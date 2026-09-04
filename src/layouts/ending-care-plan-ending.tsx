import type { SvgTemplateProps } from "./types"
import { boundaryBulletItems } from "./boundary-content"
import type { LayoutDefinition } from "./registry"
import { fitHeadingLines } from "../render/heading-fit"
import { fitSvgLine } from "../lib/svg-text-layout"
import { accessibleInk, metaInk } from "../render/ink"
import { casualHan } from "../render/heading-treatments/labels"
import { hasCjk } from "./minimal-shared"
import { stripEmphasis } from "../render/emphasis"

/**
 * care-plan-ending（第八波 pinOnly）：三条干预建议收口。构图抄
 * `.issues/design-boards/wave8/b3/Pulse.dc.html` ending：标题 y160 /
 * 44px，三条 y280/360/440，底线 y510，落款 y580。
 *
 * 清单优先取第一个 `bullets` 的前三项。没有 bullets 时从 heading 按换行
 * 或「一、/1.」切开。有 bullets 时 heading 作标题。落款取 subheading，
 * 不写死脱敏 / 隐私句。无 Thank you。
 *
 * 进共享池。零 theme id、零 baked hex。CJK 不加 letter-spacing。标题
 * 装得下就用板上 44px，不放大铺满。
 */

const TITLE_X = 96
const TITLE_Y = 160
const TITLE_SIZE = 44
const TITLE_MIN_PT = 26
const TITLE_MAX_LINES = 2
const TITLE_MAX_W = 1088
const TITLE_LINE_HEIGHT = 54

const ITEM_X = 96
const ITEM_YS = [280, 360, 440] as const
const ITEM_SIZE = 26
const ITEM_MIN_PT = 16
const ITEM_MAX_W = 1088

const RULE_X1 = 96
const RULE_X2 = 1184
const RULE_Y = 510

const FOOT_X = 96
const FOOT_Y = 580
const FOOT_SIZE = 19
const FOOT_MAX_W = 1088

/** Drop overflow marks that `truncateToUnits` appends. Cut, don't advertise the cut. */
function withoutOverflowMark(text: string): string {
  return text.replace(/(?:\u2026|\.{3})$/u, "")
}

/** Items of the accepted `bullets` block this face has room to draw. */
const ITEM_MAX = 3

function splitPlanLines(text: string): string[] {
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

function planItems(slide: SvgTemplateProps["slide"]): string[] {
  const bullets = boundaryBulletItems(slide, ITEM_MAX)
  if (bullets.length > 0) return bullets
  return splitPlanLines(slide.heading ?? "")
}

function numberedItem(item: string, index: number, cjk: boolean): string {
  if (
    /^\d+[.、]/.test(item) ||
    /^[一二三四五六七八九十]+、/.test(item) ||
    /^第[一二三四五六七八九十]+/.test(item)
  ) {
    return item
  }
  return cjk ? `${casualHan(index + 1)}、${item}` : `${index + 1}. ${item}`
}

export function CarePlanEnding({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const items = planItems(slide).map((item) => stripEmphasis(item))
  const fromBullets = boundaryBulletItems(slide, ITEM_MAX).length > 0
  const headingSource = fromBullets || items.length === 0 ? stripEmphasis(slide.heading ?? "") : ""
  const showTitle = headingSource.trim().length > 0
  const cjk = hasCjk([headingSource, ...items].join(""))

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
  const ruleStroke = colors.border ?? colors.muted

  const lines = items.map((item, i) => ({
    y: ITEM_YS[i]!,
    body: fitSvgLine(numberedItem(item, i, cjk), {
      maxWidth: ITEM_MAX_W,
      fontSize: ITEM_SIZE,
      minFontSize: ITEM_MIN_PT,
      fontFamily: fonts.body,
    }),
  }))

  const footSource = (slide.subheading ?? "").trim()
  const foot = footSource
    ? fitSvgLine(stripEmphasis(footSource), {
        maxWidth: FOOT_MAX_W,
        fontSize: FOOT_SIZE,
        minFontSize: 16,
        fontFamily: fonts.body,
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
            {withoutOverflowMark(line)}
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
          {withoutOverflowMark(line.body.text)}
        </text>
      ))}

      <line
        x1={RULE_X1}
        y1={RULE_Y}
        x2={RULE_X2}
        y2={RULE_Y}
        stroke={ruleStroke}
        strokeWidth={1}
      />

      {foot && (
        <text
          data-contrast-tier="meta"
          data-truncated={foot.truncated ? "1" : undefined}
          x={FOOT_X}
          y={FOOT_Y}
          fontFamily={fonts.body}
          fontSize={foot.fontSize}
          fill={metaInk(colors.muted, bg)}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(foot.text)}
        </text>
      )}
    </>
  )
}

export const layoutDef: LayoutDefinition = {
  branding: "none",
  // ending-care-plan-ending.tsx: three-item care plan, foot rule,
  // optional subheading sign-off. No thank-you. No invented privacy line.
  // Optional bullets fill the list.
  id: "care-plan-ending",
  kind: "standard",
  story: {
    name: "Plan Summary",
    story: "A heading at the top, up to three recommendation lines stacked below, a foot rule, and an optional sign-off. Compact and clinical, no ornament beyond the rule.",
    positioning: "The closing page for up to three follow-up items and a sign-off, with a foot rule as the only mark. Heading stays at reading size.",
    audience: "Printed handouts and close-range screens where each line must be legible at body-text size.",
    notFor: "Closings that tint numbers or emphasis words, which belong in scorecard-ending for primary-colored figures.",
  },
  slideTypes: ["ending"],
  slots: [
    { name: "heading", accepts: [] },
    { name: "body", accepts: ["bullets"], capacity: 1, itemCapacity: ITEM_MAX },
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
}
