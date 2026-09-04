import type { SvgTemplateProps } from "./types"
import { boundaryBulletItems } from "./boundary-content"
import type { LayoutDefinition } from "./registry"
import { fitSvgLine } from "../lib/svg-text-layout"
import { accessibleInk, metaInk } from "../render/ink"
import { hasCjk } from "./minimal-shared"
import { fitEmphasisLine, headingEmphasisPaint, renderEmphasisText, stripEmphasis } from "../render/emphasis"

/**
 * deliberation-ending（第八波 pinOnly）：三项安排收口。kicker 取短 heading
 * 或公开英文 ARRANGEMENTS。清单优先 bullets 前三项，否则按换行或
 * 「一、/1.」切 heading。金线 y490 收界。落款取 subheading，不写死
 * 「请领导小组审议」。无 Thank you。构图抄
 * `.issues/design-boards/wave8/b3/Vermilion.dc.html` ending：kicker y140 /
 * 22px，三条 y250/330/410，金线 x96–1184，落款 y560。
 *
 * 进共享池，不是 vermilion 专用。零 theme id、零 baked hex。顶缘金双线
 * 归 motif，本版式只画收界金线。`body accepts: ["bullets"]`。
 *
 * 板上做不到、最近落地：
 *   1. CJK kicker 不加 letter-spacing。
 *   2. 空文案不编造审议句。缺 subheading 就少画落款。
 *   3. accent 只给收界金线，绝不当文字色。
 */

const KICKER_X = 96
const KICKER_Y = 140
const KICKER_SIZE = 22
const KICKER_TRACKING = 8
const KICKER_MAX_W = 1088

const ITEM_X = 96
const ITEM_YS = [250, 330, 410] as const
const ITEM_SIZE = 32
const ITEM_MIN_PT = 20
const ITEM_MAX_W = 1088

const RULE_X1 = 96
const RULE_X2 = 1184
const RULE_Y = 490
const RULE_STROKE = 1

const SIGNOFF_X = 96
const SIGNOFF_Y = 560
const SIGNOFF_SIZE = 19
const SIGNOFF_MAX_W = 1088

const ARRANGEMENTS_KICKER = "ARRANGEMENTS"

function withoutOverflowMark(text: string): string {
  return text.replace(/(?:\.{3}|…)+$/u, "")
}

/** Items of the accepted `bullets` block this face has room to draw. */
const ITEM_MAX = 3

function splitArrangementLines(text: string): string[] {
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

function arrangementItems(slide: SvgTemplateProps["slide"]): string[] {
  const bullets = boundaryBulletItems(slide, ITEM_MAX)
  if (bullets.length > 0) return bullets
  return splitArrangementLines(stripEmphasis(slide.heading ?? ""))
}

function isShortKicker(heading: string): boolean {
  if (!heading) return false
  if (heading.includes("\n")) return false
  if (/^[一二三四五六七八九十]+、/.test(heading)) return false
  if (/^\d+[.、]/.test(heading)) return false
  return true
}

function kickerSource(slide: SvgTemplateProps["slide"]): string {
  const heading = stripEmphasis(slide.heading ?? "").trim()
  if (boundaryBulletItems(slide, ITEM_MAX).length > 0 && isShortKicker(heading)) return heading
  return ARRANGEMENTS_KICKER
}

export function DeliberationEnding({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const items = arrangementItems(slide)
  const kickerText = kickerSource(slide)
  const kickerTracking = hasCjk(kickerText) ? undefined : KICKER_TRACKING
  const signoffSource = (slide.subheading ?? "").trim()

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
      bold: true,
    })
    return { y: ITEM_YS[i]!, body, painted: withoutOverflowMark(body.text) }
  })

  const signoff = signoffSource
    ? fitEmphasisLine(signoffSource, {
        maxWidth: SIGNOFF_MAX_W,
        fontSize: SIGNOFF_SIZE,
        minFontSize: 16,
        fontFamily: fonts.body,
      })
    : null

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
          fill={accessibleInk(colors.primary, bg, kicker.fontSize)}
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
        stroke={colors.accent}
        strokeWidth={RULE_STROKE}
      />

      {signoff && renderEmphasisText(
        signoff.segments,
        headingEmphasisPaint(ctx, signoff, { baseFill: metaInk(colors.muted, bg), fontWeight: "600", fontFamily: fonts.body, bold: false }),
            <text
              data-contrast-tier="meta"
              data-truncated={signoff.truncated ? "1" : undefined}
              x={SIGNOFF_X}
              y={SIGNOFF_Y}
              fontFamily={fonts.body}
              fontSize={signoff.fontSize}
              fill={metaInk(colors.muted, bg)}
              dominantBaseline="alphabetic"
              />
      )}
    </>
  )
}

export const layoutDef: LayoutDefinition = {
  branding: "none",
  // ending-deliberation-ending.tsx: three-item arrangements list,
  // short heading or English ARRANGEMENTS kicker, accent closing rule,
  // optional subheading sign-off. No thank-you and no invented 请审议.
  // Optional bullets fill the list.
  id: "deliberation-ending",
  kind: "standard",
  story: {
    name: "Arranged Close",
    story: "A kicker from the heading or labeled ARRANGEMENTS sits at the top. Up to three arrangement lines stack below, a highlight closing rule marks the boundary, and a sign-off anchors the bottom.",
    positioning: "The closing page for up to three formal arrangements and a sign-off. The highlight rule is the only ornament.",
    audience: "Committee rooms and review panels reading the arrangements projected on a wall screen.",
    notFor: "Closings that carry informal reminders, which belong in Bare Checklist as a plain undecorated list.",
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
