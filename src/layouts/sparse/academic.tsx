import type { SvgTemplateProps } from "../types"
import { sectionNameFor } from "../../lib/derive"
import { renderEmphasisTspans } from "../../render/emphasis"
import {
  heroCaption,
  heroSource,
  heroUnit, heroValue,
  pullQuoteAttribution,
  pullQuoteContext,
  pullQuoteText,
} from "../minimal-shared"
import { fitHeroLine, heroUnitMark, fitSparseHeading, fitSparseQuote, fitStatementSource, quoteBlockBaseline, splitTrailingPercent } from "./shared"
import { underlineDescentRatio } from "../underline"

/** academic 稀排脸：脚注引文、百分号巨数、命题格言。不画点轨和角标。 */

export function pullQuote({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const quote = fitSparseQuote(pullQuoteText(slide), {
    maxWidth: 960,
    fontSize: 46,
    fontFamily: fonts.heading,
  })
  const context = pullQuoteContext(slide)
  const attr = pullQuoteAttribution(slide)
  const last = quote.lines.length - 1
  const firstY = quoteBlockBaseline(394, quote)
  const blockTop = firstY - quote.fontSize
  const blockBottom = firstY + last * quote.lineHeight + quote.fontSize * 0.3
  return (
    <>
      <rect x={96} y={blockTop} width={6} height={Math.round(blockBottom - blockTop)} fill={colors.primary} />
      {context && (
        <text x={160} y={200} fontFamily={fonts.body} fontSize={18} fill={colors.muted} dominantBaseline="alphabetic">
          {context}
        </text>
      )}
      {quote.lines.map((line, i) => (
        <text
          key={i}
          data-truncated={quote.truncated && i === last ? "1" : undefined}
          x={160}
          y={firstY + i * quote.lineHeight}
          fontFamily={fonts.heading}
          fontSize={quote.fontSize}
          fontWeight="400"
          fill={colors.text}
          dominantBaseline="alphabetic"
        >
          {renderEmphasisTspans(quote.lineSegs[i] ?? [{ text: line, emphasized: false }], {
            accent: colors.accent,
            baseFill: colors.text,
            fontWeight: "400",
          })}
          {attr && i === last && (
            <tspan fontSize={24} fill={colors.accent} dy={-18}>
              [1]
            </tspan>
          )}
        </text>
      ))}
      {attr && (
        <text
          x={160}
          y={Math.round(blockBottom) + 68}
          fontFamily={fonts.heading}
          fontSize={18}
          fill={colors.muted}
          dominantBaseline="alphabetic"
        >
          {`[1] ${attr}`}
        </text>
      )}
    </>
  )
}

/** Hero baseline, then the block that hangs below the numeral's ink. */
const HERO_BASELINE = 392
const RULE_AIR = 16
const RULE_CAPTION_GAP = 60
const CAPTION_SOURCE_GAP = 40

export function statHero({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const { body, percent } = splitTrailingPercent(heroValue(slide))
  const fitted = fitHeroLine(body, { maxWidth: 1100, fontSize: 300, fontFamily: fonts.heading, bold: false })
  const unit = heroUnit(slide)
  const unitMark = heroUnitMark(fitted.fontSize)
  const caption = heroCaption(slide)
  const source = heroSource(slide)
  // The rule hangs from the numeral's ink floor rather than a fixed y.
  // academic's heading serif sets old-style figures — 3 4 5 7 9 hang below the
  // baseline — so a 300px "4" puts ink 66px under a baseline the frozen y=448
  // sat only 56px below. The rule ran through the stem. `underlineDescentRatio`
  // is the same measured floor banner-chapter, memo-head and consulting's own
  // stat-hero already hang their rules from.
  const ruleY = Math.round(HERO_BASELINE + fitted.fontSize * underlineDescentRatio(fitted.text) + RULE_AIR)
  // Caption and source follow the rule so the approved spacing between the
  // three survives wherever the rule lands.
  const captionY = ruleY + RULE_CAPTION_GAP
  const sourceY = captionY + CAPTION_SOURCE_GAP
  return (
    <>
      <text
        x={640}
        y={HERO_BASELINE}
        textAnchor="middle"
        fontFamily={fonts.heading}
        fontSize={fitted.fontSize}
        fontWeight="400"
        fill={colors.primary}
        dominantBaseline="alphabetic"
      >
        {fitted.text}
        {percent && <tspan fontSize={Math.round(fitted.fontSize * (190 / 300))}>%</tspan>}
        {unit && (
          <tspan dx={unitMark.dx} fontSize={unitMark.fontSize}>
            {unit}
          </tspan>
        )}
      </text>
      <line x1={470} y1={ruleY} x2={810} y2={ruleY} stroke={colors.accent} strokeWidth={1.5} />
      {caption && (
        <text
          x={640}
          y={captionY}
          textAnchor="middle"
          fontFamily={fonts.body}
          fontSize={23}
          fill={colors.text}
          dominantBaseline="alphabetic"
        >
          {caption}
        </text>
      )}
      {source && (
        <text
          x={640}
          y={sourceY}
          textAnchor="middle"
          fontFamily={fonts.body}
          fontSize={17}
          fill={colors.muted}
          dominantBaseline="alphabetic"
        >
          {source}
        </text>
      )}
    </>
  )
}

export function statement({ ir, slide, index, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const section = sectionNameFor(ir.slides, index)
  const heading = fitSparseHeading(slide.heading, {
    maxWidth: 1100,
    fontSize: 48,
    maxLines: 1,
    minPt: 28,
    lineHeightRatio: 1.2,
    fontFamily: fonts.heading,
    bold: false,
  })
  const source = fitStatementSource(slide, { maxWidth: 1000, fontSize: 19, fontFamily: fonts.heading })
  return (
    <>
      {section && (
        <text
          x={640}
          y={200}
          textAnchor="middle"
          fontFamily={fonts.heading}
          fontSize={18}
          fill={colors.primary}
          dominantBaseline="alphabetic"
        >
          {section}
        </text>
      )}
      {heading.lines.map((line, i) => (
        <text
          key={i}
          data-truncated={heading.truncated ? "1" : undefined}
          x={640}
          y={360}
          textAnchor="middle"
          fontFamily={fonts.heading}
          fontSize={heading.fontSize}
          fontWeight="400"
          fill={colors.text}
          dominantBaseline="alphabetic"
        >
          {renderEmphasisTspans(heading.lineSegs[i] ?? [{ text: line, emphasized: false }], {
            accent: colors.accent,
            baseFill: colors.text,
            fontWeight: "400",
          })}
        </text>
      ))}
      {source && (
        <text
          data-truncated={source.truncated ? "1" : undefined}
          x={640}
          y={500}
          textAnchor="middle"
          fontFamily={fonts.heading}
          fontSize={source.fontSize}
          fontStyle="italic"
          fill={colors.muted}
          dominantBaseline="alphabetic"
        >
          {source.text}
        </text>
      )}
    </>
  )
}
