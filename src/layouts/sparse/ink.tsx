import type { SvgTemplateProps } from "../types"
import type { EmphasisSegment } from "../../render/emphasis"
import { renderEmphasisTspans } from "../../render/emphasis"
import {
  hasCjk,
  heroCaption,
  heroValue,
  pullQuoteAttribution,
  pullQuoteContext,
  pullQuoteText,
} from "../minimal-shared"
import { fitHeroLine, fitSparseHeading, fitSparseQuote, quoteBlockBaseline } from "./shared"

/** ink 稀排脸：竖排格言、验印巨数、竖排引文。引文页 motif 画左下半山、不画右缘落款列。 */

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
  let i = 0
  return segments.flatMap((seg) =>
    Array.from(seg.text).flatMap((ch) => {
      if (/[，。；、]/.test(ch)) return []
      const el = (
        <text
          key={`${x}-${i}`}
          x={x}
          y={y + i * size}
          textAnchor="middle"
          fontFamily={fontFamily}
          fontSize={size}
          fill={seg.emphasized ? accent : baseFill}
          dominantBaseline="alphabetic"
        >
          {ch}
        </text>
      )
      i += 1
      return [el]
    }),
  )
}

export function statement({ ir, slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const source = slide.heading ?? ""
  const latin = !hasCjk(source)
  if (latin) {
    const heading = fitSparseHeading(source, {
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
              accent: colors.accent,
              baseFill: colors.primary,
              fontWeight: "400",
            })}
          </text>
        ))}
        <rect x={163} y={600} width={34} height={34} fill="none" stroke={colors.accent} strokeWidth={2} />
      </>
    )
  }

  const heading = fitSparseHeading(source, {
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
  const org = ir.meta.organization?.trim()
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
      {org && (
        <VerticalRun
          segments={[{ text: org, emphasized: false }]}
          x={180}
          y={440}
          size={20}
          baseFill={colors.muted}
          accent={colors.accent}
          fontFamily={fonts.heading}
        />
      )}
      <rect x={163} y={600} width={34} height={34} fill="none" stroke={colors.accent} strokeWidth={2} />
    </>
  )
}

export function statHero({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const fitted = fitHeroLine(heroValue(slide), { maxWidth: 1080, fontSize: 300, fontFamily: fonts.heading, bold: false })
  const caption = heroCaption(slide)
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
    </>
  )
}

export function pullQuote({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const source = pullQuoteText(slide)
  const context = pullQuoteContext(slide)
  const attr = pullQuoteAttribution(slide)
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
              accent: colors.accent,
              baseFill: colors.primary,
              fontWeight: "400",
            })}
          </text>
        ))}
        {attr && (
          <text
            x={200}
            y={barBottom + 62}
            fontFamily={fonts.body}
            fontSize={19}
            fill={colors.muted}
            dominantBaseline="alphabetic"
          >
            {attr}
          </text>
        )}
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
      {attr && (
        <VerticalRun
          segments={[{ text: attr, emphasized: false }]}
          x={180}
          y={440}
          size={18}
          baseFill={colors.muted}
          accent={colors.accent}
          fontFamily={fonts.heading}
        />
      )}
    </>
  )
}
