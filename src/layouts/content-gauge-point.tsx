import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { sectionNameFor } from "../lib/derive"
import { fitSvgLine } from "../lib/svg-text-layout"
import { fitHeadingLines } from "../render/heading-fit"
import { fitEmphasisText, headingEmphasisPaint, renderEmphasisHeading, stripEmphasis } from "../render/emphasis"
import { accessibleInk } from "../render/ink"
import { statementLines } from "./minimal-shared"
import { GaugeMeta, withoutOverflowMark } from "./gauge-shared"

const KICKER_X = 160
const KICKER_Y = 200
const KICKER_SIZE = 16
const KICKER_TRACKING = 4
const KICKER_MAX_W = 970

const LEAD_X = 140
const LEAD_Y = 300
const LEAD_W = 8
const LEAD_H = 170

const TITLE_X = 184
const TITLE_Y = 360
const TITLE_LINE_HEIGHT = 80
const TITLE_MAX_W = 946

const SOURCE_X = 184
const SOURCE_Y = 512
const SOURCE_SIZE = 18
const SOURCE_MAX_W = 946

/**
 * The quote block, when the page's body component is a `blockquote`.
 *
 * This face reads as heading-as-claim plus a small source line, and for a
 * long time that is all it painted: handed a quote it set the speaker's name
 * and dropped what the speaker said. A page can hold both — the claim stays
 * the hero, the quote sits under it in the body register, and the speaker
 * closes underneath, which is how an attributed quote is set anywhere else in
 * this repository.
 */
const QUOTE_SIZE = 22
const QUOTE_MAX_LINES = 3
const QUOTE_LINE_RATIO = 1.55
const QUOTE_GAP = 52
const QUOTE_SOURCE_GAP = 46

/** gauge-point：以单枚金色引条校准两行结论的疏内容页。 */
export function GaugePointContent({ ir, slide, index, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const sectionSource = sectionNameFor(ir.slides, index)
  const section = sectionSource
    ? fitSvgLine(sectionSource, {
        maxWidth: KICKER_MAX_W,
        fontSize: KICKER_SIZE,
        minFontSize: KICKER_SIZE,
        letterSpacing: KICKER_TRACKING,
        fontFamily: fonts.body,
      })
    : null
  const heading = fitHeadingLines(stripEmphasis(slide.heading ?? ""), {
    ...layoutDef.headingFit,
    fontFamily: fonts.heading,
    typeScale: ctx.shape?.typeScale,
  })
  const lines = statementLines(slide)
  const quote = lines.quote
    ? fitEmphasisText(lines.quote, {
        maxWidth: SOURCE_MAX_W,
        fontSize: QUOTE_SIZE,
        maxLines: QUOTE_MAX_LINES,
        minPt: 18,
        lineHeightRatio: QUOTE_LINE_RATIO,
        fontFamily: fonts.body,
      })
    : null
  const source = lines.source
    ? fitSvgLine(lines.source, {
        maxWidth: SOURCE_MAX_W,
        fontSize: SOURCE_SIZE,
        minFontSize: SOURCE_SIZE,
        fontFamily: fonts.body,
      })
    : null
  const headingLastY = TITLE_Y + Math.max(0, heading.lines.length - 1) * TITLE_LINE_HEIGHT
  const quoteFirstY = headingLastY + QUOTE_GAP
  const quoteLastY = quote ? quoteFirstY + Math.max(0, quote.lines.length - 1) * quote.lineHeight : quoteFirstY
  // A page with no quote keeps the baseline this face has always used, so
  // adding the quote block moves nothing on the pages that never had one.
  const sourceY = quote ? quoteLastY + QUOTE_SOURCE_GAP : SOURCE_Y

  return (
    <>
      <GaugeMeta ir={ir} ctx={ctx} tone="light" />
      {section && (
        <text
          data-truncated={section.truncated ? "1" : undefined}
          x={KICKER_X}
          y={KICKER_Y}
          fontFamily={fonts.body}
          fontSize={section.fontSize}
          fill={accessibleInk(colors.muted, bg, section.fontSize)}
          letterSpacing={KICKER_TRACKING}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(section.text)}
        </text>
      )}

      <rect x={LEAD_X} y={LEAD_Y} width={LEAD_W} height={LEAD_H} fill={colors.accent} />

      {heading.lines.map((line, lineIndex) => (
        <text
          key={lineIndex}
          data-truncated={heading.truncated && lineIndex === heading.lines.length - 1 ? "1" : undefined}
          x={TITLE_X}
          y={TITLE_Y + lineIndex * TITLE_LINE_HEIGHT}
          fontFamily={fonts.heading}
          fontSize={heading.fontSize}
          fontWeight="700"
          fill={accessibleInk(colors.primary, bg, heading.fontSize)}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(line)}
        </text>
      ))}

      {quote &&
        renderEmphasisHeading(
          quote,
          headingEmphasisPaint(ctx, quote, {
            baseFill: accessibleInk(colors.text, bg, quote.fontSize),
            fontFamily: fonts.body,
            fontWeight: "600",
            bold: false,
          }),
          (_line, lineIndex) => (
            <text
              key={lineIndex}
              data-truncated={quote.truncated && lineIndex === quote.lines.length - 1 ? "1" : undefined}
              x={SOURCE_X}
              y={quoteFirstY + lineIndex * quote.lineHeight}
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
  id: "gauge-point",
  kind: "standard",
  story: {
    name: "Gauge Verdict",
    story: "An oversized bold heading with a tall coloured lead bar down its left edge. A body quote or paragraph sits below, and the section label floats above in tracked capitals.",
    positioning: "Serves statement and quote at one body block, and the statement page of the Brief preset uses it. Choose it for a single conclusion or recommendation anchoring a report section.",
    audience: "Structured-report readers who need one takeaway to land clearly.",
    notFor: "Multiple data blocks or charts, which belong in Gauge Columns.",
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
    fontSize: 60,
    maxLines: 2,
    minPt: 36,
    bold: true,
    lineHeightRatio: TITLE_LINE_HEIGHT / 60,
  },
} satisfies LayoutDefinition
