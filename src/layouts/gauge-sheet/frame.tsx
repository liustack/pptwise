import type React from "react"
import type { Slide } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import type { ContentRect } from "../../render/layout"
import { paletteWithoutAccent } from "../../render/chart-palette"
import { fitEmphasisText, headingEmphasisPaint, renderEmphasisHeading } from "../../render/emphasis"
import { accessibleInk } from "../../render/ink"
import { GAUGE_LEFT, GAUGE_RIGHT, gaugeBodyRect } from "../gauge-shared"

/*
 * The body frame every brief sheet hands its content: the band under the
 * heading rule, less the standfirst when the page has a subheading.
 *
 * The approved board has no subheading on any content page, so the
 * standfirst is this frame's own answer to a field the author may still
 * write: one or two 20px muted lines just under the rule, and the body
 * starts below them. Leaving it unpainted would drop words the author wrote.
 */

const STANDFIRST_SIZE = 20
const STANDFIRST_LINE_HEIGHT = 28
const STANDFIRST_MAX_LINES = 2
/** First standfirst baseline: its cap height clears the y172 rule by 20px. */
const STANDFIRST_Y = 206
/** From the standfirst's last baseline to the top of the body band. */
const STANDFIRST_TO_BODY = 30

export interface SheetFrame {
  /** The subheading, painted, or `null` for a page without one. */
  standfirst: React.ReactElement | null
  /** The band the body draws in. */
  rect: ContentRect
}

export function sheetFrame(slide: Slide, ctx: ComponentCtx): SheetFrame {
  const band = gaugeBodyRect(slide)
  const source = slide.subheading?.trim()
  if (!source) return { standfirst: null, rect: band }
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const layout = fitEmphasisText(source, {
    maxWidth: GAUGE_RIGHT - GAUGE_LEFT,
    fontSize: STANDFIRST_SIZE,
    maxLines: STANDFIRST_MAX_LINES,
    minPt: STANDFIRST_SIZE,
    lineHeightRatio: STANDFIRST_LINE_HEIGHT / STANDFIRST_SIZE,
    fontFamily: fonts.body,
    bold: false,
  })
  const ink = accessibleInk(colors.muted, bg, layout.fontSize)
  const lastBaseline = STANDFIRST_Y + Math.max(0, layout.lines.length - 1) * layout.lineHeight
  const top = lastBaseline + STANDFIRST_TO_BODY
  const bottom = band.y + band.h
  const standfirst = (
    <g data-gauge-standfirst="">
      {renderEmphasisHeading(
        layout,
        headingEmphasisPaint(ctx, layout, { baseFill: ink, fontWeight: "400", fontFamily: fonts.body, bold: false }),
        (_line, index) => (
          <text
            key={index}
            data-truncated={layout.truncated && index === layout.lines.length - 1 ? "1" : undefined}
            x={GAUGE_LEFT}
            y={STANDFIRST_Y + index * layout.lineHeight}
            fontFamily={fonts.body}
            fontSize={layout.fontSize}
            fill={ink}
            dominantBaseline="alphabetic"
          />
        ),
      )}
    </g>
  )
  return { standfirst, rect: { ...band, y: top, h: bottom - top } }
}

/**
 * The paint context a brief sheet hands its body.
 *
 * The highlight yellow belongs to what the author marked (`**…**`, a series
 * or a bar with `emphasis`), never to a series that happens to be second in
 * the palette, so it leaves the chart palette here. `accent` itself stays:
 * a marked bar or phase still reads it.
 */
export function sheetCtx(ctx: ComponentCtx): ComponentCtx {
  return {
    ...ctx,
    colors: { ...ctx.colors, chartPalette: paletteWithoutAccent(ctx.colors.chartPalette, ctx.colors.accent) },
  }
}
