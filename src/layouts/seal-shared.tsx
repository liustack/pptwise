import type { Slide } from "@/ir"
import type { ComponentCtx } from "../components/types"
import type { ContentRect } from "../render/layout"
import type { PageRenderContext } from "../render/page-context"
import { footnoteBaselineFor } from "../render/branding-geometry"
import { accessibleInk } from "../render/ink"
import { fitEmphasisHeading, fitEmphasisText, headingEmphasisPaint, renderEmphasisHeading, type EmphasisHeadingLayout } from "../render/emphasis"
import { SEAL_SPEC } from "./compositions/seal"
import { centredBaseline } from "./compositions/type"

/*
 * The seal frame: the one header every vermilion content page wears, and the
 * source line under its body. Settled on vermilion's 2026-10 board
 * (`design/rounds/2026-10-04-vermilion/`).
 *
 * The page is a formal report. The gold double rule along its top edge is the
 * theme's motif (`vermilion-motif`), not this frame. Under it the claim stands
 * centred and bold at 34/44 in the primary colour, across the whole 1120px
 * measure from x80, at most two lines, set on its last line so a one-line
 * claim and a two-line one end on the same baseline. A claim never breaks
 * early: it wraps only when it does not fit the measure, and then its lines
 * are evened (a Chinese claim breaks at its comma). Under it a 64 by 2 bar in
 * the accent stands centred, the frame's one ornament.
 *
 * The body runs from y186 to y648, and the source sits at the foot in 14/20
 * muted type from y660, at most two lines. The source is the one text a seal
 * page sets under 16px outside its body, at the board's size, with the
 * `seal-spec` exemption the L1 audit knows.
 */

export const SEAL_LEFT = 80
export const SEAL_RIGHT = 1200
export const SEAL_W = SEAL_RIGHT - SEAL_LEFT
const CENTRE = 640
/** The claim's box: up to two 44px lines ending at y140. */
const HEAD = { size: 34, lineHeight: 44, foot: 140, minPt: 28, maxLines: 2 } as const
/** The accent bar under the claim. */
const BAR = { w: 64, h: 2, y: 154 } as const
export const SEAL_BODY_TOP = 186
export const SEAL_BODY_BOTTOM = 648
const SOURCE = { top: 660, size: 14, lineHeight: 20, maxLines: 2 } as const
const SOURCE_CLEARANCE = 12

/** The heading fit `SealHead` runs, in the shape `LayoutDefinition.headingFit` takes. */
export const SEAL_HEAD_FIT = {
  maxWidth: SEAL_W,
  fontSize: HEAD.size,
  maxLines: HEAD.maxLines,
  minPt: HEAD.minPt,
  bold: true,
  lineHeightRatio: HEAD.lineHeight / HEAD.size,
} as const

/** Fits a seal claim, `**marked**` runs kept for the paint. */
export function fitSealHead(heading: string | undefined, ctx: ComponentCtx, maxWidth: number = SEAL_W, size: number = HEAD.size): EmphasisHeadingLayout {
  return fitEmphasisHeading(heading, {
    ...SEAL_HEAD_FIT,
    maxWidth,
    fontSize: size,
    minPt: Math.min(HEAD.minPt, size),
    lineHeightRatio: Math.round((size * HEAD.lineHeight) / HEAD.size) / size,
    fontFamily: ctx.fonts.heading,
  })
}

/**
 * The claim and its accent bar. `anchor` sets the claim centred on the page
 * (every content page) or from `x` (the photo page's column). A claim too
 * long for two lines shrinks toward 28px and is then cut with
 * `data-truncated` on its last line.
 */
export function SealHead({
  heading,
  ctx,
  x = SEAL_LEFT,
  maxWidth = SEAL_W,
  foot = HEAD.foot,
  size = HEAD.size,
  anchor = "middle",
  barY = BAR.y,
}: {
  heading: string | undefined
  ctx: ComponentCtx
  x?: number
  maxWidth?: number
  foot?: number
  size?: number
  anchor?: "middle" | "start"
  barY?: number
}) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const title = fitSealHead(heading, ctx, maxWidth, size)
  const ink = accessibleInk(colors.primary, bg, title.fontSize)
  const last = centredBaseline(foot - title.lineHeight, title.lineHeight, title.fontSize)
  const first = last - Math.max(0, title.lines.length - 1) * title.lineHeight
  const textX = anchor === "middle" ? x + maxWidth / 2 : x
  const barX = anchor === "middle" ? CENTRE - BAR.w / 2 : x
  return (
    <g data-seal-head="">
      {renderEmphasisHeading(
        title,
        headingEmphasisPaint(ctx, title, { baseFill: ink, fontWeight: "700", fontFamily: fonts.heading, bold: true }),
        (_line, index) => (
          <text
            key={index}
            data-truncated={title.truncated && index === title.lines.length - 1 ? "1" : undefined}
            x={textX}
            y={first + index * title.lineHeight}
            textAnchor={anchor === "middle" ? "middle" : undefined}
            fontFamily={fonts.heading}
            fontSize={title.fontSize}
            fontWeight="700"
            fill={ink}
            dominantBaseline="alphabetic"
          />
        ),
      )}
      <rect x={barX} y={barY} width={BAR.w} height={BAR.h} fill={colors.accent} />
    </g>
  )
}

export interface SealSourceLayout {
  layout: EmphasisHeadingLayout
  /** Baseline of the first line. */
  firstBaseline: number
  /** Where the source's ink starts. */
  top: number
}

/**
 * The source fitted `w` wide in up to two lines from y660, or above the
 * footer row when the page carries one, or `null` for an empty source.
 */
export function fitSealSource(slide: Pick<Slide, "footnote">, ctx: ComponentCtx, page?: PageRenderContext, w: number = SEAL_W, top: number = SOURCE.top): SealSourceLayout | null {
  const source = slide.footnote?.trim()
  if (!source) return null
  const layout = fitEmphasisText(source, {
    maxWidth: w,
    fontSize: SOURCE.size,
    minPt: SOURCE.size,
    maxLines: SOURCE.maxLines,
    lineHeightRatio: SOURCE.lineHeight / SOURCE.size,
    fontFamily: ctx.fonts.body,
    bold: false,
  })
  const lines = Math.max(1, layout.lines.length)
  const firstBaseline = page?.footerRow
    ? footnoteBaselineFor(SOURCE.size) - (lines - 1) * SOURCE.lineHeight
    : centredBaseline(top, SOURCE.lineHeight, SOURCE.size)
  return { layout: { ...layout, lineHeight: SOURCE.lineHeight }, firstBaseline, top: firstBaseline - SOURCE.size }
}

/** The source as the author wrote it, 14px muted, the `seal-spec` exemption on each line. */
export function SealSource({ source, ctx, x = SEAL_LEFT }: { source: SealSourceLayout | null; ctx: ComponentCtx; x?: number }) {
  if (!source) return null
  const { colors, fonts } = ctx
  const ink = accessibleInk(colors.muted, ctx.defaultBg ?? colors.bg, SOURCE.size)
  const { layout } = source
  return (
    <g data-seal-source="">
      {renderEmphasisHeading(
        layout,
        headingEmphasisPaint(ctx, layout, { baseFill: ink, fontWeight: "700", fontFamily: fonts.body, bold: false }),
        (_line, index) => (
          <text
            key={index}
            {...SEAL_SPEC}
            data-truncated={layout.truncated && index === layout.lines.length - 1 ? "1" : undefined}
            x={x}
            y={source.firstBaseline + index * SOURCE.lineHeight}
            fontFamily={fonts.body}
            fontSize={layout.fontSize}
            fill={ink}
            dominantBaseline="alphabetic"
          />
        ),
      )}
    </g>
  )
}

/** The body band from y186 down to y648, or above a source moved up for a footer row. */
export function sealBodyRect(source: SealSourceLayout | null, page?: PageRenderContext, top = SEAL_BODY_TOP): ContentRect {
  const floor = page?.footerRow && source ? source.top - SOURCE_CLEARANCE : page?.footerRow ? footnoteBaselineFor(SOURCE.size) - 26 : SEAL_BODY_BOTTOM
  const bottom = Math.min(SEAL_BODY_BOTTOM, floor)
  return { x: SEAL_LEFT, y: top, w: SEAL_W, h: bottom - top }
}
