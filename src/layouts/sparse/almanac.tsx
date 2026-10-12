import { SourceLines } from "../source-lines"
import type { SvgTemplateProps } from "../types"
import { renderEmphasisTspans, emphasisRunInk } from "../../render/emphasis"
import { heroCaption, heroUnit, heroValue } from "../minimal-shared"
import { fitHeroLine, fitHeroSource, fitSparseHeading, fitStatementSource, sourcePastFoot } from "./shared"
import { StatHeroFallbackContent } from "../content-stat-hero-fallback"

/** almanac 稀排脸：等高线格言、橄榄横线巨数、样点卡。不画 motif 左下线和右缘点。 */

export function statement({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const heading = fitSparseHeading(slide.heading, {
    maxWidth: 1088,
    fontSize: 54,
    maxLines: 2,
    minPt: 32,
    lineHeightRatio: 88 / 54,
    fontFamily: fonts.heading,
    bold: true,
  })
  const source = fitStatementSource(slide, { maxWidth: 1088, fontSize: 17, fontFamily: fonts.body })
  return (
    <>
      {heading.lines.map((line, i) => (
        <text
          key={i}
          data-truncated={heading.truncated && i === heading.lines.length - 1 ? "1" : undefined}
          x={96}
          y={330 + i * heading.lineHeight}
          fontFamily={fonts.heading}
          fontSize={heading.fontSize}
          fontWeight="700"
          fill={colors.primary}
          dominantBaseline="alphabetic"
        >
          {renderEmphasisTspans(heading.lineSegs[i] ?? [{ text: line, emphasized: false }], {
            accent: emphasisRunInk(colors),
            baseFill: colors.primary,
            fontWeight: "700",
          })}
        </text>
      ))}
      <SourceLines block={source} x={96} y={510} fontFamily={fonts.body} fill={colors.muted} />
      <path d="M 60 610 q 220 -40 430 0 t 430 0" fill="none" stroke={colors.border} strokeWidth={1.5} />
      <path d="M 20 650 q 260 -34 500 0 t 500 0" fill="none" stroke={colors.border} strokeWidth={1.5} />
    </>
  )
}

export function statHero({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const unit = heroUnit(slide)
  const fitted = fitHeroLine(heroValue(slide), { maxWidth: 1100, fontSize: 300, fontFamily: fonts.heading, bold: true, unit })
  // A figure this line cannot set whole goes to the plain page, never cut.
  if (!fitted) return StatHeroFallbackContent({ slide, ctx })
  const unitMark = fitted.unitMark
  const caption = heroCaption(slide)
  const source = fitHeroSource(slide, { maxWidth: 1088, fontSize: 17, fontFamily: fonts.body })
  // A source too long for the room under the caption hands the page over whole.
  if (sourcePastFoot(source, 612)) return StatHeroFallbackContent({ slide, ctx })
  return (
    <>
      <text
        x={96}
        y={460}
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
      <rect x={104} y={504} width={430} height={2} fill={colors.primary} />
      {caption && (
        <text x={96} y={570} fontFamily={fonts.body} fontSize={24} fill={colors.primary} dominantBaseline="alphabetic">
          {caption}
        </text>
      )}
      <SourceLines block={source} x={96} y={612} fontFamily={fonts.body} fill={colors.muted} />
    </>
  )
}
