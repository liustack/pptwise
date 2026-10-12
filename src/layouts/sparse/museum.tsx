import { SourceLines } from "../source-lines"
import type { SvgTemplateProps } from "../types"
import { footerOrganization, showsDocumentMeta } from "../../render/document-meta"
import { sectionNameFor } from "../../lib/derive"
import { renderEmphasisTspans, emphasisRunInk } from "../../render/emphasis"
import { heroCaption, heroUnit, heroValue } from "../minimal-shared"
import { fitHeroLine, fitHeroSource, fitSparseHeading, fitStatementSource, sourcePastFoot } from "./shared"
import { StatHeroFallbackContent } from "../content-stat-hero-fallback"

/** museum 稀排脸：展签格言、衬板单证据、铜金巨数。 */

export function statement({ ir, slide, index, ctx, page }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const section = sectionNameFor(ir.slides, index)
  const heading = fitSparseHeading(slide.heading, {
    maxWidth: 1000,
    fontSize: 56,
    maxLines: 2,
    minPt: 32,
    lineHeightRatio: 86 / 56,
    fontFamily: fonts.heading,
    bold: false,
  })
  // Organization and date are footer information on a content page: each
  // prints only when the deck asks for it.
  const footer = [footerOrganization(page, ir), showsDocumentMeta(page, ir) ? ir.meta.date : undefined]
    .filter((v): v is string => Boolean(v && v.trim()))
    .join(" · ")
  const source = fitStatementSource(slide, { maxWidth: 1000, fontSize: 17, fontFamily: fonts.body })
  return (
    <>
      {section && (
        <text
          x={640}
          y={200}
          textAnchor="middle"
          fontFamily={fonts.body}
          fontSize={18}
          fill={colors.accent}
          dominantBaseline="alphabetic"
        >
          {section}
        </text>
      )}
      {section && <line x1={600} y1={222} x2={680} y2={222} stroke={colors.accent} strokeWidth={1} />}
      {heading.lines.map((line, i) => (
        <text
          key={i}
          x={640}
          y={360 + i * heading.lineHeight}
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
      <SourceLines block={source} x={640} y={528} textAnchor="middle" fontFamily={fonts.body} fill={colors.muted} />
      {footer && (
        <text x={640} y={580} textAnchor="middle" fontFamily={fonts.body} fontSize={17} fill={colors.muted} dominantBaseline="alphabetic">
          {footer}
        </text>
      )}
    </>
  )
}

export function statHero({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const unit = heroUnit(slide)
  const fitted = fitHeroLine(heroValue(slide), { maxWidth: 1100, fontSize: 290, fontFamily: fonts.heading, bold: false, unit })
  // A figure this line cannot set whole goes to the plain page, never cut.
  if (!fitted) return StatHeroFallbackContent({ slide, ctx })
  const unitMark = fitted.unitMark
  const caption = heroCaption(slide)
  const source = fitHeroSource(slide, { maxWidth: 1088, fontSize: 16, fontFamily: fonts.body })
  // A source too long for the room under the caption hands the page over whole.
  if (sourcePastFoot(source, 616)) return StatHeroFallbackContent({ slide, ctx })
  return (
    <>
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
      <line x1={480} y1={530} x2={800} y2={530} stroke={colors.border} strokeWidth={1} />
      {caption && (
        <text x={640} y={580} textAnchor="middle" fontFamily={fonts.body} fontSize={21} fill={colors.muted} dominantBaseline="alphabetic">
          {caption}
        </text>
      )}
      <SourceLines block={source} x={640} y={616} textAnchor="middle" fontFamily={fonts.body} fill={colors.muted} />
    </>
  )
}
