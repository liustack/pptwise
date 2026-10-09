import type { Slide } from "@/ir"
import type { ComponentCtx } from "../components/types"
import type { ContentRect } from "../render/layout"
import type { PageRenderContext } from "../render/page-context"
import { footnoteBaselineFor } from "../render/branding-geometry"
import {
  fitEmphasisHeading,
  fitEmphasisText,
  headingEmphasisPaint,
  renderEmphasisHeading,
  type EmphasisHeadingLayout,
} from "../render/emphasis"
import { accessibleInk } from "../render/ink"
import { serifBaseline } from "./compositions/panel"
import { centredBaseline } from "./compositions/type"

/*
 * The panel frame: the one header every ledger content page wears, and the
 * source line under its body. Settled on ledger's 2026-10 board
 * (`design/rounds/2026-10-04-ledger/`).
 *
 * The page is a market screen. The status bar along its top edge is the
 * theme's motif (`poster-motif`), not this frame. Under it the claim stands
 * in the heading face, regular weight, 31/42, across the whole 1152px type
 * area from x64, at most two lines, set on its last line so a one-line claim
 * and a two-line one end on the same baseline: a claim never breaks early,
 * it wraps only when it does not fit the measure. No rule under it: the
 * panels below are the structure.
 *
 * The body runs from y152 to y648, and the source sits at the foot in 13/18
 * muted type from y664, at most two lines. The source is the one text a
 * panel page sets under 16px outside its panels, at the board's size, with
 * the `panel-spec` exemption the L1 audit knows.
 */

export const PANEL_LEFT = 64
export const PANEL_RIGHT = 1216
export const PANEL_W = PANEL_RIGHT - PANEL_LEFT
/** The claim's box: two 42px lines ending at y130. */
const HEAD = { size: 31, lineHeight: 42, foot: 130, minPt: 26, maxLines: 2 } as const
/** Top of the body band, and its foot. */
export const PANEL_BODY_TOP = 152
export const PANEL_BODY_BOTTOM = 648
/** The source's 18px line boxes from y664. */
const SOURCE = { top: 664, size: 13, lineHeight: 18, maxLines: 2 } as const
/** How far the body stops above a source line moved up for a footer row. */
const SOURCE_CLEARANCE = 12

/** The heading fit `PanelHead` runs, in the shape `LayoutDefinition.headingFit` takes. */
export const PANEL_HEAD_FIT = {
  maxWidth: PANEL_W,
  fontSize: HEAD.size,
  maxLines: HEAD.maxLines,
  minPt: HEAD.minPt,
  bold: false,
  lineHeightRatio: HEAD.lineHeight / HEAD.size,
} as const

/** Fits a panel page's claim, `**marked**` runs kept for the paint. */
export function fitPanelHead(heading: string | undefined, ctx: ComponentCtx, maxWidth: number = PANEL_W): EmphasisHeadingLayout {
  return fitEmphasisHeading(heading, { ...PANEL_HEAD_FIT, maxWidth, fontFamily: ctx.fonts.heading })
}

/**
 * The claim, set on its last line at `foot` (y130 on a content page). A
 * claim too long for two lines shrinks toward 26px and is then cut with
 * `data-truncated` on its last line.
 */
export function PanelHead({
  heading,
  ctx,
  x = PANEL_LEFT,
  maxWidth = PANEL_W,
  foot = HEAD.foot,
  size,
}: {
  heading: string | undefined
  ctx: ComponentCtx
  x?: number
  maxWidth?: number
  foot?: number
  /** A face that sets the claim at another size, with the same line ratio. */
  size?: number
}) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const fontSize = size ?? HEAD.size
  const lineHeight = Math.round((fontSize * HEAD.lineHeight) / HEAD.size)
  const title = fitEmphasisHeading(heading, {
    ...PANEL_HEAD_FIT,
    maxWidth,
    fontSize,
    minPt: Math.min(HEAD.minPt, fontSize),
    lineHeightRatio: lineHeight / fontSize,
    fontFamily: fonts.heading,
  })
  const ink = accessibleInk(colors.text, bg, title.fontSize)
  const last = serifBaseline(foot - title.lineHeight, title.lineHeight, title.fontSize)
  const first = last - Math.max(0, title.lines.length - 1) * title.lineHeight
  return (
    <g data-panel-head="">
      {renderEmphasisHeading(
        title,
        headingEmphasisPaint(ctx, title, { baseFill: ink, fontWeight: "400", fontFamily: fonts.heading, bold: false }),
        (_line, index) => (
          <text
            key={index}
            data-truncated={title.truncated && index === title.lines.length - 1 ? "1" : undefined}
            x={x}
            y={first + index * title.lineHeight}
            fontFamily={fonts.heading}
            fontSize={title.fontSize}
            fill={ink}
            dominantBaseline="alphabetic"
          />
        ),
      )}
    </g>
  )
}

export interface PanelSourceLayout {
  layout: EmphasisHeadingLayout
  /** Baseline of the first line. */
  firstBaseline: number
  /** Where the source's ink starts. */
  top: number
}

/**
 * The source line fitted `w` wide in up to two lines from y664, or above
 * the footer row when the page carries one, or `null` for an empty source.
 */
export function fitPanelSource(
  slide: Pick<Slide, "footnote">,
  ctx: ComponentCtx,
  page?: PageRenderContext,
  w: number = PANEL_W,
): PanelSourceLayout | null {
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
    : centredBaseline(SOURCE.top, SOURCE.lineHeight, SOURCE.size)
  return { layout: { ...layout, lineHeight: SOURCE.lineHeight }, firstBaseline, top: firstBaseline - SOURCE.size }
}

/** The source as the author wrote it, 13px muted, the `panel-spec` exemption on each line. */
export function PanelSource({ source, ctx, x = PANEL_LEFT }: { source: PanelSourceLayout | null; ctx: ComponentCtx; x?: number }) {
  if (!source) return null
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const ink = accessibleInk(colors.muted, bg, SOURCE.size)
  const { layout } = source
  return (
    <g data-panel-source="">
      {renderEmphasisHeading(
        layout,
        headingEmphasisPaint(ctx, layout, { baseFill: ink, fontWeight: "700", fontFamily: fonts.body, bold: false }),
        (_line, index) => (
          <text
            key={index}
            data-font-floor-exempt="panel-spec"
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

/** The body band from y152 down to y648, or above a source moved up for a footer row. */
export function panelBodyRect(source: PanelSourceLayout | null, page?: PageRenderContext, top = PANEL_BODY_TOP): ContentRect {
  const floor = page?.footerRow && source ? source.top - SOURCE_CLEARANCE : page?.footerRow ? footnoteBaselineFor(SOURCE.size) - 26 : PANEL_BODY_BOTTOM
  const bottom = Math.min(PANEL_BODY_BOTTOM, floor)
  return { x: PANEL_LEFT, y: top, w: PANEL_W, h: bottom - top }
}

/**
 * A subheading, when a page carries one: muted lines under the claim, the
 * body moved down under them. Its box starts `under` px below the claim's
 * foot (y142 under the sheet's y130).
 */
const STANDFIRST = { under: 12, size: 17, lineHeight: 24, maxLines: 2, gap: 14 } as const

export interface PanelStandfirstLayout {
  layout: EmphasisHeadingLayout
  /** Top of its first line box. */
  top: number
  /** Where the body starts under it. */
  bodyTop: number
}

/**
 * `width` and `headFoot` are the measure it is set on and the claim's foot
 * over it: the sheet's, or the column's beside a photograph
 * (`image-panel-split.tsx`).
 */
export function fitPanelStandfirst(text: string | undefined, ctx: ComponentCtx, width: number = PANEL_W, headFoot: number = HEAD.foot): PanelStandfirstLayout | null {
  const sub = text?.trim()
  if (!sub) return null
  const layout = fitEmphasisText(sub, {
    maxWidth: width,
    fontSize: STANDFIRST.size,
    minPt: STANDFIRST.size,
    maxLines: STANDFIRST.maxLines,
    lineHeightRatio: STANDFIRST.lineHeight / STANDFIRST.size,
    fontFamily: ctx.fonts.body,
    bold: false,
  })
  const top = headFoot + STANDFIRST.under
  return { layout: { ...layout, lineHeight: STANDFIRST.lineHeight }, top, bodyTop: top + layout.lines.length * STANDFIRST.lineHeight + STANDFIRST.gap }
}

export function PanelStandfirst({ layout, ctx, x = PANEL_LEFT }: { layout: PanelStandfirstLayout; ctx: ComponentCtx; x?: number }) {
  const { colors, fonts } = ctx
  const ink = accessibleInk(colors.muted, ctx.defaultBg ?? colors.bg, STANDFIRST.size)
  const first = centredBaseline(layout.top, STANDFIRST.lineHeight, STANDFIRST.size)
  return (
    <g data-panel-standfirst="">
      {renderEmphasisHeading(
        layout.layout,
        headingEmphasisPaint(ctx, layout.layout, { baseFill: ink, fontWeight: "700", fontFamily: fonts.body, bold: false }),
        (_line, index) => (
          <text
            key={index}
            data-truncated={layout.layout.truncated && index === layout.layout.lines.length - 1 ? "1" : undefined}
            x={x}
            y={first + index * STANDFIRST.lineHeight}
            fontFamily={fonts.body}
            fontSize={layout.layout.fontSize}
            fill={ink}
            dominantBaseline="alphabetic"
          />
        ),
      )}
    </g>
  )
}
