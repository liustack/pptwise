import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { fitHeadingLines } from "../heading-fit"
import { fitSvgLine } from "../../lib/svg-text-layout"
import { accessibleInk, metaInk, readableOn } from "../ink"
import { stripEmphasis } from "../emphasis"

/**
 * window-close-ending（第八波 pinOnly）：满版 primary 黑场收口。反白标题、
 * 副题窗口说明、border 细线、底联络行。构图抄
 * `.issues/design-boards/wave8/b3/Runway.dc.html` ending：标题 y300 / 60px，
 * 副题 y380 / 21px，线 y460 x96–1184，联络 y540 / 18px。
 *
 * 进共享池，不是 runway 专用。零 theme id、零 baked hex。满版色场由本文件
 * 自己铺（`paintsOwnBackground`），主题 `defaultBackgrounds.ending` 保持
 * 米白，避免 contrast floor 拿深字压深底。联络取 contact 或 org，不写死
 * 邮箱。空 heading 不编造收束句。无 Thank you。CJK 不加 letter-spacing。
 * 渲染不画省略号。
 */

const FIELD_W = 1280
const FIELD_H = 720

const TITLE_X = 96
const TITLE_Y = 300
const TITLE_SIZE = 60
const TITLE_MIN_PT = 32
const TITLE_MAX_LINES = 1
const TITLE_MAX_W = 1088

const SUB_X = 96
const SUB_Y = 380
const SUB_SIZE = 21
const SUB_MAX_W = 1088

const RULE_X1 = 96
const RULE_X2 = 1184
const RULE_Y = 460
const RULE_STROKE = 1

const FOOT_X = 96
const FOOT_Y = 540
const FOOT_SIZE = 18
const FOOT_MAX_W = 1088

/** Fit 链可能给末字补上省略号。渲染侧砍掉，不画 … 或 ...。 */
function dropOverflowMark(text: string): string {
  return text.replace(/(?:\u2026|\.{3})$/g, "")
}

function contactLine(meta: SvgTemplateProps["ir"]["meta"]): string | null {
  const contact = meta.contact
  const parts = contact
    ? [contact.name, contact.email, contact.phone, contact.website].filter(
        (v): v is string => Boolean(v && v.trim()),
      )
    : []
  if (parts.length > 0) return parts.join(" · ")
  const org = meta.organization?.trim()
  return org ? org : null
}

export function WindowCloseEnding({ ir, slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const field = colors.primary
  const ink = readableOn(field)
  const headingSource = slide.heading ?? ""
  const plainHeading = stripEmphasis(headingSource)
  const showTitle = plainHeading.trim().length > 0
  const subText = stripEmphasis(slide.subheading ?? "").trim()

  const title = fitHeadingLines(plainHeading, {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    fontFamily: fonts.heading,
  })
  const titleInk = accessibleInk(ink, field, title.fontSize)

  const subtitle = subText
    ? fitSvgLine(subText, {
        maxWidth: SUB_MAX_W,
        fontSize: SUB_SIZE,
        minFontSize: 14,
        fontFamily: fonts.heading,
      })
    : null
  const subPaint = subtitle ? dropOverflowMark(subtitle.text) : ""

  const footSource = contactLine(ir.meta)
  const foot = footSource
    ? fitSvgLine(footSource, {
        maxWidth: FOOT_MAX_W,
        fontSize: FOOT_SIZE,
        minFontSize: 12,
        fontFamily: fonts.heading,
      })
    : null
  const footPaint = foot ? dropOverflowMark(foot.text) : ""

  return (
    <>
      <rect x={0} y={0} width={FIELD_W} height={FIELD_H} fill={field} />

      {showTitle &&
        title.lines.map((line, i) => {
          const paint = dropOverflowMark(line)
          if (!paint) return null
          return (
            <text
              key={i}
              data-truncated={title.truncated && i === title.lines.length - 1 ? "1" : undefined}
              x={TITLE_X}
              y={TITLE_Y + i * title.lineHeight}
              fontFamily={fonts.heading}
              fontSize={title.fontSize}
              fontWeight="700"
              fill={titleInk}
              dominantBaseline="alphabetic"
            >
              {paint}
            </text>
          )
        })}

      {subtitle && subPaint && (
        <text
          data-contrast-tier="meta"
          data-truncated={subtitle.truncated ? "1" : undefined}
          x={SUB_X}
          y={SUB_Y}
          fontFamily={fonts.heading}
          fontSize={subtitle.fontSize}
          fill={metaInk(colors.muted, field)}
          dominantBaseline="alphabetic"
        >
          {subPaint}
        </text>
      )}

      <line
        x1={RULE_X1}
        y1={RULE_Y}
        x2={RULE_X2}
        y2={RULE_Y}
        stroke={colors.border ?? colors.muted}
        strokeWidth={RULE_STROKE}
      />

      {foot && footPaint && (
        <text
          data-contrast-tier="meta"
          data-truncated={foot.truncated ? "1" : undefined}
          x={FOOT_X}
          y={FOOT_Y}
          fontFamily={fonts.heading}
          fontSize={foot.fontSize}
          fill={metaInk(colors.muted, field)}
          dominantBaseline="alphabetic"
        >
          {footPaint}
        </text>
      )}
    </>
  )
}

export const layoutDef = {
  // ending-window-close-ending.tsx: full-bleed primary field, inverted
  // title, window note, border rule, contact/org foot. pinOnly.
  // paintsOwnBackground. Empty heading invents no close and no email.
  id: "window-close-ending",
  kind: "archetype",
  pinOnly: true,
  branding: "none",
  paintsOwnBackground: true,
  suppressMotif: true,
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
  },
} satisfies LayoutDefinition
