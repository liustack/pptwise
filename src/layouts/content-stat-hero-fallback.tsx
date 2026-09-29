import type { SvgTemplateProps } from "./types"
import { accessibleInk } from "../render/ink"
import { SvgContent } from "../render/svg-content"
import { stripEmphasis } from "../render/emphasis"
import { fitHeadingLines } from "../render/heading-fit"
import { stepAside } from "../render/step-aside"

/**
 * The page stat-hero hands over when its hero construction cannot hold what
 * the author wrote: more than one metric (`heroExact` in
 * `content-stat-hero.tsx`), or one figure too long to set whole on the hero
 * line at the skin's floor size (`fitHeroLine` in `sparse/shared.ts`).
 *
 * Its own module, not a function inside `content-stat-hero.tsx`, because the
 * eighteen theme skins under `sparse/` hand their page over too, and they are
 * reached from `content-stat-hero.tsx` through the skin registry. Importing
 * back into that file would close the cycle.
 */

/** The generic stat-hero face's own column, so the page reads as the same sheet. */
const COLUMN_X = 160
const COLUMN_W = 1280 - COLUMN_X * 2
const FALLBACK_HEADING_Y = 150
const FALLBACK_RECT = { x: COLUMN_X, y: 230, w: COLUMN_W, h: 400 } as const

/** The whole page, drawn plainly, when the hero construction cannot hold it. */
export function StatHeroFallbackContent({ slide, ctx }: Pick<SvgTemplateProps, "slide" | "ctx">) {
  const { colors, fonts } = ctx
  const defaultBg = ctx.defaultBg ?? colors.bg
  const heading = fitHeadingLines(stripEmphasis(slide.heading ?? ""), {
    maxWidth: COLUMN_W,
    fontSize: 44,
    maxLines: 2,
    minPt: 28,
    lineHeightRatio: 1.28,
    fontFamily: fonts.heading,
  })
  const headingStart = FALLBACK_HEADING_Y - Math.max(0, heading.lines.length - 1) * heading.lineHeight
  // A fixed 400px band inside a 960px column. The hero page gives its body
  // less room than an ordinary page would, so ask before drawing it.
  const aside = stepAside({ face: "stat-hero", slide, ctx, bodyRect: FALLBACK_RECT })
  if (aside) return aside
  return (
    <g data-hero-mode="fallback">
      {heading.lines.map((line, i) => (
        <text
          key={`heading-${i}`}
          data-truncated={heading.truncated && i === heading.lines.length - 1 ? "1" : undefined}
          x={COLUMN_X}
          y={headingStart + i * heading.lineHeight}
          fontFamily={fonts.heading}
          fontSize={heading.fontSize}
          fontWeight="700"
          fill={accessibleInk(colors.text, defaultBg, heading.fontSize)}
          dominantBaseline="alphabetic"
        >
          {line}
        </text>
      ))}
      <SvgContent components={slide.components} rect={FALLBACK_RECT} ctx={ctx} />
    </g>
  )
}
