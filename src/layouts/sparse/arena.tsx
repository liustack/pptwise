import type { SvgTemplateProps } from "../types"
import { pickEvidence } from "../../render/component-traits"
import { renderEmphasisTspans } from "../../render/emphasis"
import { heroCaption, heroUnit, heroSource, heroValue } from "../minimal-shared"
import { fitSvgLine } from "../../lib/svg-text-layout"
import { renderFittedEvidence, textColumnMaxWidth } from "../fitted-evidence"
import { evidenceSource, fitHeroLine, heroUnitMark, fitSparseHeading, pad2 } from "./shared"

/** arena 稀排脸：内缩 HUD、量能条、对角亮括弧。不画页角 12px 括弧和底带能量条。 */

const ENERGY = [
  { x: 96, opacity: 1 },
  { x: 134, opacity: 0.7 },
  { x: 172, opacity: 0.45 },
  { x: 210, opacity: 0.22 },
] as const

export function statHero({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const fitted = fitHeroLine(heroValue(slide), { maxWidth: 1100, fontSize: 330, fontFamily: fonts.heading, bold: true })
  const unit = heroUnit(slide)
  const unitMark = heroUnitMark(fitted.fontSize)
  const caption = heroCaption(slide)
  const source = heroSource(slide)
  return (
    <>
      <path d="M 100 100 l 0 -24 l 24 0" fill="none" stroke={colors.border} strokeWidth={2} />
      <path d="M 1180 100 l 0 -24 l -24 0" fill="none" stroke={colors.border} strokeWidth={2} />
      <path d="M 100 620 l 0 24 l 24 0" fill="none" stroke={colors.border} strokeWidth={2} />
      <path d="M 1180 620 l 0 24 l -24 0" fill="none" stroke={colors.border} strokeWidth={2} />
      <text
        x={640}
        y={470}
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
          y={570}
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
          y={610}
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
    maxWidth: 1088,
    fontSize: 58,
    maxLines: 2,
    minPt: 32,
    lineHeightRatio: 92 / 58,
    fontFamily: fonts.heading,
    bold: true,
  })
  return (
    <>
      {heading.lines.map((line, i) => (
        <text
          key={i}
          data-truncated={heading.truncated && i === heading.lines.length - 1 ? "1" : undefined}
          x={96}
          y={350 + i * heading.lineHeight}
          fontFamily={fonts.heading}
          fontSize={heading.fontSize}
          fontWeight="700"
          fill={colors.text}
          dominantBaseline="alphabetic"
        >
          {renderEmphasisTspans(heading.lineSegs[i] ?? [{ text: line, emphasized: false }], {
            accent: colors.accent,
            baseFill: colors.text,
            fontWeight: "700",
          })}
        </text>
      ))}
      {ENERGY.map((bar) => (
        <rect key={bar.x} x={bar.x} y={540} width={30} height={8} fill={colors.accent} opacity={bar.opacity} />
      ))}
    </>
  )
}

/**
 * one-evidence 取景框角标：面板四角外侧的对角亮括弧。角标与面板留
 * `VIEWFINDER_GAP` 的对角呼吸位——两条臂贴着面板边线画时，括弧读成面板
 * 描边的一段毛刺，取景框的「框住主体」语义不成立（gallery 视觉验收
 * fix/gallery-verdict-round 第 1 条）。臂长收在面板边界处，不越过主体。
 */
const VIEWFINDER_GAP = 16
const VIEWFINDER_ARM = 16

export function oneEvidence({ slide, index, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const evidence = pickEvidence(slide.components)
  const evidenceRect = { x: 600, y: 230, w: 480, h: 250 }
  const textX = 224
  const textW = evidence ? textColumnMaxWidth(textX, evidenceRect.x) : 880
  const heading = fitSparseHeading(slide.heading, {
    maxWidth: textW,
    fontSize: 42,
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
  const panel = { x: 160, y: 190, w: 960, h: 320 }
  const markTop = panel.y - VIEWFINDER_GAP
  const markLeft = panel.x - VIEWFINDER_GAP
  const markBottom = panel.y + panel.h + VIEWFINDER_GAP
  const markRight = panel.x + panel.w + VIEWFINDER_GAP
  const topLeftMark = `M ${panel.x} ${markTop} L ${markLeft} ${markTop} L ${markLeft} ${markTop + VIEWFINDER_ARM}`
  const bottomRightMark = `M ${panel.x + panel.w} ${markBottom} L ${markRight} ${markBottom} L ${markRight} ${markBottom - VIEWFINDER_ARM}`
  return (
    <>
      <rect x={panel.x} y={panel.y} width={panel.w} height={panel.h} fill={colors.surface} stroke={colors.border} strokeWidth={1} />
      <path d={topLeftMark} fill="none" stroke={colors.accent} strokeWidth={2} />
      <path d={bottomRightMark} fill="none" stroke={colors.accent} strokeWidth={2} />
      <text x={224} y={288} fontFamily={fonts.mono} fontSize={20} fill={colors.accent} dominantBaseline="alphabetic">
        {`STAT / ${pad2(index + 1)}`}
      </text>
      {heading.lines.map((line, i) => (
        <text
          key={i}
          x={224}
          y={366 + i * heading.lineHeight}
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
