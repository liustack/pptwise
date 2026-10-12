import { SourceLines } from "../source-lines"
import type { SvgTemplateProps } from "../types"
import { sectionNameFor } from "../../lib/derive"
import { renderEmphasisTspans, emphasisRunInk } from "../../render/emphasis"
import { heroCaption, heroUnit, heroValue } from "../minimal-shared"
import { fitHeroLine, fitHeroSource, fitSparseHeading, fitStatementSource, sourcePastFoot } from "./shared"
import { StatHeroFallbackContent } from "../content-stat-hero-fallback"

/** rally 稀排脸：洋红收尾杠、侧幕卡。不画纸屑场。 */

export function statement({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const heading = fitSparseHeading(slide.heading, {
    maxWidth: 1100,
    fontSize: 60,
    maxLines: 2,
    minPt: 32,
    lineHeightRatio: 96 / 60,
    fontFamily: fonts.heading,
    bold: true,
  })
  const source = fitStatementSource(slide, { maxWidth: 1000, fontSize: 16, fontFamily: fonts.body })
  return (
    <>
      {heading.lines.map((line, i) => (
        <text
          key={i}
          data-truncated={heading.truncated && i === heading.lines.length - 1 ? "1" : undefined}
          x={640}
          y={340 + i * heading.lineHeight}
          textAnchor="middle"
          fontFamily={fonts.heading}
          fontSize={heading.fontSize}
          fontWeight="700"
          fill={colors.text}
          dominantBaseline="alphabetic"
        >
          {renderEmphasisTspans(heading.lineSegs[i] ?? [{ text: line, emphasized: false }], {
            accent: emphasisRunInk(colors),
            baseFill: colors.text,
            fontWeight: "700",
          })}
        </text>
      ))}
      <rect x={576} y={490} width={128} height={6} fill={colors.accent} />
      <SourceLines block={source} x={640} y={552} textAnchor="middle" fontFamily={fonts.body} fill={colors.muted} />
    </>
  )
}

export function statHero({ ir, slide, index, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const section = sectionNameFor(ir.slides, index)
  const unit = heroUnit(slide)
  const fitted = fitHeroLine(heroValue(slide), { maxWidth: 1100, fontSize: 320, fontFamily: fonts.heading, bold: true, unit })
  // A figure this line cannot set whole goes to the plain page, never cut.
  if (!fitted) return StatHeroFallbackContent({ slide, ctx })
  const unitMark = fitted.unitMark
  const caption = heroCaption(slide)
  const source = fitHeroSource(slide, { maxWidth: 1088, fontSize: 16, fontFamily: fonts.body })
  // A source too long for the room under the caption hands the page over whole.
  if (sourcePastFoot(source, 616)) return StatHeroFallbackContent({ slide, ctx })
  return (
    <>
      {section && (
        <text
          x={640}
          y={200}
          textAnchor="middle"
          fontFamily={fonts.body}
          fontSize={20}
          fill={colors.muted}
          dominantBaseline="alphabetic"
        >
          {section}
        </text>
      )}
      <text
        x={640}
        y={480}
        textAnchor="middle"
        fontFamily={fonts.heading}
        fontSize={fitted.fontSize}
        fontWeight="700"
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
      {caption && (
        <text
          x={640}
          y={580}
          textAnchor="middle"
          fontFamily={fonts.body}
          fontSize={23}
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
