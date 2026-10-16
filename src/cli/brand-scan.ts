/**
 * `pptwise brand scan [dir]`: what a project already says about its brand,
 * found before a deck is planned, so the user is asked about colors, theme,
 * and pictures once, with their own material in front of them.
 *
 * It walks the project folder and reads only what can carry a brand: style
 * sheets, Tailwind and design-token files, web manifests and HTML heads for
 * colors and fonts, image headers for logos and pictures, and the theme part
 * of Office templates. Everything stays on this machine. It never follows a
 * symlink, never enters a hidden folder, dependency folder, build output, or
 * pptwise's own `.pptwise/`, and never opens a file whose name marks it as a
 * secret (`.env`, keys, credentials), even when its extension would qualify.
 *
 * A large repository costs a bounded amount: the walk stops at a fixed
 * number of directory entries and depth, reads a fixed number of text files
 * and only their head, and reads image headers, never whole pictures. A walk
 * cut short says so (`truncated`), with what it did find.
 */
import { open, readdir, readFile, stat } from "node:fs/promises"
import { basename, dirname, extname, join, relative, resolve, sep } from "node:path"
import { PptwiseError } from "../errors"
import { dataUriDimensions } from "../lib/image-size"
import { readTemplateBrand } from "../themes/extract/brand-extract"
import { hexToOklch, hueDistance, oklabDistance, oklchChroma, oklchToHex } from "../themes/palette-rebase"
import { findConfig } from "./config"

export interface BrandScanLimits {
  /** Directory entries looked at, files and folders alike. */
  maxEntries: number
  /** Folder depth below the root. */
  maxDepth: number
  /** Style, token, manifest and HTML files read. */
  maxTextFiles: number
  /** Bytes read from the head of each of them. */
  maxTextBytes: number
  /** Image headers read for their size. */
  maxImageHeaders: number
  /** Office files opened for their theme part. */
  maxOfficeFiles: number
  /** Office files larger than this are listed but not opened. */
  maxOfficeBytes: number
}

export const DEFAULT_BRAND_SCAN_LIMITS: BrandScanLimits = {
  maxEntries: 20000,
  maxDepth: 10,
  maxTextFiles: 400,
  maxTextBytes: 256 * 1024,
  maxImageHeaders: 600,
  maxOfficeFiles: 6,
  maxOfficeBytes: 64 * 1024 * 1024,
}

/** Folders no brand lives in: dependencies, build output, caches, tests. */
const SKIPPED_DIRS = new Set([
  "node_modules",
  "bower_components",
  "jspm_packages",
  "vendor",
  "dist",
  "build",
  "out",
  "target",
  "coverage",
  "storybook-static",
  "playwright-report",
  "test-results",
  "__pycache__",
  "venv",
  "env",
  "site-packages",
  "Pods",
  "DerivedData",
  "fixtures",
  "__fixtures__",
  "__snapshots__",
  "__tests__",
  "test",
  "tests",
])

/** A name that marks a secret. Such a file is never opened. */
const SECRET_NAME =
  /^\.env|\.env$|\.(pem|key|p12|pfx|keystore|jks|asc|gpg)$|^id_(rsa|dsa|ecdsa|ed25519)|^\.?(npmrc|netrc|pgpass)$|secret|credential|password|passwd|token\.json$/i

const STYLE_EXT = new Set([".css", ".scss", ".sass", ".less", ".styl", ".pcss"])
const HTML_EXT = new Set([".html", ".htm"])
const RASTER_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"])
const OFFICE_EXT = new Set([".potx", ".thmx", ".pptx"])
/** Tailwind and design-token source files read for colors and fonts. */
const TOKEN_SCRIPT = /^(tailwind\.config|theme|tokens?|design-tokens|colou?rs?|brand|palette)(\.[\w-]+)*\.(c|m)?[jt]s$/i
const TOKEN_JSON = /(tokens?|theme|colou?rs?|brand|palette)[^/]*\.json$/i
const LOGO_NAME = /logo|wordmark|logotype|emblem|brand|favicon|apple-touch-icon|icon-(192|512)/i

/** The formats a deck takes as a picture as it is. */
const DECK_READY = new Set(["png", "jpeg", "gif", "webp"])

export interface BrandScanLogo {
  path: string
  format: string
  width?: number
  height?: number
  bytes: number
  /** Whether a deck takes this file as it is. An SVG is pinned through `images add`, which turns it into a PNG. */
  deckReady: boolean
}

export interface BrandScanImage {
  path: string
  format: string
  width: number
  height: number
  orientation: "landscape" | "portrait" | "square"
  bytes: number
}

export interface BrandScanColor {
  hex: string
  /** The names the project gives it (`--brand-primary`, `colors.accent`, `theme_color`). */
  names: string[]
  /** Where it was found, relative to the root. */
  files: string[]
  count: number
  score: number
  /** A grey, black or white (OKLCH chroma under 0.04): never a brand color. */
  neutral: boolean
}

export interface BrandScanFont {
  family: string
  count: number
  files: string[]
}

export interface BrandScanOffice {
  path: string
  kind: "potx" | "thmx" | "pptx"
  bytes: number
  /** The color scheme's name. `Office` is the stock theme, which says nothing about the brand. */
  scheme?: string
  brand?: string
  second?: string
  fonts?: { heading?: string; body?: string }
  /** Why the theme part could not be read, when it could not. */
  error?: string
}

export interface BrandScanReport {
  root: string
  scanned: { entries: number; textFiles: number; imageHeaders: number; truncated: boolean }
  logos: BrandScanLogo[]
  images: BrandScanImage[]
  colors: BrandScanColor[]
  fonts: BrandScanFont[]
  office: BrandScanOffice[]
  /** The brand color and the second color the evidence points to, if any. */
  brand: { color?: string; second?: string; from?: string }
  /** Ready-to-run arguments for the next step, with placeholders in angle brackets. */
  next: { brandFlag?: string; themeTry?: string; themeFork?: string; brandExtract?: string }
  summary: string
}

export interface BrandScanOptions {
  cwd?: string
  json?: boolean
  limits?: Partial<BrandScanLimits>
}

interface ColorHit {
  hex: string
  name: string
  file: string
  weight: number
}

interface FileEntry {
  abs: string
  rel: string
  name: string
  ext: string
  size: number
}

function posix(path: string): string {
  return path.split(sep).join("/")
}

/** Walk the tree breadth first, names sorted, so the same tree gives the same answer. */
async function walk(root: string, limits: BrandScanLimits): Promise<{ files: FileEntry[]; entries: number; truncated: boolean }> {
  const files: FileEntry[] = []
  let entries = 0
  let truncated = false
  let level: string[] = [root]
  for (let depth = 0; level.length > 0; depth++) {
    const next: string[] = []
    for (const dir of level) {
      let dirents
      try {
        dirents = await readdir(dir, { withFileTypes: true })
      } catch {
        continue
      }
      dirents.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
      for (const dirent of dirents) {
        if (entries >= limits.maxEntries) return { files, entries, truncated: true }
        entries++
        const name = dirent.name
        if (name.startsWith(".")) continue
        const abs = join(dir, name)
        if (dirent.isDirectory()) {
          if (SKIPPED_DIRS.has(name)) continue
          if (depth + 1 > limits.maxDepth) {
            truncated = true
            continue
          }
          next.push(abs)
        } else if (dirent.isFile()) {
          if (SECRET_NAME.test(name) || name.startsWith("~$")) continue
          const ext = extname(name).toLowerCase()
          if (!wanted(name, ext)) continue
          let size = 0
          try {
            size = (await stat(abs)).size
          } catch {
            continue
          }
          files.push({ abs, rel: posix(relative(root, abs)), name, ext, size })
        }
      }
    }
    level = next
  }
  return { files, entries, truncated }
}

function wanted(name: string, ext: string): boolean {
  if (/\.min\.(css|js)$/i.test(name)) return false
  return (
    STYLE_EXT.has(ext) ||
    HTML_EXT.has(ext) ||
    RASTER_EXT.has(ext) ||
    ext === ".svg" ||
    OFFICE_EXT.has(ext) ||
    TOKEN_SCRIPT.test(name) ||
    (ext === ".json" && !name.endsWith(".theme.json") && TOKEN_JSON.test(name)) ||
    name === "manifest.json" ||
    ext === ".webmanifest"
  )
}

async function readHead(path: string, bytes: number): Promise<Buffer> {
  const handle = await open(path, "r")
  try {
    const buffer = Buffer.alloc(bytes)
    const { bytesRead } = await handle.read(buffer, 0, bytes, 0)
    return buffer.subarray(0, bytesRead)
  } finally {
    await handle.close()
  }
}

// ── colors ──────────────────────────────────────────────────────────────

function hex2(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0")
}

function rgbHex(r: number, g: number, b: number): string {
  return `#${hex2(r)}${hex2(g)}${hex2(b)}`.toUpperCase()
}

function hslHex(h: number, s: number, l: number): string {
  const sat = s / 100
  const light = l / 100
  const k = (n: number) => (n + h / 30) % 12
  const a = sat * Math.min(light, 1 - light)
  const f = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return rgbHex(f(0) * 255, f(8) * 255, f(4) * 255)
}

function channel(raw: string): number {
  return raw.endsWith("%") ? (Number(raw.slice(0, -1)) / 100) * 255 : Number(raw)
}

function numbers(body: string): string[] {
  return body.replace(/\/.*$/, "").split(/[\s,]+/).filter((part) => part !== "")
}

/**
 * One color value as hex, or null. Takes `#rgb`, `#rrggbb` (an alpha byte
 * is dropped), `rgb()`, `hsl()`, `oklch()`, and, where `bareHsl` allows,
 * the bare `222 47% 11%` triple shadcn-style variables hold.
 */
export function parseColorValue(value: string, bareHsl = false): string | null {
  const v = value.trim().replace(/\s*!important$/, "")
  let m = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(v)
  if (m) {
    const h = m[1]!
    const full = h.length <= 4 ? h.slice(0, 3).split("").map((c) => c + c).join("") : h.slice(0, 6)
    return `#${full}`.toUpperCase()
  }
  m = /^rgba?\(([^)]*)\)$/i.exec(v)
  if (m) {
    const parts = numbers(m[1]!)
    if (parts.length < 3) return null
    const [r, g, b] = parts.map(channel)
    return [r, g, b].every((n) => Number.isFinite(n)) ? rgbHex(r!, g!, b!) : null
  }
  m = /^hsla?\(([^)]*)\)$/i.exec(v)
  const hsl = m ? numbers(m[1]!) : bareHsl ? (/^-?[\d.]+(deg)?\s+[\d.]+%\s+[\d.]+%$/.test(v) ? v.split(/\s+/) : null) : null
  if (hsl) {
    if (hsl.length < 3) return null
    const [h, s, l] = [parseFloat(hsl[0]!), parseFloat(hsl[1]!), parseFloat(hsl[2]!)]
    return [h, s, l].every((n) => Number.isFinite(n)) ? hslHex(((h % 360) + 360) % 360, s, l) : null
  }
  m = /^oklch\(([^)]*)\)$/i.exec(v)
  if (m) {
    const parts = numbers(m[1]!)
    if (parts.length < 3) return null
    const L = parts[0]!.endsWith("%") ? parseFloat(parts[0]!) / 100 : parseFloat(parts[0]!)
    const C = parts[1]!.endsWith("%") ? (parseFloat(parts[1]!) / 100) * 0.4 : parseFloat(parts[1]!)
    const h = parseFloat(parts[2]!)
    if (![L, C, h].every((n) => Number.isFinite(n))) return null
    return oklchToHex({ L, C, h })
  }
  return null
}

/** Names that say a value is not the brand: states, inks, grounds, greys, chart series. */
const NOT_BRAND = /error|danger|warn|success|info|destructive|muted|border|ring|shadow|gr[ae]y|neutral|slate|zinc|stone|black|white|foreground|background|^bg|-bg|text|input|card|popover|chart|sidebar|overlay|disabled|placeholder|link|focus|hover/i

/** How strongly a name says "this is the brand". */
export function colorNameWeight(name: string): number {
  const n = name.toLowerCase()
  if (NOT_BRAND.test(n)) return 0.25
  if (/brand/.test(n)) return 6
  if (/primary/.test(n)) return 5
  if (/theme[-_]?colou?r/.test(n)) return 4
  if (/accent|secondary/.test(n)) return 3
  return 1
}

/** Plain style properties: a color used, not named. */
const COLOR_PROPERTIES = new Set(["color", "background", "background-color", "fill", "stroke", "border-color", "outline-color"])

function cssColors(text: string, file: string, hits: ColorHit[]): void {
  for (const m of text.matchAll(/(?:^|[;{\s])(--[\w-]+|\$[\w-]+|@[\w-]+)\s*:\s*([^;{}\n]+)/g)) {
    const name = m[1]!
    const hex = parseColorValue(m[2]!, name.startsWith("--"))
    if (hex) hits.push({ hex, name, file, weight: colorNameWeight(name.replace(/^(--|\$|@)/, "")) })
  }
  for (const m of text.matchAll(/(?:^|[;{\s])([a-z-]+)\s*:\s*(#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|oklch\([^)]*\))/g)) {
    if (!COLOR_PROPERTIES.has(m[1]!)) continue
    const hex = parseColorValue(m[2]!)
    if (hex) hits.push({ hex, name: m[1]!, file, weight: 0.5 })
  }
}

/**
 * Colors in a JavaScript, TypeScript or JSON object literal (a Tailwind
 * config, a token file, a web manifest), each named by its key path:
 * `colors.brand.DEFAULT` reads as `colors-brand-DEFAULT`.
 */
function objectColors(text: string, file: string, hits: ColorHit[]): void {
  const stack: string[] = []
  let pendingKey: string | undefined
  const token = /(["'`])((?:\\.|(?!\1)[^\\\n])*)\1|([A-Za-z_$][\w$-]*)|(\{)|(\})|(:)|(,)|(\[)|(\])/g
  let lastKey: string | undefined
  let afterColon = false
  for (const m of text.matchAll(token)) {
    if (m[4]) {
      stack.push(afterColon && lastKey !== undefined ? lastKey : "")
      afterColon = false
      lastKey = undefined
      continue
    }
    if (m[5]) {
      stack.pop()
      afterColon = false
      continue
    }
    if (m[6]) {
      afterColon = true
      lastKey = pendingKey
      continue
    }
    if (m[7] || m[8] || m[9]) {
      if (m[7]) afterColon = false
      continue
    }
    const word = m[2] ?? m[3]!
    if (afterColon) {
      const hex = m[2] !== undefined ? parseColorValue(word) : null
      if (hex && lastKey !== undefined) {
        const name = [...stack.filter((part) => part !== ""), lastKey].join("-")
        hits.push({ hex, name, file, weight: colorNameWeight(name) })
      }
      afterColon = false
      continue
    }
    pendingKey = word
  }
}

function htmlColors(text: string, file: string, hits: ColorHit[]): void {
  for (const m of text.matchAll(/<meta\s+[^>]*name=["']theme-color["'][^>]*>/gi)) {
    const content = /content=["']([^"']+)["']/i.exec(m[0])
    const hex = content ? parseColorValue(content[1]!) : null
    if (hex) hits.push({ hex, name: "theme-color", file, weight: colorNameWeight("theme-color") })
  }
  for (const m of text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) cssColors(m[1]!, file, hits)
}

// ── fonts ───────────────────────────────────────────────────────────────

const GENERIC_FAMILIES = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-sans-serif",
  "ui-serif",
  "ui-monospace",
  "ui-rounded",
  "-apple-system",
  "blinkmacsystemfont",
  "inherit",
  "initial",
  "unset",
  "revert",
  "emoji",
  "math",
  "fangsong",
])

/** The first real family in a font stack, or null. */
export function leadFamily(stack: string): string | null {
  for (const raw of stack.split(",")) {
    const family = raw.trim().replace(/^["']|["']$/g, "").trim()
    if (family === "" || family.startsWith("var(") || /[{}();]/.test(family)) continue
    if (GENERIC_FAMILIES.has(family.toLowerCase())) continue
    return family
  }
  return null
}

function fontsIn(text: string, file: string, out: Map<string, BrandScanFont>): void {
  const add = (family: string | null) => {
    if (!family) return
    const entry = out.get(family) ?? { family, count: 0, files: [] }
    entry.count++
    if (!entry.files.includes(file)) entry.files.push(file)
    out.set(family, entry)
  }
  for (const m of text.matchAll(/font-family\s*:\s*([^;}\n]+)/gi)) add(leadFamily(m[1]!))
  for (const m of text.matchAll(/--font[\w-]*\s*:\s*([^;}\n]+)/gi)) add(leadFamily(m[1]!))
  for (const m of text.matchAll(/fontFamily\s*:\s*\{([^}]*)\}/g)) {
    for (const list of m[1]!.matchAll(/:\s*\[([^\]]*)\]/g)) add(leadFamily(list[1]!))
  }
  for (const m of text.matchAll(/fonts\.googleapis\.com\/css2?\?([^"'\s)>]+)/g)) {
    for (const family of m[1]!.matchAll(/family=([^&:;]+)/g)) {
      add(decodeURIComponent(family[1]!.replace(/\+/g, " ")).trim())
    }
  }
}

// ── images ──────────────────────────────────────────────────────────────

function sniffFormat(head: Buffer): string | null {
  if (head.length > 8 && head[0] === 0x89 && head[1] === 0x50) return "png"
  if (head.length > 3 && head[0] === 0xff && head[1] === 0xd8) return "jpeg"
  if (head.length > 3 && head[0] === 0x47 && head[1] === 0x49 && head[2] === 0x46) return "gif"
  if (head.length > 12 && head.toString("latin1", 0, 4) === "RIFF" && head.toString("latin1", 8, 12) === "WEBP") return "webp"
  return null
}

function headDimensions(head: Buffer, format: string): { width: number; height: number } | null {
  const mime = format === "jpeg" ? "jpeg" : format
  const dims = dataUriDimensions(`data:image/${mime};base64,${head.toString("base64")}`)
  return dims && dims.w > 0 && dims.h > 0 ? { width: dims.w, height: dims.h } : null
}

function svgDimensions(text: string): { width: number; height: number } | null {
  const tag = /<svg\b[^>]*>/i.exec(text)?.[0]
  if (!tag) return null
  const num = (name: string) => {
    const m = new RegExp(`\\b${name}=["']([\\d.]+)(px)?["']`).exec(tag)
    return m ? Number(m[1]) : undefined
  }
  const w = num("width")
  const h = num("height")
  if (w && h) return { width: Math.round(w), height: Math.round(h) }
  const box = /viewBox=["'][-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)["']/.exec(tag)
  return box ? { width: Math.round(Number(box[1])), height: Math.round(Number(box[2])) } : null
}

function logoScore(name: string): number {
  const n = name.toLowerCase()
  if (/logo|wordmark|logotype/.test(n)) return 3
  if (/brand|emblem/.test(n)) return 2
  if (/apple-touch-icon|icon-(192|512)/.test(n)) return 1
  return 0.5
}

function orientation(width: number, height: number): BrandScanImage["orientation"] {
  const ratio = width / height
  if (ratio > 1.1) return "landscape"
  if (ratio < 0.9) return "portrait"
  return "square"
}

// ── the scan ────────────────────────────────────────────────────────────

/** The folder a scan covers by default: the project folder, else the working directory. */
async function defaultRoot(cwd: string): Promise<string> {
  const hit = await findConfig(cwd)
  return hit ? dirname(hit.path) : cwd
}

function rankColors(hits: ColorHit[]): BrandScanColor[] {
  const byHex = new Map<string, BrandScanColor>()
  for (const hit of hits) {
    const entry = byHex.get(hit.hex) ?? { hex: hit.hex, names: [], files: [], count: 0, score: 0, neutral: oklchChroma(hit.hex) < 0.04 }
    entry.count++
    entry.score += hit.weight
    if (hit.weight >= 1 && !entry.names.includes(hit.name) && entry.names.length < 6) entry.names.push(hit.name)
    if (!entry.files.includes(hit.file) && entry.files.length < 6) entry.files.push(hit.file)
    byHex.set(hit.hex, entry)
  }
  return [...byHex.values()]
    .map((entry) => ({ ...entry, score: Math.round(entry.score * 100) / 100 }))
    .sort((a, b) => b.score - a.score || b.count - a.count || (a.hex < b.hex ? -1 : 1))
}

/**
 * The brand color and its second color: the strongest named colored value,
 * and the next one that reads as a color of its own (not a shade of the
 * first). A color seen only in plain `color:` declarations is not enough.
 */
function pickBrand(colors: BrandScanColor[], office: BrandScanOffice[]): BrandScanReport["brand"] {
  const template = office.find((file) => file.brand !== undefined && file.scheme !== "Office" && file.kind !== "pptx") ??
    office.find((file) => file.brand !== undefined && file.scheme !== "Office")
  if (template?.brand) {
    return { color: template.brand, ...(template.second ? { second: template.second } : {}), from: template.path }
  }
  const chromatic = colors.filter((color) => !color.neutral && color.score >= 1 && color.names.length > 0)
  const first = chromatic[0]
  if (!first) return {}
  const firstHue = hexToOklch(first.hex).h
  const second = chromatic.find(
    (color) => color !== first && oklabDistance(color.hex, first.hex) >= 0.1 && hueDistance(hexToOklch(color.hex).h, firstHue) >= 30,
  )
  return { color: first.hex, ...(second ? { second: second.hex } : {}), from: first.files[0] }
}

function shellQuote(path: string): string {
  return /^[\w./-]+$/.test(path) ? path : `'${path.replace(/'/g, "'\\''")}'`
}

function nextSteps(brand: BrandScanReport["brand"], office: BrandScanOffice[]): BrandScanReport["next"] {
  const next: BrandScanReport["next"] = {}
  if (brand.color) {
    const flag = brand.second ? `${brand.color},${brand.second}` : brand.color
    next.brandFlag = flag
    next.themeTry = `pptwise theme try --title "<cover title>" --occasion <words> --brand '${flag}' --json`
    next.themeFork = `pptwise theme fork <theme> --brand '${flag}' -o <deck-dir>/theme.json --id <id>`
  }
  const template = office.find((file) => file.brand !== undefined && file.scheme !== "Office" && file.kind !== "pptx") ??
    office.find((file) => file.brand !== undefined && file.scheme !== "Office")
  if (template) next.brandExtract = `pptwise brand extract ${shellQuote(template.path)} -o <deck-dir>/theme.json --id <id> --from <theme>`
  return next
}

function summaryLine(report: Omit<BrandScanReport, "summary">): string {
  const parts: string[] = []
  if (report.brand.color) {
    parts.push(`brand color ${report.brand.color}${report.brand.second ? ` with ${report.brand.second}` : ""} (from ${report.brand.from})`)
  } else {
    parts.push("no brand color")
  }
  parts.push(report.logos.length > 0 ? `${report.logos.length} logo candidate${report.logos.length === 1 ? "" : "s"} (${report.logos[0]!.path})` : "no logo")
  parts.push(`${report.images.length} picture${report.images.length === 1 ? "" : "s"} large enough for a slide`)
  if (report.fonts.length > 0) parts.push(`fonts ${report.fonts.slice(0, 2).map((font) => font.family).join(", ")}`)
  if (report.office.length > 0) parts.push(`${report.office.length} Office file${report.office.length === 1 ? "" : "s"}`)
  return `${parts.join(", ")}${report.scanned.truncated ? ". The scan stopped at its limit, so a part of the folder was not read" : ""}.`
}

export async function scanBrand(dirArg: string | undefined, opts: BrandScanOptions = {}): Promise<BrandScanReport> {
  const cwd = opts.cwd ?? process.cwd()
  const root = dirArg !== undefined ? resolve(cwd, dirArg) : await defaultRoot(cwd)
  try {
    if (!(await stat(root)).isDirectory()) throw new PptwiseError(`brand scan takes a folder: ${root} is a file`)
  } catch (e) {
    if (e instanceof PptwiseError) throw e
    throw new PptwiseError(`cannot read folder ${root}`)
  }
  const limits = { ...DEFAULT_BRAND_SCAN_LIMITS, ...opts.limits }
  const { files, entries, truncated: walkTruncated } = await walk(root, limits)
  let truncated = walkTruncated

  const hits: ColorHit[] = []
  const fonts = new Map<string, BrandScanFont>()
  let textFiles = 0
  const textual = files.filter(
    (file) => STYLE_EXT.has(file.ext) || HTML_EXT.has(file.ext) || TOKEN_SCRIPT.test(file.name) || file.ext === ".json" || file.ext === ".webmanifest",
  )
  for (const file of textual) {
    if (textFiles >= limits.maxTextFiles) {
      truncated = true
      break
    }
    textFiles++
    let text: string
    try {
      text = (await readHead(file.abs, limits.maxTextBytes)).toString("utf8")
    } catch {
      continue
    }
    if (STYLE_EXT.has(file.ext)) cssColors(text, file.rel, hits)
    else if (HTML_EXT.has(file.ext)) htmlColors(text, file.rel, hits)
    else objectColors(text, file.rel, hits)
    fontsIn(text, file.rel, fonts)
  }

  const logos: BrandScanLogo[] = []
  const images: BrandScanImage[] = []
  let imageHeaders = 0
  for (const file of files.filter((candidate) => RASTER_EXT.has(candidate.ext) || candidate.ext === ".svg")) {
    const isLogo = LOGO_NAME.test(file.name)
    if (file.ext === ".svg") {
      if (!isLogo) continue
      let dims: { width: number; height: number } | null = null
      try {
        dims = svgDimensions((await readHead(file.abs, 16 * 1024)).toString("utf8"))
      } catch {
        continue
      }
      logos.push({ path: file.rel, format: "svg", ...(dims ?? {}), bytes: file.size, deckReady: false })
      continue
    }
    if (imageHeaders >= limits.maxImageHeaders) {
      truncated = true
      continue
    }
    imageHeaders++
    let head: Buffer
    try {
      head = await readHead(file.abs, 192 * 1024)
    } catch {
      continue
    }
    const format = sniffFormat(head)
    if (!format) continue
    const dims = headDimensions(head, format)
    if (isLogo) {
      logos.push({ path: file.rel, format, ...(dims ?? {}), bytes: file.size, deckReady: DECK_READY.has(format) })
      continue
    }
    if (!dims) continue
    const long = Math.max(dims.width, dims.height)
    const short = Math.min(dims.width, dims.height)
    if (long < 1000 || short < 500) continue
    images.push({ path: file.rel, format, width: dims.width, height: dims.height, orientation: orientation(dims.width, dims.height), bytes: file.size })
  }
  logos.sort(
    (a, b) =>
      logoScore(basename(b.path)) - logoScore(basename(a.path)) ||
      Number(b.format === "svg" || b.format === "png") - Number(a.format === "svg" || a.format === "png") ||
      (b.width ?? 0) * (b.height ?? 0) - (a.width ?? 0) * (a.height ?? 0) ||
      (a.path < b.path ? -1 : 1),
  )
  images.sort((a, b) => b.width * b.height - a.width * a.height || (a.path < b.path ? -1 : 1))

  const office: BrandScanOffice[] = []
  const officeFiles = files
    .filter((file) => OFFICE_EXT.has(file.ext))
    .sort((a, b) => Number(a.ext === ".pptx") - Number(b.ext === ".pptx") || (a.rel < b.rel ? -1 : 1))
  for (const [index, file] of officeFiles.entries()) {
    const kind = file.ext.slice(1) as BrandScanOffice["kind"]
    const entry: BrandScanOffice = { path: file.rel, kind, bytes: file.size }
    if (index >= limits.maxOfficeFiles || file.size > limits.maxOfficeBytes) {
      office.push(entry)
      continue
    }
    try {
      const read = await readTemplateBrand(await readFile(file.abs))
      if (read.schemeName !== undefined) entry.scheme = read.schemeName
      entry.brand = read.brand
      if (read.second !== undefined) entry.second = read.second
      if (read.fonts.heading !== undefined || read.fonts.body !== undefined) entry.fonts = read.fonts
      for (const family of [read.fonts.heading, read.fonts.body]) {
        if (!family || read.schemeName === "Office") continue
        const font = fonts.get(family) ?? { family, count: 0, files: [] }
        font.count++
        if (!font.files.includes(file.rel)) font.files.push(file.rel)
        fonts.set(family, font)
      }
    } catch (e) {
      entry.error = e instanceof Error ? e.message : String(e)
    }
    office.push(entry)
  }

  const colors = rankColors(hits)
  const brand = pickBrand(colors, office)
  const base: Omit<BrandScanReport, "summary"> = {
    root,
    scanned: { entries, textFiles, imageHeaders, truncated },
    logos: logos.slice(0, 8),
    images: images.slice(0, 24),
    colors: colors.slice(0, 12),
    fonts: [...fonts.values()].sort((a, b) => b.count - a.count || (a.family < b.family ? -1 : 1)).slice(0, 6),
    office,
    brand,
    next: nextSteps(brand, office),
  }
  return { ...base, summary: summaryLine(base) }
}

function formatReport(report: BrandScanReport): string {
  const lines = [`brand scan of ${report.root}`, `  ${report.summary}`]
  if (report.brand.color) {
    lines.push(`  brand color: ${report.brand.color}${report.brand.second ? `, second color ${report.brand.second}` : ""} (from ${report.brand.from})`)
  }
  const named = report.colors.filter((color) => !color.neutral && color.names.length > 0).slice(0, 5)
  if (named.length > 0) lines.push(`  colors: ${named.map((color) => `${color.hex} ${color.names[0]} (${color.files[0]})`).join(", ")}`)
  if (report.fonts.length > 0) lines.push(`  fonts: ${report.fonts.map((font) => font.family).join(", ")}`)
  for (const logo of report.logos.slice(0, 4)) {
    const size = logo.width && logo.height ? ` ${logo.width}x${logo.height}` : ""
    lines.push(`  logo: ${logo.path} (${logo.format}${size})`)
  }
  for (const image of report.images.slice(0, 8)) {
    lines.push(`  picture: ${image.path} ${image.width}x${image.height} ${image.orientation}`)
  }
  if (report.images.length > 8) lines.push(`  and ${report.images.length - 8} more pictures (--json lists them)`)
  for (const file of report.office) {
    const read = file.error
      ? `, unreadable: ${file.error}`
      : file.brand
        ? `, scheme "${file.scheme ?? "unnamed"}"${file.scheme === "Office" ? " (the stock Office theme)" : ""}, accent1 ${file.brand}${file.second ? `, accent2 ${file.second}` : ""}`
        : ""
    lines.push(`  Office: ${file.path} (${file.kind}${read})`)
  }
  const next = [report.next.themeTry, report.next.themeFork, report.next.brandExtract].filter((line): line is string => line !== undefined)
  if (next.length > 0) lines.push("next:", ...next.map((line) => `  ${line}`))
  return lines.join("\n")
}

export async function runBrandScan(dirArg: string | undefined, opts: BrandScanOptions = {}): Promise<string> {
  const report = await scanBrand(dirArg, opts)
  return opts.json ? JSON.stringify(report, null, 2) : formatReport(report)
}
