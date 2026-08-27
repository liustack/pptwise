import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { fitSvgLine } from "../lib/svg-text-layout"
import { accessibleInk, metaInk } from "../render/ink"
import { stripEmphasis } from "../render/emphasis"
import { hasCjk } from "./minimal-shared"

/**
 * defense-close-ending（第八波 pinOnly）：结论三行收口。kicker 公开英文
 * CONCLUSIONS。清单优先取 bullets 前三项，否则按换行或「一、/1.」切 heading。
 * 落款句取 subheading，不写死「恳请各位老师批评指正」。无 Thank you。
 *
 * 构图抄 academic 设计板 ending：kicker y140（中文「结论」、拉丁 CONCLUSIONS），
 * 三条 y240/316/392，底线 y470，落款 y560。进共享池。零 theme id、零 baked hex。
 */

const KICKER_X = 96
const KICKER_Y = 140
const KICKER_SIZE = 19
const KICKER_TRACKING = 8

const ITEM_X = 96
const ITEM_YS = [240, 316, 392] as const
const ITEM_SIZE = 34
const ITEM_MIN_PT = 20
const ITEM_MAX_W = 1088

const FOOT_X = 96
const FOOT_RULE_Y = 470
const FOOT_RULE_X2 = 1184
const SIGNOFF_Y = 560
const SIGNOFF_SIZE = 26
const SIGNOFF_MAX_W = 1088

const CONCLUSIONS_KICKER_LATIN = "CONCLUSIONS"
const CONCLUSIONS_KICKER_CJK = "结论"

function coverBulletItems(slide: SvgTemplateProps["slide"]): string[] {
  const block = slide.components.find((c) => c.type === "bullets")
  if (!block || block.type !== "bullets") return []
  return block.items.slice(0, 3)
}

function splitConclusionLines(text: string): string[] {
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

function conclusionItems(slide: SvgTemplateProps["slide"]): string[] {
  const bullets = coverBulletItems(slide)
  if (bullets.length > 0) return bullets
  return splitConclusionLines(stripEmphasis(slide.heading ?? ""))
}

function conclusionsKicker(slide: SvgTemplateProps["slide"], items: string[]): string {
  const corpus = [slide.heading, slide.subheading, ...items].join("")
  return hasCjk(corpus) ? CONCLUSIONS_KICKER_CJK : CONCLUSIONS_KICKER_LATIN
}

export function DefenseCloseEnding({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const items = conclusionItems(slide)
  const signoffSource = (slide.subheading ?? "").trim()

  const kicker = fitSvgLine(conclusionsKicker(slide, items), {
    maxWidth: ITEM_MAX_W,
    fontSize: KICKER_SIZE,
    minFontSize: 16,
    letterSpacing: KICKER_TRACKING,
    fontFamily: fonts.heading,
  })

  const lines = items.map((item, i) => ({
    y: ITEM_YS[i]!,
    body: fitSvgLine(stripEmphasis(item), {
      maxWidth: ITEM_MAX_W,
      fontSize: ITEM_SIZE,
      minFontSize: ITEM_MIN_PT,
      fontFamily: fonts.heading,
    }),
  }))

  const signoff = signoffSource
    ? fitSvgLine(signoffSource, {
        maxWidth: SIGNOFF_MAX_W,
        fontSize: SIGNOFF_SIZE,
        minFontSize: 16,
        fontFamily: fonts.heading,
      })
    : null

  const itemInk = accessibleInk(colors.text, bg, ITEM_SIZE)
  const ruleStroke = colors.border ?? colors.muted

  return (
    <>
      <text
        data-contrast-tier="meta"
        data-truncated={kicker.truncated ? "1" : undefined}
        x={KICKER_X}
        y={KICKER_Y}
        fontFamily={fonts.heading}
        fontSize={kicker.fontSize}
        fill={accessibleInk(colors.primary, bg, kicker.fontSize)}
        letterSpacing={KICKER_TRACKING}
        dominantBaseline="alphabetic"
      >
        {kicker.text}
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
        x1={FOOT_X}
        y1={FOOT_RULE_Y}
        x2={FOOT_RULE_X2}
        y2={FOOT_RULE_Y}
        stroke={ruleStroke}
        strokeWidth={1}
      />

      {signoff && (
        <text
          data-contrast-tier="meta"
          data-truncated={signoff.truncated ? "1" : undefined}
          x={FOOT_X}
          y={SIGNOFF_Y}
          fontFamily={fonts.heading}
          fontSize={signoff.fontSize}
          fill={metaInk(colors.muted, bg)}
          dominantBaseline="alphabetic"
        >
          {signoff.text}
        </text>
      )}
    </>
  )
}

export const layoutDef: LayoutDefinition = {
  // ending-defense-close-ending.tsx: pinOnly conclusions list, English
  // CONCLUSIONS kicker, foot rule, optional subheading sign-off. No
  // thank-you fallback. Optional bullets fill the list.
  id: "defense-close-ending",
  kind: "archetype",
  pinOnly: true,
  branding: "none",
  slideTypes: ["ending"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "body", accepts: ["bullets"], capacity: 1 },
    { name: "meta", accepts: [] },
  ],
}
