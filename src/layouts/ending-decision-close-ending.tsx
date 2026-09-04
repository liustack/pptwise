import type { SvgTemplateProps } from "./types"
import { boundaryBulletItems } from "./boundary-content"
import type { LayoutDefinition } from "./registry"
import { fitSvgLine } from "../lib/svg-text-layout"
import { accessibleInk, metaInk } from "../render/ink"
import { hasCjk } from "./minimal-shared"
import { stripEmphasis } from "../render/emphasis"

/**
 * decision-close-ending（第八波 pinOnly）：决定两条收口。kicker CJK「决定」/
 * Latin DECISION，accent 只成字。清单优先 bullets 前两项，否则按换行或
 * 「一、/1.」切 heading。底 border 细线。拟稿审定抄送取 subheading（可多行），
 * 不写死部门。无 Thank you。构图抄
 * `.issues/design-boards/wave8/b4/Memo.dc.html` ending：kicker y170 / 22px，
 * 两条 y280/360 / 36px，线 y440 x96–1184，落款 y520 / 19px。
 *
 * 进共享池。零 theme id、零 baked hex。红双线归 motif，本版式不画。红永不
 * 成面。`body accepts: ["bullets"]`。CJK 不加 letter-spacing。渲染不画省略号。
 */

const KICKER_X = 96
const KICKER_Y = 170
const KICKER_SIZE = 22
const KICKER_TRACKING = 8
const KICKER_MAX_W = 1088

const ITEM_X = 96
const ITEM_YS = [280, 360] as const
const ITEM_SIZE = 36
const ITEM_MIN_PT = 20
const ITEM_MAX_W = 1088

const RULE_X1 = 96
const RULE_X2 = 1184
const RULE_Y = 440
const RULE_STROKE = 1

const SIGNOFF_X = 96
const SIGNOFF_Y0 = 520
const SIGNOFF_GAP = 46
const SIGNOFF_SIZE = 19
const SIGNOFF_MAX_W = 1088
const SIGNOFF_MAX_LINES = 3

const DECISION_KICKER_CJK = "决定"
const DECISION_KICKER_LATIN = "DECISION"

function dropOverflowMark(text: string): string {
  return text.replace(/(?:\.{3}|…)+$/u, "")
}

/** Items of the accepted `bullets` block this face has room to draw. */
const ITEM_MAX = 2

function splitDecisionLines(text: string): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []
  const byNewline = trimmed.split(/\n+/).map((line) => line.trim()).filter(Boolean)
  if (byNewline.length > 1) return byNewline.slice(0, 2)
  const byCn = trimmed.split(/(?=[一二三四五六七八九十]+、)/).map((line) => line.trim()).filter(Boolean)
  if (byCn.length > 1) return byCn.slice(0, 2)
  const byDot = trimmed.split(/(?=(?:^|\s)\d+[.、]\s*)/).map((line) => line.trim()).filter(Boolean)
  if (byDot.length > 1) return byDot.slice(0, 2)
  return [trimmed]
}

function decisionItems(slide: SvgTemplateProps["slide"]): string[] {
  const bullets = boundaryBulletItems(slide, ITEM_MAX)
  if (bullets.length > 0) return bullets
  return splitDecisionLines(stripEmphasis(slide.heading ?? ""))
}

function signoffLines(text: string): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []
  return trimmed
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, SIGNOFF_MAX_LINES)
}

function scriptIsCjk(slide: SvgTemplateProps["slide"], items: string[]): boolean {
  if (hasCjk(slide.heading ?? "") || hasCjk(slide.subheading ?? "")) return true
  return items.some((item) => hasCjk(item))
}

export function DecisionCloseEnding({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const items = decisionItems(slide)
  const kickerText = scriptIsCjk(slide, items) ? DECISION_KICKER_CJK : DECISION_KICKER_LATIN
  const kickerTracking = hasCjk(kickerText) ? undefined : KICKER_TRACKING
  const signoffSource = stripEmphasis(slide.subheading ?? "")

  const kicker = fitSvgLine(kickerText, {
    maxWidth: KICKER_MAX_W,
    fontSize: KICKER_SIZE,
    minFontSize: 16,
    letterSpacing: kickerTracking,
    fontFamily: fonts.heading,
    bold: true,
  })
  const kickerPainted = dropOverflowMark(kicker.text)

  const lines = items.map((item, i) => {
    const body = fitSvgLine(stripEmphasis(item), {
      maxWidth: ITEM_MAX_W,
      fontSize: ITEM_SIZE,
      minFontSize: ITEM_MIN_PT,
      fontFamily: fonts.heading,
      bold: true,
    })
    return { y: ITEM_YS[i]!, body, painted: dropOverflowMark(body.text) }
  })

  const signoffs = signoffLines(signoffSource).map((line, i) => {
    const fitted = fitSvgLine(line, {
      maxWidth: SIGNOFF_MAX_W,
      fontSize: SIGNOFF_SIZE,
      minFontSize: 16,
      fontFamily: fonts.heading,
    })
    return {
      y: SIGNOFF_Y0 + i * SIGNOFF_GAP,
      fitted,
      painted: dropOverflowMark(fitted.text),
    }
  })

  const itemInk = accessibleInk(colors.text, bg, ITEM_SIZE)

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
            fontWeight="700"
            fill={itemInk}
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
        stroke={colors.border ?? colors.muted}
        strokeWidth={RULE_STROKE}
      />

      {signoffs.map((line, i) =>
        line.painted ? (
          <text
            key={`signoff-${i}`}
            data-contrast-tier="meta"
            data-truncated={line.fitted.truncated ? "1" : undefined}
            x={SIGNOFF_X}
            y={line.y}
            fontFamily={fonts.heading}
            fontSize={line.fitted.fontSize}
            fill={metaInk(colors.muted, bg)}
            dominantBaseline="alphabetic"
          >
            {line.painted}
          </text>
        ) : null,
      )}
    </>
  )
}

export const layoutDef: LayoutDefinition = {
  branding: "none",
  // ending-decision-close-ending.tsx: two-decision close. CJK
  // 决定 / Latin DECISION kicker in accent type, bullets or split heading
  // as the two lines, border rule, optional multi-line subheading sign-off.
  // No thank-you and no invented departments. Red is never a fill.
  id: "decision-close-ending",
  kind: "standard",
  story: {
    name: "Recorded Decision",
    story: "A kicker labeled DECISION sits at the top. Two decision lines stack below, a border rule runs across, and a multi-line sign-off anchors the bottom.",
    positioning: "The closing page for exactly two recorded decisions and a sign-off. The kicker carries the highlight color.",
    audience: "Internal meetings and memos where the decision must be stated on one projected page.",
    notFor: "Closings with three items, which belong in Numbered Resolution for three formally recorded points.",
  },
  slideTypes: ["ending"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "body", accepts: ["bullets"], capacity: 1, itemCapacity: ITEM_MAX },
    { name: "rule", accepts: [] },
  ],
}
