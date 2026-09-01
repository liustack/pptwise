import type { SvgTemplateProps } from "../types"
import { renderEmphasisTspans } from "../../render/emphasis"
import {
  hasCjk,
  heroCaption,
  heroUnit, heroSource, heroValue,
  pullQuoteAttribution,
  pullQuoteContext,
  pullQuoteText,
  trackingPx,
} from "../minimal-shared"
import { fitHeroLine, heroUnitMark, fitSparseHeading, fitSparseQuote, quoteBlockBaseline, rotateRectPolygon } from "./shared"

/** luxe 稀排脸：金菱引文、发丝巨数、一行金字。不画金框。 */

const DIAMOND = rotateRectPolygon(640, 180, 14, 14, 45)

export function pullQuote({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const quote = fitSparseQuote(pullQuoteText(slide), {
    maxWidth: 1000,
    fontSize: 48,
    fontFamily: fonts.heading,
    lineHeightRatio: 1.44,
  })
  const context = pullQuoteContext(slide)
  const attr = pullQuoteAttribution(slide)
  const attrTracking = attr && !hasCjk(attr) ? trackingPx(17, 0.35) : undefined
  const last = quote.lines.length - 1
  const firstY = quoteBlockBaseline(392, quote)
  return (
    <>
      <polygon points={DIAMOND} fill={colors.accent} />
      {context && (
        <text
          x={640}
          y={236}
          textAnchor="middle"
          fontFamily={fonts.body}
          fontSize={17}
          fill={colors.muted}
          dominantBaseline="alphabetic"
        >
          {context}
        </text>
      )}
      {quote.lines.map((line, i) => (
        <text
          key={i}
          data-truncated={quote.truncated && i === last ? "1" : undefined}
          x={640}
          y={firstY + i * quote.lineHeight}
          textAnchor="middle"
          fontFamily={fonts.heading}
          fontSize={quote.fontSize}
          fontWeight="400"
          fill={colors.accent}
          dominantBaseline="alphabetic"
        >
          {renderEmphasisTspans(quote.lineSegs[i] ?? [{ text: line, emphasized: false }], {
            accent: colors.accent,
            baseFill: colors.accent,
            fontWeight: "400",
          })}
        </text>
      ))}
      {attr && (
        <text
          x={640}
          y={Math.round(firstY + last * quote.lineHeight) + 96}
          textAnchor="middle"
          fontFamily={fonts.body}
          fontSize={17}
          fill={colors.muted}
          letterSpacing={attrTracking}
          dominantBaseline="alphabetic"
        >
          {attr}
        </text>
      )}
    </>
  )
}

export function statHero({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const fitted = fitHeroLine(heroValue(slide), { maxWidth: 1100, fontSize: 270, fontFamily: fonts.heading, bold: false })
  const unit = heroUnit(slide)
  const unitMark = heroUnitMark(fitted.fontSize)
  const caption = heroCaption(slide)
  const source = heroSource(slide)
  return (
    <>
      <line x1={360} y1={200} x2={920} y2={200} stroke={colors.border} strokeWidth={1} />
      <text
        x={640}
        y={470}
        textAnchor="middle"
        fontFamily={fonts.heading}
        fontSize={fitted.fontSize}
        fontWeight="400"
        fill={colors.accent}
        dominantBaseline="alphabetic"
      >
        {fitted.text}
        {unit && (
          <tspan dx={unitMark.dx} fontSize={unitMark.fontSize}>
            {unit}
          </tspan>
        )}
      </text>
      <line x1={360} y1={524} x2={920} y2={524} stroke={colors.border} strokeWidth={1} />
      {caption && (
        <text x={640} y={580} textAnchor="middle" fontFamily={fonts.body} fontSize={19} fill={colors.muted} dominantBaseline="alphabetic">
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
  return (
    <>
      {heading.lines.map((line, i) => (
        <text
          key={i}
          x={640}
          y={380}
          textAnchor="middle"
          fontFamily={fonts.heading}
          fontSize={heading.fontSize}
          fontWeight="400"
          fill={colors.accent}
          dominantBaseline="alphabetic"
        >
          {renderEmphasisTspans(heading.lineSegs[i] ?? [{ text: line, emphasized: false }], {
            accent: colors.accent,
            baseFill: colors.accent,
            fontWeight: "400",
          })}
        </text>
      ))}
    </>
  )
}
