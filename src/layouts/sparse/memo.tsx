import type { SvgTemplateProps } from "../types"
import { renderEmphasisTspans } from "../../render/emphasis"
import {
  hasCjk,
  heroCaption,
  heroUnit, heroSource, heroValue,
  pullQuoteAttribution,
  pullQuoteContext,
  pullQuoteText,
  trackingPx,
} from "../minimal-shared"
import { firstEmphasisRun, fitHeroLine, fitSparseHeading, fitSparseQuote, fitStatementSource, heroUnitMark, quoteBlockBaseline } from "./shared"

/** memo 稀排脸：打字机引文、文武夹巨数、宋体格言+印章。不画 MEMORANDUM / 顶缘红双线。 */

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

export function pullQuote({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const quote = fitSparseQuote(pullQuoteText(slide), {
    maxWidth: 1088,
    fontSize: 44,
    fontFamily: fonts.mono,
    lineHeightRatio: 1.48,
  })
  const firstY = quoteBlockBaseline(392, quote)
  const run = firstEmphasisRun(quote.lineSegs, {
    originX: 96,
    firstY,
    lineHeight: quote.lineHeight,
    fontSize: quote.fontSize,
    fontFamily: fonts.mono,
    bold: false,
  })
  const context = pullQuoteContext(slide)
  const attr = pullQuoteAttribution(slide)
  const from = attr ? `FROM:  ${attr}` : null
  const fromTracking = from && !hasCjk(from) ? trackingPx(19, 0.2) : undefined
  const last = quote.lines.length - 1
  return (
    <>
      <InkDouble x={96} width={1088} yThick={96} yThin={102} stroke={colors.text} />
      {context && (
        <text
          x={96}
          y={168}
          fontFamily={fonts.mono}
          fontSize={18}
          fill={colors.muted}
          dominantBaseline="alphabetic"
        >
          {`RE:  ${context}`}
        </text>
      )}
      {quote.lines.map((line, i) => (
        <text
          key={i}
          data-truncated={quote.truncated && i === last ? "1" : undefined}
          x={96}
          y={firstY + i * quote.lineHeight}
          fontFamily={fonts.mono}
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
      {run && (
        <line
          x1={run.x}
          y1={run.y + 20}
          x2={run.x + run.w}
          y2={run.y + 20}
          stroke={colors.accent}
          strokeWidth={3}
        />
      )}
      {from && (
        <text
          x={96}
          y={Math.round(firstY + last * quote.lineHeight) + 84}
          fontFamily={fonts.mono}
          fontSize={19}
          fill={colors.muted}
          letterSpacing={fromTracking}
          dominantBaseline="alphabetic"
        >
          {from}
        </text>
      )}
    </>
  )
}

export function statHero({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const fitted = fitHeroLine(heroValue(slide), { maxWidth: 1088, fontSize: 280, fontFamily: fonts.heading, bold: false })
  const unit = heroUnit(slide)
  const unitMark = heroUnitMark(fitted.fontSize)
  const caption = heroCaption(slide)
  const source = heroSource(slide)
  return (
    <>
      <InkDouble x={96} width={1088} yThick={170} yThin={176} stroke={colors.text} />
      <text
        x={640}
        y={460}
        textAnchor="middle"
        fontFamily={fonts.heading}
        fontSize={fitted.fontSize}
        fontWeight="400"
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
      <InkDouble x={96} width={1088} yThick={534} yThin={530} stroke={colors.text} />
      {caption && (
        <text x={96} y={590} fontFamily={fonts.mono} fontSize={19} fill={colors.muted} dominantBaseline="alphabetic">
          {`RE:  ${caption}`}
        </text>
      )}
      {source && (
        <text
          x={96}
          y={626}
          fontFamily={fonts.mono}
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
    maxWidth: 960,
    fontSize: 54,
    maxLines: 1,
    minPt: 28,
    lineHeightRatio: 1.2,
    fontFamily: fonts.heading,
    bold: false,
  })
  const source = fitStatementSource(slide, { maxWidth: 960, fontSize: 16, fontFamily: fonts.mono })
  return (
    <>
      {heading.lines.map((line, i) => (
        <text
          key={i}
          x={96}
          y={350}
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
      {source && (
        <text
          data-truncated={source.truncated ? "1" : undefined}
          x={96}
          y={430}
          fontFamily={fonts.mono}
          fontSize={source.fontSize}
          fill={colors.muted}
          dominantBaseline="alphabetic"
        >
          {source.text}
        </text>
      )}
      {/* 骑缝章：空框是印记本身，不落字。原本框里刷的「已阅 / 存档」是本仓
          写的两个词，在观众眼里与作者写的字没有分别——一张宣言页凭空多出
          一条「这份东西已经批过存档了」的记录。印框留白，作者的出处落在
          上面那行。 */}
      <rect x={1076} y={520} width={108} height={108} fill="none" stroke={colors.accent} strokeWidth={3} />
    </>
  )
}
