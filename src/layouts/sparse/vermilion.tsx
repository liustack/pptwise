import type { SvgTemplateProps } from "../types"
import { footerOrganization, showsDocumentMeta } from "../../render/document-meta"
import { pickEvidence } from "../../render/component-traits"
import { renderEmphasisTspans } from "../../render/emphasis"
import { heroCaption, heroUnit, heroSource, heroValue } from "../minimal-shared"
import { fitSvgLine } from "../../lib/svg-text-layout"
import { renderFittedEvidence, textColumnMaxWidth } from "../fitted-evidence"
import { deckWord, evidenceSource, fitHeroLine, fitSparseHeading, fitStatementSource, pad2 } from "./shared"
import { StatHeroFallbackContent } from "../content-stat-hero-fallback"

/** vermilion 稀排脸：金双线批示、金菱巨数、案卷卡。不画顶缘金双线、金芒、底菱。 */

function InkDouble({
  x,
  width,
  yThick,
  yThin,
  stroke,
}: {
  x: number
  width: number
  yThick: number
  yThin: number
  stroke: string
}) {
  return (
    <>
      <line x1={x} y1={yThick} x2={x + width} y2={yThick} stroke={stroke} strokeWidth={2} />
      <line x1={x} y1={yThin} x2={x + width} y2={yThin} stroke={stroke} strokeWidth={1} />
    </>
  )
}

export function statement({ ir, slide, ctx, page }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const heading = fitSparseHeading(slide.heading, {
    maxWidth: 1000,
    fontSize: 56,
    maxLines: 1,
    minPt: 28,
    lineHeightRatio: 1.2,
    fontFamily: fonts.heading,
    bold: true,
  })
  // Organization and date are footer information on a content page: each
  // prints only when the deck asks for it (`footerOrganization`,
  // `showsDocumentMeta`).
  const meta = [footerOrganization(page, ir), showsDocumentMeta(page, ir) ? ir.meta.date : undefined]
    .filter((v): v is string => Boolean(v && v.trim()))
    .join(" · ")
  const source = fitStatementSource(slide, { maxWidth: 800, fontSize: 18, fontFamily: fonts.body })
  return (
    <>
      <InkDouble x={240} width={800} yThick={150} yThin={156} stroke={colors.accent} />
      {heading.lines.map((line, i) => (
        <text
          key={i}
          data-truncated={heading.truncated ? "1" : undefined}
          x={640}
          y={360}
          textAnchor="middle"
          fontFamily={fonts.heading}
          fontSize={heading.fontSize}
          fontWeight="700"
          fill={colors.primary}
          dominantBaseline="alphabetic"
        >
          {renderEmphasisTspans(heading.lineSegs[i] ?? [{ text: line, emphasized: false }], {
            accent: colors.primary,
            baseFill: colors.primary,
            fontWeight: "700",
          })}
        </text>
      ))}
      {source && (
        <text
          data-truncated={source.truncated ? "1" : undefined}
          x={640}
          y={470}
          textAnchor="middle"
          fontFamily={fonts.body}
          fontSize={source.fontSize}
          fill={colors.muted}
          dominantBaseline="alphabetic"
        >
          {source.text}
        </text>
      )}
      <InkDouble x={240} width={800} yThick={564} yThin={560} stroke={colors.accent} />
      {meta && (
        <text
          x={1040}
          y={620}
          textAnchor="end"
          fontFamily={fonts.body}
          fontSize={18}
          fill={colors.muted}
          dominantBaseline="alphabetic"
        >
          {meta}
        </text>
      )}
    </>
  )
}

/** The hero page's caption line, its measure, and how far under it the source sits. */
const CAPTION_Y = 596
const CAPTION_SIZE = 23
const HERO_TEXT_W = 1088
const SOURCE_DROP = 32

export function statHero({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const unit = heroUnit(slide)
  const fitted = fitHeroLine(heroValue(slide), { maxWidth: 1100, fontSize: 300, fontFamily: fonts.heading, bold: true, unit })
  // A figure this line cannot set whole goes to the plain page, never cut.
  if (!fitted) return StatHeroFallbackContent({ slide, ctx })
  const unitMark = fitted.unitMark
  // The caption and the source each fit one line of the type area, and the
  // source stands a line under the caption. Both used to be set as written
  // 16px apart, so the source ran into the caption's descenders, and a long
  // caption ran off the page.
  const captionText = heroCaption(slide)
  const sourceText = heroSource(slide)
  const caption = captionText
    ? fitSvgLine(captionText, { maxWidth: HERO_TEXT_W, fontSize: CAPTION_SIZE, minFontSize: 16, fontFamily: fonts.body })
    : null
  const source = sourceText ? fitSvgLine(sourceText, { maxWidth: HERO_TEXT_W, fontSize: 16, minFontSize: 16, fontFamily: fonts.body }) : null
  return (
    <>
      <text
        x={640}
        y={460}
        textAnchor="middle"
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
      <path d="M 640 520 l 8 14 l -8 14 l -8 -14 z" fill={colors.accent} />
      {caption && (
        <text
          data-truncated={caption.truncated ? "1" : undefined}
          x={640}
          y={CAPTION_Y}
          textAnchor="middle"
          fontFamily={fonts.body}
          fontSize={caption.fontSize}
          fill={colors.muted}
          dominantBaseline="alphabetic"
        >
          {caption.text}
        </text>
      )}
      {source && (
        <text
          data-truncated={source.truncated ? "1" : undefined}
          x={640}
          y={caption ? CAPTION_Y + SOURCE_DROP : CAPTION_Y}
          textAnchor="middle"
          fontFamily={fonts.body}
          fontSize={source.fontSize}
          fill={colors.muted}
          dominantBaseline="alphabetic"
        >
          {source.text}
        </text>
      )}
    </>
  )
}

export function oneEvidence({ ir, slide, index, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const evidence = pickEvidence(slide.components)
  const evidenceRect = { x: 600, y: 230, w: 480, h: 250 }
  const textX = 234
  const textW = evidence ? textColumnMaxWidth(textX, evidenceRect.x) : 860
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
      ? fitSvgLine(slide.subheading, { maxWidth: textW, fontSize: 20, minFontSize: 16, fontFamily: fonts.body })
      : { text: slide.subheading, fontSize: 20 }
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
      <rect x={160} y={190} width={10} height={320} fill={colors.primary} />
      <text x={234} y={288} fontFamily={fonts.body} fontSize={22} fill={colors.primary} dominantBaseline="alphabetic">
        {`${deckWord(ir, "案卷", "File")} · ${pad2(index + 1)}`}
      </text>
      {heading.lines.map((line, i) => (
        <text
          key={i}
          x={234}
          y={366 + i * heading.lineHeight}
          fontFamily={fonts.heading}
          fontSize={heading.fontSize}
          fontWeight="400"
          fill={colors.text}
          dominantBaseline="alphabetic"
        >
          {renderEmphasisTspans(heading.lineSegs[i] ?? [{ text: line, emphasized: false }], {
            accent: colors.text,
            baseFill: colors.text,
            fontWeight: "400",
          })}
        </text>
      ))}
      {note && (
        <text x={234} y={428} fontFamily={fonts.body} fontSize={note.fontSize} fill={colors.muted} dominantBaseline="alphabetic">
          {note.text}
        </text>
      )}
      {source && (
        <text x={234} y={478} fontFamily={fonts.body} fontSize={source.fontSize} fill={colors.muted} dominantBaseline="alphabetic">
          {source.text}
        </text>
      )}
      {evidence && renderFittedEvidence(evidence, evidenceRect, ctx)}
    </>
  )
}
