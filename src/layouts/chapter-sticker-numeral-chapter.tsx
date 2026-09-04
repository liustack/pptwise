import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { chapterNumberFor } from "../lib/derive"
import { fitHeadingLines } from "../render/heading-fit"
import { fitSvgLine } from "../lib/svg-text-layout"
import { accessibleInk, metaInk, readableOn } from "../render/ink"
import { stripEmphasis } from "../render/emphasis"

/**
 * sticker-numeral-chapter（第八波 pinOnly）：浅底上的 accent 圆角方块斜
 * -6°，块内号走 `readableOn(accent)`。构图抄 crayon 设计板章节：贴纸中心
 * (180,300)，块 128，标题 x320 y322。
 *
 * 号块是前景主角，不要丢进中景。全页唯一斜件。零 theme id、零 baked hex。
 * 主题 `defaultBackgrounds.chapter` 铺纸底，本文件不自绘满版。
 */

const STICKER_CX = 180
const STICKER_CY = 300
const STICKER = 128
const STICKER_RX = 18
const STICKER_TILT = -6
const NUM_SIZE = 72
const NUM_BASELINE = 26

const TITLE_X = 320
const TITLE_Y = 322
const TITLE_SIZE = 56
const TITLE_MIN_PT = 32
const TITLE_MAX_LINES = 2
const TITLE_MAX_W = 864
const TITLE_LINE_HEIGHT = 64

const SUB_GAP = 60
const SUB_SIZE = 22
const SUB_MAX_W = 864

export function StickerNumeralChapter({ ir, slide, index, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const pageBg = ctx.defaultBg ?? colors.bg
  const field = colors.accent
  const numInk = readableOn(field)
  const chNum = chapterNumberFor(ir.slides, index)
  const label = String(Math.max(1, chNum))

  const plainHeading = stripEmphasis(slide.heading ?? "")
  const heading = fitHeadingLines(plainHeading, {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
    fontFamily: fonts.heading,
    typeScale: ctx.shape?.typeScale,
  })
  const titleLastY = TITLE_Y + Math.max(0, heading.lines.length - 1) * heading.lineHeight
  const titleInk = accessibleInk(colors.text, pageBg, heading.fontSize)

  const subheading = slide.subheading
    ? fitSvgLine(stripEmphasis(slide.subheading), {
        maxWidth: SUB_MAX_W,
        fontSize: SUB_SIZE,
        minFontSize: 16,
        fontFamily: fonts.body,
      })
    : null

  return (
    <>
      <g transform={`translate(${STICKER_CX},${STICKER_CY}) rotate(${STICKER_TILT})`}>
        <rect
          x={-STICKER / 2}
          y={-STICKER / 2}
          width={STICKER}
          height={STICKER}
          rx={STICKER_RX}
          fill={field}
        />
        <text
          x={0}
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
      </g>

      {plainHeading.trim() &&
        heading.lines.map((line, i) => (
          <text
            key={i}
            data-truncated={heading.truncated && i === heading.lines.length - 1 ? "1" : undefined}
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

      {subheading && (
        <text
          data-contrast-tier="meta"
          data-truncated={subheading.truncated ? "1" : undefined}
          x={TITLE_X}
          y={titleLastY + SUB_GAP}
          fontFamily={fonts.body}
          fontSize={subheading.fontSize}
          fill={metaInk(colors.muted, pageBg)}
          dominantBaseline="alphabetic"
        >
          {subheading.text}
        </text>
      )}
    </>
  )
}

export const layoutDef = {
  branding: "none",
  // chapter-sticker-numeral-chapter.tsx: accent sticker tilted -6
  // degrees with the chapter number inside. Title sits to the right. The
  // sticker is foreground. Theme paints the chapter field.
  id: "sticker-numeral-chapter",
  kind: "standard",
  story: {
    name: "Tilted Badge",
    story: "A rounded accent square, tilted a few degrees, holds the chapter number in inverted type. The title sits to its right, aligned with the badge center.",
    positioning: "A playful section break whose tilted badge gives the page a casual, handmade feel. It works as a chapter marker in decks that want energy without formality.",
    audience: "Viewers on a shared screen or printed handout in an informal setting.",
    notFor: "Decks that need a formal or corporate-register break, which belong in subject-rule-chapter or block-numeral-chapter.",
  },
  slideTypes: ["chapter"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
  ],
  headingFit: {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
  },
} satisfies LayoutDefinition
