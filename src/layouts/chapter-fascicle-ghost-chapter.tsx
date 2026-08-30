import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { chapterNumberFor } from "../lib/derive"
import { fitHeadingLines, scaleTypePx } from "../render/heading-fit"
import { fitSvgLine } from "../lib/svg-text-layout"
import { accessibleInk, metaInk, readableOn } from "../render/ink"
import { casualHan, headingIsCjk } from "../render/heading-treatments/labels"
import { toRoman } from "./chapter-roman-chapter"
import { textInkBox } from "../render/depth-contract/geometry"
import { CANVAS_H_PX, CANVAS_W_PX } from "../constants"
import { stripEmphasis } from "../render/emphasis"

/**
 * fascicle-ghost-chapter（第八波 pinOnly）：浅底辑号章首。accent 辑号
 * （CJK「辑」+ 汉数字 / Latin PART + 罗马），左齐标题，题下 accent 短杠
 * 依附标题簇。罗马幽灵号沉右下，opacity 0.05，`data-depth="mid"`，整字
 * 落在 1280×720 内。构图抄 `.issues/design-boards/wave8/b2/Journal.dc.html`
 * 章节：kicker y320、标题 y404、短杠 y520、幽灵号 x1150 y620 size 400。
 *
 * 进共享池，不是 journal 专用。零 theme id、零 baked hex。底色走主题
 * `defaultBackgrounds.chapter`，本文件不自绘满版。空 heading 不编造章题，
 * 也不画那条短杠。
 */

const TITLE_X = 96
const TITLE_Y = 404
const TITLE_SIZE = 54
const TITLE_MIN_PT = 32
const TITLE_MAX_LINES = 2
const TITLE_MAX_W = 720
const TITLE_LINE_HEIGHT = 64

const KICKER_X = 96
const KICKER_Y = 320
const KICKER_SIZE = 20
const KICKER_TRACKING_CJK = 12
const KICKER_TRACKING_LATIN = 8
const KICKER_MAX_W = 720

const SUB_SIZE = 20
const SUB_GAP = 56
const SUB_MAX_W = 720

const BAR_X1 = 96
const BAR_X2 = 288
const BAR_GAP = 60
const BAR_STROKE = 2

const GHOST_X = 1150
const GHOST_Y = 620
const GHOST_SIZE = 400
const GHOST_OPACITY = 0.05

function fascicleLabel(n: number, cjk: boolean): string {
  return cjk ? `辑${casualHan(n)}` : `PART ${toRoman(n)}`
}

function placeGhost(content: string, fontFamily: string, fontSize: number): { x: number; y: number } {
  let x = GHOST_X
  let y = GHOST_Y
  const box = textInkBox({
    content,
    x,
    y,
    fontSize,
    fontFamily,
    fontWeight: null,
    textAnchor: "end",
  })
  if (box.x < 0) x += -box.x
  if (box.y < 0) y += -box.y
  if (box.x + box.w > CANVAS_W_PX) x -= box.x + box.w - CANVAS_W_PX
  if (box.y + box.h > CANVAS_H_PX) y -= box.y + box.h - CANVAS_H_PX
  return { x, y }
}

export function FascicleGhostChapter({ ir, slide, index, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const chNum = Math.max(1, chapterNumberFor(ir.slides, index))
  const plainHeading = stripEmphasis(slide.heading ?? "")
  const showTitle = plainHeading.trim().length > 0
  const cjk = headingIsCjk(plainHeading)
  const ghost = toRoman(chNum)
  const ghostSize = scaleTypePx(GHOST_SIZE, ctx.shape?.typeScale)
  const ghostPos = placeGhost(ghost, fonts.heading, ghostSize)

  const kickerTracking = cjk ? KICKER_TRACKING_CJK : KICKER_TRACKING_LATIN
  const kicker = fitSvgLine(fascicleLabel(chNum, cjk), {
    maxWidth: KICKER_MAX_W,
    fontSize: KICKER_SIZE,
    minFontSize: 16,
    letterSpacing: kickerTracking,
    fontFamily: fonts.body,
  })

  const heading = fitHeadingLines(plainHeading, {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
    fontFamily: fonts.heading,
    typeScale: ctx.shape?.typeScale,
  })
  const headingLastY = TITLE_Y + Math.max(0, heading.lines.length - 1) * heading.lineHeight

  const subSource = stripEmphasis(slide.subheading ?? "").trim()
  const subheading = subSource
    ? fitSvgLine(subSource, {
        maxWidth: SUB_MAX_W,
        fontSize: SUB_SIZE,
        minFontSize: 16,
        fontFamily: fonts.body,
      })
    : null
  const subY = headingLastY + SUB_GAP
  const barY = (subheading ? subY : headingLastY) + BAR_GAP

  return (
    <>
      <text
        data-depth="mid"
        x={ghostPos.x}
        y={ghostPos.y}
        fontFamily={fonts.heading}
        fontSize={ghostSize}
        fill={readableOn(bg)}
        opacity={GHOST_OPACITY}
        textAnchor="end"
        dominantBaseline="alphabetic"
      >
        {ghost}
      </text>

      <text
        data-truncated={kicker.truncated ? "1" : undefined}
        x={KICKER_X}
        y={KICKER_Y}
        fontFamily={fonts.body}
        fontSize={kicker.fontSize}
        fill={accessibleInk(colors.accent, bg, kicker.fontSize)}
        letterSpacing={kickerTracking}
        dominantBaseline="alphabetic"
      >
        {kicker.text}
      </text>

      {showTitle &&
        heading.lines.map((line, i) => (
          <text
            key={i}
            data-truncated={heading.truncated && i === heading.lines.length - 1 ? "1" : undefined}
            x={TITLE_X}
            y={TITLE_Y + i * heading.lineHeight}
            fontFamily={fonts.heading}
            fontSize={heading.fontSize}
            fontWeight="700"
            fill={accessibleInk(colors.text, bg, heading.fontSize)}
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
          y={subY}
          fontFamily={fonts.body}
          fontSize={subheading.fontSize}
          fill={metaInk(colors.muted, bg)}
          dominantBaseline="alphabetic"
        >
          {subheading.text}
        </text>
      )}

      {showTitle && (
        <line
          x1={BAR_X1}
          y1={barY}
          x2={BAR_X2}
          y2={barY}
          stroke={colors.accent}
          strokeWidth={BAR_STROKE}
        />
      )}
    </>
  )
}

export const layoutDef = {
  branding: "none",
  // chapter-fascicle-ghost-chapter.tsx: accent fascicle kicker, left
  // heading, short accent rule under the title cluster, roman ghost
  // numeral inset to the canvas. pinOnly. The theme-menu entry owns brand silence so the default
  // br logo does not eat the ghost.
  id: "fascicle-ghost-chapter",
  kind: "archetype",
  pinOnly: true,
  slideTypes: ["chapter"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "rule", accepts: [] },
    { name: "watermark", accepts: [] },
  ],
  headingFit: {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
  },
} satisfies LayoutDefinition
