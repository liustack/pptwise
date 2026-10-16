/**
 * `pptwise images search|fetch|list|generate` — Pexels first, Pixabay as
 * empty-result fallback, then Openverse (cc0/pdm). Local generators pin
 * through the same sidecar path. Inject `fetch` / `resizeToJpeg` / `run`
 * so tests never touch the network or spawn real CLIs.
 */
import { mkdir, mkdtemp, readFile, readdir, rename, rm, stat, unlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path"
import { PptwiseError } from "../errors"
import { sniffImageFormat } from "../ir/asset-sniff"
import { isMissingModuleError } from "../platform/node"
import { buildAssetBrief } from "../render/asset-brief"
import { VERSION } from "../version"
import type * as Sharp from "sharp"
import { loadValidatedDeckIr } from "./commands"
import { findConfig, findUserConfig } from "./config"
import { assertSafeFileSegment, ASSETS_DIRNAME, isDeckDirectory, pathExists, resolveDeckTarget } from "./deck-dir"
import {
  GENERATOR_IDS,
  knownSecretsFrom,
  missingKeysError,
  resolveGenerators,
  resolveImageKeys,
  type GeneratorId,
  type ImageProviderId,
  type ResolvedImageKeys,
} from "./image-config"
import {
  defaultProcessRunner,
  GENERATOR_ADAPTERS,
  GeneratorWriteDenied,
  locateGeneratorBin,
  writeDeniedMessage,
  type ProcessRunner,
} from "./image-generators"
import { defaultSleep, loadOpenverseDetail, searchOpenverse, type SleepFn } from "./image-openverse"
import { proxyFetch } from "./proxy-fetch"
import { assertSafeRemoteTarget, defaultDnsLookup, pinnedFetch, type DnsLookup } from "./ssrf"
import { redactSecrets } from "./redact"
import { drawContactSheet, type SheetCell } from "./image-sheet"
import { slugify } from "../themes/extract/brand-extract"
import { prepareWorkspaceDir, resolveWorkspaceLocation, type GitRunner, type WorkspaceLocation } from "./workspace"

export type { ProcessRun, ProcessRunner } from "./image-generators"

export const BYTE_CAP = 15 * 1024 * 1024
export const MAX_LONG_EDGE = 1920
const PER_PAGE = 8

export type ResizeToJpeg = (bytes: Buffer, maxLongEdge: number) => Promise<Buffer>

/** Where a pinned picture came from: a stock library, a local generator,
 *  an address on the web (`images add <url>`), or a file (`images add <file>`). */
export type PinnedProviderId = ImageProviderId | "web" | "file"

export interface StockSidecar {
  provider: PinnedProviderId
  photo_id?: string
  license: string
  author?: string
  page_url?: string
  attribution?: string
  source?: string
  query?: string
  prompt?: string
  downloaded_at?: string
  generated_at?: string
  /** `images add <url>`: the address the picture was downloaded from. */
  url?: string
  /** `images add <file>`: the file it was copied from, relative to where the command ran. */
  file?: string
  added_at?: string
}

export interface SearchHit {
  id: string
  provider: ImageProviderId
  photoId: string
  thumb: string
  width: number
  height: number
  author: string
  license: string
  pageUrl: string
  attribution: string
  source?: string
  /** The provider's own words for the picture: Pexels `alt`, Pixabay
   *  `tags`, Openverse `title`. Lets a reader rule a result in or out
   *  before looking at it. */
  description?: string
  /** The full-size picture, kept for the contact sheet when the thumbnail
   *  will not download: Openverse renders its thumbnails itself and fails
   *  on some sources (Wikimedia Commons among them). Never printed. */
  full?: string
}

export interface ImagesSearchOptions {
  orientation?: string
  color?: string
  minWidth?: number
  minHeight?: number
  fetch?: typeof fetch
  env?: NodeJS.ProcessEnv
  sleep?: SleepFn
}

export interface ImagesFetchOptions {
  deck: string
  as: string
  cwd?: string
  query?: string
  fetch?: typeof fetch
  resizeToJpeg?: ResizeToJpeg
  env?: NodeJS.ProcessEnv
  now?: () => Date
  sleep?: SleepFn
  lookup?: DnsLookup
}

export interface ImagesListOptions {
  deck: string
  cwd?: string
}

export interface ImagesGenerateOptions {
  deck: string
  as: string
  prompt?: string
  cwd?: string
  env?: NodeJS.ProcessEnv
  run?: ProcessRunner
  resolvePrompt?: (opts: { deck: string; as: string; cwd: string }) => Promise<string | undefined>
  resizeToJpeg?: ResizeToJpeg
  now?: () => Date
}

type FetchImpl = typeof fetch

function userAgent(): string {
  return `pptwise/${VERSION} (+https://pptwise.com)`
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

async function loadKeys(env: NodeJS.ProcessEnv): Promise<ResolvedImageKeys> {
  const hit = await findUserConfig()
  return resolveImageKeys({ file: hit?.config ?? null, env })
}

async function fetchJson(
  url: string,
  init: RequestInit,
  fetchImpl: FetchImpl,
  secrets: string[],
): Promise<unknown> {
  let res: Response
  try {
    res = await fetchImpl(url, init)
  } catch (e) {
    throw new PptwiseError(
      redactSecrets(`stock image request failed: ${e instanceof Error ? e.message : String(e)}`, secrets),
    )
  }
  const text = await res.text()
  const redacted = redactSecrets(text.slice(0, 800), secrets)
  if (!res.ok) {
    if (res.status === 429) {
      throw new PptwiseError(`stock image API rate-limited (HTTP 429): ${redacted}`)
    }
    throw new PptwiseError(`stock image API HTTP ${res.status}: ${redacted}`)
  }
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new PptwiseError(`stock image API returned non-JSON (HTTP ${res.status})`)
  }
}

function pexelsHeaders(apiKey: string): Record<string, string> {
  return { Authorization: apiKey, "User-Agent": userAgent() }
}

const ORIENTATIONS = new Set(["landscape", "portrait", "square"])

function parseOrientation(raw: string | undefined): "landscape" | "portrait" | "square" | undefined {
  if (raw === undefined || raw === "") return undefined
  if (!ORIENTATIONS.has(raw)) {
    throw new PptwiseError(`invalid --orientation "${raw}" — expected landscape, portrait, or square`)
  }
  return raw as "landscape" | "portrait" | "square"
}

function clientFilter(hits: SearchHit[], minWidth?: number, minHeight?: number): SearchHit[] {
  return hits.filter((hit) => {
    if (minWidth !== undefined && hit.width < minWidth) return false
    if (minHeight !== undefined && hit.height < minHeight) return false
    return true
  })
}

/** A provider description, trimmed, or nothing when it says nothing. */
function describe(text: string | undefined): { description?: string } {
  const trimmed = text?.replace(/\s+/gu, " ").trim()
  return trimmed ? { description: trimmed } : {}
}

function parsePexelsPhotos(json: unknown): SearchHit[] {
  const root = asRecord(json)
  const photos = Array.isArray(root?.photos) ? root.photos : []
  const hits: SearchHit[] = []
  for (const raw of photos) {
    const photo = asRecord(raw)
    if (!photo) continue
    const id = photo.id
    const photoId = typeof id === "number" || typeof id === "string" ? String(id) : ""
    if (!photoId) continue
    const src = asRecord(photo.src) ?? {}
    const author = asString(photo.photographer) ?? "unknown"
    const pageUrl = asString(photo.url) ?? `https://www.pexels.com/photo/${photoId}/`
    hits.push({
      id: `pexels:${photoId}`,
      provider: "pexels",
      photoId,
      thumb: asString(src.medium) ?? asString(src.tiny) ?? "",
      width: asNumber(photo.width) ?? 0,
      height: asNumber(photo.height) ?? 0,
      author,
      license: "Pexels License",
      pageUrl,
      attribution: `Photo by ${author} on Pexels`,
      ...describe(asString(photo.alt)),
    })
  }
  return hits.slice(0, PER_PAGE)
}

function parsePixabayHits(json: unknown): SearchHit[] {
  const root = asRecord(json)
  const list = Array.isArray(root?.hits) ? root.hits : []
  const hits: SearchHit[] = []
  for (const raw of list) {
    const photo = asRecord(raw)
    if (!photo) continue
    const photoId = photo.id !== undefined ? String(photo.id) : ""
    if (!photoId) continue
    const author = asString(photo.user) ?? "unknown"
    const pageUrl = asString(photo.pageURL) ?? `https://pixabay.com/photos/${photoId}/`
    hits.push({
      id: `pixabay:${photoId}`,
      provider: "pixabay",
      photoId,
      // The 640 px web size reads on a contact sheet. The 150 px preview
      // is all some hits carry.
      thumb: asString(photo.webformatURL) ?? asString(photo.previewURL) ?? "",
      width: asNumber(photo.imageWidth) ?? 0,
      height: asNumber(photo.imageHeight) ?? 0,
      author,
      license: "Pixabay License",
      pageUrl,
      attribution: `Photo by ${author} on Pixabay`,
      ...describe(asString(photo.tags)),
    })
  }
  return hits.slice(0, PER_PAGE)
}

async function searchPexels(
  query: string,
  apiKey: string,
  opts: ImagesSearchOptions,
  fetchImpl: FetchImpl,
  secrets: string[],
): Promise<SearchHit[]> {
  const url = new URL("https://api.pexels.com/v1/search")
  url.searchParams.set("query", query)
  url.searchParams.set("locale", "zh-CN")
  url.searchParams.set("per_page", String(PER_PAGE))
  const orientation = parseOrientation(opts.orientation)
  if (orientation) url.searchParams.set("orientation", orientation)
  if (opts.color) url.searchParams.set("color", opts.color)
  const json = await fetchJson(url.toString(), { headers: pexelsHeaders(apiKey) }, fetchImpl, secrets)
  return clientFilter(parsePexelsPhotos(json), opts.minWidth, opts.minHeight)
}

function pixabayOrientation(orientation: string | undefined): string | undefined {
  if (orientation === "landscape") return "horizontal"
  if (orientation === "portrait") return "vertical"
  return undefined
}

async function searchPixabay(
  query: string,
  apiKey: string,
  opts: ImagesSearchOptions,
  fetchImpl: FetchImpl,
  secrets: string[],
): Promise<SearchHit[]> {
  const url = new URL("https://pixabay.com/api/")
  url.searchParams.set("key", apiKey)
  url.searchParams.set("q", query.slice(0, 100))
  url.searchParams.set("lang", "zh")
  url.searchParams.set("per_page", String(PER_PAGE))
  url.searchParams.set("safesearch", "true")
  const mapped = pixabayOrientation(parseOrientation(opts.orientation))
  if (mapped) url.searchParams.set("orientation", mapped)
  if (opts.color) url.searchParams.set("colors", opts.color)
  if (opts.minWidth !== undefined) url.searchParams.set("min_width", String(opts.minWidth))
  if (opts.minHeight !== undefined) url.searchParams.set("min_height", String(opts.minHeight))
  const json = await fetchJson(url.toString(), { headers: { "User-Agent": userAgent() } }, fetchImpl, secrets)
  return parsePixabayHits(json)
}

function formatHits(hits: SearchHit[]): string {
  return hits
    .map((hit, index) => {
      const thumb = hit.thumb ? `\n  ${hit.thumb}` : ""
      const source = hit.source ? `  ${hit.source}` : ""
      const description = hit.description ? `\n  ${hit.description}` : ""
      return `${index + 1}. ${hit.id}  ${hit.width}x${hit.height}  ${hit.author}  ${hit.license}${source}${description}${thumb}\n  ${hit.attribution}\n  ${hit.pageUrl}`
    })
    .join("\n")
}

function openverseNotes(anonymous: boolean, pixabaySkipped: boolean): string[] {
  const lines = ["Openverse does not verify individual licenses. Results are filtered to cc0/pdm."]
  if (anonymous) {
    lines.push(
      "Anonymous Openverse quota is very low. Set credentials with `pptwise config set openverse.clientId` and `pptwise config set openverse.clientSecret`.",
    )
  }
  if (pixabaySkipped) {
    lines.push("Pixabay is unconfigured — pptwise config set pixabay.apiKey")
  }
  return lines
}

/** What one search found: the hits in the order printed, and the notes
 *  that go with them (Openverse's licence caveat, a missing key). */
export interface ImagesSearchResult {
  query: string
  hits: SearchHit[]
  notes: string[]
}

/** The search itself, without printing: Pexels, then Pixabay, then Openverse. */
export async function searchImages(query: string, opts: ImagesSearchOptions = {}): Promise<ImagesSearchResult> {
  const q = query.trim()
  if (q === "") throw new PptwiseError("search query must not be empty")
  const env = opts.env ?? process.env
  const keys = await loadKeys(env)
  const secrets = knownSecretsFrom(keys)
  const fetchImpl = opts.fetch ?? proxyFetch
  const sleep = opts.sleep ?? defaultSleep

  if (keys.pexels.apiKey) {
    const pexelsHits = await searchPexels(q, keys.pexels.apiKey, opts, fetchImpl, secrets)
    if (pexelsHits.length > 0) return { query: q, hits: pexelsHits, notes: [] }
  }

  if (keys.pixabay.apiKey) {
    const pixabayHits = await searchPixabay(q, keys.pixabay.apiKey, opts, fetchImpl, secrets)
    if (pixabayHits.length > 0) return { query: q, hits: pixabayHits, notes: [] }
  }

  const orientation = parseOrientation(opts.orientation)
  const ovHits = await searchOpenverse({
    query: q,
    orientation,
    minWidth: opts.minWidth,
    minHeight: opts.minHeight,
    clientId: keys.openverse.ready ? keys.openverse.clientId : undefined,
    clientSecret: keys.openverse.ready ? keys.openverse.clientSecret : undefined,
    fetch: fetchImpl,
    secrets,
    sleep,
  })
  const notes = openverseNotes(!keys.openverse.ready, !keys.pixabay.apiKey)
  const hits: SearchHit[] = ovHits.map((hit) => ({
    id: `openverse:${hit.id}`,
    provider: "openverse",
    photoId: hit.id,
    thumb: hit.thumbnail,
    width: hit.width,
    height: hit.height,
    author: hit.creator,
    license: hit.license,
    pageUrl: hit.foreignLandingUrl,
    attribution: hit.attribution,
    source: hit.source,
    ...describe(hit.title),
    full: hit.url,
  }))
  return { query: q, hits, notes }
}

/** One hit as `--json` prints it: its number on the contact sheet and the
 *  id `images fetch` takes, without the provider-local photo id that id
 *  already contains. */
function hitJson(hit: SearchHit, index: number): { n: number } & Omit<SearchHit, "photoId" | "full"> {
  const { photoId: _photoId, full: _full, ...rest } = hit
  return { n: index + 1, ...rest }
}

export interface ImagesSearchRunOptions extends ImagesSearchOptions {
  json?: boolean
  /** Draw the contact sheet: `true` for `.pptwise/image-search/<query>.jpg`
   *  under the project, or a file path of the caller's. */
  sheet?: boolean | string
  cwd?: string
  lookup?: DnsLookup
  gitIgnore?: boolean
  runGit?: GitRunner
}

export async function runImagesSearch(query: string, opts: ImagesSearchRunOptions = {}): Promise<string> {
  const result = await searchImages(query, opts)
  const drawn = opts.sheet && result.hits.length > 0 ? await writeSearchSheet(result, opts) : undefined
  const notes = [...result.notes, ...(drawn?.notes ?? [])]
  if (opts.json) {
    return JSON.stringify(
      { query: result.query, hits: result.hits.map(hitJson), notes, ...(drawn ? { sheet: drawn.path } : {}) },
      null,
      2,
    )
  }
  if (result.hits.length === 0) return ["No photos found.", ...notes].join("\n")
  const sheet = drawn ? [`contact sheet: ${drawn.path}`] : []
  return [...notes, ...sheet, formatHits(result.hits)].join("\n")
}

/** The folder under `.pptwise/` the default contact sheets go in. */
export const IMAGE_SEARCH_DIRNAME = "image-search"

/**
 * Download every hit's thumbnail and draw them as one numbered sheet. A
 * hit whose thumbnail fails is drawn from its full-size picture when the
 * search kept one. One the network does not deliver at all is drawn
 * crossed out under its number, and a note says which, so one slow host
 * never costs the search.
 */
async function writeSearchSheet(
  result: ImagesSearchResult,
  opts: ImagesSearchRunOptions,
): Promise<{ path: string; notes: string[] }> {
  const cwd = opts.cwd ?? process.cwd()
  const notes: string[] = []
  let path: string
  if (typeof opts.sheet === "string") {
    path = resolve(cwd, opts.sheet)
    await mkdir(dirname(path), { recursive: true })
  } else {
    const projectHit = await findConfig(cwd)
    const location = resolveWorkspaceLocation({
      cwd,
      projectConfigPath: projectHit?.path,
      target: IMAGE_SEARCH_DIRNAME,
      isDir: true,
    })
    notes.push(...(await prepareWorkspaceDir(location, { gitIgnore: opts.gitIgnore, runGit: opts.runGit })))
    path = join(location.dir, `${slugify(result.query, "search")}.jpg`)
  }
  const lookup = opts.lookup ?? (opts.fetch ? undefined : defaultDnsLookup)
  const reasons = new Map<number, string>()
  const cells: SheetCell[] = await Promise.all(
    result.hits.map(async (hit, index) => {
      const n = index + 1
      const sources = [hit.thumb, hit.full].filter((url): url is string => url !== undefined && url !== "")
      if (sources.length === 0) reasons.set(n, "no thumbnail")
      for (const url of sources) {
        try {
          return { n, bytes: await downloadBytes(url, opts.fetch, [], lookup) }
        } catch (e) {
          reasons.set(n, e instanceof Error ? e.message : String(e))
        }
      }
      return { n, bytes: null }
    }),
  )
  const { jpeg, missing } = await drawContactSheet(cells)
  await writeFile(path, jpeg)
  if (missing.length > 0) {
    const listed = missing.map((n) => `${n} (${reasons.get(n) ?? "not a readable image"})`)
    notes.push(`The contact sheet is missing thumbnails ${listed.join(", ")}. Open those pages to look at them.`)
  }
  return { path, notes }
}

type PhotoRefProvider = "pexels" | "pixabay" | "openverse"

function parsePhotoRef(ref: string): { provider: PhotoRefProvider; photoId: string } {
  const m = /^(pexels|pixabay|openverse):(.+)$/.exec(ref.trim())
  if (!m) {
    throw new PptwiseError(`invalid photo ref "${ref}" — expected pexels:<id>, pixabay:<id>, or openverse:<id>`)
  }
  const photoId = m[2]!.trim()
  if (photoId === "" || photoId.includes("/") || photoId.includes("\\") || photoId.includes("..")) {
    throw new PptwiseError(`invalid photo id in "${ref}"`)
  }
  return { provider: m[1] as PhotoRefProvider, photoId }
}

/**
 * Where `images fetch` and `images generate` pin a picture for `deckArg`,
 * and where `images list` reads.
 *
 * A deck project keeps its pictures in its own `assets/`, the folder it
 * already registers pictures from by file name (`./deck-dir.ts`), so a
 * pinned picture moves with the deck and the IR names it by a path inside
 * the deck (`assets/hero.jpg`). They used to go to the workspace,
 * `.pptwise/<deck>/assets/`, a folder named for where the deck sat in the
 * project: a deck moved to another folder looked for its pictures in a new,
 * empty workspace and drew empty frames. `earlier` is that workspace folder,
 * still read (`loadWorkspaceStock` in `./commands.ts`, `images list` here)
 * so a picture pinned there before keeps counting while the deck stays put.
 *
 * A single IR file has no folder of its own, so its pictures stay in the
 * workspace.
 */
async function resolveImageHome(
  deckArg: string,
  cwd: string,
): Promise<{ assetsDir: string; earlier?: string }> {
  const { location, isDir, target } = await resolveDeckWorkspace(deckArg, cwd)
  const workspace = join(location.dir, ASSETS_DIRNAME)
  if (!isDir) return { assetsDir: workspace }
  return { assetsDir: join(resolve(target), ASSETS_DIRNAME), earlier: workspace }
}

async function resolveDeckWorkspace(
  deckArg: string,
  cwd: string,
): Promise<{ location: WorkspaceLocation; isDir: boolean; target: string }> {
  const projectHit = await findConfig(cwd)
  const target = await resolveDeckTarget(deckArg, cwd)
  const isDir = await isDeckDirectory(target)
  const location = resolveWorkspaceLocation({
    cwd,
    projectConfigPath: projectHit?.path,
    target,
    isDir,
  })
  return { location, isDir, target }
}

function assertSafeDownloadUrl(url: string): URL {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new PptwiseError("invalid download URL")
  }
  if (parsed.protocol !== "https:") {
    throw new PptwiseError("refusing non-HTTPS download URL")
  }
  if (parsed.username !== "" || parsed.password !== "") {
    throw new PptwiseError("refusing download URL with embedded userinfo")
  }
  return parsed
}

async function downloadBytes(
  url: string,
  fetchImpl: FetchImpl | undefined,
  secrets: string[],
  lookup?: DnsLookup,
): Promise<Buffer> {
  const parsed = assertSafeDownloadUrl(url)
  let pin
  try {
    pin = await assertSafeRemoteTarget(parsed, lookup)
  } catch (e) {
    throw new PptwiseError(redactSecrets(e instanceof Error ? e.message : String(e), secrets))
  }
  let res: Response
  try {
    const init = { headers: { "User-Agent": userAgent() } }
    res = fetchImpl
      ? await fetchImpl(parsed.toString(), init)
      : await pinnedFetch(parsed, pin, init)
  } catch (e) {
    throw new PptwiseError(
      redactSecrets(`download failed: ${e instanceof Error ? e.message : String(e)}`, secrets),
    )
  }
  if (!res.ok) {
    throw new PptwiseError(`download HTTP ${res.status}`)
  }
  const declared = Number(res.headers.get("content-length") ?? "0")
  if (declared > BYTE_CAP) {
    throw new PptwiseError(`download exceeds the ${BYTE_CAP} byte cap`)
  }
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.byteLength > BYTE_CAP) {
    throw new PptwiseError(`download exceeds the ${BYTE_CAP} byte cap`)
  }
  return buf
}

export async function defaultResizeToJpeg(bytes: Buffer, maxLongEdge: number): Promise<Buffer> {
  let sharpMod: typeof Sharp.default
  try {
    sharpMod = (await import("sharp")).default as unknown as typeof Sharp.default
  } catch (e) {
    if (isMissingModuleError(e)) {
      throw new PptwiseError(`Resizing stock photos requires the optional dependency "sharp" (npm i sharp)`)
    }
    throw e
  }
  const image = sharpMod(bytes)
  const meta = await image.metadata()
  const width = meta.width ?? 0
  const height = meta.height ?? 0
  const long = Math.max(width, height)
  const pipeline = long > maxLongEdge ? (width >= height ? image.resize({ width: maxLongEdge }) : image.resize({ height: maxLongEdge })) : image
  return pipeline.jpeg({ quality: 85 }).toBuffer()
}

async function toJpeg(
  bytes: Buffer,
  apiLongEdge: number | undefined,
  resize: ResizeToJpeg,
): Promise<Buffer> {
  const format = sniffImageFormat(bytes)
  if (format === null) {
    throw new PptwiseError("downloaded bytes are not a recognized image (png/jpeg/gif/webp)")
  }
  if (format === "jpeg" && apiLongEdge !== undefined && apiLongEdge <= MAX_LONG_EDGE) {
    return bytes
  }
  return resize(bytes, MAX_LONG_EDGE)
}

interface PhotoMeta {
  author: string
  pageUrl: string
  license: string
  downloadUrl: string
  fallbackUrl?: string
  width?: number
  height?: number
  attribution?: string
  source?: string
}

async function loadPexelsPhoto(photoId: string, apiKey: string, fetchImpl: FetchImpl, secrets: string[]): Promise<PhotoMeta> {
  const url = `https://api.pexels.com/v1/photos/${encodeURIComponent(photoId)}`
  const json = await fetchJson(url, { headers: pexelsHeaders(apiKey) }, fetchImpl, secrets)
  const photo = asRecord(json)
  if (!photo) throw new PptwiseError(`Pexels photo ${photoId} was not found`)
  const src = asRecord(photo.src) ?? {}
  const original = asString(src.original)
  const large2x = asString(src.large2x)
  const downloadUrl = original ?? large2x
  if (!downloadUrl) throw new PptwiseError(`Pexels photo ${photoId} has no download URL`)
  const author = asString(photo.photographer) ?? "unknown"
  return {
    author,
    pageUrl: asString(photo.url) ?? `https://www.pexels.com/photo/${photoId}/`,
    license: "Pexels License",
    downloadUrl,
    fallbackUrl: original ? large2x : undefined,
    width: asNumber(photo.width),
    height: asNumber(photo.height),
  }
}

async function loadPixabayPhoto(photoId: string, apiKey: string, fetchImpl: FetchImpl, secrets: string[]): Promise<PhotoMeta> {
  const url = new URL("https://pixabay.com/api/")
  url.searchParams.set("key", apiKey)
  url.searchParams.set("id", photoId)
  const json = await fetchJson(url.toString(), { headers: { "User-Agent": userAgent() } }, fetchImpl, secrets)
  const hits = parsePixabayHits(json)
  const hit = hits[0]
  const root = asRecord(json)
  const rawHits = Array.isArray(root?.hits) ? root.hits : []
  const raw = asRecord(rawHits[0])
  const downloadUrl = asString(raw?.largeImageURL)
  if (!hit || !downloadUrl) throw new PptwiseError(`Pixabay photo ${photoId} was not found`)
  return {
    author: hit.author,
    pageUrl: hit.pageUrl,
    license: "Pixabay License",
    downloadUrl,
    width: hit.width,
    height: hit.height,
  }
}

async function readSidecar(path: string): Promise<StockSidecar | null> {
  try {
    const raw = JSON.parse(await readFile(path, "utf8")) as unknown
    const rec = asRecord(raw)
    if (!rec) return null
    const provider = asString(rec.provider) as PinnedProviderId | undefined
    const known =
      provider === "pexels" ||
      provider === "pixabay" ||
      provider === "openverse" ||
      provider === "grok" ||
      provider === "codex" ||
      provider === "antigravity" ||
      provider === "web" ||
      provider === "file"
    if (!known || !provider) return null
    const photoId = asString(rec.photo_id)
    if ((provider === "pexels" || provider === "pixabay") && !photoId) return null
    return {
      provider,
      photo_id: photoId,
      license: asString(rec.license) ?? "",
      author: asString(rec.author),
      page_url: asString(rec.page_url),
      attribution: asString(rec.attribution),
      source: asString(rec.source),
      query: asString(rec.query),
      prompt: asString(rec.prompt),
      downloaded_at: asString(rec.downloaded_at),
      generated_at: asString(rec.generated_at),
      url: asString(rec.url),
      file: asString(rec.file),
      added_at: asString(rec.added_at),
    }
  } catch {
    return null
  }
}

export async function runImagesFetch(ref: string, opts: ImagesFetchOptions): Promise<string> {
  const { provider, photoId } = parsePhotoRef(ref)
  assertSafeFileSegment(opts.as, "asset id")
  const cwd = opts.cwd ?? process.cwd()
  const env = opts.env ?? process.env
  const keys = await loadKeys(env)
  const secrets = knownSecretsFrom(keys)
  if (provider !== "openverse") {
    const apiKey = keys[provider].apiKey
    if (!apiKey) throw missingKeysError(provider)
  }

  const { assetsDir } = await resolveImageHome(opts.deck, cwd)
  const jpgPath = join(assetsDir, `${opts.as}.jpg`)
  const jsonPath = join(assetsDir, `${opts.as}.json`)
  if ((await pathExists(jpgPath)) && (await pathExists(jsonPath))) {
    const existing = await readSidecar(jsonPath)
    if (existing && existing.photo_id === photoId && existing.provider === provider) {
      return `already pinned ${provider}:${photoId} as ${opts.as} — skipped`
    }
  }

  const fetchImpl = opts.fetch ?? proxyFetch
  const sleep = opts.sleep ?? defaultSleep
  const downloadFetch = opts.fetch
  const lookup = opts.lookup ?? (opts.fetch ? undefined : defaultDnsLookup)
  let meta: PhotoMeta
  if (provider === "openverse") {
    const hit = await loadOpenverseDetail(
      photoId,
      {
        clientId: keys.openverse.ready ? keys.openverse.clientId : undefined,
        clientSecret: keys.openverse.ready ? keys.openverse.clientSecret : undefined,
      },
      fetchImpl,
      secrets,
      sleep,
    )
    meta = {
      author: hit.creator,
      pageUrl: hit.foreignLandingUrl,
      license: hit.license,
      downloadUrl: hit.url,
      width: hit.width,
      height: hit.height,
      attribution: hit.attribution,
      source: hit.source,
    }
  } else {
    const apiKey = keys[provider].apiKey!
    meta =
      provider === "pexels"
        ? await loadPexelsPhoto(photoId, apiKey, fetchImpl, secrets)
        : await loadPixabayPhoto(photoId, apiKey, fetchImpl, secrets)
  }

  let bytes: Buffer
  try {
    bytes = await downloadBytes(meta.downloadUrl, downloadFetch, secrets, lookup)
  } catch (e) {
    if (meta.fallbackUrl) {
      bytes = await downloadBytes(meta.fallbackUrl, downloadFetch, secrets, lookup)
    } else {
      throw e
    }
  }

  const apiLong = meta.width !== undefined && meta.height !== undefined ? Math.max(meta.width, meta.height) : undefined
  const resize = opts.resizeToJpeg ?? defaultResizeToJpeg
  const jpeg = await toJpeg(bytes, apiLong, resize)

  await mkdir(assetsDir, { recursive: true })
  await writeFile(jpgPath, jpeg)
  const sidecar: StockSidecar = {
    provider,
    photo_id: photoId,
    license: meta.license,
    author: meta.author,
    page_url: meta.pageUrl,
    downloaded_at: (opts.now ?? (() => new Date()))().toISOString(),
  }
  if (opts.query) sidecar.query = opts.query
  if (meta.attribution) sidecar.attribution = meta.attribution
  if (meta.source) sidecar.source = meta.source
  const json = JSON.stringify(sidecar, null, 2) + "\n"
  if (/"apiKey"\s*:/.test(json) || /"key"\s*:/.test(json) || /"clientSecret"\s*:/.test(json)) {
    throw new PptwiseError("internal error: sidecar would have contained a key field")
  }
  await writeFile(jsonPath, json)
  return `pinned ${provider}:${photoId} as ${opts.as} → ${jpgPath}`
}

export async function runImagesList(opts: ImagesListOptions): Promise<string> {
  const cwd = opts.cwd ?? process.cwd()
  const { assetsDir, earlier } = await resolveImageHome(opts.deck, cwd)
  const lines: string[] = []
  const listed = new Set<string>()
  // The deck's own pictures first, then any pinned in the workspace before,
  // which the deck still reads unless its own folder has one of that id.
  for (const dir of earlier === undefined ? [assetsDir] : [assetsDir, earlier]) {
    for (const name of await sidecarNames(dir)) {
      const assetId = name.slice(0, -".json".length)
      if (listed.has(assetId)) continue
      const sidecar = await readSidecar(join(dir, name))
      if (!sidecar) continue
      listed.add(assetId)
      const id = sidecar.photo_id ? `${sidecar.provider}:${sidecar.photo_id}` : sidecar.provider
      const rest = [sidecar.author, sidecar.license, sidecar.page_url ?? sidecar.file ?? sidecar.generated_at].filter(Boolean)
      lines.push(`${assetId}  ${id}  ${rest.join("  ")}`)
    }
  }
  return lines.length === 0 ? "No pinned stock photos." : lines.join("\n")
}

async function sidecarNames(dir: string): Promise<string[]> {
  try {
    return (await readdir(dir)).filter((n) => n.endsWith(".json") && !n.startsWith(".")).sort()
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return []
    throw e
  }
}

async function writePinnedAsset(
  assetsDir: string,
  assetId: string,
  jpeg: Buffer,
  sidecar: StockSidecar,
): Promise<string> {
  return writePinnedFile(assetsDir, assetId, "jpg", jpeg, sidecar)
}

/** Write a picture and its sidecar side by side, each through a temp name, so a failure leaves neither half. */
async function writePinnedFile(
  assetsDir: string,
  assetId: string,
  ext: "jpg" | "png",
  bytes: Buffer,
  sidecar: StockSidecar,
): Promise<string> {
  await mkdir(assetsDir, { recursive: true })
  const picturePath = join(assetsDir, `${assetId}.${ext}`)
  const jsonPath = join(assetsDir, `${assetId}.json`)
  const tmpPicture = join(assetsDir, `.${assetId}.${ext}.tmp`)
  const tmpJson = join(assetsDir, `.${assetId}.json.tmp`)
  const json = JSON.stringify(sidecar, null, 2) + "\n"
  if (/"apiKey"\s*:/.test(json) || /"key"\s*:/.test(json) || /"clientSecret"\s*:/.test(json)) {
    throw new PptwiseError("internal error: sidecar would have contained a key field")
  }
  try {
    await writeFile(tmpPicture, bytes)
    await writeFile(tmpJson, json)
    await rename(tmpPicture, picturePath)
    await rename(tmpJson, jsonPath)
  } catch (e) {
    await unlink(tmpPicture).catch(() => undefined)
    await unlink(tmpJson).catch(() => undefined)
    await unlink(picturePath).catch(() => undefined)
    throw e
  }
  return picturePath
}

async function defaultResolvePrompt(opts: { deck: string; as: string; cwd: string }): Promise<string | undefined> {
  const { ir, theme } = await loadValidatedDeckIr(opts.deck, opts.cwd)
  const brief = buildAssetBrief(ir, { theme })
  const item = brief.items.find((entry) => entry.asset_id === opts.as && entry.suggested_prompt.trim() !== "")
  return item?.suggested_prompt
}

export async function runImagesGenerate(opts: ImagesGenerateOptions): Promise<string> {
  assertSafeFileSegment(opts.as, "asset id")
  const cwd = opts.cwd ?? process.cwd()
  const env = opts.env ?? process.env
  const hit = await findUserConfig()
  const gens = resolveGenerators({ file: hit?.config ?? null })
  const fromFlag = opts.prompt?.trim()
  const prompt =
    fromFlag && fromFlag !== ""
      ? fromFlag
      : await (opts.resolvePrompt ?? defaultResolvePrompt)({ deck: opts.deck, as: opts.as, cwd })
  if (!prompt) {
    throw new PptwiseError(`no prompt for asset "${opts.as}" — pass --prompt`)
  }

  const bins = {} as Record<GeneratorId, string | null>
  for (const id of GENERATOR_IDS) {
    bins[id] = await locateGeneratorBin(id, env)
  }

  const anyEnabled = GENERATOR_IDS.some((id) => gens.enabled[id])
  if (!anyEnabled) {
    const foundDisabled = GENERATOR_IDS.filter((id) => bins[id] !== null)
    if (foundDisabled.length === 0) {
      throw new PptwiseError(
        "No image generator is enabled. Looked for grok, codex, antigravity. None were found on PATH.",
      )
    }
    const listed = foundDisabled
      .map((id) => `${id} — pptwise config set images.generators.${id}.enabled true`)
      .join("; ")
    throw new PptwiseError(`No image generator is enabled. Found but disabled: ${listed}`)
  }

  const { assetsDir } = await resolveImageHome(opts.deck, cwd)
  const workdir = await mkdtemp(join(tmpdir(), "pptwise-gen-"))
  const dest = join(workdir, "generated.jpg")
  const run = opts.run ?? defaultProcessRunner
  const attempts: string[] = []
  try {
    for (const id of gens.order) {
      if (!gens.enabled[id]) continue
      const bin = bins[id]
      if (!bin) continue
      try {
        await GENERATOR_ADAPTERS[id]({
          bin,
          workdir,
          dest,
          prompt,
          timeoutMs: gens.timeoutMs,
          run,
        })
        const bytes = await readFile(dest)
        if (sniffImageFormat(bytes) === null) {
          throw new PptwiseError("produced bytes that are not a recognized image")
        }
        const resize = opts.resizeToJpeg ?? defaultResizeToJpeg
        const jpeg = await toJpeg(bytes, undefined, resize)
        const sidecar: StockSidecar = {
          provider: id,
          license: "user-generated",
          prompt,
          generated_at: (opts.now ?? (() => new Date()))().toISOString(),
        }
        const pinned = await writePinnedAsset(assetsDir, opts.as, jpeg, sidecar)
        return `pinned ${id} as ${opts.as} → ${pinned}`
      } catch (e) {
        attempts.push(
          e instanceof GeneratorWriteDenied
            ? writeDeniedMessage(id, e.detail)
            : `${id}: ${e instanceof Error ? e.message : String(e)}`,
        )
      }
    }
    if (attempts.length === 0) {
      throw new PptwiseError(
        "No enabled image generator was found on PATH. Looked for grok, codex, antigravity.",
      )
    }
    throw new PptwiseError(`All image generators failed: ${attempts.join("; ")}`)
  } finally {
    await rm(workdir, { recursive: true, force: true })
  }
}

/**
 * The licenses `images add` takes: the terms under which a picture found
 * outside the stock libraries may go into a deck. Every one of them lets a
 * deck use the picture as it is. Share-alike, non-commercial and
 * no-derivatives terms are refused, since a deck cannot keep them, and so
 * is any license this list does not name.
 */
export const ADD_LICENSES = ["cc0", "pdm", "cc-by", "press", "own"] as const

interface AddLicense {
  /** What the sidecar records. */
  label: string
  /** Whether the picture must be credited, which needs its author. */
  credit: boolean
}

function parseAddLicense(raw: string): AddLicense {
  const value = raw.trim().toLowerCase()
  if (value === "cc0") return { label: "CC0 1.0", credit: false }
  if (value === "pdm" || value === "public-domain") return { label: "Public Domain", credit: false }
  if (value === "own") return { label: "Own", credit: false }
  if (value === "press") return { label: "Press material", credit: true }
  const by = /^cc-by(?:-(\d\.\d))?$/.exec(value)
  if (by) return { label: by[1] ? `CC BY ${by[1]}` : "CC BY", credit: true }
  if (/^cc-by-(sa|nc|nd)|^cc-by-nc|^cc-(sa|nc|nd)/.test(value)) {
    throw new PptwiseError(
      `--license ${raw}: share-alike, non-commercial and no-derivatives pictures are not taken, because a deck cannot keep those terms. Find another picture`,
    )
  }
  throw new PptwiseError(
    `--license ${raw} is not one images add takes. Use cc0, pdm (public domain), cc-by or cc-by-<version> (credit the author), press (the subject's own press material, credited to it), or own (the user's own picture), as the source page states it`,
  )
}

export interface ImagesAddOptions {
  deck: string
  as: string
  /** One of {@link ADD_LICENSES}, as the source page states it. Required for an address, `own` by default for a file. */
  license?: string
  /** The page that shows the picture and states its license. Required for an address. */
  source?: string
  author?: string
  /** The credit line, when the source page gives its own. */
  attribution?: string
  cwd?: string
  fetch?: typeof fetch
  lookup?: DnsLookup
  resizeToJpeg?: ResizeToJpeg
  /** Turns an SVG into PNG bytes. */
  rasterizeSvg?: (bytes: Buffer) => Promise<Buffer>
  /** Brings a PNG down to the long edge, keeping it a PNG. */
  resizePng?: (bytes: Buffer, maxLongEdge: number) => Promise<Buffer>
  now?: () => Date
}

function isSvg(bytes: Buffer): boolean {
  const head = bytes.subarray(0, 1024).toString("utf8").trimStart()
  return /^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE svg[^>]*>\s*)?<svg[\s>]/i.test(head)
}

async function loadSharp(why: string): Promise<typeof Sharp.default> {
  try {
    return (await import("sharp")).default as unknown as typeof Sharp.default
  } catch (e) {
    if (isMissingModuleError(e)) throw new PptwiseError(`${why} requires the optional dependency "sharp" (npm i sharp)`)
    throw e
  }
}

async function defaultRasterizeSvg(bytes: Buffer): Promise<Buffer> {
  const sharpMod = await loadSharp("Turning an SVG into a picture")
  // 288 dpi draws a logo of a few hundred SVG units at a size that stays
  // sharp on a full-width slide, then the long edge is held to the cap.
  return sharpMod(bytes, { density: 288 })
    .resize({ width: MAX_LONG_EDGE, height: MAX_LONG_EDGE, fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer()
}

async function defaultResizePng(bytes: Buffer, maxLongEdge: number): Promise<Buffer> {
  const sharpMod = await loadSharp("Resizing a PNG")
  const image = sharpMod(bytes)
  const meta = await image.metadata()
  if (Math.max(meta.width ?? 0, meta.height ?? 0) <= maxLongEdge) return bytes
  return image.resize({ width: maxLongEdge, height: maxLongEdge, fit: "inside" }).png().toBuffer()
}

function sourcePage(raw: string, flag: string): string {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new PptwiseError(`${flag} must be the address of the page that states the picture's license, such as https://commons.wikimedia.org/wiki/File:...`)
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new PptwiseError(`${flag} must be a web address`)
  return url.toString()
}

/**
 * `pptwise images add <url|file> --deck <dir> --as <asset_id>`: pin one
 * picture the stock search did not supply, a file of the project or the
 * user's, or one the agent found on the web, with the same sidecar the
 * stock pictures get.
 *
 * A picture from the web comes in only with the license its own page
 * states (`--license`), that page (`--source`), and, where the license
 * asks for credit, its author (`--author`), so every picture in a deck can
 * say where it came from and who to credit. A file is the user's own
 * unless `--license` says otherwise. PNG stays PNG, so a logo keeps its
 * transparency. An SVG becomes a PNG. JPEG, WebP and GIF become JPEG. The
 * long edge is held to 1920 px.
 */
export async function runImagesAdd(ref: string, opts: ImagesAddOptions): Promise<string> {
  assertSafeFileSegment(opts.as, "asset id")
  const cwd = opts.cwd ?? process.cwd()
  const remote = /^https?:\/\//i.test(ref.trim())
  if (!remote && /^[a-z][a-z0-9+.-]*:\/\//i.test(ref.trim())) {
    throw new PptwiseError(`images add takes an https address or a file path, not ${ref}`)
  }
  if (remote && opts.license === undefined) {
    throw new PptwiseError(
      "a picture from the web needs --license, as its source page states it: cc0, pdm, cc-by, press or own. A page that states no license is no source: find another picture",
    )
  }
  const license = parseAddLicense(opts.license ?? "own")
  const author = opts.author?.trim() || undefined
  if (license.credit && !author) {
    throw new PptwiseError(`${license.label} pictures are credited to their author: pass --author with the name the source page gives`)
  }
  let source: string | undefined
  if (opts.source !== undefined) source = sourcePage(opts.source, "--source")
  else if (remote && opts.license?.trim().toLowerCase() !== "own") {
    throw new PptwiseError("a picture from the web needs --source: the page that shows it and states its license")
  }

  let bytes: Buffer
  let origin: { url: string } | { file: string }
  if (remote) {
    bytes = await downloadBytes(ref.trim(), opts.fetch, [], opts.lookup ?? (opts.fetch ? undefined : defaultDnsLookup))
    origin = { url: ref.trim() }
  } else {
    const abs = resolve(cwd, ref)
    let size: number
    try {
      const info = await stat(abs)
      if (!info.isFile()) throw new PptwiseError(`${ref} is not a file`)
      size = info.size
    } catch (e) {
      if (e instanceof PptwiseError) throw e
      throw new PptwiseError(`cannot read ${ref}`)
    }
    if (size > BYTE_CAP) throw new PptwiseError(`${ref} is over the ${BYTE_CAP} byte cap`)
    bytes = await readFile(abs)
    const rel = relative(cwd, abs)
    origin = { file: rel.startsWith("..") || isAbsolute(rel) ? basename(abs) : rel.split(sep).join("/") }
  }

  let ext: "jpg" | "png"
  let out: Buffer
  const format = sniffImageFormat(bytes)
  if (format === "png") {
    ext = "png"
    out = await (opts.resizePng ?? defaultResizePng)(bytes, MAX_LONG_EDGE)
  } else if (format !== null) {
    ext = "jpg"
    out = await toJpeg(bytes, undefined, opts.resizeToJpeg ?? defaultResizeToJpeg)
  } else if (isSvg(bytes)) {
    ext = "png"
    out = await (opts.rasterizeSvg ?? defaultRasterizeSvg)(bytes)
    if (sniffImageFormat(out) !== "png") throw new PptwiseError("the SVG did not draw as a picture")
  } else {
    throw new PptwiseError(`${ref} is not a picture a deck takes (PNG, JPEG, WebP, GIF or SVG)`)
  }

  const { assetsDir } = await resolveImageHome(opts.deck, cwd)
  // One id is one picture: a pinned picture of the other extension is
  // replaced, and a file of the user's under that id is left alone.
  const other = join(assetsDir, `${opts.as}.${ext === "png" ? "jpg" : "png"}`)
  if (await pathExists(other)) {
    if (!(await readSidecar(join(assetsDir, `${opts.as}.json`)))) {
      throw new PptwiseError(`${other} already holds the asset id "${opts.as}". Pass another --as, or remove that file`)
    }
    await unlink(other)
  }

  const credit =
    opts.attribution?.trim() ||
    (license.credit ? (license.label === "Press material" ? `Courtesy of ${author}` : `${author}, ${license.label}${source ? `, ${source}` : ""}`) : undefined)
  const sidecar: StockSidecar = {
    provider: remote ? "web" : "file",
    license: license.label,
    ...(author ? { author } : {}),
    ...(source ? { page_url: source } : {}),
    ...(credit ? { attribution: credit } : {}),
    ...origin,
    added_at: (opts.now ?? (() => new Date()))().toISOString(),
  }
  const pinned = await writePinnedFile(assetsDir, opts.as, ext, out, sidecar)
  const lines = [`pinned ${remote ? "web" : "file"} picture as ${opts.as} → ${pinned}`]
  if (credit) lines.push(`credit: ${credit}`)
  return lines.join("\n")
}
