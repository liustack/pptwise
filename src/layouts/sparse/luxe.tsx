import { SourceLines } from "../source-lines"
import type { SvgTemplateProps } from "../types"
import { renderEmphasisTspans, emphasisRunInk } from "../../render/emphasis"
import {
  hasCjk,
  heroCaption,
  heroUnit,
  heroValue,
  pullQuoteContext,
  pullQuoteSourceParts,
  pullQuoteText,
  trackingPx,
} from "../minimal-shared"
import { contextFits, fitHeroLine, fitHeroSource, fitPullQuoteSource, fitSparseHeading, fitSparseQuote, fitStatementSource, quoteBlockBaseline, rotateRectPolygon, sourcePastFoot } from "./shared"
import { StatHeroFallbackContent } from "../content-stat-hero-fallback"

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
  // A context line this page cannot set whole goes to the shared face.
  if (!contextFits(context, { maxWidth: 1000, fontSize: 17, fontFamily: fonts.body })) return null
  const attrText = pullQuoteSourceParts(slide)
  const attrTracking = !hasCjk(attrText.attribution ?? attrText.footnote ?? "") ? trackingPx(17, 0.35) : undefined
  const attr = fitPullQuoteSource(slide, { maxWidth: 1000, fontSize: 17, fontFamily: fonts.body, letterSpacing: attrTracking })
  const last = quote.lines.length - 1
  const firstY = quoteBlockBaseline(392, quote)
  const attrY = Math.round(firstY + last * quote.lineHeight) + 96
  // A source too long for the room under the quote hands the page to the shared face.
  if (sourcePastFoot(attr, attrY)) return null
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
            accent: emphasisRunInk(colors),
            baseFill: colors.accent,
            fontWeight: "400",
          })}
        </text>
      ))}
      <SourceLines block={attr} x={640} y={attrY} textAnchor="middle" fontFamily={fonts.body} fill={colors.muted} letterSpacing={attrTracking} />
    </>
  )
}

export function statHero({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const unit = heroUnit(slide)
  const fitted = fitHeroLine(heroValue(slide), { maxWidth: 1100, fontSize: 270, fontFamily: fonts.heading, bold: false, unit })
  // A figure this line cannot set whole goes to the plain page, never cut.
  if (!fitted) return StatHeroFallbackContent({ slide, ctx })
  const unitMark = fitted.unitMark
  const caption = heroCaption(slide)
  const source = fitHeroSource(slide, { maxWidth: 1088, fontSize: 16, fontFamily: fonts.body })
  // A source too long for the room under the caption hands the page over whole.
  if (sourcePastFoot(source, 616)) return StatHeroFallbackContent({ slide, ctx })
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
      <SourceLines block={source} x={640} y={616} textAnchor="middle" fontFamily={fonts.body} fill={colors.muted} />
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
  // A claim this line cannot hold whole goes to the shared face, which marks what it still cuts.
  if (heading.truncated) return null
  const source = fitStatementSource(slide, { maxWidth: 1000, fontSize: 17, fontFamily: fonts.body })
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
            accent: emphasisRunInk(colors),
            baseFill: colors.accent,
            fontWeight: "400",
          })}
        </text>
      ))}
      <SourceLines block={source} x={640} y={470} textAnchor="middle" fontFamily={fonts.body} fill={colors.muted} />
    </>
  )
}
