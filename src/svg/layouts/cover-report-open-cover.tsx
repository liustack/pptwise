import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import type { PptxIR } from "@/ir"
import { fitHeadingLines } from "../heading-fit"
import { fitSvgLine, layoutSvgText } from "../../lib/svg-text-layout"
import { accessibleInk, metaInk } from "../ink"
import { hasCjk } from "./minimal-shared"
import { stripEmphasis } from "../emphasis"

/**
 * report-open-cover（第八波 pinOnly）：薄荷纸上的左齐报告题。kicker 取
 * org，副题取 subheading，底落款取 date / authors。构图抄
 * `.issues/design-boards/wave8/b3/Pulse.dc.html` 封面：kicker y150、
 * 标题 y330 / 58px、副题 y410、落款 y662。
 *
 * 进共享池，不是 pulse 专用。零 theme id、零 baked hex。心搏线归 motif，
 * 本版式不重画。空 heading 不编造报告题。缺 date / authors 就少画，不写死
 * 「数据已脱敏」。CJK 不加 letter-spacing。标题装得下就用板上 58px，
 * 不放大铺满。
 */

const TITLE_X = 96
const TITLE_Y = 330
const TITLE_SIZE = 58
const TITLE_MIN_PT = 32
const TITLE_MAX_LINES = 2
const TITLE_MAX_W = 1088
const TITLE_LINE_HEIGHT = 80

const KICKER_X = 96
const KICKER_Y = 150
const KICKER_SIZE = 17
const KICKER_TRACKING = 6
const KICKER_MAX_W = 1088

const SUB_SIZE = 24
const SUB_Y = 410
const SUB_DROP = 80
const SUB_MAX_W = 1088

const FOOT_X = 96
const FOOT_Y = 662
const FOOT_SIZE = 17
const FOOT_MAX_W = 1088

/** Drop overflow marks that `truncateToUnits` appends. Cut, don't advertise the cut. */
function withoutOverflowMark(text: string): string {
  return text.replace(/(?:\u2026|\.{3})$/u, "")
}

function coverSignoff(meta: PptxIR["meta"]): string | null {
  const authors = (meta.authors ?? []).map((author) => author.name.trim()).filter(Boolean)
  const authorLine = authors.length > 0 ? authors.join(" · ") : null
  const date = (meta.date ?? "").trim() || null
  const parts = [authorLine, date].filter((v): v is string => Boolean(v))
  return parts.length > 0 ? parts.join(" · ") : null
}

export function ReportOpenCover({ ir, slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const org = ir.meta.organization
  const headingSource = slide.heading ?? ""
  const plainHeading = stripEmphasis(headingSource)
  const showTitle = plainHeading.trim().length > 0
  const subSource = (slide.subheading ?? "").trim()
  const footSource = coverSignoff(ir.meta)

  const title = fitHeadingLines(plainHeading, {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
    fontFamily: fonts.heading,
    typeScale: ctx.shape?.typeScale,
  })
  const titleInk = accessibleInk(colors.text, bg, title.fontSize)
  const titleLastY = TITLE_Y + Math.max(0, title.lines.length - 1) * title.lineHeight
  const subY = showTitle ? Math.max(SUB_Y, titleLastY + SUB_DROP) : SUB_Y

  const kickerTracking = org && !hasCjk(org) ? KICKER_TRACKING : undefined
  const kicker = org
    ? fitSvgLine(org, {
        maxWidth: KICKER_MAX_W,
        fontSize: KICKER_SIZE,
        minFontSize: 16,
        letterSpacing: kickerTracking,
        fontFamily: fonts.body,
      })
    : null

  const subtitle = subSource
    ? layoutSvgText(subSource, {
        maxWidth: SUB_MAX_W,
        fontSize: SUB_SIZE,
        maxLines: 2,
        minPt: 16,
        lineHeightRatio: 1.25,
        fontFamily: fonts.body,
      })
    : null

  const foot = footSource
    ? fitSvgLine(footSource, {
        maxWidth: FOOT_MAX_W,
        fontSize: FOOT_SIZE,
        minFontSize: 16,
        fontFamily: fonts.body,
      })
    : null

  return (
    <>
      {kicker && (
        <text
          data-contrast-tier="meta"
          data-truncated={kicker.truncated ? "1" : undefined}
          x={KICKER_X}
          y={KICKER_Y}
          fontFamily={fonts.body}
          fontSize={kicker.fontSize}
          fill={metaInk(colors.muted, bg)}
          letterSpacing={kickerTracking}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(kicker.text)}
        </text>
      )}

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
            {withoutOverflowMark(line)}
          </text>
        ))}

      {subtitle &&
        subtitle.lines.map((line, i) => (
          <text
            key={`sub-${i}`}
            data-contrast-tier="meta"
            data-truncated={subtitle.truncated && i === subtitle.lines.length - 1 ? "1" : undefined}
            x={TITLE_X}
            y={subY + i * subtitle.lineHeight}
            fontFamily={fonts.body}
            fontSize={subtitle.fontSize}
            fill={metaInk(colors.muted, bg)}
            dominantBaseline="alphabetic"
          >
            {withoutOverflowMark(line)}
          </text>
        ))}

      {foot && (
        <text
          data-contrast-tier="meta"
          data-truncated={foot.truncated ? "1" : undefined}
          x={FOOT_X}
          y={FOOT_Y}
          fontFamily={fonts.body}
          fontSize={foot.fontSize}
          fill={metaInk(colors.muted, bg)}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(foot.text)}
        </text>
      )}
    </>
  )
}

export const layoutDef = {
  // cover-report-open-cover.tsx: left-aligned report title on paper.
  // Motif owns the mid-page heartbeat. Empty heading draws no title.
  // Missing date/authors skips the sign-off. No invented privacy line.
  id: "report-open-cover",
  kind: "archetype",
  pinOnly: true,
  branding: "none",
  slideTypes: ["cover"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
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
