/**
 * A theme's brand face: the color slot its own sample pages paint most,
 * among the slots with real chroma. `--brand` and `brand extract` put the
 * brand's color there first (`./brand-regen.ts`).
 *
 * Nobody writes this down per theme. It is measured: the theme draws the
 * sample deck in `./brand-sample.ts` (cover, chapter, every content kind its
 * menu offers, ending), and the area painted in `primary` and in `accent`
 * exactly is summed: fills, strokes, and text. The same pass notes which
 * slot sets words, and how large, because a slot that sets body-size words
 * must keep body-text contrast, and how much of a slot is fields of color
 * (bars, blocks) rather than marks (rules, strokes, words).
 */
import { renderSlideSvg, validateIr, formatIssues } from "../../api"
import { PptwiseError } from "../../errors"
import { offeredContentKinds } from "../../render/layout-selection"
import { compileThemeDefinition } from "../definitions"
import { hexToOklch, oklabDistance, oklchChroma, oklchToHex } from "../palette-rebase"
import type { ThemeFile } from "../schema"
import { BRAND_SAMPLE_HEADINGS, brandSampleIr } from "./brand-sample"

export type BrandSlot = "primary" | "accent"

export const BRAND_SLOTS: readonly BrandSlot[] = ["primary", "accent"]

/** What one slot does on the sample pages. */
export interface SlotUse {
  /** Square pixels painted in the slot's exact color, summed over the pages. */
  area: number
  /** Text runs the slot sets below {@link LARGE_TEXT_PX}. */
  bodyText: number
  /** Text runs the slot sets at or above {@link LARGE_TEXT_PX}. */
  largeText: number
  /** Runs of a page heading the slot sets. */
  headings: number
  /** The largest size, in px, the slot sets a heading at: 0 when it sets none. A heading's display line, not a running head that repeats it small. */
  headingPx: number
  /** The largest single rectangle the slot fills, as a share of the page: 1 is a page-filling ground. */
  field: number
  /** Square pixels of `area` that are fields of color (a bar, a block, a disc at least {@link FILL_MIN_SIDE}px across), not marks (a rule, a stroke, a word, a dot). */
  filled: number
  /**
   * The largest rectangle the pages fill in a color the layouts work out
   * from this slot rather than the slot's own (homeroom's blackboard is its
   * primary darkened), found by drawing the sample again with the slot
   * changed and seeing what follows it. Where it is, and how much of the
   * page it covers. Absent when no such rectangle follows the slot.
   */
  derivedField?: { page: number; ordinal: number; share: number }
}

export interface BrandFace {
  /** The chromatic slot painted most, or `accent` when neither slot has chroma. */
  slot: BrandSlot
  /** Whether a slot qualifies at all (see {@link isChromatic}). */
  chromatic: Record<BrandSlot, boolean>
  use: Record<BrandSlot, SlotUse>
  /** Runs of a page heading the sample sets, in any color. */
  headingRuns: number
}

/** Text this size and up reads as large text: 18pt, the WCAG line for 3:1. */
export const LARGE_TEXT_PX = 24

/** OKLCH chroma at and above which a color reads as a color, not a grey. */
export const CHROMA_FLOOR = 0.04

/**
 * A color with real chroma. A warm ink black (ink's `#1F1C18`, 0.009), a
 * blackboard green-grey (lecture's `#2E4038`, 0.027), or a silver (stage's
 * `#C4BFB6`, 0.014) is the theme's ink or chrome, not its face. A deep navy
 * or petrol that a chapter page is filled with (brief's `#1E2A4A`, 0.061,
 * proposal's `#0E3B53`, 0.063) is a color, though dark.
 */
export function isChromatic(hex: string): boolean {
  return oklchChroma(hex) >= CHROMA_FLOOR
}

const SHAPE_RE = /<(rect|line|circle|ellipse|path|polygon|polyline)\b([^>]*)>/g
const TEXT_RE = /<text\b([^>]*)>([\s\S]*?)<\/text>/g
const TSPAN_RE = /<tspan\b([^>]*)>([^<]*)/g
const ATTR_RE = /([a-zA-Z][a-zA-Z0-9:-]*)="([^"]*)"/g
const HEX_RE = /^#[0-9a-fA-F]{6}$/
/** The narrowest side a filled shape has to be a field of color rather than a mark: a chart's bar is, a 4px rule is not. */
export const FILL_MIN_SIDE = 16
/** The page the sample is drawn on, in px. */
const PAGE_AREA = 1280 * 720
/** The share of a line of type's box that ink covers, roughly. */
const TEXT_INK_SHARE = 0.35
/** A glyph's average advance, in ems. */
const GLYPH_ADVANCE_EM = 0.55

function attrs(source: string): Map<string, string> {
  const out = new Map<string, string>()
  for (const m of source.matchAll(ATTR_RE)) out.set(m[1]!, m[2]!)
  return out
}

function num(a: Map<string, string>, key: string, fallback = 0): number {
  const value = Number(a.get(key))
  return Number.isFinite(value) ? value : fallback
}

function opacity(a: Map<string, string>, channel: "fill" | "stroke"): number {
  return num(a, "opacity", 1) * num(a, `${channel}-opacity`, 1)
}

/** The bounding box of a path or point list, read off its coordinates. */
function pointsBox(source: string): { w: number; h: number } {
  const values = (source.match(/-?\d*\.?\d+(?:e-?\d+)?/g) ?? []).map(Number)
  const xs = values.filter((_, i) => i % 2 === 0)
  const ys = values.filter((_, i) => i % 2 === 1)
  if (xs.length === 0 || ys.length === 0) return { w: 0, h: 0 }
  return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }
}

/** Fill area, stroke length, and narrowest side of one shape element. */
function shapeGeometry(tag: string, a: Map<string, string>): { fill: number; stroke: number; side: number } {
  switch (tag) {
    case "rect": {
      const w = num(a, "width")
      const h = num(a, "height")
      return { fill: w * h, stroke: 2 * (w + h), side: Math.min(w, h) }
    }
    case "line":
      return { fill: 0, stroke: Math.hypot(num(a, "x2") - num(a, "x1"), num(a, "y2") - num(a, "y1")), side: 0 }
    case "circle": {
      const r = num(a, "r")
      return { fill: Math.PI * r * r, stroke: 2 * Math.PI * r, side: 2 * r }
    }
    case "ellipse": {
      const rx = num(a, "rx")
      const ry = num(a, "ry")
      return { fill: Math.PI * rx * ry, stroke: Math.PI * (rx + ry), side: 2 * Math.min(rx, ry) }
    }
    default: {
      const box = pointsBox(a.get(tag === "path" ? "d" : "points") ?? "")
      return { fill: (box.w * box.h) / 2, stroke: box.w + box.h, side: Math.min(box.w, box.h) }
    }
  }
}

/** Whether a run of words is (part of) one of `headings`: a heading wraps into several runs. */
function isHeadingRun(text: string, headings: readonly string[]): boolean {
  const run = text.trim().toLowerCase()
  return run.length >= 3 && headings.some((heading) => heading.toLowerCase().includes(run))
}

/**
 * Measure each slot across rendered pages: the area painted in its exact
 * color, how many text runs it sets at body and at display size, which of
 * them are page headings (`headings` names them), and the largest ground
 * it fills. Area, not a count of paints: a gold hairline drawn twice on
 * every page is still less of the page than one red bar chart.
 */
export function countSlotUse(
  svgs: readonly string[],
  colors: Record<BrandSlot, string>,
  headings: readonly string[] = [],
): Record<BrandSlot, SlotUse> {
  const empty = (): SlotUse => ({ area: 0, bodyText: 0, largeText: 0, headings: 0, headingPx: 0, field: 0, filled: 0 })
  const use: Record<BrandSlot, SlotUse> = { primary: empty(), accent: empty() }
  const slotsOf = (hex: string | undefined) =>
    hex === undefined || !HEX_RE.test(hex)
      ? []
      : BRAND_SLOTS.filter((slot) => colors[slot].toUpperCase() === hex.toUpperCase())
  const addText = (a: Map<string, string>, text: string, inherited: Map<string, string>) => {
    const fill = a.get("fill") ?? inherited.get("fill")
    const size = num(a, "font-size", num(inherited, "font-size"))
    const chars = text.replace(/&[a-z#0-9]+;/g, "x").trim().length
    if (chars === 0) return
    for (const slot of slotsOf(fill)) {
      use[slot].area += chars * GLYPH_ADVANCE_EM * size * size * TEXT_INK_SHARE * opacity(a, "fill")
      if (size >= LARGE_TEXT_PX) use[slot].largeText++
      else use[slot].bodyText++
      if (isHeadingRun(text, headings)) {
        use[slot].headings++
        use[slot].headingPx = Math.max(use[slot].headingPx, size)
      }
    }
  }
  for (const svg of svgs) {
    for (const m of svg.matchAll(SHAPE_RE)) {
      const a = attrs(m[2]!)
      const geometry = shapeGeometry(m[1]!, a)
      for (const slot of slotsOf(a.get("fill"))) {
        const painted = geometry.fill * opacity(a, "fill")
        use[slot].area += painted
        if (geometry.side >= FILL_MIN_SIDE) use[slot].filled += painted
        if (m[1] === "rect") use[slot].field = Math.max(use[slot].field, geometry.fill / PAGE_AREA)
      }
      for (const slot of slotsOf(a.get("stroke"))) {
        use[slot].area += geometry.stroke * num(a, "stroke-width", 1) * opacity(a, "stroke")
      }
    }
    for (const m of svg.matchAll(TEXT_RE)) {
      const a = attrs(m[1]!)
      const inner = m[2]!
      if (!inner.includes("<tspan")) {
        addText(a, inner.replace(/<[^>]*>/g, ""), new Map())
        continue
      }
      for (const span of inner.matchAll(TSPAN_RE)) addText(attrs(span[1]!), span[2]!, a)
    }
  }
  return use
}

/**
 * How much of the page a slot is, as the eye takes it: its painted area
 * times how far its color stands from the ground (OKLab distance). A deep
 * navy step arrow on a near-black console is a lot of area and very little
 * of the picture.
 */
export function slotWeight(use: SlotUse, color: string, bg: string): number {
  return use.area * oklabDistance(color, bg)
}

/** Pick the face from measured use. Ties go to primary. */
export function pickBrandFace(
  colors: Record<BrandSlot | "bg", string>,
  use: Record<BrandSlot, SlotUse>,
): BrandFace {
  const chromatic = { primary: isChromatic(colors.primary), accent: isChromatic(colors.accent) }
  const candidates = BRAND_SLOTS.filter((slot) => chromatic[slot])
  const weight = (slot: BrandSlot) => slotWeight(use[slot], colors[slot], colors.bg)
  let slot: BrandSlot = "accent"
  if (candidates.length > 0) {
    slot = candidates.reduce((best, next) => (weight(next) > weight(best) ? next : best))
  }
  return { slot, chromatic, use, headingRuns: 0 }
}

/** How many runs of a page heading the pages set, in any color. */
export function countHeadingRuns(svgs: readonly string[], headings: readonly string[]): number {
  let runs = 0
  for (const svg of svgs) {
    for (const m of svg.matchAll(/<(?:text|tspan)\b[^>]*>([^<]*)/g)) if (isHeadingRun(m[1]!, headings)) runs++
  }
  return runs
}

/** Draw the sample deck in `theme` and return each page's SVG, or only the pages `only` names. */
export function renderBrandSample(theme: ThemeFile, only?: readonly number[]): string[] {
  const definition = compileThemeDefinition(theme)
  const raw = brandSampleIr(definition.id, new Set<string>(offeredContentKinds(definition.menu)))
  const v = validateIr(raw, { theme: definition })
  if (!v.ok) {
    throw new PptwiseError(`theme "${definition.id}" cannot draw the brand sample deck:\n${formatIssues(v.errors)}`)
  }
  const ir = v.ir!
  const pages = only ?? ir.slides.map((_, index) => index)
  return pages.map((index) => renderSlideSvg(ir, index, { theme: definition }))
}

/** `theme` with `slot` painted `color`: both slots when the theme paints them as one. */
function withSlot(theme: ThemeFile, slot: BrandSlot, color: string): ThemeFile {
  const out = structuredClone(theme)
  const colors = out.style.colors
  const oneColor = colors.primary.toUpperCase() === colors.accent.toUpperCase()
  colors[slot] = color
  if (oneColor) colors[slot === "primary" ? "accent" : "primary"] = color
  return out
}

/** Each filled rectangle on a page, in document order: its fill and its share of the page. */
function filledRects(svg: string): { fill: string; share: number }[] {
  const out: { fill: string; share: number }[] = []
  for (const m of svg.matchAll(/<rect\b([^>]*)>/g)) {
    const a = attrs(m[1]!)
    out.push({ fill: (a.get("fill") ?? "").toUpperCase(), share: (num(a, "width") * num(a, "height")) / PAGE_AREA })
  }
  return out
}

/**
 * The largest rectangle whose color follows `slot` without being it: drawn
 * once as the theme has it and once with the slot turned to the opposite
 * hue, a rectangle whose fill changed with the slot but was not the slot's
 * own color is one the layouts work out from it. A page whose rectangles do
 * not line up between the two drawings is skipped.
 */
function findDerivedField(theme: ThemeFile, slot: BrandSlot, own: readonly string[]): SlotUse["derivedField"] {
  const color = theme.style.colors[slot].toUpperCase()
  const c = hexToOklch(color)
  const probe = oklchToHex({ L: c.L, C: Math.max(c.C, 0.12), h: c.h + 180 })
  const moved = renderBrandSample(withSlot(theme, slot, probe))
  let best: SlotUse["derivedField"]
  own.forEach((svg, page) => {
    const before = filledRects(svg)
    const after = filledRects(moved[page]!)
    if (before.length !== after.length) return
    before.forEach((rect, ordinal) => {
      if (rect.fill === color || rect.fill === after[ordinal]!.fill || !HEX_RE.test(rect.fill)) return
      if (best === undefined || rect.share > best.share) best = { page, ordinal, share: rect.share }
    })
  })
  return best
}

/**
 * The color the pages actually paint the rectangle `field` names when `slot`
 * is `color`: homeroom's board for an orange primary is a dark brown.
 */
export function paintedField(theme: ThemeFile, slot: BrandSlot, color: string, field: NonNullable<SlotUse["derivedField"]>): string {
  const [svg] = renderBrandSample(withSlot(theme, slot, color), [field.page])
  const rect = filledRects(svg!)[field.ordinal]
  if (rect === undefined || !HEX_RE.test(rect.fill)) {
    throw new PptwiseError(`theme "${theme.id}" no longer draws the field its ${slot} is worked into on sample page ${field.page + 1}`)
  }
  return rect.fill
}

/** Measure `theme`'s brand face from its own sample pages. */
export function measureBrandFace(theme: ThemeFile): BrandFace {
  const { primary, accent, bg } = theme.style.colors
  const svgs = renderBrandSample(theme)
  const face = pickBrandFace({ primary, accent, bg }, countSlotUse(svgs, { primary, accent }, BRAND_SAMPLE_HEADINGS))
  for (const slot of BRAND_SLOTS) {
    if (!face.chromatic[slot]) continue
    const derivedField = findDerivedField(theme, slot, svgs)
    if (derivedField !== undefined) face.use[slot].derivedField = derivedField
  }
  return { ...face, headingRuns: countHeadingRuns(svgs, BRAND_SAMPLE_HEADINGS) }
}
