import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { fitHeadingLines } from "../heading-fit"
import { fitSvgLine } from "../../lib/svg-text-layout"
import { accessibleInk, metaInk } from "../ink"
import { hasCjk } from "./minimal-shared"
import { stripEmphasis } from "../emphasis"

/**
 * issue-head-cover（第八波 pinOnly）：刊头规制。左齐刊名、右齐日期、y148/156
 * 文武双线（粗 3 + 细 1，primary）、铅字标题、底 border 线与编辑部落款。
 * 构图抄 `.issues/design-boards/wave8/b2/Journal.dc.html` 封面。
 * 标题从板上 y370 收到 y280，长题不再把版心压到下半页。
 *
 * 进共享池，不是 journal 专用。零 theme id、零 baked hex。accent 不上封面。
 * 刊头双线是结构，本版式画。motif 封面不再画 y26/32，避免四条线。
 *
 * 刊名取 org。期号取 date，推得出年月就排年月，推不出就只排日期原文，
 * 没有日期就省略。不写死「第 24 期」。空 heading 不编造封面句。
 *
 * 板上做不到、最近落地：CJK 刊名字距按板 10px，标题本身不加 tracking。
 */

const MASTHEAD_X = 96
const MASTHEAD_Y = 120
const MASTHEAD_SIZE = 26
const MASTHEAD_TRACKING = 10
const MASTHEAD_MAX_W = 680

const DATE_X = 1184
const DATE_Y = 120
const DATE_SIZE = 16
const DATE_MAX_W = 360

const RULE_X1 = 96
const RULE_X2 = 1184
const THICK_RULE_Y = 148
const THICK_RULE_STROKE = 3
const THIN_RULE_Y = 156
const THIN_RULE_STROKE = 1

const TITLE_X = 96
const TITLE_Y = 280
const TITLE_SIZE = 60
const TITLE_MIN_PT = 36
const TITLE_MAX_LINES = 2
const TITLE_MAX_W = 1088
const TITLE_LINE_HEIGHT = 76

const SUB_SIZE = 24
const SUB_GAP = 76
const SUB_MAX_W = 1088

const FOOT_RULE_Y = 640
const COLOPHON_Y = 676
const COLOPHON_SIZE = 16
const COLOPHON_MAX_W = 1088

const CJK_DIGITS = ["〇", "一", "二", "三", "四", "五", "六", "七", "八", "九"] as const

function parseYearMonth(date: string | undefined): { year: string; month: number } | null {
  const m = /^(\d{4})\D+(\d{1,2})(?:\D|$)/.exec(date ?? "")
  if (!m) return null
  const month = Number(m[2])
  if (month < 1 || month > 12) return null
  return { year: m[1]!, month }
}

function cjkYearMonth(year: string, month: number): string {
  const yearGlyphs = [...year].map((d) => CJK_DIGITS[Number(d)] ?? d).join("")
  const monthGlyphs =
    month < 10 ? CJK_DIGITS[month] : month === 10 ? "十" : `十${CJK_DIGITS[month - 10]}`
  return `${yearGlyphs}年${monthGlyphs}月`
}

/** Date for the right masthead slot. Never invents a sequential 期号. */
function issueDateLabel(date: string | undefined, cjk: boolean): string | null {
  const parsed = parseYearMonth(date)
  if (parsed) {
    return cjk
      ? cjkYearMonth(parsed.year, parsed.month)
      : `${parsed.year}.${String(parsed.month).padStart(2, "0")}`
  }
  const trimmed = (date ?? "").trim()
  return trimmed.length > 0 ? trimmed : null
}

export function IssueHeadCover({ ir, slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const org = ir.meta.organization?.trim() || ""
  const headingSource = slide.heading ?? ""
  const plainHeading = stripEmphasis(headingSource)
  const showTitle = plainHeading.trim().length > 0
  const cjk = hasCjk([org, plainHeading, slide.subheading ?? ""].join(""))

  const mastheadTracking = org && hasCjk(org) ? MASTHEAD_TRACKING : undefined
  const masthead = org
    ? fitSvgLine(org, {
        maxWidth: MASTHEAD_MAX_W,
        fontSize: MASTHEAD_SIZE,
        minFontSize: 16,
        letterSpacing: mastheadTracking,
        fontFamily: fonts.heading,
      })
    : null

  const dateSource = issueDateLabel(ir.meta.date, cjk)
  const dateLine = dateSource
    ? fitSvgLine(dateSource, {
        maxWidth: DATE_MAX_W,
        fontSize: DATE_SIZE,
        minFontSize: 16,
        fontFamily: fonts.body,
      })
    : null

  const title = fitHeadingLines(plainHeading, {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
    fontFamily: fonts.heading,
    typeScale: ctx.shape?.typeScale,
  })
  const titleLastY = TITLE_Y + Math.max(0, title.lines.length - 1) * title.lineHeight
  const titleInk = accessibleInk(colors.text, bg, title.fontSize)

  const subSource = stripEmphasis(slide.subheading ?? "").trim()
  const subtitle = subSource
    ? fitSvgLine(subSource, {
        maxWidth: SUB_MAX_W,
        fontSize: SUB_SIZE,
        minFontSize: 16,
        fontFamily: fonts.body,
      })
    : null
  const subY = titleLastY + SUB_GAP

  const author = ir.meta.authors?.[0]
  const authorText = author ? [author.name, author.role].filter(Boolean).join(" · ") : null
  const colophonParts = [org || null, authorText].filter((v): v is string => Boolean(v))
  const colophon =
    colophonParts.length > 0
      ? fitSvgLine(colophonParts.join(" · "), {
          maxWidth: COLOPHON_MAX_W,
          fontSize: COLOPHON_SIZE,
          minFontSize: 16,
          fontFamily: fonts.body,
        })
      : null

  const ruleStroke = colors.primary
  const footStroke = colors.border ?? colors.muted

  return (
    <>
      {masthead && (
        <text
          data-truncated={masthead.truncated ? "1" : undefined}
          x={MASTHEAD_X}
          y={MASTHEAD_Y}
          fontFamily={fonts.heading}
          fontSize={masthead.fontSize}
          fontWeight="700"
          fill={accessibleInk(colors.primary, bg, masthead.fontSize)}
          letterSpacing={mastheadTracking}
          dominantBaseline="alphabetic"
        >
          {masthead.text}
        </text>
      )}

      {dateLine && (
        <text
          data-contrast-tier="meta"
          data-truncated={dateLine.truncated ? "1" : undefined}
          x={DATE_X}
          y={DATE_Y}
          textAnchor="end"
          fontFamily={fonts.body}
          fontSize={dateLine.fontSize}
          fill={metaInk(colors.muted, bg)}
          dominantBaseline="alphabetic"
        >
          {dateLine.text}
        </text>
      )}

      <line
        x1={RULE_X1}
        y1={THICK_RULE_Y}
        x2={RULE_X2}
        y2={THICK_RULE_Y}
        stroke={ruleStroke}
        strokeWidth={THICK_RULE_STROKE}
      />
      <line
        x1={RULE_X1}
        y1={THIN_RULE_Y}
        x2={RULE_X2}
        y2={THIN_RULE_Y}
        stroke={ruleStroke}
        strokeWidth={THIN_RULE_STROKE}
      />

      {showTitle &&
        title.lines.map((line, i) => (
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
            {line}
          </text>
        ))}

      {subtitle && (
        <text
          data-contrast-tier="meta"
          data-truncated={subtitle.truncated ? "1" : undefined}
          x={TITLE_X}
          y={subY}
          fontFamily={fonts.body}
          fontSize={subtitle.fontSize}
          fill={metaInk(colors.muted, bg)}
          dominantBaseline="alphabetic"
        >
          {subtitle.text}
        </text>
      )}

      <line
        x1={RULE_X1}
        y1={FOOT_RULE_Y}
        x2={RULE_X2}
        y2={FOOT_RULE_Y}
        stroke={footStroke}
        strokeWidth={1}
      />

      {colophon && (
        <text
          data-contrast-tier="meta"
          data-truncated={colophon.truncated ? "1" : undefined}
          x={MASTHEAD_X}
          y={COLOPHON_Y}
          fontFamily={fonts.body}
          fontSize={colophon.fontSize}
          fill={metaInk(colors.muted, bg)}
          dominantBaseline="alphabetic"
        >
          {colophon.text}
        </text>
      )}
    </>
  )
}

export const layoutDef = {
  // cover-issue-head-cover.tsx: left masthead name, right date, wenwu
  // rules at y148/156, lead type, foot rule and colophon. No accent.
  // Empty heading draws no title. pinOnly.
  id: "issue-head-cover",
  kind: "archetype",
  pinOnly: true,
  branding: "none",
  suppressMotif: true,
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
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
  },
} satisfies LayoutDefinition
