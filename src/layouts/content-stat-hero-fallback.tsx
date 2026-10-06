import type { SvgTemplateProps } from "./types"
import { accessibleInk } from "../render/ink"
import { SvgContent } from "../render/svg-content"
import { stripEmphasis } from "../render/emphasis"
import { fitHeadingLines } from "../render/heading-fit"
import { stepAside } from "../render/step-aside"
import { footnoteBaselineFor } from "../render/branding-geometry"
import { fitSvgLine } from "../lib/svg-text-layout"

/**
 * The page stat-hero hands over when its hero construction cannot hold what
 * the author wrote: more than one metric, a figure with an icon, a delta, a
 * note, a tag or a tone, a heading the figure does not repeat, or a
 * subheading beside a cited source (`heroExact` in `content-stat-hero.tsx`),
 * or one figure too long to set whole on the hero line at the skin's floor
 * size (`fitHeroLine` in `sparse/shared.ts`).
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
const SUBHEADING_SIZE = 22
/** Below the heading's last baseline, clear of the body band at y=230. */
const SUBHEADING_GAP = 40
const FOOTNOTE_SIZE = 16
/** Air between the body band and the footnote's cap height. */
const FOOTNOTE_AIR = 16

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
  // The hero face sets these as its caption and source, so the page it hands
  // over keeps them: a plain page that dropped them would lose them unmarked.
  const subheadingText = stripEmphasis(slide.subheading ?? "").trim()
  const subheading = subheadingText
    ? fitSvgLine(subheadingText, { maxWidth: COLUMN_W, fontSize: SUBHEADING_SIZE, minFontSize: 16, fontFamily: fonts.body })
    : null
  const footnoteText = stripEmphasis(slide.footnote ?? "").trim()
  const footnote = footnoteText
    ? fitSvgLine(footnoteText, { maxWidth: COLUMN_W, fontSize: FOOTNOTE_SIZE, minFontSize: 16, fontFamily: fonts.body })
    : null
  const footnoteY = footnote ? footnoteBaselineFor(footnote.fontSize) : 0
  const bodyRect = footnote
    ? {
        ...FALLBACK_RECT,
        h: Math.min(FALLBACK_RECT.h, footnoteY - footnote.fontSize - FOOTNOTE_AIR - FALLBACK_RECT.y),
      }
    : FALLBACK_RECT
  // A fixed band of at most 400px inside a 960px column. The hero page gives
  // its body less room than an ordinary page would, so ask before drawing it.
  const aside = stepAside({ face: "stat-hero", slide, ctx, bodyRect })
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
      {subheading && (
        <text
          data-truncated={subheading.truncated ? "1" : undefined}
          x={COLUMN_X}
          y={FALLBACK_HEADING_Y + SUBHEADING_GAP}
          fontFamily={fonts.body}
          fontSize={subheading.fontSize}
          fill={accessibleInk(colors.muted, defaultBg, subheading.fontSize)}
          dominantBaseline="alphabetic"
        >
          {subheading.text}
        </text>
      )}
      <SvgContent components={slide.components} rect={bodyRect} ctx={ctx} />
      {footnote && (
        <text
          data-truncated={footnote.truncated ? "1" : undefined}
          x={COLUMN_X}
          y={footnoteY}
          fontFamily={fonts.body}
          fontSize={footnote.fontSize}
          fill={accessibleInk(colors.muted, defaultBg, footnote.fontSize)}
          dominantBaseline="alphabetic"
        >
          {footnote.text}
        </text>
      )}
    </g>
  )
}
