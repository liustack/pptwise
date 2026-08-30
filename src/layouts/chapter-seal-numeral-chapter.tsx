import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { chapterNumberFor } from "../lib/derive"
import { fitHeadingLines } from "../render/heading-fit"
import { fitSvgLine } from "../lib/svg-text-layout"
import { accessibleInk, readableOn } from "../render/ink"
import { casualHan, headingIsCjk } from "../render/heading-treatments/labels"
import { stripEmphasis } from "../render/emphasis"

/**
 * seal-numeral-chapter（第八波 pinOnly）：浅底红号块章节。primary 方号块
 * 96,272 120×120，号走 `readableOn(primary)`。CJK 用 `casualHan(n)`，Latin
 * 用阿拉伯数字。标题贴块右侧，accent 金线 y470 收界（结构件，本版式画）。
 * 构图抄 `.issues/design-boards/wave8/b3/Vermilion.dc.html` 章节：号 y354，
 * 题 y332 / 50px，副题 y386，金线 x96–1184。
 *
 * 进共享池，不是 vermilion 专用。零 theme id、零 baked hex。motif 章节
 * 退让，避免顶缘金双线与收界金线叠出四条线。纸底走主题
 * `defaultBackgrounds.chapter`，本文件不自绘满版。
 *
 * 板上做不到、最近落地：
 *   1. CJK 标题与号不加 letter-spacing。
 *   2. 空 heading 不编造章名，号块与收界金线仍在。
 *   3. accent 只给收界金线，绝不当文字色。
 */

const BLOCK_X = 96
const BLOCK_Y = 272
const BLOCK = 120
const NUM_SIZE = 52
const NUM_BASELINE = 354

const TITLE_X = 260
const TITLE_Y = 332
const TITLE_SIZE = 50
const TITLE_MIN_PT = 32
const TITLE_MAX_LINES = 2
const TITLE_MAX_W = 880
const TITLE_LINE_HEIGHT = 58

const SUB_Y = 386
const SUB_GAP = SUB_Y - TITLE_Y
const SUB_SIZE = 20
const SUB_MAX_W = 880

const RULE_X1 = 96
const RULE_X2 = 1184
const RULE_Y = 470
const RULE_STROKE = 1

function withoutOverflowMark(text: string): string {
  return text.replace(/(?:\.{3}|…)+$/u, "")
}

function numeralLabel(n: number, cjk: boolean): string {
  const index = Math.max(1, n)
  return cjk ? casualHan(index) : String(index)
}

export function SealNumeralChapter({ ir, slide, index, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const pageBg = ctx.defaultBg ?? colors.bg
  const field = colors.primary
  const numInk = readableOn(field)
  const chNum = chapterNumberFor(ir.slides, index)
  const cjk = headingIsCjk(slide.heading)
  const label = numeralLabel(chNum, cjk)

  const plainHeading = stripEmphasis(slide.heading ?? "")
  const showTitle = plainHeading.trim().length > 0
  const heading = fitHeadingLines(plainHeading, {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
    fontFamily: fonts.heading,
    typeScale: ctx.shape?.typeScale,
  })
  const titleLines = heading.lines.map(withoutOverflowMark).filter(Boolean)
  const titleLastY = TITLE_Y + Math.max(0, titleLines.length - 1) * heading.lineHeight
  const titleInk = accessibleInk(colors.text, pageBg, heading.fontSize)
  const subY = showTitle && titleLines.length > 0 ? titleLastY + SUB_GAP : SUB_Y

  const subheading = slide.subheading
    ? fitSvgLine(stripEmphasis(slide.subheading), {
        maxWidth: SUB_MAX_W,
        fontSize: SUB_SIZE,
        minFontSize: 16,
        fontFamily: fonts.body,
      })
    : null
  const subText = subheading ? withoutOverflowMark(subheading.text) : ""

  return (
    <>
      <rect x={BLOCK_X} y={BLOCK_Y} width={BLOCK} height={BLOCK} fill={field} />
      <text
        x={BLOCK_X + BLOCK / 2}
        y={NUM_BASELINE}
        textAnchor="middle"
        fontFamily={fonts.heading}
        fontSize={NUM_SIZE}
        fontWeight="700"
        fill={numInk}
        dominantBaseline="alphabetic"
      >
        {label}
      </text>

      {showTitle &&
        titleLines.map((line, i) => (
          <text
            key={i}
            data-truncated={heading.truncated && i === titleLines.length - 1 ? "1" : undefined}
            x={TITLE_X}
            y={TITLE_Y + i * heading.lineHeight}
            fontFamily={fonts.heading}
            fontSize={heading.fontSize}
            fontWeight="700"
            fill={titleInk}
            dominantBaseline="alphabetic"
          >
            {line}
          </text>
        ))}

      {subheading && subText && (
        <text
          data-contrast-tier="meta"
          data-truncated={subheading.truncated ? "1" : undefined}
          x={TITLE_X}
          y={subY}
          fontFamily={fonts.body}
          fontSize={subheading.fontSize}
          fill={accessibleInk(colors.muted, pageBg, subheading.fontSize)}
          dominantBaseline="alphabetic"
        >
          {subText}
        </text>
      )}

      <line
        data-depth="mid"
        x1={RULE_X1}
        y1={RULE_Y}
        x2={RULE_X2}
        y2={RULE_Y}
        stroke={colors.accent}
        strokeWidth={RULE_STROKE}
      />
    </>
  )
}

export const layoutDef = {
  // chapter-seal-numeral-chapter.tsx: square primary numeral block, title
  // to its right, accent closing rule. Light page ground comes from the
  // theme. Motif yields on chapter. Empty heading draws no title.
  id: "seal-numeral-chapter",
  kind: "archetype",
  pinOnly: true,
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
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
  },
} satisfies LayoutDefinition
