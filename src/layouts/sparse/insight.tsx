import type { SvgTemplateProps } from "../types"
import { renderEmphasisTspans } from "../../render/emphasis"
import {
  heroCaption,
  heroSource,
  heroUnit, heroValue,
  pullQuoteAttribution,
  pullQuoteContext,
  pullQuoteText,
} from "../minimal-shared"
import { fitHeroLine, fitSparseHeading, fitSparseQuote, fitStatementSource, heroUnitMark, quoteBlockBaseline, yearQuarter } from "./shared"

/** insight 稀排脸：行情格言、幽灵季度、折线引文。不画顶缘刻度尺和底缘面积线。 */

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
      {source && (
        <text
          data-truncated={source.truncated ? "1" : undefined}
          x={96}
          y={662}
          fontFamily={fonts.mono}
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

export function statHero({ ir, slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const quarter = yearQuarter(ir.meta.date)
  const fitted = fitHeroLine(heroValue(slide), { maxWidth: 1100, fontSize: 290, fontFamily: fonts.heading, bold: false })
  const unit = heroUnit(slide)
  const unitMark = heroUnitMark(fitted.fontSize)
  const caption = heroCaption(slide)
  const source = heroSource(slide)
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
      {source && (
        <text x={96} y={602} fontFamily={fonts.mono} fontSize={16} fill={colors.muted} dominantBaseline="alphabetic">
          {source}
        </text>
      )}
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
  const attr = pullQuoteAttribution(slide)
  const last = quote.lines.length - 1
  const firstY = quoteBlockBaseline(398, quote)
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
            accent: colors.accent,
            baseFill: colors.text,
            fontWeight: "400",
          })}
        </text>
      ))}
      {attr && (
        <text
          x={640}
          y={Math.round(firstY + last * quote.lineHeight) + 76}
          textAnchor="middle"
          fontFamily={fonts.heading}
          fontSize={18}
          fill={colors.accent}
          dominantBaseline="alphabetic"
        >
          {attr}
        </text>
      )}
    </>
  )
}
