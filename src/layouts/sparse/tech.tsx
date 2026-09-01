import type { SvgTemplateProps } from "../types"
import { pickEvidence } from "../../render/component-traits"
import { renderEmphasisTspans } from "../../render/emphasis"
import { heroCaption, heroSource, heroUnit, heroValue } from "../minimal-shared"
import { fitSvgLine, measureTextUnits } from "../../lib/svg-text-layout"
import { renderFittedEvidence, textColumnMaxWidth } from "../fitted-evidence"
import { evidenceSource, fitHeroLine, heroUnitMark, fitSparseHeading, pad2 } from "./shared"

/** tech 稀排脸：青光巨数、轨道格言、节点证据卡。不画右缘星座链。 */

const STAR_R = [5, 3.5, 3.5, 5] as const
const STAR_SPAN = 490
const HERO_X = 96
const STAR_Y = 505

function starTrack(heroWidth: number): { x1: number; x2: number; dots: { cx: number; r: number }[] } {
  const span = Math.min(STAR_SPAN, Math.max(160, heroWidth))
  const x1 = Math.round(HERO_X + Math.max(0, heroWidth - span) / 2)
  const x2 = x1 + span
  const step = span / (STAR_R.length - 1)
  return {
    x1,
    x2,
    dots: STAR_R.map((r, i) => ({ cx: Math.round(x1 + i * step), r })),
  }
}

export function statHero({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const fitted = fitHeroLine(heroValue(slide), { maxWidth: 1100, fontSize: 300, fontFamily: fonts.heading, bold: true })
  const unit = heroUnit(slide)
  const unitMark = heroUnitMark(fitted.fontSize)
  const caption = heroCaption(slide)
  const source = heroSource(slide)
  const heroWidth = measureTextUnits(fitted.text, { bold: true, fontFamily: fonts.heading }) * fitted.fontSize
  const track = starTrack(heroWidth)
  return (
    <>
      <text
        x={HERO_X}
        y={450}
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
      <line x1={track.x1} y1={STAR_Y} x2={track.x2} y2={STAR_Y} stroke={colors.border} strokeWidth={1.5} />
      {track.dots.map((dot) => (
        <circle key={dot.cx} cx={dot.cx} cy={STAR_Y} r={dot.r} fill={colors.accent} />
      ))}
      {caption && (
        <text x={96} y={574} fontFamily={fonts.body} fontSize={25} fill={colors.text} dominantBaseline="alphabetic">
          {caption}
        </text>
      )}
      {source && (
        <text x={96} y={614} fontFamily={fonts.body} fontSize={17} fill={colors.muted} dominantBaseline="alphabetic">
          {source}
        </text>
      )}
    </>
  )
}

export function statement({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const heading = fitSparseHeading(slide.heading, {
    maxWidth: 920,
    fontSize: 58,
    maxLines: 2,
    minPt: 32,
    lineHeightRatio: 92 / 58,
    fontFamily: fonts.heading,
    bold: true,
  })
  return (
    <>
      <path d="M 980 48 C 1140 48 1232 104 1232 208" fill="none" stroke={colors.border} strokeWidth={1.5} />
      <path d="M 1060 56 C 1164 56 1220 100 1220 176" fill="none" stroke={colors.border} strokeWidth={1} />
      <circle cx={1148} cy={58} r={4} fill={colors.accent} />
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
  return (
    <>
      <rect x={160} y={190} width={960} height={320} fill={colors.surface} stroke={colors.border} strokeWidth={1} />
      <circle cx={224} cy={268} r={6} fill={colors.accent} />
      <line x1={230} y1={268} x2={300} y2={268} stroke={colors.border} strokeWidth={1.5} />
      <text x={316} y={276} fontFamily={fonts.body} fontSize={20} fill={colors.accent} dominantBaseline="alphabetic">
        {`NODE ${pad2(index + 1)}`}
      </text>
      {heading.lines.map((line, i) => (
        <text
          key={i}
          x={224}
          y={360 + i * heading.lineHeight}
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
        <text x={224} y={420} fontFamily={fonts.body} fontSize={note.fontSize} fill={colors.muted} dominantBaseline="alphabetic">
          {note.text}
        </text>
      )}
      {source && (
        <text x={224} y={470} fontFamily={fonts.body} fontSize={source.fontSize} fill={colors.muted} dominantBaseline="alphabetic">
          {source.text}
        </text>
      )}
      {evidence && renderFittedEvidence(evidence, evidenceRect, ctx)}
    </>
  )
}
