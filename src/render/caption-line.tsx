import type { ComponentCtx } from "../components/types"
import { fitEmphasisLine, headingEmphasisPaint, renderEmphasisText } from "./emphasis"

/**
 * A picture's caption on one line, its `**…**` runs painted as marked runs.
 *
 * The image takeovers fitted `image.caption` as raw text, so a caption the
 * author marked printed its asterisks on the page (「示意图：**车间里的老工人**」)
 * on every theme whose photo page is a takeover. The caption is now fitted
 * with its marks stripped, at the same size and with the same measure as
 * before, so a caption with no mark keeps the bytes it had, and a marked run
 * is painted in the theme's emphasis against what the caption sits on.
 */

/** The size every takeover sets a caption at, and the floor it keeps. */
const CAPTION_SIZE = 16

export type FittedCaption = NonNullable<ReturnType<typeof fitEmphasisLine>>

/** `text` fitted to one line of `maxWidth`, or `null` for no caption. */
export function fitCaptionLine(text: string | undefined, maxWidth: number): FittedCaption | null {
  return fitEmphasisLine(text, { maxWidth, fontSize: CAPTION_SIZE, minFontSize: CAPTION_SIZE })
}

/**
 * Paints a fitted caption. `ground` is what the caption sits on (a dark band
 * over the photograph, or the page), for the marked run's ink.
 */
export function CaptionText({
  fitted,
  ctx,
  x,
  y,
  anchor,
  fill,
  fillOpacity,
  ground,
}: {
  fitted: FittedCaption
  ctx: ComponentCtx
  x: number
  y: number
  anchor?: "start" | "middle" | "end"
  fill: string
  fillOpacity?: number
  ground: string
}) {
  return renderEmphasisText(
    fitted.segments,
    headingEmphasisPaint(ctx, fitted, { baseFill: fill, fontFamily: ctx.fonts.body, bold: false, bg: ground }),
    <text
      data-truncated={fitted.truncated ? "1" : undefined}
      x={x}
      y={y}
      textAnchor={anchor}
      fontSize={fitted.fontSize}
      fontFamily={ctx.fonts.body}
      fill={fill}
      fillOpacity={fillOpacity}
      dominantBaseline="alphabetic"
    />,
  )
}
