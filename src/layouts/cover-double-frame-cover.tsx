import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { fitHeadingLines } from "../render/heading-fit"
import { fitSvgLine } from "../lib/svg-text-layout"
import { accessibleInk, metaInk } from "../render/ink"
import { showsDocumentMeta } from "../render/document-meta"
import { hasCjk, trackingPx } from "./minimal-shared"
import { stripEmphasis } from "../render/emphasis"

/**
 * double-frame-cover（第八波 pinOnly）：居中双框规制。外框 border 1px，
 * 内框 accent 1.5px，成组。勃艮第只给大题（primary 经 `accessibleInk`）。
 * 年份行、落款居中。构图抄 `.issues/design-boards/wave8/b2/Heritage.dc.html`
 * 封面：外框 (56,48,1168×624)、内框 (68,60,1144×600)、kicker y200、
 * 标题 y380 / 88px、年份 y452、落款 y600。
 *
 * 进共享池，不是 heritage 专用。零 theme id、零 baked hex。双框是封面
 * 规制，由本版式画，motif 不再画顶缘双线或藏书票章。不自绘满版
 * （`paintsOwnBackground` 关掉），纸底仍走主题 `defaultBackgrounds.cover`。
 * 主题菜单应声明 `decor: silent`，避免 logo 压框。
 *
 * 板上做不到、最近落地：
 *   1. CJK 标题与 kicker 不加 letter-spacing。
 *   2. 空 heading 不编造封面句，双框仍在。
 *   3. 缺 org / date / authors 就少画，不编造印文或「谨制」。
 */

const CENTER_X = 640

const OUTER_X = 56
const OUTER_Y = 48
const OUTER_W = 1168
const OUTER_H = 624
const OUTER_STROKE = 1

const INNER_X = 68
const INNER_Y = 60
const INNER_W = 1144
const INNER_H = 600
const INNER_STROKE = 1.5

const TITLE_Y = 380
const TITLE_SIZE = 88
const TITLE_MIN_PT = 48
const TITLE_MAX_LINES = 2
const TITLE_MAX_W = 1040
const TITLE_LINE_HEIGHT = 104

const KICKER_Y = 200
const KICKER_SIZE = 22
const KICKER_TRACKING_EM = 0.22
const KICKER_MAX_W = 1040

const YEAR_Y = 452
const YEAR_SIZE = 24
const YEAR_TRACKING_EM = 0.33
const YEAR_MAX_W = 1040
const YEAR_GAP = YEAR_Y - TITLE_Y

const COLOPHON_Y = 600
const COLOPHON_SIZE = 18
const COLOPHON_MAX_W = 1040

export function DoubleFrameCover({ ir, slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const org = ir.meta.organization
  const date = showsDocumentMeta(ir) ? ir.meta.date : undefined
  const author = ir.meta.authors?.[0]
  const authorText = author ? [author.name, author.role].filter(Boolean).join(" · ") : null
  const headingSource = slide.heading ?? ""
  const plainHeading = stripEmphasis(headingSource)
  const showTitle = plainHeading.trim().length > 0
  const frameStroke = colors.border ?? colors.muted

  const title = fitHeadingLines(plainHeading, {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
    fontFamily: fonts.heading,
    typeScale: ctx.shape?.typeScale,
  })
  const titleInk = accessibleInk(colors.primary, bg, title.fontSize)
  const titleLastY = TITLE_Y + Math.max(0, title.lines.length - 1) * title.lineHeight
  const yearY = titleLastY + YEAR_GAP

  const kickerTracking = org && !hasCjk(org) ? trackingPx(KICKER_SIZE, KICKER_TRACKING_EM) : undefined
  const kicker = org
    ? fitSvgLine(org, {
        maxWidth: KICKER_MAX_W,
        fontSize: KICKER_SIZE,
        minFontSize: 16,
        letterSpacing: kickerTracking,
        fontFamily: fonts.body,
      })
    : null

  const yearTracking = date && !hasCjk(date) ? trackingPx(YEAR_SIZE, YEAR_TRACKING_EM) : undefined
  const year = date
    ? fitSvgLine(date, {
        maxWidth: YEAR_MAX_W,
        fontSize: YEAR_SIZE,
        minFontSize: 16,
        letterSpacing: yearTracking,
        fontFamily: fonts.heading,
      })
    : null

  const colophon = authorText
    ? fitSvgLine(authorText, {
        maxWidth: COLOPHON_MAX_W,
        fontSize: COLOPHON_SIZE,
        minFontSize: 16,
        fontFamily: fonts.body,
      })
    : null

  return (
    <>
      <g>
        <rect
          x={OUTER_X}
          y={OUTER_Y}
          width={OUTER_W}
          height={OUTER_H}
          fill="none"
          stroke={frameStroke}
          strokeWidth={OUTER_STROKE}
        />
        <rect
          x={INNER_X}
          y={INNER_Y}
          width={INNER_W}
          height={INNER_H}
          fill="none"
          stroke={colors.accent}
          strokeWidth={INNER_STROKE}
        />
      </g>

      {kicker && (
        <text
          data-contrast-tier="meta"
          data-truncated={kicker.truncated ? "1" : undefined}
          x={CENTER_X}
          y={KICKER_Y}
          textAnchor="middle"
          fontFamily={fonts.body}
          fontSize={kicker.fontSize}
          fill={metaInk(colors.muted, bg)}
          letterSpacing={kickerTracking}
          dominantBaseline="alphabetic"
        >
          {kicker.text}
        </text>
      )}

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

      {year && (
        <text
          data-truncated={year.truncated ? "1" : undefined}
          x={CENTER_X}
          y={yearY}
          textAnchor="middle"
          fontFamily={fonts.heading}
          fontSize={year.fontSize}
          fill={accessibleInk(colors.text, bg, year.fontSize)}
          letterSpacing={yearTracking}
          dominantBaseline="alphabetic"
        >
          {year.text}
        </text>
      )}

      {colophon && (
        <text
          data-contrast-tier="meta"
          data-truncated={colophon.truncated ? "1" : undefined}
          x={CENTER_X}
          y={COLOPHON_Y}
          textAnchor="middle"
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
  // cover-double-frame-cover.tsx: pinOnly centered double frame. Outer
  // border hairline, inner accent hairline, grouped. Burgundy only on the
  // display title. Year and colophon centered. Empty heading invents no
  // cover sentence. Paper field stays on the theme default background.
  id: "double-frame-cover",
  kind: "archetype",
  pinOnly: true,
  slideTypes: ["cover"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
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
