import type React from "react"
import type { Slide } from "@/ir"
import type { ComponentCtx } from "../components/types"
import { fitEmphasisText, stripEmphasis, type EmphasisHeadingLayout } from "../render/emphasis"
import type { ContentRect } from "../render/layout"
import { SLIDE_NUMBER_FIELD } from "../render/footer"
import type { DeckFooter } from "../render/footer-marks"
import { measureTextUnits } from "../lib/svg-text-layout"
import { fitMemoTitle } from "./compositions/memo"
import {
  LINEUP_META,
  LINEUP_SPEC,
  lineupBaseline,
  lineupInks,
  lineupMeta,
  lineupText,
  lineupTrackedWidth,
  paintLineup,
  paintLineupRule,
  paintLineupTracked,
  type LineupClaimColumn,
  type LineupSourceColumn,
} from "./compositions/lineup"

/*
 * The running order: what every runway page wears, settled on runway's
 * 2026-10 board (`design/rounds/2026-10-08-runway/`).
 *
 * Across the top, the show's masthead: the deck's label at the left in small
 * bold type tracked wide (the deck's `organization` and the footer's `label`,
 * 「毕业设计 · 再穿一次」), the page's section small and grey at the right
 * (its `kicker`), the page number in the serif as two figures like an exit
 * number at the far right, and a black hairline under them on y54. On a page
 * over a dark photograph the masthead turns to the paper. Under it the claim
 * in the heading serif at its regular weight, 34px, across the whole measure
 * (x64 to x1216), on one line whenever it fits, a point or two smaller if
 * that keeps it there, and broken at a comma or a colon when it does not, its
 * last line ending on y158 whether it has one line or two. The source small
 * and grey at the foot from y670.
 */

export const LINEUP_LEFT = 64
export const LINEUP_RIGHT = 1216
export const LINEUP_W = LINEUP_RIGHT - LINEUP_LEFT

/** The masthead: 10px tracked 4px from y30, the folio in the serif at 13px, the hairline on y54. */
export const MASTHEAD = { top: 30, lineHeight: 16, size: 10, tracking: 4, rule: 54, ruleW: 1, folioSize: 13, sectionRight: 1060, gap: 24 } as const

/**
 * The claim: 34/44 in the heading serif across x64 to x1216, its last line's
 * box ending on y158. It gives up at most a twelfth of its size to stay on one
 * line before it breaks.
 */
export const CLAIM = { x: LINEUP_LEFT, w: LINEUP_W, size: 34, lineHeight: 44, foot: 158, minPt: 28, oneLineFloor: 0.92, maxLines: 2 } as const

/** The source: 10/14 in the stone grey from y670, one line or two. */
export const SOURCE = { x: LINEUP_LEFT, top: 670, w: 1000, size: 10, lineHeight: 14, maxLines: 2 } as const

/** Where a body set under the claim by the ordinary renderer starts and ends. */
export const BODY = { top: 190, bottom: 650 } as const

/** The heading fit the claim runs over the whole measure, in the shape `LayoutDefinition.headingFit` takes. */
export const LINEUP_HEAD_FIT = { maxWidth: CLAIM.w, fontSize: CLAIM.size, maxLines: CLAIM.maxLines, minPt: CLAIM.minPt, bold: false, lineHeightRatio: CLAIM.lineHeight / CLAIM.size } as const

// ── The masthead ────────────────────────────────────────────────────────

/** The show's label at the left of the masthead: the deck's organization and its footer label, joined by a middle dot. */
export function mastheadLabel(footer: Pick<DeckFooter, "organization" | "label" | "notice">): string {
  return [footer.organization, footer.label, footer.notice]
    .map((part) => (part ? stripEmphasis(part).trim() : ""))
    .filter(Boolean)
    .join(" · ")
}

/**
 * The masthead from `left` to x1216: the label, the section, the folio and
 * the hairline. `dark` sets it in the paper over a dark photograph or the
 * stage. A label or a section that does not fit beside the rest is declared
 * dropped rather than run into it.
 */
export function LineupMasthead({
  ctx,
  label,
  section,
  folio,
  marks,
  left = LINEUP_LEFT,
  dark = false,
}: {
  ctx: ComponentCtx
  label?: string | null
  section?: string | null
  /** The page number, printed as PowerPoint's slide-number field, or nothing. */
  folio?: number | null
  /** The draft and confidentiality marks, set before the section. */
  marks?: string | null
  left?: number
  dark?: boolean
}): React.ReactElement {
  const inks = lineupInks(ctx)
  const ground = dark ? inks.stage : inks.ground
  const strong = dark ? lineupText(inks.light, ground, MASTHEAD.size) : lineupText(inks.ink, ground, MASTHEAD.size)
  const quiet = dark ? lineupMeta(inks.lightQuiet, ground) : lineupMeta(inks.muted, ground)
  const y = lineupBaseline(MASTHEAD.top, MASTHEAD.lineHeight, MASTHEAD.size)
  const words = label ? stripEmphasis(label).trim() : ""
  const right = [marks, section].map((part) => (part ? stripEmphasis(part).trim() : "")).filter(Boolean).join(" · ")
  const sectionRight = folio != null ? MASTHEAD.sectionRight : LINEUP_RIGHT
  const labelW = words ? lineupTrackedWidth(words, MASTHEAD.size, MASTHEAD.tracking, ctx, { bold: true }) : 0
  const rightW = right ? lineupTrackedWidth(right, MASTHEAD.size, MASTHEAD.tracking, ctx) : 0
  const fits = left + labelW + (right ? MASTHEAD.gap + rightW : 0) <= sectionRight
  const labelFits = left + labelW <= sectionRight
  return (
    <g data-lineup-masthead="">
      {words && labelFits ? <g data-lineup-label={words}>{paintLineupTracked({ ctx, text: words, x: left, y, size: MASTHEAD.size, tracking: MASTHEAD.tracking, bold: true, fill: strong })}</g> : null}
      {right && fits ? <g data-lineup-section={right}>{paintLineupTracked({ ctx, text: right, x: sectionRight, y, size: MASTHEAD.size, tracking: MASTHEAD.tracking, fill: quiet, anchor: "end", attrs: { ...LINEUP_META } })}</g> : null}
      {(words && !labelFits) || (right && !fits) ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {folio != null ? (
        <text {...LINEUP_SPEC} {...LINEUP_META} data-field={SLIDE_NUMBER_FIELD} data-lineup-folio="" x={LINEUP_RIGHT} y={lineupBaseline(MASTHEAD.top, MASTHEAD.lineHeight, MASTHEAD.folioSize, true)} textAnchor="end" fontFamily={ctx.fonts.heading} fontSize={MASTHEAD.folioSize} fill={strong} dominantBaseline="alphabetic">
          {String(folio)}
        </text>
      ) : null}
      {paintLineupRule(left, LINEUP_RIGHT, MASTHEAD.rule, strong, MASTHEAD.ruleW)}
    </g>
  )
}

// ── The claim ───────────────────────────────────────────────────────────

/**
 * The claim fitted to a column of `width` at `size`: the author's own break
 * kept, each part on a line of its own. Otherwise on one line whenever it
 * fits, down to a twelfth under its size. Otherwise on two lines broken at
 * the last comma or colon that lets both fit.
 */
export function fitLineupClaim(heading: string | undefined, ctx: ComponentCtx, width: number = CLAIM.w, size: number = CLAIM.size, lineHeight: number = CLAIM.lineHeight, maxLines: number = CLAIM.maxLines): EmphasisHeadingLayout {
  const plain = stripEmphasis(heading ?? "").trim()
  const floor = Math.round(size * CLAIM.oneLineFloor)
  const fontFamily = ctx.fonts.heading
  const parts = (heading ?? "").split(/\n+/u).map((part) => part.trim()).filter(Boolean)
  // A break the author wrote is kept: a claim broken into more parts than the column takes lines does not fit it.
  if (parts.length > maxLines) return { ...fitMemoTitle(heading, { maxWidth: width, fontSize: size, minPt: size, lineHeight, fontFamily, bold: false }), lineHeight, truncated: true }
  if (parts.length > 1) {
    for (let s = size; s >= Math.min(size, CLAIM.minPt); s -= 1) {
      const fitted = parts.map((part) => fitMemoTitle(part, { maxWidth: width, fontSize: s, minPt: s, lineHeight, fontFamily, bold: false }))
      if (fitted.every((f) => f.lines.length === 1 && !f.truncated)) {
        return { ...fitted[0]!, lines: fitted.flatMap((f) => f.lines), segments: fitted.flatMap((f) => f.segments), lineHeight }
      }
    }
  }
  if (plain && !plain.includes("\n")) {
    const units = measureTextUnits(plain, { fontFamily, bold: false })
    for (let s = size; s >= floor; s -= 1) {
      if (units * s <= width) return { ...fitMemoTitle(heading, { maxWidth: width, fontSize: s, minPt: s, lineHeight, fontFamily, bold: false }), lineHeight }
    }
  }
  const layout = fitMemoTitle(heading, { maxWidth: width, fontSize: size, minPt: Math.min(size, CLAIM.minPt), lineHeight, fontFamily, bold: false })
  return { ...layout, lineHeight }
}

/** The claim painted from its column's left, its last line's box ending on `foot`. A claim too long for its lines is cut and says so. */
export function LineupClaim({ heading, ctx, column, layout, dark = false }: { heading: string | undefined; ctx: ComponentCtx; column: LineupClaimColumn; layout?: EmphasisHeadingLayout; dark?: boolean }): React.ReactElement {
  const inks = lineupInks(ctx)
  const lineHeight = column.lineHeight ?? CLAIM.lineHeight
  const title = layout ?? fitLineupClaim(heading, ctx, column.w, column.size ?? CLAIM.size, lineHeight, column.maxLines ?? CLAIM.maxLines)
  const foot = column.foot ?? CLAIM.foot
  const ground = dark ? inks.stage : inks.ground
  const fill = lineupText(dark ? inks.light : inks.ink, ground, title.fontSize)
  const cut = title.truncated || title.lines.length > (column.maxLines ?? CLAIM.maxLines)
  return (
    <g data-lineup-claim="">
      {paintLineup(title, { ctx, x: column.x, top: foot - lineHeight * title.lines.length, fill, serif: true, ground, lastAttrs: cut ? { "data-truncated": "1" } : undefined })}
    </g>
  )
}

/**
 * The claim a composition places in a column of its own, or `null` when it
 * would not fit that column whole: the composition then declines the page.
 */
export function lineupClaimIn(slide: Pick<Slide, "heading">, ctx: ComponentCtx): (column: LineupClaimColumn) => React.ReactElement | null {
  return (column) => {
    if (!stripEmphasis(slide.heading ?? "").trim()) return null
    const lineHeight = column.lineHeight ?? CLAIM.lineHeight
    const maxLines = column.maxLines ?? CLAIM.maxLines
    const layout = fitLineupClaim(slide.heading, ctx, column.w, column.size ?? CLAIM.size, lineHeight, maxLines)
    if (layout.truncated || layout.lines.length > maxLines) return null
    return <LineupClaim heading={slide.heading} ctx={ctx} column={column} layout={layout} />
  }
}

/** How many lines the claim takes in a column: what a composition that moves its body by the claim reads. */
export function lineupClaimLines(heading: string | undefined, ctx: ComponentCtx, column: LineupClaimColumn): number {
  return fitLineupClaim(heading, ctx, column.w, column.size ?? CLAIM.size, column.lineHeight ?? CLAIM.lineHeight, column.maxLines ?? CLAIM.maxLines).lines.length
}

// ── The source ─────────────────────────────────────────────────────────

/** The page's source fitted to a column of `width`: the author's own line breaks kept, two lines at most, or `null` when there is none. */
export function fitLineupSource(slide: Pick<Slide, "footnote">, ctx: ComponentCtx, width: number = SOURCE.w): EmphasisHeadingLayout | null {
  const parts = (slide.footnote ?? "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (parts.length === 0) return null
  const fit = (text: string, maxLines: number) =>
    fitEmphasisText(text, { maxWidth: width, fontSize: SOURCE.size, minPt: SOURCE.size, maxLines, lineHeightRatio: SOURCE.lineHeight / SOURCE.size, fontFamily: ctx.fonts.body, bold: false })
  if (parts.length === 1) return { ...fit(parts[0]!, SOURCE.maxLines), lineHeight: SOURCE.lineHeight }
  const first = fit(parts[0]!, 1)
  const second = fit(parts.slice(1).join(" "), 1)
  return { ...first, lines: [...first.lines, ...second.lines], segments: [...first.segments, ...second.segments], lineHeight: SOURCE.lineHeight, truncated: first.truncated || second.truncated }
}

export function LineupSource({ source, ctx, x = SOURCE.x, top = SOURCE.top, dark = false }: { source: EmphasisHeadingLayout | null; ctx: ComponentCtx; x?: number; top?: number; dark?: boolean }): React.ReactElement | null {
  if (!source) return null
  const inks = lineupInks(ctx)
  const ground = dark ? inks.stage : inks.ground
  const ink = lineupMeta(dark ? inks.lightQuiet : inks.muted, ground)
  return <g data-lineup-source="">{paintLineup(source, { ctx, x, top, fill: ink, ground, attrs: { ...LINEUP_SPEC, ...LINEUP_META }, lastAttrs: source.truncated ? { "data-truncated": "1" } : undefined })}</g>
}

/** The source a composition places in a column of its own, or `undefined` when the page has none. The placer answers `null` when it would not fit. */
export function lineupSourceIn(slide: Pick<Slide, "footnote">, ctx: ComponentCtx): ((column: LineupSourceColumn) => React.ReactElement | null) | undefined {
  if (!slide.footnote?.trim()) return undefined
  return ({ x, w, top }) => {
    const source = fitLineupSource(slide, ctx, w)
    if (!source || source.truncated) return null
    return <LineupSource source={source} ctx={ctx} x={x} top={top ?? SOURCE.top} />
  }
}

// ── The bands ──────────────────────────────────────────────────────────

/** The band a composition is handed: the whole page, which it sets by its board's coordinates. */
export function lineupBandRect(): ContentRect {
  return { x: 0, y: 0, w: 1280, h: 720 }
}

/** The band the ordinary renderer sets a body in, under the claim. */
export function lineupBodyRect(): ContentRect {
  return { x: LINEUP_LEFT, y: BODY.top, w: LINEUP_W, h: BODY.bottom - BODY.top }
}
