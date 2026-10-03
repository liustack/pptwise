import type { PptxIR, Slide } from "@/ir"
import type { ComponentCtx } from "../components/types"
import type { ContentRect } from "../render/layout"
import type { PageRenderContext } from "../render/page-context"
import { chapterNumberFor, sectionNameFor } from "../lib/derive"
import { measureTextUnits } from "../lib/svg-text-layout"
import { footnoteBaselineFor } from "../render/branding-geometry"
import { accessibleInk } from "../render/ink"
import {
  emphasisRunInk,
  fitEmphasisHeading,
  headingEmphasisPaint,
  renderEmphasisHeading,
  stripEmphasis,
  type EmphasisHeadingLayout,
} from "../render/emphasis"
import { centredBaseline } from "./compositions/type"
import { fitNoticeSource, NoticeSource, type NoticeSourceLayout } from "./notice-shared"

/*
 * The grid frame: the one header every swiss content page wears, and the
 * source line under its body. Settled on swiss's 2026-10 board
 * (`design/rounds/2026-10-03-swiss/`).
 *
 * Over the claim, a small line says where the page sits: the chapter's
 * number in the theme's emphasis ink (its red) and the chapter's name in
 * muted ink, at 15px. A deck with no chapter before the page prints no line.
 * The claim is black and bold at 34/46, at most two lines across the whole
 * type area, 1120px from x80, set on its last line so a one-line claim and a
 * two-line one end on the same baseline. Under it a 2px black rule runs the
 * type area at y180. The red bar along the top edge is the theme's motif,
 * not this frame.
 *
 * The source is the notice frame's: 14px muted on a fixed baseline at the
 * foot (`NoticeSource`). The small line and the source are the two texts a
 * grid page sets under 16px, both at the board's size, and both carry the
 * `grid-spec` exemption the L1 audit knows.
 */

export const GRID_LEFT = 80
export const GRID_RIGHT = 1200
export const GRID_W = GRID_RIGHT - GRID_LEFT
/** The small line over the claim: a 22px box from y44. */
const KICKER = { top: 44, box: 22, size: 15, gap: 12, minNumberW: 16 }
/** The claim's box: its last line's box ends at y166. */
const HEAD = { size: 34, lineHeight: 46, foot: 166, minPt: 28, maxLines: 2 }
/** The rule under the claim. */
export const GRID_RULE_Y = 180
export const GRID_RULE_H = 2
/** Top of the body band. */
export const GRID_BODY_TOP = 196
/** Lowest y body ink may reach with a source line, and without one. */
export const GRID_BODY_BOTTOM_WITH_SOURCE = 640
export const GRID_BODY_BOTTOM = 660
/** Baseline of a one-line source. A second line sits 20px under it. */
export const GRID_SOURCE_BASELINE = 666
/** How far the body stops above the source line's ink. */
const SOURCE_CLEARANCE = 12

/** The heading fit `GridHead` runs, in the shape `LayoutDefinition.headingFit` takes. */
export const GRID_HEAD_FIT = {
  maxWidth: GRID_W,
  fontSize: HEAD.size,
  maxLines: HEAD.maxLines,
  minPt: HEAD.minPt,
  bold: true,
  lineHeightRatio: HEAD.lineHeight / HEAD.size,
} as const

/** Where a page sits: its chapter's number and name, or `null` before the first chapter. */
export interface GridKicker {
  number: string
  name: string
}

/** The chapter a page sits in, read from the deck's chapter pages. */
export function gridKicker(ir: Pick<PptxIR, "slides">, index: number): GridKicker | null {
  const n = chapterNumberFor(ir.slides, index)
  if (n <= 0) return null
  return { number: String(n), name: stripEmphasis(sectionNameFor(ir.slides, index) ?? "").trim() }
}

/** Fits a grid heading. `**marked**` runs survive the fit and paint in the theme's emphasis. */
export function fitGridHead(heading: string | undefined, ctx: ComponentCtx): EmphasisHeadingLayout {
  return fitEmphasisHeading(heading, { ...GRID_HEAD_FIT, fontFamily: ctx.fonts.heading })
}

/**
 * The grid header: the small line, the claim and the 2px rule. A claim too
 * long for two lines shrinks toward 28px and is then cut with
 * `data-truncated` on its last line. The rule is the page's frame and is
 * drawn under an empty claim too.
 */
export function GridHead({ heading, ctx, kicker }: { heading: string | undefined; ctx: ComponentCtx; kicker: GridKicker | null }) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const title = fitGridHead(heading, ctx)
  const ink = accessibleInk(colors.text, bg, title.fontSize)
  const lastBaseline = centredBaseline(HEAD.foot - HEAD.lineHeight, HEAD.lineHeight, title.fontSize)
  const firstBaseline = lastBaseline - Math.max(0, title.lines.length - 1) * title.lineHeight
  const kickerBaseline = centredBaseline(KICKER.top, KICKER.box, KICKER.size)
  const numberW = kicker ? measureTextUnits(kicker.number, { fontFamily: fonts.body, bold: true }) * KICKER.size : 0
  const nameX = GRID_LEFT + Math.max(KICKER.minNumberW, numberW) + KICKER.gap
  return (
    <g data-grid-head="">
      {kicker && (
        <g data-grid-kicker="">
          <text
            data-font-floor-exempt="grid-spec"
            x={GRID_LEFT}
            y={kickerBaseline}
            fontFamily={fonts.body}
            fontSize={KICKER.size}
            fontWeight="700"
            fill={accessibleInk(emphasisRunInk(colors), bg, KICKER.size)}
            dominantBaseline="alphabetic"
          >
            {kicker.number}
          </text>
          {kicker.name && (
            <text
              data-font-floor-exempt="grid-spec"
              x={nameX}
              y={kickerBaseline}
              fontFamily={fonts.body}
              fontSize={KICKER.size}
              fill={accessibleInk(colors.muted, bg, KICKER.size)}
              dominantBaseline="alphabetic"
            >
              {kicker.name}
            </text>
          )}
        </g>
      )}
      <FittedLines layout={title} ctx={ctx} x={GRID_LEFT} y={firstBaseline} fill={ink} bold />
      <rect x={GRID_LEFT} y={GRID_RULE_Y} width={GRID_W} height={GRID_RULE_H} fill={accessibleInk(colors.text, bg, HEAD.size)} />
    </g>
  )
}

/**
 * A fitted heading or standfirst, one `<text>` per line, its marked runs in
 * the theme's emphasis, and `data-truncated` on its last line when the fit
 * had to cut it.
 */
export function FittedLines({
  layout,
  ctx,
  x,
  y,
  fill,
  bold = false,
  fontFamily,
}: {
  layout: EmphasisHeadingLayout
  ctx: ComponentCtx
  x: number
  /** Baseline of the first line. */
  y: number
  fill: string
  bold?: boolean
  fontFamily?: string
}) {
  const family = fontFamily ?? (bold ? ctx.fonts.heading : ctx.fonts.body)
  return (
    <>
      {renderEmphasisHeading(
        layout,
        headingEmphasisPaint(ctx, layout, { baseFill: fill, fontWeight: "700", fontFamily: family, bold }),
        (_line, index) => (
          <text
            key={index}
            data-truncated={layout.truncated && index === layout.lines.length - 1 ? "1" : undefined}
            x={x}
            y={y + index * layout.lineHeight}
            fontFamily={family}
            fontSize={layout.fontSize}
            fontWeight={bold ? "700" : undefined}
            fill={fill}
            dominantBaseline="alphabetic"
          />
        ),
      )}
    </>
  )
}

/** The source's last baseline: the board's, or above the footer rule when the page carries a footer row. */
export function gridSourceBaseline(page: PageRenderContext | undefined): number {
  return page?.footerRow ? footnoteBaselineFor(14) : GRID_SOURCE_BASELINE
}

/** The source line fitted across the type area, or `null`. */
export function fitGridSource(slide: Pick<Slide, "footnote">, ctx: ComponentCtx, page?: PageRenderContext, w = GRID_W): NoticeSourceLayout | null {
  return fitNoticeSource(slide.footnote, ctx, w, gridSourceBaseline(page))
}

/** The source line, set as the author wrote it at 14px, the `grid-spec` exemption on each line. */
export function GridSource({ source, ctx, x = GRID_LEFT }: { source: NoticeSourceLayout | null; ctx: ComponentCtx; x?: number }) {
  return <NoticeSource source={source} ctx={ctx} x={x} exempt="grid-spec" />
}

/** The body band under the rule, down to the source line, or to the foot clearance without one. */
export function gridBodyRect(source: NoticeSourceLayout | null, page?: PageRenderContext, top = GRID_BODY_TOP): ContentRect {
  const floor = page?.footerRow ? footnoteBaselineFor(14) - 26 : source ? GRID_BODY_BOTTOM_WITH_SOURCE : GRID_BODY_BOTTOM
  const bottom = source ? Math.min(floor, source.top - SOURCE_CLEARANCE) : floor
  return { x: GRID_LEFT, y: top, w: GRID_W, h: bottom - top }
}
