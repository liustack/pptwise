import type { SvgTemplateProps } from "../types"
import { renderEmphasisTspans } from "../../render/emphasis"
import { heroCaption, heroUnit, heroSource, heroValue, pullQuoteAttribution, pullQuoteContext, pullQuoteText } from "../minimal-shared"
import { fitHeroLine, fitSparseHeading, fitSparseQuote, fitStatementSource, heroUnitMark, quoteBlockBaseline } from "./shared"

/** heritage 稀排脸：文武线引文、取景框格言、夹心巨数。不画 motif 顶缘双线和顶角金菱。 */

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
    maxWidth: 1000,
    fontSize: 48,
    fontFamily: fonts.heading,
    lineHeightRatio: 1.36,
  })
  const context = pullQuoteContext(slide)
  const attr = pullQuoteAttribution(slide)
  const last = quote.lines.length - 1
  const firstY = quoteBlockBaseline(368, quote)
  const barY = Math.round(firstY + last * quote.lineHeight + quote.fontSize * 0.66)
  return (
    <>
      <InkDouble x={96} width={1088} yThick={80} yThin={88} stroke={colors.primary} />
      {context && (
        <text
          x={640}
          y={158}
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
      <rect x={568} y={barY} width={144} height={3} fill={colors.accent} />
      {attr && (
        <text
          x={640}
          y={barY + 78}
          textAnchor="middle"
          fontFamily={fonts.heading}
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

const VIEWFINDER_L = 200
const VIEWFINDER_T = 120
const VIEWFINDER_R = 1080
const VIEWFINDER_B = 600
const VIEWFINDER_ARM = 56
const SUBJECT_MAX_W = 720

function viewfinderCorner(x: number, y: number, dx: number, dy: number): string {
  return `M ${x + dx} ${y} L ${x} ${y} L ${x} ${y + dy}`
}

export function statement({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const heading = fitSparseHeading(slide.heading, {
    maxWidth: SUBJECT_MAX_W,
    fontSize: 44,
    maxLines: 2,
    minPt: 28,
    lineHeightRatio: 64 / 44,
    fontFamily: fonts.heading,
    bold: false,
  })
  const blockH = heading.lines.length * heading.lineHeight
  const frameH = VIEWFINDER_B - VIEWFINDER_T
  const firstY = VIEWFINDER_T + (frameH - blockH) / 2 + heading.fontSize * 0.82
  const source = fitStatementSource(slide, { maxWidth: SUBJECT_MAX_W, fontSize: 16, fontFamily: fonts.heading })
  return (
    <>
      <path
        d={viewfinderCorner(VIEWFINDER_L, VIEWFINDER_T, VIEWFINDER_ARM, VIEWFINDER_ARM)}
        fill="none"
        stroke={colors.accent}
        strokeWidth={2}
      />
      <path
        d={viewfinderCorner(VIEWFINDER_R, VIEWFINDER_T, -VIEWFINDER_ARM, VIEWFINDER_ARM)}
        fill="none"
        stroke={colors.accent}
        strokeWidth={2}
      />
      <path
        d={viewfinderCorner(VIEWFINDER_L, VIEWFINDER_B, VIEWFINDER_ARM, -VIEWFINDER_ARM)}
        fill="none"
        stroke={colors.accent}
        strokeWidth={2}
      />
      <path
        d={viewfinderCorner(VIEWFINDER_R, VIEWFINDER_B, -VIEWFINDER_ARM, -VIEWFINDER_ARM)}
        fill="none"
        stroke={colors.accent}
        strokeWidth={2}
      />
      {heading.lines.map((line, i) => (
        <text
          key={i}
          data-truncated={heading.truncated && i === heading.lines.length - 1 ? "1" : undefined}
          x={640}
          y={firstY + i * heading.lineHeight}
          textAnchor="middle"
          fontFamily={fonts.heading}
          fontSize={heading.fontSize}
          fontWeight="400"
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
      {source && (
        <text
          data-truncated={source.truncated ? "1" : undefined}
          x={640}
          y={VIEWFINDER_B + 52}
          textAnchor="middle"
          fontFamily={fonts.heading}
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

export function statHero({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const fitted = fitHeroLine(heroValue(slide), { maxWidth: 800, fontSize: 280, fontFamily: fonts.heading, bold: false })
  const unit = heroUnit(slide)
  const unitMark = heroUnitMark(fitted.fontSize)
  const caption = heroCaption(slide)
  const source = heroSource(slide)
  return (
    <>
      <InkDouble x={240} width={800} yThick={180} yThin={186} stroke={colors.primary} />
      <text
        x={640}
        y={470}
        textAnchor="middle"
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
      <InkDouble x={240} width={800} yThick={534} yThin={530} stroke={colors.primary} />
      {caption && (
        <text
          x={640}
          y={592}
          textAnchor="middle"
          fontFamily={fonts.heading}
          fontSize={20}
          fill={colors.muted}
          dominantBaseline="alphabetic"
        >
          {caption}
        </text>
      )}
      {source && (
        <text
          x={640}
          y={628}
        textAnchor="middle"
          fontFamily={fonts.heading}
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
