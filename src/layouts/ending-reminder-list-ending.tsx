import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { fitHeadingLines } from "../render/heading-fit"
import { fitSvgLine } from "../lib/svg-text-layout"
import { accessibleInk } from "../render/ink"
import { stripEmphasis } from "../render/emphasis"

/**
 * reminder-list-ending（第八波 pinOnly）：三件小事清单，零装饰。构图抄
 * crayon 设计板 ending：标题 y180 / 48px，三条 y300/380/460，末行 y600。
 *
 * 清单优先取第一个 `bullets` 的前三项。没有 bullets 时从 heading 按换行
 * 或「一、/1.」切开。末行联系句取 subheading，色走 accessible primary。
 * 不致谢，不兜底 Thank you。零 theme id、零 baked hex。
 */

const TITLE_X = 96
const TITLE_Y = 180
const TITLE_SIZE = 48
const TITLE_MIN_PT = 28
const TITLE_MAX_LINES = 2
const TITLE_MAX_W = 1088
const TITLE_LINE_HEIGHT = 58

const ITEM_X = 96
const ITEM_YS = [300, 380, 460] as const
const ITEM_SIZE = 28
const ITEM_MIN_PT = 18
const ITEM_MAX_W = 1088

const FOOT_X = 96
const FOOT_Y = 600
const FOOT_SIZE = 22
const FOOT_MAX_W = 1088

function coverBulletItems(slide: SvgTemplateProps["slide"]): string[] {
  const block = slide.components.find((c) => c.type === "bullets")
  if (!block || block.type !== "bullets") return []
  return block.items.slice(0, 3)
}

function splitActionLines(text: string): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []
  const byNewline = trimmed.split(/\n+/).map((line) => line.trim()).filter(Boolean)
  if (byNewline.length > 1) return byNewline.slice(0, 3)
  const byCn = trimmed.split(/(?=[一二三四五六七八九十]+、)/).map((line) => line.trim()).filter(Boolean)
  if (byCn.length > 1) return byCn.slice(0, 3)
  const byDot = trimmed.split(/(?=(?:^|\s)\d+[.、]\s*)/).map((line) => line.trim()).filter(Boolean)
  if (byDot.length > 1) return byDot.slice(0, 3)
  return []
}

function reminderItems(slide: SvgTemplateProps["slide"]): string[] {
  const bullets = coverBulletItems(slide)
  if (bullets.length > 0) return bullets
  return splitActionLines(slide.heading ?? "")
}

function numberedItem(item: string, index: number): string {
  if (/^\d+[.、]/.test(item) || /^[一二三四五六七八九十]+、/.test(item)) return item
  return `${index + 1}. ${item}`
}

export function ReminderListEnding({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const items = reminderItems(slide)
  const fromBullets = coverBulletItems(slide).length > 0
  const headingSource = fromBullets || items.length === 0 ? stripEmphasis(slide.heading ?? "") : ""
  const showTitle = headingSource.trim().length > 0

  const title = fitHeadingLines(headingSource, {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
    fontFamily: fonts.heading,
    typeScale: ctx.shape?.typeScale,
  })
  const titleInk = accessibleInk(colors.text, bg, title.fontSize)
  const itemInk = accessibleInk(colors.text, bg, ITEM_SIZE)

  const lines = items.map((item, i) => ({
    y: ITEM_YS[i]!,
    body: fitSvgLine(numberedItem(item, i), {
      maxWidth: ITEM_MAX_W,
      fontSize: ITEM_SIZE,
      minFontSize: ITEM_MIN_PT,
      fontFamily: fonts.body,
    }),
  }))

  const footSource = (slide.subheading ?? "").trim()
  const foot = footSource
    ? fitSvgLine(footSource, {
        maxWidth: FOOT_MAX_W,
        fontSize: FOOT_SIZE,
        minFontSize: 16,
        fontFamily: fonts.body,
        bold: true,
      })
    : null

  return (
    <>
      {showTitle &&
        title.lines.map((line, i) => (
          <text
            key={`title-${i}`}
            data-truncated={title.truncated && i === title.lines.length - 1 ? "1" : undefined}
            x={TITLE_X}
            y={TITLE_Y + i * title.lineHeight}
            fontFamily={fonts.heading}
            fontSize={title.fontSize}
            fontWeight="700"
            fill={titleInk}
            dominantBaseline="alphabetic"
          >
            {line}
          </text>
        ))}

      {lines.map((line, i) => (
        <text
          key={i}
          data-truncated={line.body.truncated ? "1" : undefined}
          x={ITEM_X}
          y={line.y}
          fontFamily={fonts.body}
          fontSize={line.body.fontSize}
          fill={itemInk}
          dominantBaseline="alphabetic"
        >
          {line.body.text}
        </text>
      ))}

      {foot && (
        <text
          data-truncated={foot.truncated ? "1" : undefined}
          x={FOOT_X}
          y={FOOT_Y}
          fontFamily={fonts.body}
          fontSize={foot.fontSize}
          fontWeight="700"
          fill={accessibleInk(colors.primary, bg, foot.fontSize)}
          dominantBaseline="alphabetic"
        >
          {foot.text}
        </text>
      )}
    </>
  )
}

export const layoutDef: LayoutDefinition = {
  branding: "none",
  // ending-reminder-list-ending.tsx: pinOnly three-item reminder list,
  // contact line from subheading. No decoration. No thank-you.
  id: "reminder-list-ending",
  kind: "standard",
  pinOnly: true,
  slideTypes: ["ending"],
  slots: [
    { name: "heading", accepts: [] },
    { name: "body", accepts: ["bullets"], capacity: 1 },
    { name: "subheading", accepts: [] },
  ],
  headingFit: {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
  },
}
