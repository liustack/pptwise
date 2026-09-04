import type { SvgTemplateProps } from "../types"
import { sectionNameFor } from "../../lib/derive"
import { pickEvidence } from "../../render/component-traits"
import { renderEmphasisText } from "../../render/emphasis"
import { heroCaption, heroSource, heroUnit, heroValue, statementAttribution } from "../minimal-shared"
import { fitSvgLine, measureTextUnits } from "../../lib/svg-text-layout"
import { renderFittedEvidence, textColumnMaxWidth } from "../fitted-evidence"
import { evidenceSource, fitHeroLine, heroUnitMark, fitSparseHeading, pad2 } from "./shared"
import { underlineYFromBaseline } from "../underline"

/** brief 稀排脸：结论先行、藏青巨数、白卡单证据。不画顶缘规矩线。 */

export function statement({ ir, slide, index, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const heading = fitSparseHeading(slide.heading, {
    maxWidth: 1088,
    fontSize: 62,
    maxLines: 2,
    minPt: 36,
    lineHeightRatio: 96 / 62,
    fontFamily: fonts.heading,
    bold: true,
  })
  const attr = statementAttribution(slide)
  // 眉头是这页在牌记里的位置，不是本仓给它起的口号。原本刷的「结论先行」
  // 是咨询件的方法论标签，观众读到的却是这份 deck 自己在说话。
  const section = sectionNameFor(ir.slides, index)
  return (
    <>
      {section && (
        <text x={96} y={200} fontFamily={fonts.body} fontSize={18} fill={colors.muted} dominantBaseline="alphabetic">
          {section}
        </text>
      )}
      {heading.lines.map((line, i) =>
        renderEmphasisText(
          heading.lineSegs[i] ?? [{ text: line, emphasized: false }],
          {
            accent: colors.primary,
            padFill: colors.accent,
            baseFill: colors.primary,
            fontWeight: "700",
            emphasis: ctx.emphasis,
            measureWeight: { bold: true, fontFamily: fonts.heading },
          },
          <text
            key={i}
            data-truncated={heading.truncated && i === heading.lines.length - 1 ? "1" : undefined}
            x={96}
            y={366 + i * heading.lineHeight}
            fontFamily={fonts.heading}
            fontSize={heading.fontSize}
            fontWeight="700"
            fill={colors.primary}
            dominantBaseline="alphabetic"
          />,
        ),
      )}
      {attr && (
        <text x={96} y={600} fontFamily={fonts.body} fontSize={18} fill={colors.muted} dominantBaseline="alphabetic">
          {attr}
        </text>
      )}
    </>
  )
}

export function statHero({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const fitted = fitHeroLine(heroValue(slide), { maxWidth: 1100, fontSize: 310, fontFamily: fonts.heading, bold: true })
  const unit = heroUnit(slide)
  const unitMark = heroUnitMark(fitted.fontSize)
  const caption = heroCaption(slide)
  const source = heroSource(slide)
  const numberY = 450
  const barY = underlineYFromBaseline(numberY, fitted.fontSize, fitted.text)
  const barW = Math.round(measureTextUnits(fitted.text, { bold: true, fontFamily: fonts.heading }) * fitted.fontSize)
  const BAR_H = 10
  const CAPTION_SIZE = 26
  // Caption ink must sit fully below the 10px bar. CJK fills the em box,
  // so the baseline is one caption em plus a little air under the bar.
  const captionY = barY + BAR_H + CAPTION_SIZE + 10
  const sourceY = captionY + 42
  return (
    <>
      <text
        x={96}
        y={numberY}
        fontFamily={fonts.heading}
        fontSize={fitted.fontSize}
        fontWeight="700"
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
      <rect x={96} y={barY} width={barW} height={BAR_H} fill={colors.accent} />
      {caption && (
        <text x={96} y={captionY} fontFamily={fonts.body} fontSize={CAPTION_SIZE} fill={colors.primary} dominantBaseline="alphabetic">
          {caption}
        </text>
      )}
      {source && (
        <text x={96} y={sourceY} fontFamily={fonts.body} fontSize={17} fill={colors.muted} dominantBaseline="alphabetic">
          {source}
        </text>
      )}
    </>
  )
}

export function oneEvidence({ slide, index, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const evidence = pickEvidence(slide.components)
  const evidenceRect = { x: 600, y: 230, w: 480, h: 250 }
  const textX = 224
  const textW = evidence ? textColumnMaxWidth(textX, evidenceRect.x) : 880
  const heading = fitSparseHeading(slide.heading, {
    maxWidth: textW,
    fontSize: 40,
    maxLines: 2,
    minPt: 24,
    lineHeightRatio: 1.2,
    fontFamily: fonts.heading,
    bold: false,
  })
  const note = slide.subheading
    ? evidence
      ? fitSvgLine(slide.subheading, { maxWidth: textW, fontSize: 21, minFontSize: 16, fontFamily: fonts.body })
      : { text: slide.subheading, fontSize: 21 }
    : null
  const sourceRaw = evidenceSource(slide)
  const source = sourceRaw
    ? evidence
      ? fitSvgLine(sourceRaw, { maxWidth: textW, fontSize: 16, minFontSize: 16, fontFamily: fonts.body })
      : { text: sourceRaw, fontSize: 16 }
    : null
  return (
    <>
      <rect x={160} y={190} width={960} height={320} fill={colors.surface} stroke={colors.border} strokeWidth={1} />
      <rect x={160} y={190} width={960} height={8} fill={colors.primary} />
      <text x={224} y={300} fontFamily={fonts.heading} fontSize={26} fontWeight="700" fill={colors.primary} dominantBaseline="alphabetic">
        {`依据 ${pad2(index + 1)}`}
      </text>
      {heading.lines.map((line, i) =>
        renderEmphasisText(
          heading.lineSegs[i] ?? [{ text: line, emphasized: false }],
          {
            accent: colors.primary,
            padFill: colors.accent,
            baseFill: colors.primary,
            fontWeight: "400",
            emphasis: ctx.emphasis,
            measureWeight: { bold: false, fontFamily: fonts.heading },
          },
          <text
            key={i}
            x={224}
            y={370 + i * heading.lineHeight}
            fontFamily={fonts.heading}
            fontSize={heading.fontSize}
            fontWeight="400"
            fill={colors.primary}
            dominantBaseline="alphabetic"
          />,
        ),
      )}
      {note && (
        <text x={224} y={428} fontFamily={fonts.body} fontSize={note.fontSize} fill={colors.muted} dominantBaseline="alphabetic">
          {note.text}
        </text>
      )}
      {source && (
        <text x={224} y={478} fontFamily={fonts.body} fontSize={source.fontSize} fill={colors.muted} dominantBaseline="alphabetic">
          {source.text}
        </text>
      )}
      {evidence && renderFittedEvidence(evidence, evidenceRect, ctx)}
    </>
  )
}
