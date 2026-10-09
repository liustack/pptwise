import { SourceLines } from "../source-lines"
import type { SvgTemplateProps } from "../types"
import { renderEmphasisTspans, emphasisRunInk } from "../../render/emphasis"
import {
  heroCaption,
  heroUnit,
  heroValue,
  pullQuoteContext,
  pullQuoteText,
} from "../minimal-shared"
import { contextFits, fitHeroLine, fitHeroSource, fitPullQuoteSource, fitSparseHeading, fitSparseQuote, fitStatementSource, quoteBlockBaseline, sourcePastFoot, yearQuarter } from "./shared"
import { StatHeroFallbackContent } from "../content-stat-hero-fallback"

/** ledger 稀排脸：行情格言、幽灵季度、折线引文。不画顶缘刻度尺和底缘面积线。 */

const PULL_QUOTE_TICKER: readonly (readonly [number, number])[] = [
  [96, 150], [240, 142], [390, 158], [540, 138], [740, 138], [890, 158],
  [1040, 142], [1184, 150],
]

function pathCoord(n: number): number {
  return Math.round(n * 100) / 100
}

/** Same uniform Catmull-Rom as poster-motif. Sparse pull-quote owns this ticker because the motif yields. */
function catmullRomCubicD(pts: readonly (readonly [number, number])[]): string {
  if (pts.length === 0) return ""
  const r = pathCoord
  let d = `M ${r(pts[0]![0])} ${r(pts[0]![1])}`
  const n = pts.length
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1]!
    const p1 = pts[i]!
    const p2 = pts[i + 1]!
    const p3 = pts[i + 2 < n ? i + 2 : n - 1]!
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C ${r(c1x)} ${r(c1y)} ${r(c2x)} ${r(c2y)} ${r(p2[0])} ${r(p2[1])}`
  }
  return d
}

export function statement({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const heading = fitSparseHeading(slide.heading, {
    maxWidth: 1088,
    fontSize: 52,
    maxLines: 1,
    minPt: 28,
    lineHeightRatio: 1.2,
    fontFamily: fonts.heading,
    bold: false,
  })
  // A claim this line cannot hold whole goes to the shared face, which marks what it still cuts.
  if (heading.truncated) return null
  const verse = heading.lines[0] ?? ""
  const source = fitStatementSource(slide, { maxWidth: 1088, fontSize: 16, fontFamily: fonts.mono })
  return (
    <>
      <text
        x={96}
        y={380}
        fontFamily={fonts.heading}
        fontSize={heading.fontSize}
        fontWeight="400"
        fill={colors.accent}
        dominantBaseline="alphabetic"
      >
        <tspan fill={colors.muted}>{">"}</tspan>
        <tspan dx={24} fill={colors.accent}>
          {verse}
        </tspan>
      </text>
      <rect x={96} y={420} width={26} height={6} fill={colors.accent} />
      <SourceLines block={source} x={96} y={662} fontFamily={fonts.mono} fill={colors.muted} rise />
    </>
  )
}

export function statHero({ ir, slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const quarter = yearQuarter(ir.meta.date)
  const unit = heroUnit(slide)
  const fitted = fitHeroLine(heroValue(slide), { maxWidth: 1100, fontSize: 290, fontFamily: fonts.heading, bold: false, unit })
  // A figure this line cannot set whole goes to the plain page, never cut.
  if (!fitted) return StatHeroFallbackContent({ slide, ctx })
  const unitMark = fitted.unitMark
  const caption = heroCaption(slide)
  const source = fitHeroSource(slide, { maxWidth: 1088, fontSize: 16, fontFamily: fonts.mono })
  // A source too long for the room under the caption hands the page over whole.
  if (sourcePastFoot(source, 602)) return StatHeroFallbackContent({ slide, ctx })
  return (
    <>
      {quarter && (
        <text
          x={1180}
          y={560}
          textAnchor="end"
          fontFamily={fonts.heading}
          fontSize={430}
          fontWeight="400"
          fill={colors.surface}
          dominantBaseline="alphabetic"
        >
          {quarter.quarter}
        </text>
      )}
      <text
        x={96}
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
      {caption && (
        <text x={96} y={560} fontFamily={fonts.body} fontSize={24} fill={colors.muted} dominantBaseline="alphabetic">
          {caption}
        </text>
      )}
      <SourceLines block={source} x={96} y={602} fontFamily={fonts.mono} fill={colors.muted} />
    </>
  )
}

export function pullQuote({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const quote = fitSparseQuote(pullQuoteText(slide), {
    maxWidth: 1000,
    fontSize: 46,
    fontFamily: fonts.heading,
    lineHeightRatio: 1.38,
  })
  const context = pullQuoteContext(slide)
  // A context line this page cannot set whole goes to the shared face.
  if (!contextFits(context, { maxWidth: 1088, fontSize: 18, fontFamily: fonts.body })) return null
  const attr = fitPullQuoteSource(slide, { maxWidth: 1088, fontSize: 18, fontFamily: fonts.heading })
  const last = quote.lines.length - 1
  const firstY = quoteBlockBaseline(398, quote)
  const attrY = Math.round(firstY + last * quote.lineHeight) + 76
  // A source too long for the room under the quote hands the page to the shared face.
  if (sourcePastFoot(attr, attrY)) return null
  return (
    <>
      {/* 行情走线是内容无关装饰，走中景，不与引言抢前景。 */}
      <g data-depth="mid">
        <path
          d={catmullRomCubicD(PULL_QUOTE_TICKER)}
          fill="none"
          stroke={colors.border}
          strokeWidth={2}
        />
      </g>
      {context && (
        <text
          x={640}
          y={228}
          textAnchor="middle"
          fontFamily={fonts.body}
          fontSize={18}
          fill={colors.muted}
          dominantBaseline="alphabetic"
        >
          {context}
        </text>
      )}
      {quote.lines.map((line, i) => (
        <text
          key={i}
          data-truncated={quote.truncated && i === last ? "1" : undefined}
          x={640}
          y={firstY + i * quote.lineHeight}
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
      <SourceLines block={attr} x={640} y={attrY} textAnchor="middle" fontFamily={fonts.heading} fill={colors.accent} />
    </>
  )
}
