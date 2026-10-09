import { SourceLines } from "../source-lines"
import type { SvgTemplateProps } from "../types"
import { sectionNameFor } from "../../lib/derive"
import { pickEvidence } from "../../render/component-traits"
import { renderEmphasisTspans, emphasisRunInk } from "../../render/emphasis"
import { fitSvgLine } from "../../lib/svg-text-layout"
import { heroCaption, heroUnit, heroValue } from "../minimal-shared"
import { renderFittedEvidence } from "../fitted-evidence"
import { evidenceSource, firstEmphasisRun, fitHeroLine, fitHeroSource, fitSparseHeading, fitStatementSource, sourcePastFoot } from "./shared"
import { StatHeroFallbackContent } from "../content-stat-hero-fallback"

/** lecture 稀排脸：左轴板书、粉笔巨数、虚线证据框。不画整页粉笔槽细框。 */

export function statement({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const heading = fitSparseHeading(slide.heading, {
    maxWidth: 1040,
    fontSize: 58,
    maxLines: 2,
    minPt: 32,
    lineHeightRatio: 98 / 58,
    fontFamily: fonts.heading,
    bold: false,
  })
  const run = firstEmphasisRun(heading.lineSegs, {
    originX: 120,
    firstY: 330,
    lineHeight: heading.lineHeight,
    fontSize: heading.fontSize,
    fontFamily: fonts.heading,
    bold: false,
  })
  const attrLine = fitStatementSource(slide, { maxWidth: 1040, fontSize: 20, minFontSize: 16, fontFamily: fonts.body })
  return (
    <>
      {heading.lines.map((line, i) => (
        <text
          key={i}
          data-truncated={heading.truncated && i === heading.lines.length - 1 ? "1" : undefined}
          x={120}
          y={330 + i * heading.lineHeight}
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
      {run && (
        <path
          d={`M ${run.x} ${run.y + 24} q ${Math.round(run.w * 0.38)} 16 ${Math.round(run.w)} 4`}
          fill="none"
          stroke={colors.accent}
          strokeWidth={4}
          strokeLinecap="round"
        />
      )}
      <SourceLines block={attrLine} x={120} y={560} fontFamily={fonts.body} fill={colors.muted} />
    </>
  )
}

export function statHero({ ir, slide, index, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const section = sectionNameFor(ir.slides, index)
  const kicker = section
    ? fitSvgLine(section, { maxWidth: 1040, fontSize: 22, minFontSize: 16, fontFamily: fonts.body })
    : null
  const unit = heroUnit(slide)
  const fitted = fitHeroLine(heroValue(slide), { maxWidth: 1040, fontSize: 260, fontFamily: fonts.heading, bold: false, unit })
  // A figure this line cannot set whole goes to the plain page, never cut.
  if (!fitted) return StatHeroFallbackContent({ slide, ctx })
  const unitMark = fitted.unitMark
  const caption = heroCaption(slide)
  const source = fitHeroSource(slide, { maxWidth: 1040, fontSize: 16, fontFamily: fonts.body })
  // A source too long for the room under the caption hands the page over whole.
  if (sourcePastFoot(source, 626)) return StatHeroFallbackContent({ slide, ctx })
  return (
    <>
      {kicker && (
        <text x={120} y={180} fontFamily={fonts.body} fontSize={kicker.fontSize} fill={colors.muted} dominantBaseline="alphabetic">
          {kicker.text}
        </text>
      )}
      <text
        x={120}
        y={470}
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
      <path
        d="M 124 510 q 200 22 560 6"
        fill="none"
        stroke={colors.accent}
        strokeWidth={5}
        strokeLinecap="round"
        opacity={0.8}
      />
      {caption && (
        <text x={120} y={590} fontFamily={fonts.body} fontSize={22} fill={colors.muted} dominantBaseline="alphabetic">
          {caption}
        </text>
      )}
      <SourceLines block={source} x={120} y={626} fontFamily={fonts.body} fill={colors.muted} />
    </>
  )
}

export function oneEvidence({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const evidence = pickEvidence(slide.components)
  const heading = fitSparseHeading(slide.heading, {
    maxWidth: 800,
    fontSize: 40,
    maxLines: 2,
    minPt: 22,
    lineHeightRatio: 1.28,
    fontFamily: fonts.heading,
    bold: false,
  })
  const note = slide.subheading
    ? fitSvgLine(slide.subheading, { maxWidth: 800, fontSize: 24, minFontSize: 16, fontFamily: fonts.body })
    : null
  const sourceRaw = evidenceSource(slide)
  const source = sourceRaw ? fitSvgLine(sourceRaw, { maxWidth: 800, fontSize: 18, minFontSize: 18, fontFamily: fonts.body }) : null
  // The frame sets every line whole or hands the page over: a line it would
  // cut, or a subheading beside an exhibit, which this frame has no room
  // for, goes to the shared face, which sets it at its own measure and marks
  // what it still cannot hold.
  if (heading.truncated || note?.truncated || source?.truncated || (evidence && note)) return null
  return (
    <>
      <rect
        x={200}
        y={200}
        width={880}
        height={300}
        fill="none"
        stroke={colors.muted}
        strokeWidth={2}
        strokeDasharray="10 8"
      />
      {evidence &&
        heading.lines.map((line, i) => (
          <text
            key={`claim-${i}`}
            x={120}
            y={140 + i * heading.lineHeight}
            fontFamily={fonts.heading}
            fontSize={Math.min(heading.fontSize, 28)}
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
      {evidence
        ? renderFittedEvidence(evidence, { x: 220, y: 220, w: 840, h: 260 }, ctx)
        : heading.lines.map((line, i) => (
            <text
              key={i}
              x={640}
              y={316 + i * heading.lineHeight}
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
      {!evidence && note && (
        <text x={640} y={380} textAnchor="middle" fontFamily={fonts.body} fontSize={note.fontSize} fill={colors.muted} dominantBaseline="alphabetic">
          {note.text}
        </text>
      )}
      {source && (
        <text x={640} y={560} textAnchor="middle" fontFamily={fonts.body} fontSize={source.fontSize} fill={colors.muted} dominantBaseline="alphabetic">
          {source.text}
        </text>
      )}
    </>
  )
}
