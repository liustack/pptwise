import type { ComponentCtx } from "../components/types"
import { footnoteBaselineFor } from "./branding-geometry"
import { fitEmphasisLine, headingEmphasisPaint, renderEmphasisText } from "./emphasis"

/**
 * A face's footnote line (`slide.footnote`), set on one line inside the
 * width the face gives it.
 *
 * Three faces (`bento-panel`, `tone-adaptive-content`, `stacked-poster`)
 * printed the footnote as raw text at 20px with no measure at all: a long
 * English source ran past the type area, and a `**…**` run printed its
 * asterisks. Here the line shrinks to 16px first, is cut with
 * `data-truncated` only past that, and paints a marked run in the theme's
 * emphasis. A footnote that fits at the face's own size keeps the bytes the
 * face drew before.
 */
export function FaceFootnote({
  text,
  ctx,
  x,
  maxWidth,
  fontSize = 20,
  fill,
  italic = true,
  letterSpacing,
}: {
  text: string | undefined
  ctx: ComponentCtx
  x: number
  maxWidth: number
  fontSize?: number
  fill: string
  italic?: boolean
  letterSpacing?: number
}) {
  const source = text?.trim()
  if (!source) return null
  // Tracking widens every gap, so the line is fitted to what is left after it.
  const tracking = letterSpacing ? letterSpacing * Array.from(source).length : 0
  const fitted = fitEmphasisLine(text, { maxWidth: maxWidth - tracking, fontSize, minFontSize: 16, fontFamily: ctx.fonts.body })
  if (!fitted) return null
  return renderEmphasisText(
    fitted.segments,
    headingEmphasisPaint(ctx, fitted, { baseFill: fill, fontFamily: ctx.fonts.body, bold: false }),
    <text
      data-truncated={fitted.truncated ? "1" : undefined}
      x={x}
      y={footnoteBaselineFor(fitted.fontSize)}
      fontFamily={ctx.fonts.body}
      fontSize={fitted.fontSize}
      fill={fill}
      letterSpacing={letterSpacing}
      fontStyle={italic ? "italic" : undefined}
      dominantBaseline="alphabetic"
    />,
  )
}
