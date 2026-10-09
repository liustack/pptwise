import { SourceLines } from "../source-lines"
import type { SvgTemplateProps } from "../types"
import { sectionNameFor } from "../../lib/derive"
import { renderEmphasisTspans, emphasisRunInk } from "../../render/emphasis"
import { fitSvgLine } from "../../lib/svg-text-layout"
import {
  hasCjk,
  heroCaption,
  heroUnit,
  heroValue,
  pullQuoteContext,
  pullQuoteText,
} from "../minimal-shared"
import {
  contextFits,
  fitHeroLine,
  fitHeroSource,
  fitPullQuoteSource,
  fitSparseHeading,
  fitSparseQuote,
  fitStatementSource,
  quoteBlockBaseline,
  sourcePastFoot,
  splitTrailingPercent,
} from "./shared"
import { StatHeroFallbackContent } from "../content-stat-hero-fallback"

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
  const attrLine = fitStatementSource(slide, { maxWidth: 920, fontSize: 20, minFontSize: 16, fontFamily: fonts.body })
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
      <SourceLines block={attrLine} x={640} y={540} textAnchor="middle" fontFamily={fonts.body} fill={colors.muted} />
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
  const unit = heroUnit(slide)
  const fitted = fitHeroLine(body, { maxWidth: 1100, fontSize: 300, fontFamily: fonts.heading, bold: false, unit, percentScale: percent ? 0.5 : undefined })
  // A figure this line cannot set whole goes to the plain page, never cut.
  if (!fitted) return StatHeroFallbackContent({ slide, ctx })
  const unitMark = fitted.unitMark
  const caption = heroCaption(slide)
  const source = fitHeroSource(slide, { maxWidth: 1088, fontSize: 16, fontFamily: fonts.body })
  // A source too long for the room under the caption hands the page over whole.
  if (sourcePastFoot(source, 616)) return StatHeroFallbackContent({ slide, ctx })
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
      <SourceLines block={source} x={640} y={616} textAnchor="middle" fontFamily={fonts.body} fill={colors.muted} />
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
  // A context line this page cannot set whole goes to the shared face.
  if (!contextFits(context, { maxWidth: 920, fontSize: 18, fontFamily: fonts.body })) return null
  const attr = fitPullQuoteSource(slide, { maxWidth: 920, fontSize: 20, fontFamily: fonts.body })
  const last = quote.lines.length - 1
  // The two rules are the frame the quote sits in, so they follow the block
  // instead of pinning it: a four-line quote inside a fixed 190px band would
  // cross both of them.
  const titleY = quoteBlockBaseline(372, quote)
  const ruleTop = Math.round(titleY - quote.fontSize - 40)
  const ruleBot = Math.round(titleY + last * quote.lineHeight + 46)
  // A source too long for the room under the quote hands the page to the shared face.
  if (sourcePastFoot(attr, ruleBot + 54)) return null
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
      <SourceLines block={attr} x={1040} y={ruleBot + 54} textAnchor="end" fontFamily={fonts.body} fill={colors.muted} />
    </>
  )
}
