import type { SvgTemplateProps } from "../types"
import { sectionNameFor } from "../../lib/derive"
import { renderEmphasisTspans, emphasisRunInk } from "../../render/emphasis"
import { fitSvgLine } from "../../lib/svg-text-layout"
import {
  hasCjk,
  heroCaption,
  heroUnit, heroSource, heroValue,
  pullQuoteAttribution,
  pullQuoteContext,
  pullQuoteText,
  statementAttribution,
} from "../minimal-shared"
import {
  fitHeroLine, heroUnitMark,
  fitSparseHeading,
  fitSparseQuote,
  quoteBlockBaseline,
  splitTrailingPercent,
} from "./shared"

/** stage 稀排脸：居中细字、巨数、双发丝引文。 */

export function statement({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const heading = fitSparseHeading(slide.heading, {
    maxWidth: 920,
    fontSize: 64,
    maxLines: 2,
    minPt: 36,
    lineHeightRatio: 90 / 64,
    fontFamily: fonts.heading,
    bold: false,
  })
  const attr = statementAttribution(slide)
  const attrLine = attr
    ? fitSvgLine(attr, { maxWidth: 920, fontSize: 20, minFontSize: 16, fontFamily: fonts.body })
    : null
  return (
    <>
      {heading.lines.map((line, i) => (
        <text
          key={i}
          data-truncated={heading.truncated && i === heading.lines.length - 1 ? "1" : undefined}
          x={640}
          y={330 + i * heading.lineHeight}
          textAnchor="middle"
          fontFamily={fonts.heading}
          fontSize={heading.fontSize}
          fontWeight="400"
          fill={colors.text}
          dominantBaseline="alphabetic"
        >
          {renderEmphasisTspans(heading.lineSegs[i] ?? [{ text: line, emphasized: false }], {
            accent: emphasisRunInk(colors),
            baseFill: colors.text,
            fontWeight: "400",
          })}
        </text>
      ))}
      <line x1={616} y1={484} x2={664} y2={484} stroke={colors.border} strokeWidth={2} />
      {attrLine && (
        <text
          data-truncated={attrLine.truncated ? "1" : undefined}
          x={640}
          y={540}
          textAnchor="middle"
          fontFamily={fonts.body}
          fontSize={attrLine.fontSize}
          fill={colors.muted}
          dominantBaseline="alphabetic"
        >
          {attrLine.text}
        </text>
      )}
    </>
  )
}

export function statHero({ ir, slide, index, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const section = sectionNameFor(ir.slides, index)
  const tracking = section && !hasCjk(section) ? 14 : undefined
  const kicker = section
    ? fitSvgLine(section, { maxWidth: 920, fontSize: 20, minFontSize: 16, letterSpacing: tracking, fontFamily: fonts.body })
    : null
  const { body, percent } = splitTrailingPercent(heroValue(slide))
  const fitted = fitHeroLine(body, { maxWidth: 1100, fontSize: 300, fontFamily: fonts.heading, bold: false })
  const unit = heroUnit(slide)
  const unitMark = heroUnitMark(fitted.fontSize)
  const caption = heroCaption(slide)
  const source = heroSource(slide)
  return (
    <>
      {kicker && (
        <text
          x={640}
          y={196}
          textAnchor="middle"
          fontFamily={fonts.body}
          fontSize={kicker.fontSize}
          fill={colors.muted}
          letterSpacing={tracking}
          dominantBaseline="alphabetic"
        >
          {kicker.text}
        </text>
      )}
      <text
        x={640}
        y={480}
        textAnchor="middle"
        fontFamily={fonts.heading}
        fontSize={fitted.fontSize}
        fontWeight="400"
        fill={colors.text}
        dominantBaseline="alphabetic"
      >
        {fitted.text}
        {unit && (
          <tspan dx={unitMark.dx} fontSize={unitMark.fontSize}>
            {unit}
          </tspan>
        )}
        {percent && (
          <tspan fontSize={Math.round(fitted.fontSize * 0.5)} fill={colors.accent}>
            %
          </tspan>
        )}
      </text>
      {caption && (
        <text
          x={640}
          y={580}
          textAnchor="middle"
          fontFamily={fonts.body}
          fontSize={22}
          fill={colors.muted}
          dominantBaseline="alphabetic"
        >
          {caption}
        </text>
      )}
      {source && (
        <text
          x={640}
          y={616}
        textAnchor="middle"
          fontFamily={fonts.body}
          fontSize={16}
          fill={colors.muted}
          dominantBaseline="alphabetic"
        >
          {source}
        </text>
      )}
    </>
  )
}

export function pullQuote({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const quote = fitSparseQuote(pullQuoteText(slide), {
    maxWidth: 800,
    fontSize: 46,
    fontFamily: fonts.heading,
    lineHeightRatio: 1.4,
  })
  const context = pullQuoteContext(slide)
  const attr = pullQuoteAttribution(slide)
  const last = quote.lines.length - 1
  // The two rules are the frame the quote sits in, so they follow the block
  // instead of pinning it: a four-line quote inside a fixed 190px band would
  // cross both of them.
  const titleY = quoteBlockBaseline(372, quote)
  const ruleTop = Math.round(titleY - quote.fontSize - 40)
  const ruleBot = Math.round(titleY + last * quote.lineHeight + 46)
  return (
    <>
      {context && (
        <text
          x={640}
          y={ruleTop - 34}
          textAnchor="middle"
          fontFamily={fonts.body}
          fontSize={18}
          fill={colors.muted}
          dominantBaseline="alphabetic"
        >
          {context}
        </text>
      )}
      <line x1={240} y1={ruleTop} x2={1040} y2={ruleTop} stroke={colors.border} strokeWidth={1.5} />
      {quote.lines.map((line, i) => (
        <text
          key={i}
          data-truncated={quote.truncated && i === last ? "1" : undefined}
          x={640}
          y={titleY + i * quote.lineHeight}
          textAnchor="middle"
          fontFamily={fonts.heading}
          fontSize={quote.fontSize}
          fontWeight="400"
          fill={colors.text}
          dominantBaseline="alphabetic"
        >
          {renderEmphasisTspans(quote.lineSegs[i] ?? [{ text: line, emphasized: false }], {
            accent: emphasisRunInk(colors),
            baseFill: colors.text,
            fontWeight: "400",
          })}
        </text>
      ))}
      <line x1={240} y1={ruleBot} x2={1040} y2={ruleBot} stroke={colors.border} strokeWidth={1.5} />
      {attr && (
        <text
          x={1040}
          y={ruleBot + 54}
          textAnchor="end"
          fontFamily={fonts.body}
          fontSize={20}
          fill={colors.muted}
          dominantBaseline="alphabetic"
        >
          {attr}
        </text>
      )}
    </>
  )
}
