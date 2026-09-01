import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { fitSvgLine } from "../lib/svg-text-layout"
import { accessibleInk, metaInk } from "../render/ink"
import { hasCjk } from "./minimal-shared"
import { fitEmphasisLine, headingEmphasisPaint, renderEmphasisText, stripEmphasis } from "../render/emphasis"

/**
 * resolution-ending（第八波 pinOnly）：决议编号制收口。kicker 取短 heading
 * 或公开 CJK「评审决议」/ Latin RESOLUTION。清单优先 bullets 前三项，否则
 * 按换行或「一、/1.」切 heading。条目文本原样，不要再叠 3.1。底 border 线
 * y520。落款取 subheading，不写死决议编号。无 Thank you。构图抄
 * `.issues/design-boards/wave8/b4/Swiss.dc.html` ending：kicker y140 /
 * 20px，三条 y260/350/440，线 x96–1184，落款 y590。
 *
 * 进共享池。零 theme id、零 baked hex。红条归 motif，本版式不画红条。
 * 红永不承字成横幅，accent 不当文字色。`body accepts: ["bullets"]`。
 * CJK kicker 不加 letter-spacing。渲染不画省略号。
 */

const KICKER_X = 96
const KICKER_Y = 140
const KICKER_SIZE = 20
const KICKER_TRACKING = 8
const KICKER_MAX_W = 1088

const ITEM_X = 96
const ITEM_YS = [260, 350, 440] as const
const ITEM_SIZE = 34
const ITEM_MIN_PT = 20
const ITEM_MAX_W = 1088

const RULE_X1 = 96
const RULE_X2 = 1184
const RULE_Y = 520
const RULE_STROKE = 1

const SIGNOFF_X = 96
const SIGNOFF_Y = 590
const SIGNOFF_SIZE = 18
const SIGNOFF_MAX_W = 1088

const RESOLUTION_CJK = "评审决议"
const RESOLUTION_LATIN = "RESOLUTION"

function withoutOverflowMark(text: string): string {
  return text.replace(/(?:\.{3}|…)+$/u, "")
}

/** Items of the accepted `bullets` block this face has room to draw. */
const ITEM_MAX = 3

function coverBulletItems(slide: SvgTemplateProps["slide"]): string[] {
  const block = slide.components.find((c) => c.type === "bullets")
  if (!block || block.type !== "bullets") return []
  return block.items.slice(0, ITEM_MAX)
}

function splitResolutionLines(text: string): string[] {
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

function resolutionItems(slide: SvgTemplateProps["slide"]): string[] {
  const bullets = coverBulletItems(slide)
  if (bullets.length > 0) return bullets
  return splitResolutionLines(stripEmphasis(slide.heading ?? ""))
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
  if (coverBulletItems(slide).length > 0 && isShortKicker(heading)) return heading
  const scriptSrc = heading || coverBulletItems(slide)[0] || ""
  return hasCjk(scriptSrc) ? RESOLUTION_CJK : RESOLUTION_LATIN
}

export function ResolutionEnding({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const items = resolutionItems(slide)
  const kickerText = kickerSource(slide)
  const kickerTracking = hasCjk(kickerText) ? undefined : KICKER_TRACKING
  const signoffSource = (slide.subheading ?? "").trim()
  const ruleStroke = colors.border ?? colors.muted

  const kicker = fitSvgLine(kickerText, {
    maxWidth: KICKER_MAX_W,
    fontSize: KICKER_SIZE,
    minFontSize: 16,
    letterSpacing: kickerTracking,
    fontFamily: fonts.heading,
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
          data-contrast-tier="meta"
          data-truncated={kicker.truncated ? "1" : undefined}
          x={KICKER_X}
          y={KICKER_Y}
          fontFamily={fonts.heading}
          fontSize={kicker.fontSize}
          fill={metaInk(colors.muted, bg)}
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
        stroke={ruleStroke}
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
  // ending-resolution-ending.tsx: three-item resolution list,
  // short heading or CJK 评审决议 / Latin RESOLUTION kicker, border
  // closing rule, optional subheading sign-off. No thank-you and no
  // invented resolution number. Optional bullets fill the list.
  id: "resolution-ending",
  kind: "standard",
  slideTypes: ["ending"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "body", accepts: ["bullets"], capacity: 1, itemCapacity: ITEM_MAX },
    { name: "rule", accepts: [] },
  ],
}
