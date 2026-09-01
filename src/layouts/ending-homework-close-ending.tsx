import type { SvgTemplateProps } from "./types"
import { boundaryBulletItems } from "./boundary-content"
import type { LayoutDefinition } from "./registry"
import { fitSvgLine } from "../lib/svg-text-layout"
import { accessibleInk, metaInk, readableOn } from "../render/ink"
import { hasCjk } from "./minimal-shared"
import { stripEmphasis } from "../render/emphasis"

/**
 * homework-close-ending（第八波 pinOnly）：accent 作业盒 + 三条清单 + 底
 * border 线。构图抄 `.issues/design-boards/wave8/b2/Classroom.dc.html`
 * ending：盒 (96,96,176×56)，三条 y256/336/416，底线 y500，预告 y580。
 *
 * 清单优先取 bullets 前三项，否则按换行或「一、/1.」切 heading。预告句取
 * subheading。盒内白字按标题脚本切：CJK「课后作业」，Latin `HOMEWORK`。
 * 不写死课本页码，无 Thank you。
 *
 * 进共享池，不是 classroom 专用。零 theme id、零 baked hex。批改红盒只此一处。
 */

const BOX_X = 96
const BOX_Y = 96
const BOX_W = 176
const BOX_H = 56
const BOX_LABEL_Y = 134
const BOX_LABEL_SIZE = 24
const BOX_LABEL_MAX_W = 160

const ITEM_X = 96
const ITEM_YS = [256, 336, 416] as const
const ITEM_SIZE = 30
const ITEM_MIN_PT = 18
const ITEM_MAX_W = 1088

const RULE_X1 = 96
const RULE_X2 = 1184
const RULE_Y = 500

const PREVIEW_X = 96
const PREVIEW_Y = 580
const PREVIEW_SIZE = 19
const PREVIEW_MAX_W = 1088

const HOMEWORK_CJK = "课后作业"
const HOMEWORK_LATIN = "HOMEWORK"

/** Items of the accepted `bullets` block this face has room to draw. */
const ITEM_MAX = 3

function splitActionLines(text: string): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []
  const byNewline = trimmed.split(/\n+/).map((line) => line.trim()).filter(Boolean)
  if (byNewline.length > 1) return byNewline.slice(0, 3)
  const byCn = trimmed.split(/(?=[一二三四五六七八九十]+、)/).map((line) => line.trim()).filter(Boolean)
  if (byCn.length > 1) return byCn.slice(0, 3)
  const byDot = trimmed.split(/(?=(?:^|\s)\d+[.、]\s*)/).map((line) => line.trim()).filter(Boolean)
  if (byDot.length > 1) return byDot.slice(0, 3)
  return [trimmed]
}

function homeworkItems(slide: SvgTemplateProps["slide"]): string[] {
  const bullets = boundaryBulletItems(slide, ITEM_MAX)
  if (bullets.length > 0) return bullets
  return splitActionLines(slide.heading ?? "")
}

function homeworkLabel(slide: SvgTemplateProps["slide"], items: string[]): string {
  const scriptSrc = slide.heading || items[0] || ""
  return hasCjk(scriptSrc) ? HOMEWORK_CJK : HOMEWORK_LATIN
}

export function HomeworkCloseEnding({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const field = colors.accent
  const items = homeworkItems(slide).map((item) => stripEmphasis(item))
  const labelSource = homeworkLabel(slide, items)
  const label = fitSvgLine(labelSource, {
    maxWidth: BOX_LABEL_MAX_W,
    fontSize: BOX_LABEL_SIZE,
    minFontSize: 16,
    fontFamily: fonts.heading,
  })
  const labelInk = readableOn(field)
  const itemInk = accessibleInk(colors.text, bg, ITEM_SIZE)
  const ruleStroke = colors.border ?? colors.muted

  const lines = items.map((item, i) => ({
    y: ITEM_YS[i]!,
    body: fitSvgLine(item, {
      maxWidth: ITEM_MAX_W,
      fontSize: ITEM_SIZE,
      minFontSize: ITEM_MIN_PT,
      fontFamily: fonts.heading,
    }),
  }))

  const previewSource = (slide.subheading ?? "").trim()
  const preview = previewSource
    ? fitSvgLine(stripEmphasis(previewSource), {
        maxWidth: PREVIEW_MAX_W,
        fontSize: PREVIEW_SIZE,
        minFontSize: 16,
        fontFamily: fonts.body,
      })
    : null

  return (
    <>
      <rect x={BOX_X} y={BOX_Y} width={BOX_W} height={BOX_H} fill={field} />
      <text
        data-truncated={label.truncated ? "1" : undefined}
        x={BOX_X + BOX_W / 2}
        y={BOX_LABEL_Y}
        textAnchor="middle"
        fontFamily={fonts.heading}
        fontSize={label.fontSize}
        fontWeight="700"
        fill={labelInk}
        dominantBaseline="alphabetic"
      >
        {label.text}
      </text>

      {lines.map((line, i) => (
        <text
          key={i}
          data-truncated={line.body.truncated ? "1" : undefined}
          x={ITEM_X}
          y={line.y}
          fontFamily={fonts.heading}
          fontSize={line.body.fontSize}
          fontWeight="700"
          fill={itemInk}
          dominantBaseline="alphabetic"
        >
          {line.body.text}
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

      {preview && (
        <text
          data-contrast-tier="meta"
          data-truncated={preview.truncated ? "1" : undefined}
          x={PREVIEW_X}
          y={PREVIEW_Y}
          fontFamily={fonts.body}
          fontSize={preview.fontSize}
          fill={metaInk(colors.muted, bg)}
          dominantBaseline="alphabetic"
        >
          {preview.text}
        </text>
      )}
    </>
  )
}

export const layoutDef: LayoutDefinition = {
  branding: "none",
  // ending-homework-close-ending.tsx: homework list, accent box
  // label, foot rule, preview from subheading. No thank-you. Optional
  // bullets fill the list.
  id: "homework-close-ending",
  kind: "standard",
  slideTypes: ["ending"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "body", accepts: ["bullets"], capacity: 1, itemCapacity: ITEM_MAX },
  ],
}
