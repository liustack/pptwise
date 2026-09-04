import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { sectionNameFor } from "../lib/derive"
import { fitSvgLine } from "../lib/svg-text-layout"
import { fitHeadingLines } from "../render/heading-fit"
import { fitEmphasisText, headingEmphasisPaint, renderEmphasisHeading, stripEmphasis } from "../render/emphasis"
import { accessibleInk } from "../render/ink"
import { statementLines } from "./minimal-shared"
import {
  CREATIVE_PURPLE,
  CrayonboxDecorPiece,
  CrayonboxSunDoodle,
  GRASS_GREEN,
  SKY_BLUE,
  doodleRays,
  withoutOverflowMark,
} from "./crayonbox-shared"

const TITLE_X = 96
const TITLE_Y = 330
const TITLE_SIZE = 64
const TITLE_MIN_PT = 38
const TITLE_MAX_LINES = 2
const TITLE_MAX_W = 700
const TITLE_LINE_HEIGHT = 88

const SOURCE_X = 96
const SOURCE_Y = 500

/**
 * The quote block, when the page's body component is a `blockquote`.
 *
 * Same defect this face shared with `gauge-point`: it read the attribution
 * and left the quote itself unpainted, so a page said who spoke and never
 * what they said. The block sits under the crayon underline, clear of the
 * sun doodle (which ends around y=422), and the speaker closes underneath.
 */
const QUOTE_X = 96
const QUOTE_Y = 496
const QUOTE_SIZE = 24
const QUOTE_MAX_LINES = 3
const QUOTE_LINE_RATIO = 1.5
const QUOTE_MAX_W = 1000
const QUOTE_SOURCE_GAP = 46

/** crayonbox-point：一条大结论与右侧特大太阳组成的疏内容页。 */
export function CrayonboxPointContent({ ir, slide, index, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const sectionSource = sectionNameFor(ir.slides, index)
  const section = sectionSource
    ? fitSvgLine(sectionSource, {
        maxWidth: 176,
        fontSize: 18,
        minFontSize: 16,
        fontFamily: fonts.body,
      })
    : null
  const heading = fitHeadingLines(stripEmphasis(slide.heading ?? ""), {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    bold: true,
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
    fontFamily: fonts.heading,
    typeScale: ctx.shape?.typeScale,
  })
  const lines = statementLines(slide)
  const quote = lines.quote
    ? fitEmphasisText(lines.quote, {
        maxWidth: QUOTE_MAX_W,
        fontSize: QUOTE_SIZE,
        maxLines: QUOTE_MAX_LINES,
        minPt: 18,
        lineHeightRatio: QUOTE_LINE_RATIO,
        fontFamily: fonts.body,
      })
    : null
  const source = lines.source
    ? fitSvgLine(lines.source, {
        maxWidth: 700,
        fontSize: 22,
        minFontSize: 18,
        fontFamily: fonts.body,
      })
    : null
  const quoteLastY = quote ? QUOTE_Y + Math.max(0, quote.lines.length - 1) * quote.lineHeight : QUOTE_Y
  // A page with no quote keeps this face's original source baseline.
  const sourceY = quote ? quoteLastY + QUOTE_SOURCE_GAP : SOURCE_Y

  return (
    <>
      <CrayonboxDecorPiece id="sun" colors={colors}>
        <CrayonboxSunDoodle
          x={1030}
          y={330}
          r={92}
          strokeWidth={7}
          rays={doodleRays(118, 150, 83, 106)}
        />
      </CrayonboxDecorPiece>
      <CrayonboxDecorPiece id="stars" colors={colors}>
        <text x={905} y={180} fontFamily={fonts.heading} fontSize={30} fill={GRASS_GREEN} dominantBaseline="alphabetic">
          ★
        </text>
        <text x={1150} y={520} fontFamily={fonts.heading} fontSize={26} fill={CREATIVE_PURPLE} dominantBaseline="alphabetic">
          ★
        </text>
      </CrayonboxDecorPiece>

      {section && (
        <>
          <rect x={96} y={150} width={220} height={40} rx={20} fill={SKY_BLUE} />
          <text
            data-truncated={section.truncated ? "1" : undefined}
            x={118}
            y={177}
            fontFamily={fonts.body}
            fontSize={section.fontSize}
            fontWeight="500"
            fill={accessibleInk(colors.text, SKY_BLUE, section.fontSize)}
            dominantBaseline="alphabetic"
          >
            {withoutOverflowMark(section.text)}
          </text>
        </>
      )}

      {heading.lines.map((line, lineIndex) => (
        <text
          key={lineIndex}
          data-truncated={heading.truncated && lineIndex === heading.lines.length - 1 ? "1" : undefined}
          x={TITLE_X}
          y={TITLE_Y + lineIndex * TITLE_LINE_HEIGHT}
          fontFamily={fonts.heading}
          fontSize={heading.fontSize}
          fontWeight="700"
          fill={accessibleInk(colors.text, bg, heading.fontSize)}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(line)}
        </text>
      ))}

      <CrayonboxDecorPiece id="underline" colors={colors} crayonOnly>
        <rect x={96} y={436} width={352} height={12} rx={6} fill={colors.accent} />
      </CrayonboxDecorPiece>

      {quote &&
        renderEmphasisHeading(
          quote,
          headingEmphasisPaint(ctx, quote, {
            baseFill: accessibleInk(colors.text, bg, quote.fontSize),
            fontFamily: fonts.body,
            fontWeight: "700",
            bold: false,
          }),
          (_line, lineIndex) => (
            <text
              key={lineIndex}
              data-truncated={quote.truncated && lineIndex === quote.lines.length - 1 ? "1" : undefined}
              x={QUOTE_X}
              y={QUOTE_Y + lineIndex * quote.lineHeight}
              fontFamily={fonts.body}
              fontSize={quote.fontSize}
              fill={accessibleInk(colors.text, bg, quote.fontSize)}
              dominantBaseline="alphabetic"
            />
          ),
        )}

      {source && (
        <text
          data-truncated={source.truncated ? "1" : undefined}
          x={SOURCE_X}
          y={sourceY}
          fontFamily={fonts.body}
          fontSize={source.fontSize}
          fill={accessibleInk(colors.muted, bg, source.fontSize)}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(source.text)}
        </text>
      )}
    </>
  )
}

export const layoutDef = {
  branding: "none",
  suppressMotif: true,
  id: "crayonbox-point",
  kind: "standard",
  story: {
    name: "Crayon Callout",
    story: "A bold heading in up to two lines sits left, a large sun doodle fills the right. A crayon underline accents the heading, and a small body block or quote sits below.",
    positioning: "Serves statement and quote at one body block, Crayon theme only. Choose it to make one finding or one quote memorable on a playful page.",
    audience: "A workshop screen where one lively takeaway needs to stick.",
    notFor: "Multiple items that each need a card, which belong in crayonbox-cards.",
  },
  slideTypes: ["content"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "body", accepts: ["blockquote", "paragraph"], capacity: 1 },
    { name: "meta", accepts: [] },
  ],
  headingFit: {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    bold: true,
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
  },
} satisfies LayoutDefinition
