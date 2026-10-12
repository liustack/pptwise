import { SourceLines } from "../source-lines"
import type { SvgTemplateProps } from "../types"
import { renderEmphasisTspans, emphasisRunInk } from "../../render/emphasis"
import { heroCaption, heroUnit, heroValue } from "../minimal-shared"
import { fitHeroLine, fitHeroSource, fitSparseHeading, fitStatementSource, sourcePastFoot, pad2 } from "./shared"
import { StatHeroFallbackContent } from "../content-stat-hero-fallback"

/** swiss 稀排脸：左对齐超黑。不画顶边红条（motif 已画）。 */

export function statHero({ ir, slide, index, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const unit = heroUnit(slide)
  const fitted = fitHeroLine(heroValue(slide), { maxWidth: 1100, fontSize: 360, fontFamily: fonts.heading, bold: true, unit })
  // A figure this line cannot set whole goes to the plain page, never cut.
  if (!fitted) return StatHeroFallbackContent({ slide, ctx })
  const unitMark = fitted.unitMark
  const caption = heroCaption(slide)
  const source = fitHeroSource(slide, { maxWidth: 1096, fontSize: 18, fontFamily: fonts.body })
  const page = `${pad2(index + 1)} / ${pad2(ir.slides.length)}`
  // A source too long for the room under the caption hands the page over whole.
  if (sourcePastFoot(source, 600)) return StatHeroFallbackContent({ slide, ctx })
  return (
    <>
      <text
        x={88}
        y={480}
        fontFamily={fonts.heading}
        fontSize={fitted.fontSize}
        fontWeight="700"
        fill={colors.text}
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
        <text x={92} y={560} fontFamily={fonts.heading} fontSize={26} fontWeight="700" fill={colors.text} dominantBaseline="alphabetic">
          {caption}
        </text>
      )}
      <SourceLines block={source} x={92} y={600} fontFamily={fonts.body} fill={colors.muted} />
      <text x={1188} y={600} textAnchor="end" fontFamily={fonts.body} fontSize={16} fill={colors.muted} dominantBaseline="alphabetic">
        {page}
      </text>
    </>
  )
}

export function statement({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const heading = fitSparseHeading(slide.heading, {
    maxWidth: 1100,
    fontSize: 84,
    maxLines: 2,
    minPt: 44,
    lineHeightRatio: 110 / 84,
    fontFamily: fonts.heading,
    bold: true,
  })
  const source = fitStatementSource(slide, { maxWidth: 1100, fontSize: 18, fontFamily: fonts.body })
  return (
    <>
      {heading.lines.map((line, i) => (
        <text
          key={i}
          data-truncated={heading.truncated && i === heading.lines.length - 1 ? "1" : undefined}
          x={88}
          y={330 + i * heading.lineHeight}
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
      <rect x={88} y={490} width={120} height={6} fill={colors.text} />
      <SourceLines block={source} x={88} y={560} fontFamily={fonts.body} fill={colors.muted} />
    </>
  )
}
