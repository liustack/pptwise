import type { SvgTemplateProps } from "../types"
import { sectionNameFor } from "../../lib/derive"
import { renderEmphasisTspans, emphasisRunInk } from "../../render/emphasis"
import { heroCaption, heroUnit, heroSource, heroValue, pullQuoteAttribution, pullQuoteContext, pullQuoteText } from "../minimal-shared"
import { fitHeroLine, heroUnitMark, fitSparseHeading, fitSparseQuote, fitStatementSource, pad2, quoteBlockBaseline } from "./shared"

/** journal 稀排脸：巨引号、期号巨数、报头格言。不画 motif 报头双线。 */

export function pullQuote({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const quote = fitSparseQuote(pullQuoteText(slide), {
    maxWidth: 820,
    fontSize: 46,
    fontFamily: fonts.heading,
    lineHeightRatio: 1.44,
  })
  const context = pullQuoteContext(slide)
  const attr = pullQuoteAttribution(slide)
  const last = quote.lines.length - 1
  const firstY = quoteBlockBaseline(396, quote)
  return (
    <>
      <text
        x={150}
        y={Math.round(firstY) - 30}
        fontFamily={fonts.heading}
        fontSize={200}
        fill={colors.accent}
        opacity={0.9}
        dominantBaseline="alphabetic"
      >
        {"\u201C"}
      </text>
      {context && (
        <text x={300} y={172} fontFamily={fonts.body} fontSize={18} fill={colors.muted} dominantBaseline="alphabetic">
          {context}
        </text>
      )}
      {quote.lines.map((line, i) => (
        <text
          key={i}
          data-truncated={quote.truncated && i === last ? "1" : undefined}
          x={300}
          y={firstY + i * quote.lineHeight}
          fontFamily={fonts.heading}
          fontSize={quote.fontSize}
          fontWeight="400"
          fill={colors.primary}
          dominantBaseline="alphabetic"
        >
          {renderEmphasisTspans(quote.lineSegs[i] ?? [{ text: line, emphasized: false }], {
            accent: emphasisRunInk(colors),
            baseFill: colors.primary,
            fontWeight: "400",
          })}
        </text>
      ))}
      {attr && (
        <text
          x={300}
          y={Math.round(firstY + last * quote.lineHeight) + 76}
          fontFamily={fonts.heading}
          fontSize={19}
          fill={colors.muted}
          dominantBaseline="alphabetic"
        >
          {`\u2014\u2014 ${attr}`}
        </text>
      )}
    </>
  )
}

export function statHero({ ir, slide, index, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const section = sectionNameFor(ir.slides, index)
  const kicker = [`№ ${pad2(index + 1)}`, section].filter((v): v is string => Boolean(v && v.trim())).join(" · ")
  const fitted = fitHeroLine(heroValue(slide), { maxWidth: 1100, fontSize: 300, fontFamily: fonts.heading, bold: false })
  const unit = heroUnit(slide)
  const unitMark = heroUnitMark(fitted.fontSize)
  const caption = heroCaption(slide)
  const source = heroSource(slide)
  return (
    <>
      <text
        x={640}
        y={190}
        textAnchor="middle"
        fontFamily={fonts.heading}
        fontSize={19}
        fill={colors.accent}
        dominantBaseline="alphabetic"
      >
        {kicker}
      </text>
      <text
        x={640}
        y={480}
        textAnchor="middle"
        fontFamily={fonts.heading}
        fontSize={fitted.fontSize}
        fontWeight="400"
        fill={colors.primary}
        dominantBaseline="alphabetic"
      >
        {fitted.text}
        {unit && (
          <tspan dx={unitMark.dx} fontSize={unitMark.fontSize}>
            {unit}
          </tspan>
        )}
      </text>
      <line x1={500} y1={540} x2={780} y2={540} stroke={colors.primary} strokeWidth={1.5} />
      {caption && (
        <text
          x={640}
          y={592}
          textAnchor="middle"
          fontFamily={fonts.heading}
          fontSize={20}
          fill={colors.muted}
          dominantBaseline="alphabetic"
        >
          {caption}
        </text>
      )}
      {source && (
        <text
          x={640}
          y={628}
        textAnchor="middle"
          fontFamily={fonts.heading}
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

export function statement({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const heading = fitSparseHeading(slide.heading, {
    maxWidth: 1100,
    fontSize: 50,
    maxLines: 1,
    minPt: 28,
    lineHeightRatio: 1.2,
    fontFamily: fonts.heading,
    bold: false,
  })
  const source = fitStatementSource(slide, { maxWidth: 1000, fontSize: 20, fontFamily: fonts.heading })
  return (
    <>
      {heading.lines.map((line, i) => (
        <text
          key={i}
          data-truncated={heading.truncated ? "1" : undefined}
          x={640}
          y={350}
          textAnchor="middle"
          fontFamily={fonts.heading}
          fontSize={heading.fontSize}
          fontWeight="400"
          fill={colors.primary}
          dominantBaseline="alphabetic"
        >
          {renderEmphasisTspans(heading.lineSegs[i] ?? [{ text: line, emphasized: false }], {
            accent: emphasisRunInk(colors),
            baseFill: colors.primary,
            fontWeight: "400",
          })}
        </text>
      ))}
      <rect x={565} y={400} width={150} height={3} fill={colors.accent} />
      {source && (
        <text
          data-truncated={source.truncated ? "1" : undefined}
          x={640}
          y={470}
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
