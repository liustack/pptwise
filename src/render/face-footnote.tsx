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
 *
 * Set upright unless the face asks for italic. Chinese has no italic, and a
 * renderer that slants it draws a synthetic oblique of the whole line, so a
 * line with Chinese in it is upright even then. The default used to be
 * italic, which put every face that called this without a word on it into
 * a slant it never chose.
 */

/** Han characters, CJK punctuation and full-width forms: a line holding any is never slanted. */
const UPRIGHT = /[\u3000-\u303f\u3400-\u9fff\uf900-\ufaff\uff00-\uffef]/u
export function FaceFootnote({
  text,
  ctx,
  x,
  maxWidth,
  fontSize = 20,
  fill,
  italic = false,
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
      fontStyle={italic && !UPRIGHT.test(source) ? "italic" : undefined}
      dominantBaseline="alphabetic"
    />,
  )
}
