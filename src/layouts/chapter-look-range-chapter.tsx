import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { chapterNumberFor } from "../lib/derive"
import { fitHeadingLines } from "../render/heading-fit"
import { fitSvgLine } from "../lib/svg-text-layout"
import { accessibleInk, metaInk } from "../render/ink"
import { parseEmphasis, renderEmphasisText, sliceEmphasisForLines, stripEmphasis } from "../render/emphasis"

/**
 * look-range-chapter（第八波 pinOnly）：look 组导视。kicker 为 LOOK + 两位
 * 章号，左齐大标题，副题可含 `**强调**`（绯红只点强调词），底 border 细线。
 * 构图抄 `.issues/design-boards/wave8/b3/Runway.dc.html` 章节：kicker y150
 * / 16px tracking 10，标题 y400 / 88px，副题 y470 / 21px，底线 y560
 * x96–1184。
 *
 * 进共享池，不是 runway 专用。零 theme id、零 baked hex。零装饰。不要编造
 * 13-24 区间。空 heading 不编造章题。CJK 不加 letter-spacing。渲染不画省
 * 略号。底色走主题 `defaultBackgrounds.chapter`，本文件不自绘满版。
 */

const KICKER_X = 96
const KICKER_Y = 150
const KICKER_SIZE = 16
const KICKER_TRACKING = 10
const KICKER_MAX_W = 720

const TITLE_X = 96
const TITLE_Y = 400
const TITLE_SIZE = 88
const TITLE_MIN_PT = 44
const TITLE_MAX_LINES = 1
const TITLE_MAX_W = 1088

const SUB_X = 96
const SUB_Y = 470
const SUB_SIZE = 21
const SUB_MAX_W = 1088

const RULE_X1 = 96
const RULE_X2 = 1184
const RULE_Y = 560
const RULE_STROKE = 1

/** Fit 链可能给末字补上省略号。渲染侧砍掉，不画 … 或 ...。 */
function dropOverflowMark(text: string): string {
  return text.replace(/(?:\u2026|\.{3})$/g, "")
}

function lookLabel(n: number): string {
  return `LOOK ${String(n).padStart(2, "0")}`
}

export function LookRangeChapter({ ir, slide, index, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const chNum = Math.max(1, chapterNumberFor(ir.slides, index))
  const headingSource = slide.heading ?? ""
  const plainHeading = stripEmphasis(headingSource)
  const showTitle = plainHeading.trim().length > 0
  const subSource = slide.subheading ?? ""
  const subPlain = stripEmphasis(subSource).trim()

  const kicker = fitSvgLine(lookLabel(chNum), {
    maxWidth: KICKER_MAX_W,
    fontSize: KICKER_SIZE,
    minFontSize: 16,
    letterSpacing: KICKER_TRACKING,
    fontFamily: fonts.heading,
  })
  const kickerPaint = dropOverflowMark(kicker.text)

  const title = fitHeadingLines(plainHeading, {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    fontFamily: fonts.heading,
  })
  const titleInk = accessibleInk(colors.text, bg, title.fontSize)

  const subtitle = subPlain
    ? fitSvgLine(subPlain, {
        maxWidth: SUB_MAX_W,
        fontSize: SUB_SIZE,
        minFontSize: 16,
        fontFamily: fonts.heading,
      })
    : null
  const subPaint = subtitle ? dropOverflowMark(subtitle.text) : ""
  const subSegs = subPaint ? (sliceEmphasisForLines(parseEmphasis(subSource), [subPaint])[0] ?? []) : []
  const subInk = metaInk(colors.muted, bg)
  const subAccent = subtitle ? accessibleInk(colors.accent, bg, subtitle.fontSize) : colors.accent

  return (
    <>
      {kickerPaint && (
        <text
          data-contrast-tier="meta"
          data-truncated={kicker.truncated ? "1" : undefined}
          x={KICKER_X}
          y={KICKER_Y}
          fontFamily={fonts.heading}
          fontSize={kicker.fontSize}
          fill={metaInk(colors.muted, bg)}
          letterSpacing={KICKER_TRACKING}
          dominantBaseline="alphabetic"
        >
          {kickerPaint}
        </text>
      )}

      {showTitle &&
        title.lines.map((line, i) => {
          const paint = dropOverflowMark(line)
          if (!paint) return null
          return (
            <text
              key={i}
              data-truncated={title.truncated && i === title.lines.length - 1 ? "1" : undefined}
              x={TITLE_X}
              y={TITLE_Y + i * title.lineHeight}
              fontFamily={fonts.heading}
              fontSize={title.fontSize}
              fontWeight="700"
              fill={titleInk}
              dominantBaseline="alphabetic"
            >
              {paint}
            </text>
          )
        })}

      {subtitle && subPaint &&
        renderEmphasisText(
          subSegs.length > 0 ? subSegs : [{ text: subPaint, emphasized: false }],
          {
            accent: subAccent,
            padFill: colors.accent,
            baseFill: subInk,
            emphasis: ctx.emphasis,
            measureWeight: { fontFamily: fonts.heading },
          },
          <text
            data-contrast-tier="meta"
            data-truncated={subtitle.truncated ? "1" : undefined}
            x={SUB_X}
            y={SUB_Y}
            fontFamily={fonts.heading}
            fontSize={subtitle.fontSize}
            fill={subInk}
            dominantBaseline="alphabetic"
          />,
        )}

      <line
        x1={RULE_X1}
        y1={RULE_Y}
        x2={RULE_X2}
        y2={RULE_Y}
        stroke={colors.border ?? colors.muted}
        strokeWidth={RULE_STROKE}
      />
    </>
  )
}

export const layoutDef = {
  branding: "none",
  // chapter-look-range-chapter.tsx: LOOK + padded chapter number, left
  // title, optional **emphasis** on the subtitle, foot border rule. pinOnly.
  // Does not invent a look range. Empty heading draws no title.
  id: "look-range-chapter",
  kind: "standard",
  story: {
    name: "Look Range",
    story: "A small tracked kicker reads LOOK plus a zero-padded chapter number in the upper-left. A large title fills the middle of the page, and a thin full-width border rule closes the bottom.",
    positioning: "A runway-paced break that numbers sections like looks in a collection. The oversized title and floor rule frame each section as a chapter in a lookbook.",
    audience: "Viewers on a large screen or projection display, where the oversized title reads from across the room.",
    notFor: "Decks that need an academic or institutional feel, which suit decimal-index-chapter.",
  },
  slideTypes: ["chapter"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "rule", accepts: [] },
  ],
  headingFit: {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
  },
} satisfies LayoutDefinition
