import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import type { PptxIR } from "@/ir"
import { fitHeadingLines } from "../render/heading-fit"
import { fitSvgLine } from "../lib/svg-text-layout"
import { accessibleInk, metaInk } from "../render/ink"
import { hasCjk, trackingPx } from "./minimal-shared"
import { stripEmphasis } from "../render/emphasis"
import { RULE_TYPE_AIR_EM, SIBLING_AIR_PX } from "../render/spacing"

/**
 * invitation-plate-cover（第八波 pinOnly）：中轴请柬。暖黑纸底不自绘满版。
 * kicker 取 org，标题走 accent 香槟金，副题取 subheading，暗檀短线，底句
 * 取 date 或 authors。金框归 motif，本版式不画框。构图抄
 * `.issues/design-boards/wave8/b3/Luxe.dc.html` 封面：kicker y180、标题
 * y368 / 72px、副题 y442、短线 y520 宽 160、底句 y620。
 *
 * 进共享池，不是 luxe 专用。零 theme id、零 baked hex。这是明确的中轴
 * 请柬，垂直居中允许。主题菜单应声明 `decor: silent`。
 *
 * 板上做不到、最近落地：
 *   1. CJK 不加 letter-spacing。
 *   2. 空 heading 不编造「致一百位挚友」，也不画那条短线。
 *   3. 缺 org / date / authors 就少画，不写死「仅凭请柬入席」。
 */

const CENTER_X = 640

const TITLE_Y = 368
const TITLE_SIZE = 72
const TITLE_MIN_PT = 48
const TITLE_MAX_LINES = 2
const TITLE_MAX_W = 1000
const TITLE_LINE_HEIGHT = 86

const KICKER_Y = 180
const KICKER_SIZE = 16
const KICKER_TRACKING_EM = 0.22
const KICKER_MAX_W = 1000

const SUB_GAP = 74
const SUB_SIZE = 20
const SUB_MAX_W = 1000

const RULE_Y = 520
const RULE_GAP = RULE_Y - TITLE_Y
const RULE_W = 160
const RULE_STROKE = 1

const FOOT_Y = 620
const FOOT_SIZE = 16
const FOOT_MAX_W = 1000

function cutMarks(text: string): string {
  return text.replaceAll("…", "").replaceAll("...", "")
}

function authorLine(authors: PptxIR["meta"]["authors"] | undefined): string | null {
  const author = authors?.[0]
  if (!author) return null
  const text = [author.name, author.role].filter(Boolean).join(" · ")
  return text || null
}

function footSource(meta: PptxIR["meta"]): string | null {
  const date = meta.date?.trim()
  if (date) return date
  return authorLine(meta.authors)
}

export function InvitationPlateCover({ ir, slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const org = ir.meta.organization?.trim() || ""
  const headingSource = slide.heading ?? ""
  const plainHeading = stripEmphasis(headingSource)
  const showTitle = plainHeading.trim().length > 0
  const ruleStroke = colors.border ?? colors.muted

  const title = fitHeadingLines(plainHeading, {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
    fontFamily: fonts.heading,
    typeScale: ctx.shape?.typeScale,
    bold: false,
  })
  const titleLines = title.lines.map(cutMarks)
  const titleInk = accessibleInk(colors.accent, bg, title.fontSize)
  const titleLastY = TITLE_Y + Math.max(0, titleLines.length - 1) * title.lineHeight
  const subY = titleLastY + SUB_GAP
  const footGlyphTop = FOOT_Y - Math.round(FOOT_SIZE * RULE_TYPE_AIR_EM * 0.75)
  const ruleCeiling = footGlyphTop - SIBLING_AIR_PX
  const ruleY = Math.min(titleLastY + RULE_GAP, ruleCeiling)

  const kickerTracking = org && !hasCjk(org) ? trackingPx(KICKER_SIZE, KICKER_TRACKING_EM) : undefined
  const kicker = org
    ? fitSvgLine(org, {
        maxWidth: KICKER_MAX_W,
        fontSize: KICKER_SIZE,
        minFontSize: 16,
        letterSpacing: kickerTracking,
        fontFamily: fonts.heading,
      })
    : null

  const subSource = slide.subheading?.trim() || ""
  const subTracking = subSource && !hasCjk(subSource) ? trackingPx(SUB_SIZE, 0.2) : undefined
  const subtitle = subSource
    ? fitSvgLine(subSource, {
        maxWidth: SUB_MAX_W,
        fontSize: SUB_SIZE,
        minFontSize: 16,
        letterSpacing: subTracking,
        fontFamily: fonts.heading,
      })
    : null

  const footRaw = footSource(ir.meta)
  const footTracking = footRaw && !hasCjk(footRaw) ? trackingPx(FOOT_SIZE, 0.2) : undefined
  const foot = footRaw
    ? fitSvgLine(footRaw, {
        maxWidth: FOOT_MAX_W,
        fontSize: FOOT_SIZE,
        minFontSize: 16,
        letterSpacing: footTracking,
        fontFamily: fonts.heading,
      })
    : null

  return (
    <>
      {kicker && (
        <text
          data-contrast-tier="meta"
          data-truncated={kicker.truncated ? "1" : undefined}
          x={CENTER_X}
          y={KICKER_Y}
          textAnchor="middle"
          fontFamily={fonts.heading}
          fontSize={kicker.fontSize}
          fill={metaInk(colors.muted, bg)}
          letterSpacing={kickerTracking}
          dominantBaseline="alphabetic"
        >
          {cutMarks(kicker.text)}
        </text>
      )}

      {showTitle &&
        titleLines.map((line, i) => (
          <text
            key={i}
            data-truncated={title.truncated && i === titleLines.length - 1 ? "1" : undefined}
            x={CENTER_X}
            y={TITLE_Y + i * title.lineHeight}
            textAnchor="middle"
            fontFamily={fonts.heading}
            fontSize={title.fontSize}
            fill={titleInk}
            dominantBaseline="alphabetic"
          >
            {line}
          </text>
        ))}

      {subtitle && (
        <text
          data-truncated={subtitle.truncated ? "1" : undefined}
          x={CENTER_X}
          y={subY}
          textAnchor="middle"
          fontFamily={fonts.heading}
          fontSize={subtitle.fontSize}
          fill={accessibleInk(colors.text, bg, subtitle.fontSize)}
          letterSpacing={subTracking}
          dominantBaseline="alphabetic"
        >
          {cutMarks(subtitle.text)}
        </text>
      )}

      {showTitle && (
        <line
          x1={CENTER_X - RULE_W / 2}
          y1={ruleY}
          x2={CENTER_X + RULE_W / 2}
          y2={ruleY}
          stroke={ruleStroke}
          strokeWidth={RULE_STROKE}
        />
      )}

      {foot && (
        <text
          data-contrast-tier="meta"
          data-truncated={foot.truncated ? "1" : undefined}
          x={CENTER_X}
          y={FOOT_Y}
          textAnchor="middle"
          fontFamily={fonts.heading}
          fontSize={foot.fontSize}
          fill={metaInk(colors.muted, bg)}
          letterSpacing={footTracking}
          dominantBaseline="alphabetic"
        >
          {cutMarks(foot.text)}
        </text>
      )}
    </>
  )
}

export const layoutDef = {
  branding: "none",
  // cover-invitation-plate-cover.tsx: pinOnly centered invitation plate.
  // Gold title on the theme paper. Motif owns the double gilt frame.
  // Empty heading invents no invitation line and skips the short rule.
  id: "invitation-plate-cover",
  kind: "archetype",
  pinOnly: true,
  slideTypes: ["cover"],
  slots: [
    { name: "kicker", accepts: [] },
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
    bold: false,
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
  },
} satisfies LayoutDefinition
