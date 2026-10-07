import type React from "react"
import type { PptxIR, Slide } from "@/ir"
import type { ComponentCtx } from "../components/types"
import { fitEmphasisText, stripEmphasis, type EmphasisHeadingLayout } from "../render/emphasis"
import { SLIDE_NUMBER_FIELD } from "../render/footer"
import type { ContentRect } from "../render/layout"
import { measureTextUnits } from "../lib/svg-text-layout"
import { fitMemoTitle } from "./compositions/memo"
import {
  CRAYON_META,
  CRAYON_SPEC,
  CrayonLine,
  crayonBaseline,
  crayonInks,
  crayonMeta,
  crayonSectionColor,
  crayonText,
  crayonTint,
  crayonWidth,
  inkOn,
  paintCrayon,
  paintCrayonIcon,
  type ClaimColumn,
} from "./compositions/crayonbox"

/*
 * The crayonbox frame: what every crayon content page wears, settled on
 * crayon's 2026-10 board (`design/rounds/2026-10-08-crayon/`).
 *
 * At the top left a rounded capsule in the crayon of the section the page
 * sits in, with the section's symbol and its name (the page's `kicker`). The
 * claim under it at 34/46 in the heavy sans across the measure (x64, 1080
 * wide), on one line whenever it fits a point or two smaller, broken at a
 * comma or a colon when it does not, its last line ending on y146 so a claim
 * of one line and a claim of two end on the same line. A stroke of crayon in
 * the section's colour under it, from x64 to x200 on y156. The source stands
 * at the foot from y648, 11/16 in the grey. The sun and the two stars at the
 * top right, the deck's name and term at the bottom left and the page number
 * in a pale disc of the section's crayon are the motif's.
 */

export const CRAYON_LEFT = 64
/** The claim's measure: to x1144, clear of the sun. */
export const CLAIM_W = 1080
/** The body's measure: to x1216. */
export const CRAYON_W = 1152

/** The section capsule: 34px tall at y34, its symbol at x76, its name 15px after it. */
export const CAPSULE = { x: 64, y: 34, h: 34, size: 15, pad: 40, tail: 12, icon: { x: 12, size: 18 } } as const
/** The claim: 34/46, its last line's box ending on y146; it gives up at most a twentieth of its size to stay on one line. */
export const CLAIM = { size: 34, lineHeight: 46, foot: 146, minPt: 26, maxLines: 2, oneLineFloor: 0.95, weight: 900 } as const
/** The stroke under the claim: 136px of crayon, 10px under the claim's foot. */
export const UNDERLINE = { w: 136, gap: 10, stroke: 7 } as const
/** Where the body a composition is handed starts and ends. */
export const BODY = { top: 186, bottom: 640 } as const
/** The source: 11/16 in the grey from y648, one line or two. */
export const SOURCE = { top: 648, size: 11, lineHeight: 16, maxLines: 2 } as const
/** The folio: the deck's name and term 12/20 at the left from y684, the page number in a 36px disc at x1180. */
export const FOLIO = { top: 684, size: 12, lineHeight: 20, disc: { x: 1180, y: 676, d: 36, size: 14 } } as const

/** The heading fit the claim runs over the measure, in the shape `LayoutDefinition.headingFit` takes. */
export const CRAYON_HEAD_FIT = { maxWidth: CLAIM_W, fontSize: CLAIM.size, maxLines: CLAIM.maxLines, minPt: CLAIM.minPt, bold: true, lineHeightRatio: CLAIM.lineHeight / CLAIM.size } as const

// ── The section ─────────────────────────────────────────────────────────

/**
 * The symbol a section is drawn with: the icon the deck's own contents gives
 * it, the first card anywhere in the deck whose title is the section's name
 * and that carries an icon (the contents page's crayon for 「新规定」 carries
 * the scales). A section the contents does not name goes without one.
 */
export function sectionSymbol(ir: Pick<PptxIR, "slides">, name: string): string | undefined {
  const want = stripEmphasis(name).trim()
  for (const slide of ir.slides) {
    for (const component of slide.components) {
      if (component.type !== "numbered_cards" && component.type !== "icon_cards" && component.type !== "row_cards") continue
      for (const item of component.items) {
        if (item.icon && stripEmphasis(item.title ?? "").trim() === want) return item.icon
      }
    }
  }
  return undefined
}

/** The section capsule's width for `name`. */
export function capsuleWidth(name: string, ctx: ComponentCtx, withIcon: boolean): number {
  return Math.round(crayonWidth(name, CAPSULE.size, ctx, { weight: 800 }) + (withIcon ? CAPSULE.pad : CAPSULE.tail + 6) + CAPSULE.tail)
}

/**
 * A rounded capsule in `color` with `name` in it and, when the section has
 * one, its symbol before it. Its words take the navy ink, or white on a
 * crayon the navy does not read on. A name wider than `maxW` is declared
 * dropped, never cut.
 */
export function SectionCapsule({ name, color, icon, ctx, x = CAPSULE.x, y = CAPSULE.y, h = CAPSULE.h, size = CAPSULE.size, maxW = 560, centred = false }: { name: string; color: string; icon?: string; ctx: ComponentCtx; x?: number; y?: number; h?: number; size?: number; maxW?: number; centred?: boolean }): React.ReactElement {
  const words = stripEmphasis(name).trim()
  const inks = crayonInks(ctx)
  const textW = crayonWidth(words, size, ctx, { weight: 800 })
  const lead = icon ? CAPSULE.pad : 22
  // A centred capsule stands at least 160 wide with its words in the middle, as the board's cover and close set it.
  const w = Math.round(centred ? Math.max(160, textW + 102) : textW + lead + (icon ? CAPSULE.tail : 22))
  if (w > maxW) return <g data-dropped={1} data-dropped-kind="label" />
  const fg = inkOn(color, inks, size)
  return (
    <g data-crayon-capsule={words}>
      <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={color} />
      {icon ? paintCrayonIcon(icon, x + CAPSULE.icon.x, y + (h - CAPSULE.icon.size) / 2, CAPSULE.icon.size, fg, color) : null}
      <text
        {...(size < 16 ? CRAYON_SPEC : {})}
        x={centred ? x + w / 2 : x + lead}
        y={crayonBaseline(y, h, size)}
        textAnchor={centred ? "middle" : undefined}
        fontFamily={ctx.fonts.body}
        fontSize={size}
        fontWeight="800"
        fill={fg}
        dominantBaseline="alphabetic"
      >
        {words}
      </text>
    </g>
  )
}

/** The page's section capsule at the top left, when the page names its section. */
export function CrayonSection({ ir, slide, index, ctx }: { ir: PptxIR; slide: Slide; index: number; ctx: ComponentCtx }): React.ReactElement | null {
  const name = slide.kicker ? stripEmphasis(slide.kicker).trim() : ""
  if (!name) return null
  const color = crayonSectionColor(ir.slides, index, crayonInks(ctx))
  return <SectionCapsule name={name} color={color} icon={sectionSymbol(ir, name)} ctx={ctx} />
}

// ── The claim ───────────────────────────────────────────────────────────

/**
 * The claim fitted to a column of `width` at `size`: on one line whenever it
 * fits, down to 95% of its size, and otherwise on two lines broken at the
 * last comma or colon that lets both fit. A claim the author broke in two
 * keeps the author's break.
 */
export function fitCrayonClaim(heading: string | undefined, ctx: ComponentCtx, width: number = CLAIM_W, size: number = CLAIM.size, lineHeight: number = CLAIM.lineHeight): EmphasisHeadingLayout {
  const plain = stripEmphasis(heading ?? "").trim()
  const floor = Math.round(size * CLAIM.oneLineFloor)
  const parts = (heading ?? "").split(/\n+/u).map((part) => part.trim()).filter(Boolean)
  if (parts.length === 2) {
    for (let s = size; s >= Math.min(CLAIM.minPt, size); s -= 1) {
      const fitted = parts.map((part) => fitMemoTitle(part, { maxWidth: width, fontSize: s, minPt: s, lineHeight, fontFamily: ctx.fonts.heading, bold: true }))
      if (fitted.every((f) => f.lines.length === 1 && !f.truncated)) {
        return { ...fitted[0]!, lines: fitted.flatMap((f) => f.lines), segments: fitted.flatMap((f) => f.segments), lineHeight }
      }
    }
  }
  if (plain && !plain.includes("\n")) {
    const units = measureTextUnits(plain, { fontFamily: ctx.fonts.heading, bold: true })
    for (let s = size; s >= floor; s -= 1) {
      if (units * s <= width) return { ...fitMemoTitle(heading, { maxWidth: width, fontSize: s, minPt: s, lineHeight, fontFamily: ctx.fonts.heading, bold: true }), lineHeight }
    }
  }
  const layout = fitMemoTitle(heading, { maxWidth: width, fontSize: size, minPt: Math.min(CLAIM.minPt, size), lineHeight, fontFamily: ctx.fonts.heading, bold: true })
  return { ...layout, lineHeight }
}

/** The claim's lines in its column, the last line's box ending on `foot`. A claim cut to fit says so on its last line. */
export function CrayonClaimText({ layout, ctx, x = CRAYON_LEFT, foot = CLAIM.foot }: { layout: EmphasisHeadingLayout; ctx: ComponentCtx; x?: number; foot?: number }): React.ReactElement {
  const inks = crayonInks(ctx)
  const ink = crayonText(inks.ink, inks.ground, layout.fontSize)
  const top = foot - layout.lineHeight * layout.lines.length
  return <>{paintCrayon(layout, { ctx, x, top, fill: ink, weight: CLAIM.weight, heading: true, lastAttrs: layout.truncated ? { "data-truncated": "1" } : undefined })}</>
}

/** How the stroke of crayon under a claim is drawn: its length, its gap under the claim's foot and its width. */
export interface Underline {
  w: number
  gap: number
  stroke: number
}

/** The claim painted in its column, with a stroke of crayon in `color` under it. */
export function CrayonClaim({ layout, ctx, color, x = CRAYON_LEFT, foot = CLAIM.foot, underline = UNDERLINE }: { layout: EmphasisHeadingLayout; ctx: ComponentCtx; color: string; x?: number; foot?: number; underline?: Underline }): React.ReactElement {
  return (
    <g data-crayon-claim="">
      <CrayonClaimText layout={layout} ctx={ctx} x={x} foot={foot} />
      <g data-decor-piece="crayon-underline">
        <CrayonLine x1={x} x2={x + underline.w} y={foot + underline.gap} color={color} width={underline.stroke} />
      </g>
    </g>
  )
}

/**
 * The claim a composition places in a column of its own, or `null` when it
 * would not fit that column whole: the composition then declines the page.
 */
export function crayonClaimIn(heading: string | undefined, ctx: ComponentCtx, color: string): (column: ClaimColumn) => React.ReactElement | null {
  return ({ x, w, size, foot, lineHeight, maxLines, underline }) => {
    if (!stripEmphasis(heading ?? "").trim()) return null
    const s = size ?? CLAIM.size
    const layout = fitCrayonClaim(heading, ctx, w, s, lineHeight ?? CLAIM.lineHeight)
    if (layout.truncated || layout.lines.length > (maxLines ?? CLAIM.maxLines)) return null
    return <CrayonClaim layout={layout} ctx={ctx} color={color} x={x} foot={foot ?? CLAIM.foot} underline={underline ?? UNDERLINE} />
  }
}

// ── The source ─────────────────────────────────────────────────────────

/** The page's source fitted to a column of `width`: the author's own line breaks kept, two lines at most. */
export function fitCrayonSource(slide: Pick<Slide, "footnote">, ctx: ComponentCtx, width: number = CRAYON_W - 52): EmphasisHeadingLayout | null {
  const text = (slide.footnote ?? "").trim()
  if (!text) return null
  const layout = fitEmphasisText(text, { maxWidth: width, fontSize: SOURCE.size, minPt: SOURCE.size, maxLines: SOURCE.maxLines, lineHeightRatio: SOURCE.lineHeight / SOURCE.size, fontFamily: ctx.fonts.body, bold: false })
  return { ...layout, lineHeight: SOURCE.lineHeight }
}

export function CrayonSource({ source, ctx, x = CRAYON_LEFT, top = SOURCE.top }: { source: EmphasisHeadingLayout | null; ctx: ComponentCtx; x?: number; top?: number }): React.ReactElement | null {
  if (!source) return null
  const inks = crayonInks(ctx)
  const ink = crayonText(inks.muted, inks.ground, SOURCE.size)
  return (
    <g data-crayon-source="">
      {paintCrayon(source, { ctx, x, top, fill: ink, weight: 500, attrs: { ...CRAYON_SPEC }, lastAttrs: source.truncated ? { "data-truncated": "1" } : undefined })}
    </g>
  )
}

/** The source a composition places under a column of its own, or `undefined` when the page has none. */
export function crayonSourceIn(slide: Pick<Slide, "footnote">, ctx: ComponentCtx): ((column: { x: number; w: number; top?: number }) => React.ReactElement | null) | undefined {
  if (!slide.footnote?.trim()) return undefined
  return ({ x, w, top }) => {
    const source = fitCrayonSource(slide, ctx, w)
    if (!source || source.truncated) return null
    return <CrayonSource source={source} ctx={ctx} x={x} top={top} />
  }
}

// ── The folio ──────────────────────────────────────────────────────────

/** The page number in a pale disc of `color`, PowerPoint's slide-number field. */
export function FolioDisc({ n, color, ctx }: { n: number; color: string; ctx: ComponentCtx }): React.ReactElement {
  const inks = crayonInks(ctx)
  const { x, y, d, size } = FOLIO.disc
  const fill = crayonTint(color, inks)
  return (
    <g data-crayon-folio="">
      <circle cx={x + d / 2} cy={y + d / 2} r={d / 2} fill={fill} />
      <text
        {...CRAYON_SPEC}
        {...CRAYON_META}
        data-field={SLIDE_NUMBER_FIELD}
        x={x + d / 2}
        y={crayonBaseline(y, d, size)}
        textAnchor="middle"
        fontFamily={ctx.fonts.body}
        fontSize={size}
        fontWeight="800"
        fill={crayonText(inks.ink, fill, size)}
        dominantBaseline="alphabetic"
      >
        {String(n)}
      </text>
    </g>
  )
}

/** The deck's name and term at the bottom left, 12/20 in the grey. */
export function FolioLine({ text, ctx, x = CRAYON_LEFT }: { text: string; ctx: ComponentCtx; x?: number }): React.ReactElement {
  const inks = crayonInks(ctx)
  return (
    <text {...CRAYON_SPEC} {...CRAYON_META} x={x} y={crayonBaseline(FOLIO.top, FOLIO.lineHeight, FOLIO.size)} fontFamily={ctx.fonts.body} fontSize={FOLIO.size} fontWeight="600" fill={crayonMeta(inks.muted, inks.ground)} dominantBaseline="alphabetic">
      {text}
    </text>
  )
}

// ── The bands ──────────────────────────────────────────────────────────

/** The band a composition is handed: the measure under the claim's stroke, down to the source. */
export function crayonBandRect(): ContentRect {
  return { x: CRAYON_LEFT, y: BODY.top, w: CRAYON_W, h: BODY.bottom - BODY.top }
}
