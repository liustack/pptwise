import { SourceLines, fitSourceBlock } from "../source-lines"
import type { SvgTemplateProps } from "../types"
import type { EmphasisSegment } from "../../render/emphasis"
import { renderEmphasisTspans, emphasisRunInk } from "../../render/emphasis"
import {
  hasCjk,
  heroCaption,
  heroUnit,
  heroValue,
  pullQuoteContext,
  pullQuoteText,
  pullQuoteSourceParts,
} from "../minimal-shared"
import { fitHeroLine, fitHeroSource, fitPullQuoteSource, fitSparseHeading, fitSparseQuote, fitStatementSource, quoteBlockBaseline, sourcePastFoot } from "./shared"
import { StatHeroFallbackContent } from "../content-stat-hero-fallback"
import { verticalForm } from "../compositions/scroll"

/** ink 稀排脸：竖排格言、验印巨数、竖排引文。机构与年月由 ink-motif v2 竖排在右缘，脸不再另画落款列。 */

function VerticalRun({
  segments,
  x,
  y,
  size,
  baseFill,
  accent,
  fontFamily,
}: {
  segments: EmphasisSegment[]
  x: number
  y: number
  size: number
  baseFill: string
  accent: string
  fontFamily: string
}) {
  // 竖排换列本身就是那个逗号：`splitCjkPhrases` 把停顿号留在它收尾的短语
  // 末尾，所以一列末尾的逗号已经由列的结束画出来了，再画一个方块是重复。
  //
  // 其余的停顿号一律照画。旧写法把 `，。；、` 全部删掉，作者写的句号、
  // 顿号、分号就此从页面消失，而且没有任何标记：`甲、乙` 竖排成 `甲乙`，
  // 引文末尾的句号也不见了。列末逗号是排版，别的是作者的字。
  const runText = segments.map((seg) => seg.text).join("")
  const breakAt = /，$/.test(runText) ? Array.from(runText).length - 1 : -1
  let seen = -1
  let i = 0
  return segments.flatMap((seg) =>
    Array.from(seg.text).flatMap((ch) => {
      seen += 1
      if (seen === breakAt) return []
      // Punctuation sits the way vertical type sets it: a comma or a full
      // stop in the upper right of its cell, a bracket in its vertical form.
      const form = verticalForm(ch)
      const cx = Math.round((x + form.dx * size) * 100) / 100
      const cy = Math.round((y + i * size + form.dy * size) * 100) / 100
      const middle = Math.round((y + i * size - size * 0.38) * 100) / 100
      const el = (
        <text
          key={`${x}-${i}`}
          x={cx}
          y={form.turn ? Math.round((middle + size * 0.35) * 100) / 100 : cy}
          transform={form.turn ? `rotate(90 ${cx} ${middle})` : undefined}
          textAnchor="middle"
          fontFamily={fontFamily}
          fontSize={size}
          fill={seg.emphasized ? accent : baseFill}
          dominantBaseline="alphabetic"
        >
          {form.ch}
        </text>
      )
      i += 1
      return [el]
    }),
  )
}

export function statement({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const verse = slide.heading ?? ""
  const latin = !hasCjk(verse)
  const cited = fitStatementSource(slide, { maxWidth: 840, fontSize: 16, fontFamily: fonts.body })
  if (latin) {
    const heading = fitSparseHeading(verse, {
      maxWidth: 1000,
      fontSize: 52,
      maxLines: 2,
      minPt: 28,
      lineHeightRatio: 1.25,
      fontFamily: fonts.heading,
      bold: false,
    })
    return (
      <>
        <rect x={1042} y={110} width={18} height={66} fill={colors.accent} />
        {heading.lines.map((line, i) => (
          <text
            key={i}
            x={640}
            y={380 + i * heading.lineHeight}
            textAnchor="middle"
            fontFamily={fonts.heading}
            fontSize={heading.fontSize}
            fill={colors.primary}
            dominantBaseline="alphabetic"
          >
            {renderEmphasisTspans(heading.lineSegs[i] ?? [{ text: line, emphasized: false }], {
              accent: emphasisRunInk(colors),
              baseFill: colors.primary,
              fontWeight: "400",
            })}
          </text>
        ))}
        <SourceLines block={cited} x={640} y={470} textAnchor="middle" fontFamily={fonts.body} fill={colors.muted} />
        <rect x={163} y={600} width={34} height={34} fill="none" stroke={colors.accent} strokeWidth={2} />
      </>
    )
  }

  const heading = fitSparseHeading(verse, {
    maxWidth: 52 * 10,
    fontSize: 52,
    maxLines: 2,
    minPt: 52,
    lineHeightRatio: 1,
    fontFamily: fonts.heading,
    bold: false,
  })
  const columns = heading.lines.slice(0, 2)
  const xs = [1000, 880]
  // The organization stands down the right margin with the date, where the
  // motif sets it on every content page (ink-motif v2), so the page prints
  // it once.
  return (
    <>
      <rect x={1042} y={110} width={18} height={66} fill={colors.accent} />
      {columns.map((line, col) => (
        <g key={col}>
          <VerticalRun
            segments={heading.lineSegs[col] ?? [{ text: line, emphasized: false }]}
            x={xs[col]}
            y={150}
            size={heading.fontSize}
            baseFill={colors.primary}
            accent={colors.accent}
            fontFamily={fonts.heading}
          />
        </g>
      ))}
      <SourceLines block={cited} x={240} y={664} fontFamily={fonts.body} fill={colors.muted} rise />
      <rect x={163} y={600} width={34} height={34} fill="none" stroke={colors.accent} strokeWidth={2} />
    </>
  )
}

export function statHero({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const unit = heroUnit(slide)
  const fitted = fitHeroLine(heroValue(slide), { maxWidth: 1080, fontSize: 300, fontFamily: fonts.heading, bold: false, unit })
  // A figure this line cannot set whole goes to the plain page, never cut.
  if (!fitted) return StatHeroFallbackContent({ slide, ctx })
  const unitMark = fitted.unitMark
  const caption = heroCaption(slide)
  const source = fitHeroSource(slide, { maxWidth: 1000, fontSize: 16, fontFamily: fonts.body })
  // A source too long for the room under the caption hands the page over whole.
  if (sourcePastFoot(source, 606)) return StatHeroFallbackContent({ slide, ctx })
  return (
    <>
      <text
        x={140}
        y={480}
        fontFamily={fonts.heading}
        fontSize={fitted.fontSize}
        fontWeight="400"
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
      <rect x={1108} y={392} width={56} height={56} fill={colors.accent} />
      <text
        x={1136}
        y={430}
        textAnchor="middle"
        fontFamily={fonts.heading}
        fontSize={24}
        fill={colors.bg}
        dominantBaseline="alphabetic"
      >
        验
      </text>
      {caption && (
        <text x={140} y={570} fontFamily={fonts.body} fontSize={22} fill={colors.muted} dominantBaseline="alphabetic">
          {caption}
        </text>
      )}
      <SourceLines block={source} x={140} y={606} fontFamily={fonts.body} fill={colors.muted} />
    </>
  )
}

export function pullQuote({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const source = pullQuoteText(slide)
  const context = pullQuoteContext(slide)
  const parts = pullQuoteSourceParts(slide)
  const latin = !hasCjk(source)

  if (latin) {
    const quote = fitSparseQuote(source, {
      maxWidth: 900,
      fontSize: 46,
      fontFamily: fonts.heading,
      lineHeightRatio: 1.44,
    })
    const last = quote.lines.length - 1
    const firstY = quoteBlockBaseline(360, quote)
    const barTop = Math.round(firstY - quote.fontSize - 12)
    const barBottom = Math.round(firstY + last * quote.lineHeight + quote.fontSize * 0.3)
    const attr = fitPullQuoteSource(slide, { maxWidth: 880, fontSize: 19, fontFamily: fonts.body })
    // A source too long for the room under the quote hands the page to the shared face.
    if (sourcePastFoot(attr, barBottom + 62)) return null
    return (
      <>
        <rect x={150} y={barTop} width={4} height={barBottom - barTop} fill={colors.accent} />
        {context && (
          <text x={200} y={176} fontFamily={fonts.body} fontSize={18} fill={colors.muted} dominantBaseline="alphabetic">
            {context}
          </text>
        )}
        {quote.lines.map((line, i) => (
          <text
            key={i}
            data-truncated={quote.truncated && i === last ? "1" : undefined}
            x={200}
            y={firstY + i * quote.lineHeight}
            fontFamily={fonts.heading}
            fontSize={quote.fontSize}
            fontWeight="400"
            fill={colors.primary}
            dominantBaseline="alphabetic"
          >
            {renderEmphasisTspans(quote.lineSegs[i] ?? [{ text: line, emphasized: false }], {
              accent: emphasisRunInk(colors),
              baseFill: colors.primary,
              fontWeight: "400",
            })}
          </text>
        ))}
        <SourceLines block={attr} x={200} y={barBottom + 62} fontFamily={fonts.body} fill={colors.muted} />
      </>
    )
  }

  // CJK: board grammar from wave8/b2 Ink cover. Vertical quote on the
  // right, vermilion opener at the shoulder, attribution as left colophon,
  // page context as a marginal column outside the quote's own rail.
  // Motif paints the remnant mountain lower left and yields the right rail.
  //
  // 竖排每列的字数上限即 `maxWidth / fontSize`，行数即列数：作者写下的引文
  // 通常有三四十字，两列装不下，四列才装得下，逗号处正好断列。
  const quote = fitSparseQuote(source, {
    maxWidth: 42 * 12,
    fontSize: 42,
    fontFamily: fonts.heading,
    lineHeightRatio: 1,
  })
  const columns = quote.lines
  const xs = [900, 780, 660, 540]
  // The page's footnote reads across, at the foot of the left margin, the
  // way the statement page sets its source: a source set down a column
  // would run off the page.
  const footnote = fitSourceBlock(undefined, parts.footnote, { maxWidth: 840, fontSize: 16, fontFamily: fonts.body })
  return (
    <>
      <rect x={942} y={110} width={14} height={56} fill={colors.accent} />
      {context && (
        <VerticalRun
          segments={[{ text: context, emphasized: false }]}
          x={1040}
          y={176}
          size={17}
          baseFill={colors.muted}
          accent={colors.accent}
          fontFamily={fonts.heading}
        />
      )}
      {columns.map((line, col) => (
        <g key={col} data-truncated={quote.truncated && col === columns.length - 1 ? "1" : undefined}>
          <VerticalRun
            segments={quote.lineSegs[col] ?? [{ text: line, emphasized: false }]}
            x={xs[col] ?? xs[xs.length - 1]! - (col - xs.length + 1) * 120}
            y={150}
            size={quote.fontSize}
            baseFill={colors.primary}
            accent={colors.accent}
            fontFamily={fonts.heading}
          />
        </g>
      ))}
      {parts.attribution && (
        <VerticalRun
          segments={[{ text: parts.attribution, emphasized: false }]}
          x={180}
          y={440}
          size={18}
          baseFill={colors.muted}
          accent={colors.accent}
          fontFamily={fonts.heading}
        />
      )}
      <SourceLines block={footnote} x={240} y={664} fontFamily={fonts.body} fill={colors.muted} rise />
    </>
  )
}
