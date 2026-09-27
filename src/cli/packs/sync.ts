/**
 * `pptwise packs sync` and `pptwise packs list`: the client half of the
 * pack distribution protocol (docs/packs.md). Sync reads the license, asks
 * the pack server for its catalog, and installs every pack that is missing
 * or at another version and that this pptwise can run. Nothing installed
 * is removed or touched unless its replacement has been downloaded,
 * verified, and unpacked in full, so a failed sync leaves the packs that
 * were there.
 */
import { createHash } from "node:crypto"
import { join } from "node:path"
import { z } from "zod"
import { PptwiseError } from "../../errors"
import { VERSION } from "../../version"
import { resolveProductEnv } from "../product-env"
import { proxyFetch } from "../proxy-fetch"
import { installPack } from "./install"
import { readLicenseKey } from "./license"
import { PACK_ID_PATTERN, PACK_VERSION_PATTERN } from "./manifest"
import { satisfiesRange } from "./semver-range"
import { listInstalledPacks, packsRoot, readInstalledPack } from "./store"

export const DEFAULT_PACKS_URL = "https://pptwise.com"

const CATALOG_TIMEOUT_MS = 30_000
const DOWNLOAD_TIMEOUT_MS = 300_000

const CatalogSchema = z.object({
  catalog: z.literal(1),
  packs: z.array(
    z.object({
      id: z.string(),
      version: z.string(),
      title: z.string(),
      size: z.number(),
      sha256: z.string(),
      engine: z.string(),
    }),
  ),
})

type CatalogEntry = z.infer<typeof CatalogSchema>["packs"][number]

/**
 * What sync did with one catalog entry. `installed`: new on this machine.
 * `updated`: replaced `previous`. `current`: already at this version.
 * `incompatible`: needs another pptwise version, left alone. `failed`:
 * refused or not downloaded, with the installed version (if any) kept.
 */
export type PackSyncStatus = "installed" | "updated" | "current" | "incompatible" | "failed"

export interface PackSyncItem {
  id: string
  version: string
  title: string
  status: PackSyncStatus
  previous?: string
  themes?: string[]
  reason?: string
}

export interface PackSyncReport {
  /** Whether a license was configured. Without one nothing is asked. */
  license: boolean
  /** `false` when the catalog could not be read or any pack failed. */
  ok: boolean
  server?: string
  /** Why the catalog could not be read. */
  error?: string
  packs: PackSyncItem[]
}

export interface PackSyncOptions {
  /** Where `PPTWISE_PACKS_URL` is read from. Default `process.env`. */
  env?: NodeJS.ProcessEnv
  /** The version engine ranges are checked against. Default this pptwise. */
  engineVersion?: string
}

const SET_HINT = "pptwise license set <key>"
const UNCHANGED = "Installed packs are unchanged."

/** The host names plain http may reach: this machine's loopback, where a
 *  test server or a local mirror runs and the key never crosses a network. */
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"])

/**
 * The pack server's base URL without a trailing slash. Every request
 * carries the license key, so the address must be https. The one
 * exception is plain http on this machine's loopback (`localhost`,
 * `127.0.0.1`, `::1`). Any other http address is refused here, before a
 * request is made.
 */
export function packsServerUrl(env: NodeJS.ProcessEnv = process.env): string {
  const raw = resolveProductEnv("PACKS_URL", env) ?? DEFAULT_PACKS_URL
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new PptwiseError(`PPTWISE_PACKS_URL is not a URL: "${raw}"`)
  }
  if (url.protocol === "http:" && !LOOPBACK_HOSTS.has(url.hostname)) {
    throw new PptwiseError(
      `PPTWISE_PACKS_URL "${raw}" uses plain http to ${url.host}, and the license key would travel unencrypted. Use an https address. Plain http is allowed only on localhost, 127.0.0.1, or ::1.`,
    )
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new PptwiseError(`PPTWISE_PACKS_URL must be an https URL, got "${raw}"`)
  }
  return raw.replace(/\/+$/, "")
}

class ServerRefusal extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

/** The server's one-sentence `{"error": ...}`, when it sent one. */
async function serverMessage(res: Response): Promise<string | undefined> {
  try {
    const body = (await res.json()) as { error?: unknown }
    return typeof body.error === "string" && body.error.length > 0 ? body.error.slice(0, 300) : undefined
  } catch {
    return undefined
  }
}

async function get(url: string, key: string, timeoutMs: number): Promise<Response> {
  const res = await proxyFetch(url, {
    headers: { authorization: `Bearer ${key}`, "user-agent": `pptwise/${VERSION}` },
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (res.ok) return res
  const said = await serverMessage(res)
  throw new ServerRefusal(res.status, said === undefined ? `HTTP ${res.status}` : `HTTP ${res.status}: ${said}`)
}

/** An error's message with what lies underneath it, when there is
 *  something (`fetch failed (ECONNREFUSED)`). */
function describeError(e: unknown): string {
  const message = e instanceof Error ? e.message : String(e)
  const cause = e instanceof Error ? (e.cause as { code?: unknown; message?: unknown } | undefined) : undefined
  const detail = typeof cause?.code === "string" ? cause.code : typeof cause?.message === "string" ? cause.message : undefined
  return detail !== undefined && detail.length > 0 && !message.includes(detail) ? `${message} (${detail})` : message
}

function reachFailure(server: string, e: unknown): string {
  return `could not reach the pack server at ${new URL(server).host}: ${describeError(e)}`
}

/** A catalog-level failure, said the way the user can act on it. */
function catalogFailure(server: string, e: unknown): string {
  if (e instanceof ServerRefusal) {
    switch (e.status) {
      case 401:
        return `the pack server did not accept this license key (${e.message}). Check it with \`pptwise license status\` and set it again with \`${SET_HINT}\`. ${UNCHANGED}`
      case 403:
        return `this license key has been revoked (${e.message}). ${UNCHANGED}`
      case 503:
        return `the pack server is not available right now (${e.message}). Try again later. ${UNCHANGED}`
      default:
        return `the pack server refused the catalog request (${e.message}). ${UNCHANGED}`
    }
  }
  return `${reachFailure(server, e)}. ${UNCHANGED}`
}

async function fetchCatalog(server: string, key: string): Promise<CatalogEntry[]> {
  const res = await get(`${server}/api/packs/catalog`, key, CATALOG_TIMEOUT_MS)
  let body: unknown
  try {
    body = await res.json()
  } catch {
    throw new PptwiseError("the pack catalog is not valid JSON")
  }
  const parsed = CatalogSchema.safeParse(body)
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join(". ")
    throw new PptwiseError(`the pack catalog is not one this pptwise can read (${detail})`)
  }
  return parsed.data.packs
}

/** Why a catalog entry cannot be acted on at all, before any download. */
function malformedEntry(entry: CatalogEntry): string | undefined {
  if (!PACK_ID_PATTERN.test(entry.id)) return `the catalog entry has an unusable pack id "${entry.id}"`
  if (!PACK_VERSION_PATTERN.test(entry.version)) return `the catalog entry has an unusable version "${entry.version}"`
  if (!/^[0-9a-f]{64}$/.test(entry.sha256)) return "the catalog entry has no usable sha256"
  return undefined
}

/** Why this pptwise cannot take the pack, or `undefined` when it can. */
function engineMismatch(entry: CatalogEntry, engineVersion: string): string | undefined {
  let fits: boolean
  try {
    fits = satisfiesRange(engineVersion, entry.engine)
  } catch {
    return `needs a pptwise that reads the engine range "${entry.engine}", and this is ${engineVersion}. Run \`pptwise self-update\``
  }
  if (fits) return undefined
  return `needs pptwise ${entry.engine}, and this is ${engineVersion}. Run \`pptwise self-update\``
}

async function installedVersion(root: string, id: string): Promise<string | undefined> {
  try {
    return (await readInstalledPack(join(root, id), id)).version
  } catch {
    // Missing or damaged: either way the catalog version gets installed.
    return undefined
  }
}

async function syncOne(entry: CatalogEntry, ctx: { server: string; key: string; root: string; engineVersion: string }): Promise<PackSyncItem> {
  const item: PackSyncItem = { id: entry.id, version: entry.version, title: entry.title, status: "failed" }
  const malformed = malformedEntry(entry)
  if (malformed !== undefined) return { ...item, reason: malformed }
  const previous = await installedVersion(ctx.root, entry.id)
  const incompatible = engineMismatch(entry, ctx.engineVersion)
  if (incompatible !== undefined) {
    const kept = previous !== undefined ? `. Version ${previous} stays installed` : ""
    return { ...item, status: "incompatible", reason: `${incompatible}${kept}` }
  }
  if (previous === entry.version) return { ...item, status: "current" }
  let bytes: Uint8Array
  try {
    const res = await get(`${ctx.server}/api/packs/${entry.id}/${entry.version}.zip`, ctx.key, DOWNLOAD_TIMEOUT_MS)
    bytes = new Uint8Array(await res.arrayBuffer())
  } catch (e) {
    const reason = e instanceof ServerRefusal ? `the download was refused (${e.message})` : `the download failed (${describeError(e)})`
    return { ...item, reason }
  }
  const digest = createHash("sha256").update(bytes).digest("hex")
  if (digest !== entry.sha256) {
    return { ...item, reason: `the download's sha256 is ${digest}, but the catalog says ${entry.sha256}` }
  }
  try {
    const result = await installPack(bytes, { id: entry.id, version: entry.version }, { root: ctx.root, engineVersion: ctx.engineVersion })
    const done: PackSyncItem = { ...item, status: previous === undefined ? "installed" : "updated", themes: result.themes }
    if (previous !== undefined) done.previous = previous
    return done
  } catch (e) {
    return { ...item, reason: e instanceof Error ? e.message : String(e) }
  }
}

export async function syncPacks(opts: PackSyncOptions = {}): Promise<PackSyncReport> {
  const key = await readLicenseKey()
  if (key === undefined) return { license: false, ok: true, packs: [] }
  const server = packsServerUrl(opts.env ?? process.env)
  let catalog: CatalogEntry[]
  try {
    catalog = await fetchCatalog(server, key)
  } catch (e) {
    const error = e instanceof PptwiseError ? `${e.message}. ${UNCHANGED}` : catalogFailure(server, e)
    return { license: true, ok: false, server, error, packs: [] }
  }
  const ctx = { server, key, root: packsRoot(), engineVersion: opts.engineVersion ?? VERSION }
  const packs: PackSyncItem[] = []
  for (const entry of catalog) packs.push(await syncOne(entry, ctx))
  return { license: true, ok: packs.every((p) => p.status !== "failed"), server, packs }
}

function formatItem(item: PackSyncItem, width: number): string {
  const head = `  ${`${item.id} ${item.version}`.padEnd(width)}  `
  switch (item.status) {
    case "installed":
      return `${head}installed (themes: ${item.themes!.join(", ") || "none"})`
    case "updated":
      return `${head}updated from ${item.previous} (themes: ${item.themes!.join(", ") || "none"})`
    case "current":
      return `${head}up to date`
    case "incompatible":
      return `${head}skipped: ${item.reason}`
    case "failed":
      return `${head}not installed: ${item.reason}`
  }
}

export function formatPackSyncReport(report: PackSyncReport): string {
  if (!report.license) return `No license configured, so there are no packs to sync. Set one with \`${SET_HINT}\`.`
  if (report.packs.length === 0) return `The pack catalog at ${report.server} lists no packs.`
  const width = Math.max(...report.packs.map((p) => `${p.id} ${p.version}`.length))
  return [`Packs from ${report.server}:`, ...report.packs.map((p) => formatItem(p, width))].join("\n")
}

/**
 * `pptwise packs sync [--json]`. Without a license this is a one-line
 * note and success, since the skill runs it unconditionally. A catalog
 * that cannot be read is an error. A pack that fails is reported beside
 * the others and fails the command.
 */
export async function runPacksSync(opts: PackSyncOptions & { json?: boolean } = {}): Promise<{ output: string; failed: boolean }> {
  const report = await syncPacks(opts)
  if (opts.json) return { output: JSON.stringify(report, null, 2), failed: !report.ok }
  if (report.error !== undefined) throw new PptwiseError(`packs sync failed: ${report.error}`)
  return { output: formatPackSyncReport(report), failed: !report.ok }
}

/** `pptwise packs list [--json]` */
export async function runPacksList(opts: { json?: boolean } = {}): Promise<string> {
  const packs = await listInstalledPacks()
  if (opts.json) return JSON.stringify(packs, null, 2)
  if (packs.length === 0) return "No packs installed. With a license configured, run `pptwise packs sync`."
  const width = Math.max(...packs.map((p) => `${p.id} ${p.version}`.length))
  return packs
    .map((p) => {
      const themes = p.themes.length > 0 ? p.themes.map((t) => `    ${t.id}`).join("\n") : "    (no themes)"
      return `${`${p.id} ${p.version}`.padEnd(width)}  ${p.title}\n${themes}`
    })
    .join("\n")
}
