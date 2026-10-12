/**
 * A theme repainted around the brand color of a user's own `.thmx`/`.potx`/
 * `.pptx` template. The template's OOXML theme part gives the brand color
 * (its `accent1`), the second color the company paired with it (`accent2`),
 * and its Latin fonts. A theme, bulletin unless the caller names another,
 * is then repainted around them by the same rules `pptwise theme fork
 * --brand` uses (`../brand/brand-regen.ts`). The template's `dk1`/`lt1`
 * ground and its other accents are left behind: Office templates nearly all
 * carry plain black on white there, which says nothing about the brand and
 * would wipe out the theme's own paper.
 *
 * Everything here runs against zip bytes only (`jszip`, already a
 * browser-safe dependency), so `src/index.ts`'s dependency closure stays
 * free of Node-only deps (`AGENTS.md`'s layout rule). The CLI's `pptwise
 * brand extract` reads the file and resolves a workspace theme by name, then
 * calls {@link extractBrandTheme} like any other caller.
 *
 * Rewritten from `.issues/notes/brand-extraction-probe.py` (the 39/39
 * feasibility reference: every macOS Office `.thmx` extracted cleanly) —
 * read that file for the reference regex shapes, not embedded here as
 * Python. This is a TS reimplementation, not a port with a Python shim.
 */
import JSZip from "jszip"
import { PptwiseError } from "../../errors"
import { hasExactWidthTable } from "../../lib/svg-text-layout"
import { resolveFontFace, SAFE_FONTS } from "../../render/fonts"
import { contrastRatio } from "../../render/ink"
import { mixHex } from "../../components/color-mix"
import { isChromatic } from "../brand/brand-face"
import { regenerateFromBrand, type BrandColors, type BrandPlacement } from "../brand/brand-regen"
import { themeFileFromPreset } from "../presets"
import { ThemeFileSchema, type ThemeFile } from "../schema"

/** The complete v2 theme-file shape {@link extractBrandTheme} writes. */
export type BrandThemeFile = ThemeFile

export interface ExtractBrandThemeOptions {
  /** Theme id — defaults to a slug of {@link ExtractBrandThemeOptions.label},
   *  or (when that's also absent) a slug of the source theme part's own
   *  `<a:clrScheme name="…">`. The CLI (`pptwise brand extract`) always
   *  passes one explicitly (`--id`, or a slug of the `-o` filename — 裁定
   *  4) — this default only ever fires for a bare SDK caller. */
  id?: string
  /** Human-readable label — defaults to the source theme part's own
   *  `<a:clrScheme name="…">`. */
  label?: string
  /** The theme repainted around the brand: a built-in theme id, or a
   *  complete v2 theme file. Default `"bulletin"`, the business theme that
   *  carries a brand color best, as given and on its face. */
  from?: string | ThemeFile
  /** Set the template's Latin fonts ahead of the theme's own. Off by
   *  default: the theme keeps its fonts, and the template's East Asian faces
   *  are never used. */
  brandFonts?: boolean
}

/** What {@link extractBrandTheme} returns. */
export interface BrandThemeResult {
  /** The repainted theme, a complete v2 file under the new id and label. */
  file: BrandThemeFile
  /** Where the brand color and the second color went, and why. */
  placement: BrandPlacement
  /** What became of the template's fonts under `brandFonts`: a role the
   *  template names no font for, or a font the slides cannot set as named.
   *  Empty without `brandFonts`. */
  fontNotes: string[]
}

/** Every OOXML color-scheme slot this parser reads. `hlink`/`folHlink` are
 *  parsed (mirroring probe.py) but never mapped onto a pptwise token — no
 *  hyperlink-color concept exists in `StyleColors` today. */
type ClrSlot = "dk1" | "lt1" | "dk2" | "lt2" | "accent1" | "accent2" | "accent3" | "accent4" | "accent5" | "accent6" | "hlink" | "folHlink"
type ClrSlots = Partial<Record<ClrSlot, string>>

const ACCENT_SLOTS: readonly ClrSlot[] = ["accent1", "accent2", "accent3", "accent4", "accent5", "accent6"]

// Theme part location (probe.py's own comment): `.thmx` puts it at
// `theme/theme/theme1.xml`, `.pptx`/`.potx` at `ppt/theme/theme1.xml` — this
// regex matches either, and any numbered variant (`theme2.xml`, …). A
// multi-variant `.thmx` also carries per-variant copies under
// `theme/themeVariants/variant<N>/theme/theme1.xml`; those are excluded by
// path, and among the survivors the *shortest* path wins (probe.py's own
// `sorted(cands, key=len)[0]`) — the top-level part is always the shortest.
const THEME_PART_RE = /theme\d*\.xml$/
const THEME_VARIANTS_SEGMENT = "themeVariants"

const CLR_SCHEME_RE = /<a:clrScheme name="([^"]*)">([\s\S]*?)<\/a:clrScheme>/
const CLR_SLOT_RE =
  /<a:(dk1|lt1|dk2|lt2|accent[1-6]|hlink|folHlink)>\s*<a:(?:srgbClr val="([0-9A-Fa-f]{6})"|sysClr[^>]*lastClr="([0-9A-Fa-f]{6})")/g
const FONT_SCHEME_RE =
  /<a:fontScheme name="([^"]*)">[\s\S]*?<a:majorFont>\s*<a:latin typeface="([^"]*)"[\s\S]*?<a:minorFont>\s*<a:latin typeface="([^"]*)"/

interface ThemePart {
  path: string
  xml: string
}

async function findThemePart(zip: JSZip): Promise<ThemePart | undefined> {
  const candidates = Object.keys(zip.files)
    .filter((name) => !zip.files[name]!.dir && THEME_PART_RE.test(name) && !name.includes(THEME_VARIANTS_SEGMENT))
    .sort((a, b) => a.length - b.length)
  const path = candidates[0]
  if (path === undefined) return undefined
  const xml = await zip.files[path]!.async("string")
  return { path, xml }
}

function parseColors(xml: string): { schemeName: string | undefined; slots: ClrSlots } {
  const match = CLR_SCHEME_RE.exec(xml)
  if (!match) return { schemeName: undefined, slots: {} }
  const slots: ClrSlots = {}
  for (const m of match[2]!.matchAll(CLR_SLOT_RE)) {
    const slot = m[1] as ClrSlot
    const hex = m[2] ?? m[3]
    if (hex) slots[slot] = `#${hex.toUpperCase()}`
  }
  return { schemeName: match[1]?.trim() || undefined, slots }
}

function parseFonts(xml: string): { major: string | undefined; minor: string | undefined } {
  const m = FONT_SCHEME_RE.exec(xml)
  if (!m) return { major: undefined, minor: undefined }
  return { major: m[2]?.trim() || undefined, minor: m[3]?.trim() || undefined }
}

/** How many discrete steps {@link deriveMuted} walks from the most-muted
 *  (blended fully toward `bg`) candidate back toward `text` itself — same
 *  20-step (5% increment) granularity `metaInk` (`../../render/ink.ts`) already
 *  uses for its own stepped ink walk, reused here rather than picked fresh. */
const MUTED_STEPS = 20
/** The body-text WCAG floor (`CONTRAST_RATIO_BODY` in `../../render/ink.ts`,
 *  inlined rather than imported since that constant isn't exported) — a
 *  derived `muted` token must clear this against *both* `bg` and `surface`,
 *  not just registerTheme's lower 3.0:1 registration floor, so it reads
 *  correctly as body text on either background a theme might paint. */
const MUTED_TARGET_RATIO = 4.5

/**
 * Derive a `muted` token from `text` by blending it toward `bg` in
 * {@link MUTED_STEPS} discrete steps (`mixHex`, `../../components/color-mix.ts`
 * — the same solid-hex blend `swot.tsx`/`bmc.tsx`/`waterfall.tsx` already
 * share) and measuring each candidate with the already-exported
 * `contrastRatio` (`../../render/ink.ts`) — no new color math, per this wave's own
 * discipline. Walks from the most-muted end (`t=1`, blended fully toward
 * `bg`) down to `t=0` (`text` itself, the highest-contrast endpoint) and
 * returns the *first* candidate, meaning the most-muted one, that clears
 * {@link MUTED_TARGET_RATIO} against **both** `bg` and `surface` (the two
 * backgrounds `colors.muted` can actually render against). Throws when no
 * step clears the floor, because returning `text` would hide an unusable
 * anchor combination and could still fail on `surface`.
 */
function findMutedCandidate(text: string, bg: string, surface: string): string | undefined {
  for (let step = MUTED_STEPS; step >= 0; step--) {
    const t = step / MUTED_STEPS
    const candidate = mixHex(text, bg, t)
    if (contrastRatio(candidate, bg) >= MUTED_TARGET_RATIO && contrastRatio(candidate, surface) >= MUTED_TARGET_RATIO) {
      return candidate.toUpperCase()
    }
  }
  return undefined
}

export function deriveMuted(text: string, bg: string, surface: string): string {
  const candidate = findMutedCandidate(text, bg, surface)
  if (candidate !== undefined) return candidate
  throw new PptwiseError(
    `cannot derive colors.muted with a contrast ratio of ${MUTED_TARGET_RATIO.toFixed(1)}:1 against both colors.bg (${bg}) and colors.surface (${surface}) from colors.text (${text}). Choose compatible background and text anchors`,
  )
}

/** Lower-cases, replaces every run of non-alphanumeric characters with a
 *  single hyphen, and trims leading/trailing hyphens — a plain, dependency-free
 *  slug (no new package for one string transform). Empty input (or input
 *  that's entirely non-alphanumeric — a CJK-only deck name reduces to nothing
 *  here) falls back to `fallback` rather than producing an empty/invalid
 *  identifier. The fallback is a parameter because this function now serves
 *  two callers whose empty-input answer differs: a brand theme id (`"brand"`,
 *  the default) and a workspace deck directory name (`"deck"`,
 *  `../../cli/workspace.ts`). */
export function slugify(input: string, fallback = "brand"): string {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return slug || fallback
}

/** The brand color and the second color a template names: its `accent1`
 *  (or `dk2`, or its first accent) and its `accent2`, when that is a color
 *  of its own and not a grey. */
function templateColors(slots: ClrSlots, path: string): BrandColors {
  const accents = ACCENT_SLOTS.map((slot) => slots[slot]).filter((c): c is string => c !== undefined)
  if (accents.length === 0) {
    throw new PptwiseError(`theme part ${path} has no accent colors — cannot read a brand color`)
  }
  const brand = slots.accent1 ?? slots.dk2 ?? accents[0]!
  const second = slots.accent2
  return second !== undefined && second.toUpperCase() !== brand.toUpperCase() && isChromatic(second) ? { brand, second } : { brand }
}

/**
 * The theme's font stacks with the template's Latin faces put first, and
 * what a reader needs to know about them. The theme's East Asian faces stay
 * where they are in each stack, so Chinese text keeps the theme's face.
 */
function withTemplateFonts(
  fonts: ThemeFile["style"]["fonts"],
  template: { major: string | undefined; minor: string | undefined },
): { fonts: ThemeFile["style"]["fonts"]; notes: string[] } {
  const notes: string[] = []
  const lead = (role: "heading" | "body", face: string | undefined, stack: string[]): string[] => {
    if (face === undefined) {
      notes.push(`fonts: the template names no ${role} font, so ${role} text keeps the theme's own`)
      return stack
    }
    const next = [face, ...stack.filter((f) => f.toLowerCase() !== face.toLowerCase())]
    const resolved = resolveFontFace(next, role)
    if (!SAFE_FONTS.has(face.toLowerCase())) {
      notes.push(
        `warning: ${role} font "${face}" is not on the safe font list (the fonts a stock Windows machine has), so the slides set ${role} text in "${resolved}", the next safe face in the stack`,
      )
    } else if (!hasExactWidthTable(face)) {
      notes.push(`warning: ${role} font "${face}" has no exact width table: text widths are estimated and long lines may overflow`)
    }
    return next
  }
  return {
    fonts: { ...fonts, heading: lead("heading", template.major, fonts.heading), body: lead("body", template.minor ?? template.major, fonts.body) },
    notes,
  }
}

/** The theme to repaint, copied under the new id and label. */
function donorTheme(from: string | ThemeFile, identity: { id: string; label: string }): ThemeFile {
  if (typeof from === "string") return themeFileFromPreset(from, identity)
  const copy = structuredClone(from)
  return ThemeFileSchema.parse({ ...copy, id: identity.id, label: identity.label, style: { ...copy.style, id: identity.id } }) as ThemeFile
}

/**
 * Repaint a theme around the brand color of a template, from the raw bytes
 * of a `.thmx`/`.potx`/`.pptx` file (only its theme part is read). The
 * theme keeps its ground, text, surface, menu, and fonts. Its colored
 * tokens move to the brand by the rules `../brand/brand-regen.ts` sets out.
 * Deterministic: the same bytes and options always give the same theme.
 *
 * Rendering the theme to find which slot it shows most needs a platform
 * (`installPlatform`), as any other render does.
 *
 * Throws {@link PptwiseError} when the package has no theme part, when the
 * theme part names no accent color, and when the repainted theme would fail
 * a contrast floor.
 */
export async function extractBrandTheme(
  bytes: Uint8Array | ArrayBuffer,
  opts: ExtractBrandThemeOptions = {},
): Promise<BrandThemeResult> {
  const zip = await JSZip.loadAsync(bytes)
  const part = await findThemePart(zip)
  if (!part) {
    throw new PptwiseError(
      "no theme part found in this file — expected a .thmx/.potx/.pptx OOXML package with a ppt/theme/theme1.xml (or theme/theme/theme1.xml) part",
    )
  }
  const { schemeName, slots } = parseColors(part.xml)
  const colors = templateColors(slots, part.path)
  const label = opts.label ?? schemeName ?? "brand"
  const id = opts.id ?? slugify(opts.label ?? schemeName ?? "brand")
  const donor = donorTheme(opts.from ?? "bulletin", { id, label })
  const template = opts.brandFonts === true ? withTemplateFonts(donor.style.fonts, parseFonts(part.xml)) : undefined
  const { file, placement } = regenerateFromBrand(donor, colors, { id, label, fonts: template?.fonts })
  return { file, placement, fontNotes: template?.notes ?? [] }
}
