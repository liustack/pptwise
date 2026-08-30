import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { fitHeadingLines } from "../render/heading-fit"
import { fitSvgLine } from "../lib/svg-text-layout"
import { accessibleInk, accessibleOpacity, readableOn } from "../render/ink"
import { stripEmphasis } from "../render/emphasis"

/**
 * invite-field-ending（第八波 pinOnly）：满版 primary 邀约页。反白一句把
 * 人请回来，accent 短线收束，落款走 `readableOn(primary)` 的淡墨。构图抄
 * `.issues/design-boards/wave8/b2/Heritage.dc.html` ending：标题 y300 /
 * 56px、副题 y380、短线 y450 x540–740、落款 y540。
 *
 * 进共享池，不是 heritage 专用。零 theme id、零 baked hex。heading 就是
 * 邀约句，不写死「十月十日，回明川看看」。无 Thank you。满版色场由本文件
 * 自己铺（`paintsOwnBackground`），主题 `defaultBackgrounds.ending` 保持
 * 纸色，避免 contrast floor 拿深字压深底。
 *
 * 板上做不到、最近落地：
 *   1. CJK 标题不加 letter-spacing。
 *   2. 空 heading 不编造邀约句，也不画那条短线。
 *   3. 字色走 `readableOn` 相对本场 primary，落款再淡一档。
 */

const CENTER_X = 640
const FIELD_W = 1280
const FIELD_H = 720

const TITLE_Y = 300
const TITLE_SIZE = 56
const TITLE_MIN_PT = 32
const TITLE_MAX_LINES = 2
const TITLE_MAX_W = 1088
const TITLE_LINE_HEIGHT = 68

const SUB_SIZE = 21
const SUB_GAP = 80
const SUB_MAX_W = 1088
const SUB_OPACITY = 0.78

const RULE_Y = 450
const RULE_GAP = RULE_Y - TITLE_Y
const RULE_X1 = 540
const RULE_X2 = 740
const RULE_STROKE = 1.5

const FOOT_SIZE = 18
const FOOT_GAP = 90
const FOOT_MAX_W = 1088
const FOOT_OPACITY = 0.7

export function InviteFieldEnding({ ir, slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const field = colors.primary
  const ink = readableOn(field)
  const org = ir.meta.organization
  const author = ir.meta.authors?.[0]
  const authorText = author ? [author.name, author.role].filter(Boolean).join(" · ") : null
  const contact = ir.meta.contact
  const contactText = contact ? [contact.name, contact.email].filter(Boolean).join(" · ") : null

  const plainHeading = stripEmphasis(slide.heading ?? "")
  const showTitle = plainHeading.trim().length > 0
  const title = fitHeadingLines(plainHeading, {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
    fontFamily: fonts.heading,
    typeScale: ctx.shape?.typeScale,
  })
  const titleInk = accessibleInk(ink, field, title.fontSize)
  const titleLastY = TITLE_Y + Math.max(0, title.lines.length - 1) * title.lineHeight
  const subY = titleLastY + SUB_GAP
  const ruleY = titleLastY + RULE_GAP

  const subheading = slide.subheading?.trim()
    ? fitSvgLine(slide.subheading, {
        maxWidth: SUB_MAX_W,
        fontSize: SUB_SIZE,
        minFontSize: 16,
        fontFamily: fonts.body,
      })
    : null
  const subOpacity = subheading
    ? accessibleOpacity(ink, field, subheading.fontSize, SUB_OPACITY)
    : 1

  const footParts = [org, authorText, contactText].filter((v): v is string => Boolean(v))
  const foot =
    footParts.length > 0
      ? fitSvgLine(footParts.join(" · "), {
          maxWidth: FOOT_MAX_W,
          fontSize: FOOT_SIZE,
          minFontSize: 16,
          fontFamily: fonts.body,
        })
      : null
  const footY = ruleY + FOOT_GAP
  const footOpacity = foot ? accessibleOpacity(ink, field, foot.fontSize, FOOT_OPACITY) : 1
  const showRule = showTitle

  return (
    <>
      <rect x={0} y={0} width={FIELD_W} height={FIELD_H} fill={field} />

      {showTitle &&
        title.lines.map((line, i) => (
          <text
            key={i}
            data-truncated={title.truncated && i === title.lines.length - 1 ? "1" : undefined}
            x={CENTER_X}
            y={TITLE_Y + i * title.lineHeight}
            textAnchor="middle"
            fontFamily={fonts.heading}
            fontSize={title.fontSize}
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
          x={CENTER_X}
          y={subY}
          textAnchor="middle"
          fontFamily={fonts.body}
          fontSize={subheading.fontSize}
          fill={ink}
          fillOpacity={subOpacity}
          dominantBaseline="alphabetic"
        >
          {subheading.text}
        </text>
      )}

      {showRule && (
        <line
          x1={RULE_X1}
          y1={ruleY}
          x2={RULE_X2}
          y2={ruleY}
          stroke={colors.accent}
          strokeWidth={RULE_STROKE}
        />
      )}

      {foot && (
        <text
          data-contrast-tier="meta"
          data-truncated={foot.truncated ? "1" : undefined}
          x={CENTER_X}
          y={footY}
          textAnchor="middle"
          fontFamily={fonts.body}
          fontSize={foot.fontSize}
          fill={ink}
          fillOpacity={footOpacity}
          dominantBaseline="alphabetic"
        >
          {foot.text}
        </text>
      )}
    </>
  )
}

export const layoutDef = {
  // ending-invite-field-ending.tsx: pinOnly full-bleed primary invite.
  // Heading is the invitation. Accent short rule. Colophon in faded
  // readableOn ink. Empty heading invents no date-and-place sentence and
  // draws no rule. Theme ending paper stays light.
  id: "invite-field-ending",
  kind: "archetype",
  pinOnly: true,
  paintsOwnBackground: true,
  slideTypes: ["ending"],
  slots: [
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "rule", accepts: [] },
    { name: "meta", accepts: [] },
  ],
  headingFit: {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
  },
} satisfies LayoutDefinition
