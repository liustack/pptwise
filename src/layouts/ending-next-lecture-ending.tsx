import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { fitSvgLine } from "../lib/svg-text-layout"
import { accessibleInk, metaInk } from "../render/ink"
import { hasCjk } from "./minimal-shared"
import { stripEmphasis } from "../render/emphasis"

/**
 * next-lecture-ending（第八波 pinOnly）：课后清单 + 下讲预告。kicker 按标
 * 题脚本切：CJK「课后」/ Latin `AFTER`。清单优先 bullets 前两项，否则按
 * 换行切 heading。底 border 细线 y430。下一讲取 subheading。构图抄
 * `.issues/design-boards/wave8/b4/Lecture.dc.html` ending：kicker y160 /
 * 22px，两条 y270/350，线 x96–1184 y430，预告 y510。
 *
 * 进共享池，不是 lecture 专用。零 theme id、零 baked hex。框归 motif，本
 * 版式不画细框。不写死书名与习题。无 Thank you。空文案不编造课后作业。
 * `body accepts: ["bullets"]`。CJK 不加 letter-spacing。渲染不画省略号。
 */

const KICKER_X = 96
const KICKER_Y = 160
const KICKER_SIZE = 22
const KICKER_TRACKING = 8
const KICKER_MAX_W = 1088

const ITEM_X = 96
const ITEM_YS = [270, 350] as const
const ITEM_SIZE = 26
const ITEM_MIN_PT = 16
const ITEM_MAX_W = 1088

const RULE_X1 = 96
const RULE_X2 = 1184
const RULE_Y = 430
const RULE_STROKE = 1

const NEXT_X = 96
const NEXT_Y = 510
const NEXT_SIZE = 20
const NEXT_MAX_W = 1088

const KICKER_CJK = "课后"
const KICKER_LATIN = "AFTER"

function withoutOverflowMark(text: string): string {
  return text.replace(/(?:\u2026|\.{3})+$/u, "")
}

function coverBulletItems(slide: SvgTemplateProps["slide"]): string[] {
  const block = slide.components.find((c) => c.type === "bullets")
  if (!block || block.type !== "bullets") return []
  return block.items.slice(0, 2)
}

function isKickerWord(text: string): boolean {
  return text === KICKER_CJK || text === KICKER_LATIN
}

function splitHomeworkLines(text: string): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []
  const byNewline = trimmed.split(/\n+/).map((line) => line.trim()).filter(Boolean)
  const lines = (byNewline.length > 1 ? byNewline : [trimmed]).filter((line) => !isKickerWord(line))
  return lines.slice(0, 2)
}

function homeworkItems(slide: SvgTemplateProps["slide"]): string[] {
  const bullets = coverBulletItems(slide)
  if (bullets.length > 0) return bullets
  return splitHomeworkLines(stripEmphasis(slide.heading ?? ""))
}

function scriptIsCjk(slide: SvgTemplateProps["slide"], items: string[]): boolean {
  if (hasCjk(slide.heading ?? "")) return true
  if (items.some((item) => hasCjk(item))) return true
  return hasCjk(slide.subheading ?? "")
}

export function NextLectureEnding({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const items = homeworkItems(slide)
  const cjk = scriptIsCjk(slide, items)
  const kickerText = cjk ? KICKER_CJK : KICKER_LATIN
  const kickerTracking = cjk ? undefined : KICKER_TRACKING
  const nextSource = stripEmphasis(slide.subheading ?? "").trim()
  const ruleStroke = colors.border ?? colors.muted

  const kicker = fitSvgLine(kickerText, {
    maxWidth: KICKER_MAX_W,
    fontSize: KICKER_SIZE,
    minFontSize: 16,
    letterSpacing: kickerTracking,
    fontFamily: fonts.heading,
    bold: true,
  })
  const kickerPainted = withoutOverflowMark(kicker.text)

  const lines = items.map((item, i) => {
    const body = fitSvgLine(stripEmphasis(item), {
      maxWidth: ITEM_MAX_W,
      fontSize: ITEM_SIZE,
      minFontSize: ITEM_MIN_PT,
      fontFamily: fonts.heading,
    })
    return { y: ITEM_YS[i]!, body, painted: withoutOverflowMark(body.text) }
  })

  const next = nextSource
    ? fitSvgLine(nextSource, {
        maxWidth: NEXT_MAX_W,
        fontSize: NEXT_SIZE,
        minFontSize: 16,
        fontFamily: fonts.body,
      })
    : null
  const nextPainted = next ? withoutOverflowMark(next.text) : ""

  return (
    <>
      {kickerPainted && (
        <text
          data-truncated={kicker.truncated ? "1" : undefined}
          x={KICKER_X}
          y={KICKER_Y}
          fontFamily={fonts.heading}
          fontSize={kicker.fontSize}
          fontWeight="700"
          fill={accessibleInk(colors.accent, bg, kicker.fontSize)}
          letterSpacing={kickerTracking}
          dominantBaseline="alphabetic"
        >
          {kickerPainted}
        </text>
      )}

      {lines.map((line, i) =>
        line.painted ? (
          <text
            key={i}
            data-truncated={line.body.truncated ? "1" : undefined}
            x={ITEM_X}
            y={line.y}
            fontFamily={fonts.heading}
            fontSize={line.body.fontSize}
            fill={accessibleInk(colors.text, bg, line.body.fontSize)}
            dominantBaseline="alphabetic"
          >
            {line.painted}
          </text>
        ) : null,
      )}

      <line
        data-depth="mid"
        x1={RULE_X1}
        y1={RULE_Y}
        x2={RULE_X2}
        y2={RULE_Y}
        stroke={ruleStroke}
        strokeWidth={RULE_STROKE}
      />

      {next && nextPainted && (
        <text
          data-contrast-tier="meta"
          data-truncated={next.truncated ? "1" : undefined}
          x={NEXT_X}
          y={NEXT_Y}
          fontFamily={fonts.body}
          fontSize={next.fontSize}
          fill={metaInk(colors.muted, bg)}
          dominantBaseline="alphabetic"
        >
          {nextPainted}
        </text>
      )}
    </>
  )
}

export const layoutDef: LayoutDefinition = {
  branding: "none",
  // ending-next-lecture-ending.tsx: after-class list plus next
  // lecture preview. CJK 课后 / Latin AFTER kicker, first two bullets or
  // newline-split heading, border rule, optional subheading. No thank-you
  // and no invented homework.
  id: "next-lecture-ending",
  kind: "standard",
  slideTypes: ["ending"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "body", accepts: ["bullets"], capacity: 1 },
    { name: "rule", accepts: [] },
    { name: "subheading", accepts: [] },
  ],
}
