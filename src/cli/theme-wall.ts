/**
 * `pptwise theme try --title`: the caller's own cover, and one content page,
 * drawn in every named theme.
 *
 * The fixed fitting-room sample (`./fixtures/theme-try-sample.ts`) answers
 * "what does each theme do with ten kinds of page", in English, for a deck
 * called Northstar Review. Someone choosing a theme for their own deck asks a
 * smaller question: what does my title look like in it. That is this module.
 * It draws two pages per theme, writes each as its own SVG next to a manifest
 * that names them, and leaves the contact sheet beside them for a reader with
 * only a browser. A host with its own UI reads the manifest and shows the
 * SVGs however it likes, so nothing outside this module draws a theme.
 *
 * Each page is validated on its own against each theme, the way a deck page
 * would be. A page a theme refuses is left out of that theme's row and the
 * manifest says why, in validate's own words: a title too long for one
 * cover is a fact about that theme, not a reason to fail the whole wall.
 */
import { formatIssues, renderSlideSvg, validateIr, type ValidationIssue } from "../api"
import { CANVAS_H_PX, CANVAS_W_PX } from "../constants"
import { PptwiseError } from "../errors"
import type { ThemeDefinition } from "../themes/definitions"
import { VERSION } from "../version"
import type { ThemeWallSheetRow } from "./preview-html"

/** The languages the default content page is written in. */
export const THEME_WALL_LANGS = ["zh", "en"] as const
export type ThemeWallLang = (typeof THEME_WALL_LANGS)[number]

/** Bumped when a consumer of the manifest would need to change. */
export const THEME_WALL_MANIFEST_VERSION = 1 as const

export const THEME_WALL_MANIFEST_FILE = "manifest.json"
export const THEME_WALL_SHEET_FILE = "contact-sheet.html"

/**
 * The content page drawn when the caller brings none: three short points,
 * the kind every built-in theme offers. The English text is the fitting-room
 * sample's own `points` page, and the Chinese text says the same thing.
 */
const DEFAULT_CONTENT_PAGE: Record<ThemeWallLang, Record<string, unknown>> = {
  zh: {
    type: "content",
    kind: "points",
    heading: "这一季我们定下的三件事",
    components: [{ type: "bullets", items: ["招聘名额冻结在 42 人", "暂停分析平台重建", "客服轮值由各组分担"] }],
  },
  en: {
    type: "content",
    kind: "points",
    heading: "What we decided",
    components: [{ type: "bullets", items: ["Hold hiring at 42", "Cut the analytics rebuild", "Share the support rotation"] }],
  },
}

const CJK = /[぀-ヿ㐀-鿿豈-﫿가-힯]/

/**
 * The language of the default content page: the one asked for, or Chinese
 * when the title carries Chinese, Japanese or Korean characters and English
 * otherwise. `zh-CN` and `en-US` read as `zh` and `en`.
 */
export function themeWallLang(title: string, lang?: string): ThemeWallLang {
  if (lang === undefined) return CJK.test(title) ? "zh" : "en"
  const base = lang.trim().toLowerCase().split(/[-_]/)[0]
  const found = THEME_WALL_LANGS.find((candidate) => candidate === base)
  if (found === undefined) {
    throw new PptwiseError(`unknown --lang "${lang}". Use one of: ${THEME_WALL_LANGS.join(", ")}`)
  }
  return found
}

/**
 * The caller's content page, checked for the one thing every theme needs from
 * it: that it is one content page. `type` may be left out. Everything else is
 * IR as a deck page carries it, and validate judges it per theme.
 */
export function themeWallContentPage(raw: unknown, source: string): Record<string, unknown> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new PptwiseError(`${source} must hold one content page as a JSON object`)
  }
  const page = { ...(raw as Record<string, unknown>) }
  if (page.type === undefined) page.type = "content"
  if (page.type !== "content") {
    throw new PptwiseError(`${source} holds a ${String(page.type)} page. --page takes one content page, with its kind`)
  }
  return page
}

export interface ThemeWallInput {
  title: string
  subtitle?: string
  lang: ThemeWallLang
  /** The caller's content page, or the default one in `lang` when absent. */
  contentPage?: Record<string, unknown>
  themes: readonly { id: string; label: string; source: string; definition: ThemeDefinition }[]
}

export interface ThemeWallPage {
  type: "cover" | "content"
  /** The content page's kind. */
  kind?: string
  /** The page's SVG, relative to the manifest. */
  file: string
}

export interface ThemeWallSkip {
  type: "cover" | "content"
  kind?: string
  /** validate's own findings on the page, one line each. */
  reason: string
}

export interface ThemeWallTheme {
  id: string
  label: string
  /** `builtin`, `pack`, or `file` for a deck or workspace theme file. */
  source: string
  pages: ThemeWallPage[]
  skipped?: ThemeWallSkip[]
}

export interface ThemeWallManifest {
  manifestVersion: typeof THEME_WALL_MANIFEST_VERSION
  generator: "pptwise theme try"
  pptwiseVersion: string
  title: string
  subtitle?: string
  lang: ThemeWallLang
  /** Every page's canvas, in px. */
  slide: { width: number; height: number }
  /** The same pages for a browser, relative to the manifest. */
  contactSheet: string
  themes: ThemeWallTheme[]
}

export interface ThemeWallFile {
  /** Relative to the output directory. */
  name: string
  svg: string
}

export interface ThemeWall {
  manifest: ThemeWallManifest
  files: ThemeWallFile[]
  /** Contact-sheet rows, one per theme, in manifest order. */
  rows: ThemeWallSheetRow[]
}

/** The slide's own findings, with the `slides.0.` prefix every one of them carries taken off. */
function pageReason(errors: ValidationIssue[]): string {
  return formatIssues(errors.map((issue) => ({ path: issue.path.replace(/^slides\.0\.?/, "") || "page", message: issue.message })))
}

/** One page drawn alone in one theme, or validate's reason it cannot be. */
function drawPage(
  slide: Record<string, unknown>,
  theme: ThemeWallInput["themes"][number],
): { svg: string } | { reason: string } {
  const raw = { version: "5", filename: "theme-try", theme: { id: theme.id }, slides: [slide] }
  const v = validateIr(raw, { theme: theme.definition })
  if (!v.ok) return { reason: pageReason(v.errors) }
  return { svg: renderSlideSvg(v.ir!, 0, { theme: theme.definition }) }
}

/**
 * Draw the wall. Pure apart from rendering: the caller writes `files`, the
 * manifest, and the contact sheet built from `sheet`.
 */
export function buildThemeWall(input: ThemeWallInput): ThemeWall {
  const cover: Record<string, unknown> = {
    type: "cover",
    heading: input.title,
    ...(input.subtitle !== undefined ? { subheading: input.subtitle } : {}),
  }
  const content = input.contentPage ?? DEFAULT_CONTENT_PAGE[input.lang]
  const kind = typeof content.kind === "string" ? content.kind : undefined
  const files: ThemeWallFile[] = []
  const rows: ThemeWallSheetRow[] = []
  const themes: ThemeWallTheme[] = input.themes.map((theme) => {
    const pages: ThemeWallPage[] = []
    const skipped: ThemeWallSkip[] = []
    const row: ThemeWallSheetRow = { id: theme.id, label: theme.label, cells: [] }
    for (const [type, slide] of [["cover", cover], ["content", content]] as const) {
      const drawn = drawPage(slide, theme)
      const pageKind = type === "content" && kind !== undefined ? { kind } : {}
      if ("reason" in drawn) {
        skipped.push({ type, ...pageKind, reason: drawn.reason })
        row.cells.push({ type, reason: drawn.reason })
        continue
      }
      const name = `${theme.id}-${type}.svg`
      files.push({ name, svg: drawn.svg })
      pages.push({ type, ...pageKind, file: name })
      row.cells.push({ type, svg: drawn.svg })
    }
    rows.push(row)
    return {
      id: theme.id,
      label: theme.label,
      source: theme.source,
      pages,
      ...(skipped.length > 0 ? { skipped } : {}),
    }
  })
  return {
    manifest: {
      manifestVersion: THEME_WALL_MANIFEST_VERSION,
      generator: "pptwise theme try",
      pptwiseVersion: VERSION,
      title: input.title,
      ...(input.subtitle !== undefined ? { subtitle: input.subtitle } : {}),
      lang: input.lang,
      slide: { width: CANVAS_W_PX, height: CANVAS_H_PX },
      contactSheet: THEME_WALL_SHEET_FILE,
      themes,
    },
    files,
    rows,
  }
}

/**
 * The pages a wall left out, one line per distinct reason, naming every theme
 * it applies to. A page the caller wrote wrong fails the same way in every
 * theme, and twenty-two copies of one schema error hide the one fact that
 * matters: the page itself needs fixing, or leaving out.
 */
export function themeWallSkipNotes(themes: readonly Pick<ThemeWallTheme, "id" | "skipped">[]): string[] {
  const groups = new Map<string, { what: string; type: string; reason: string; ids: string[] }>()
  for (const theme of themes) {
    for (const skip of theme.skipped ?? []) {
      const what = skip.kind !== undefined ? `${skip.type} (${skip.kind})` : skip.type
      const reason = skip.reason.replace(/\n/g, " ")
      const key = `${what}\u0000${reason}`
      const group = groups.get(key) ?? { what, type: skip.type, reason, ids: [] }
      group.ids.push(theme.id)
      groups.set(key, group)
    }
  }
  return [...groups.values()].map((group) => {
    if (group.ids.length === themes.length && themes.length > 1) {
      const fix = group.type === "content" ? " Fix the page, or leave it out to draw the default sample page" : ""
      return `note: every theme left out its ${group.what} page: ${group.reason}.${fix}`
    }
    return `note: ${group.ids.join(", ")} left out ${group.ids.length === 1 ? "its" : "their"} ${group.what} page: ${group.reason}`
  })
}

/** The human summary `theme try --title` prints without `--json`. */
export function formatThemeWall(manifest: ThemeWallManifest, dir: string): string {
  const lines = [
    `wrote ${manifest.themes.length} theme${manifest.themes.length === 1 ? "" : "s"} (cover and one content page each) to ${dir}`,
    `  themes: ${manifest.themes.map((theme) => theme.id).join(", ")}`,
    `  manifest: ${THEME_WALL_MANIFEST_FILE}`,
    `  contact sheet: ${manifest.contactSheet}`,
    ...themeWallSkipNotes(manifest.themes),
  ]
  return lines.join("\n")
}
