import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { fitHeadingLines } from "../render/heading-fit"
import { fitSvgLine, layoutSvgText } from "../lib/svg-text-layout"
import { accessibleInk, metaInk } from "../render/ink"
import { hasCjk } from "./minimal-shared"
import { stripEmphasis } from "../render/emphasis"

/**
 * capsule-open-cover（第八波 pinOnly）：卡纸上的左齐大标题，日期是一行
 * primary 字，不是胶囊按钮。构图抄 `.issues/design-boards/wave8/b2/Crayon.dc.html`
 * 封面的字位：kicker y140、标题 y352 / 72px、副题 y440、日期约 y563。
 *
 * 进共享池，不是 crayon 专用。零 theme id、零 baked hex。太阳归 motif，
 * 本版式不重画。不要 header-band 顶栏。空 heading 不编造封面句。日期文案
 * 取 date，没有 date 再取 subheading，不要写死召集句。
 */

const TITLE_X = 96
const TITLE_Y = 352
const TITLE_SIZE = 72
const TITLE_MIN_PT = 40
const TITLE_MAX_LINES = 2
const TITLE_MAX_W = 1088
const TITLE_LINE_HEIGHT = 88

const KICKER_X = 96
const KICKER_Y = 140
const KICKER_SIZE = 18
const KICKER_TRACKING = 4
const KICKER_MAX_W = 960

const SUB_GAP = 88
const SUB_SIZE = 26
const SUB_MAX_W = 1088

const DATE_X = 96
const DATE_GAP = 123
const DATE_MAX_W = 720
const DATE_SIZE = 22

export function CapsuleOpenCover({ ir, slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const org = ir.meta.organization
  const headingSource = slide.heading ?? ""
  const plainHeading = stripEmphasis(headingSource)
  const subheading = (slide.subheading ?? "").trim()
  const date = (ir.meta.date ?? "").trim()
  const dateSource = date || subheading
  const subtitleSource = subheading && subheading !== dateSource ? subheading : ""
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
  const titleInk = accessibleInk(colors.text, bg, title.fontSize)
  const titleLastY = TITLE_Y + Math.max(0, title.lines.length - 1) * title.lineHeight

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

  const subtitle = subtitleSource
    ? layoutSvgText(subtitleSource, {
        maxWidth: SUB_MAX_W,
        fontSize: SUB_SIZE,
        maxLines: 2,
        lineHeightRatio: 1.25,
        fontFamily: fonts.body,
      })
    : null
  const subY = titleLastY + SUB_GAP
  const subLastY = subtitle ? subY + Math.max(0, subtitle.lines.length - 1) * subtitle.lineHeight : titleLastY
  const dateY = subLastY + DATE_GAP

  const dateLine = dateSource
    ? fitSvgLine(dateSource, {
        maxWidth: DATE_MAX_W,
        fontSize: DATE_SIZE,
        minFontSize: 16,
        fontFamily: fonts.body,
        bold: true,
      })
    : null
  const dateInk = dateLine ? accessibleInk(colors.primary, bg, dateLine.fontSize) : colors.primary

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
          {kicker.text}
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
            {line}
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
            {line}
          </text>
        ))}

      {dateLine && (
        <text
          data-truncated={dateLine.truncated ? "1" : undefined}
          x={DATE_X}
          y={dateY}
          fontFamily={fonts.body}
          fontSize={dateLine.fontSize}
          fontWeight="700"
          fill={dateInk}
          dominantBaseline="alphabetic"
        >
          {dateLine.text}
        </text>
      )}
    </>
  )
}

export const layoutDef = {
  // cover-capsule-open-cover.tsx: left-aligned title on paper, primary
  // date line (not a pill). Motif owns the sun. Empty heading draws no
  // title. No header band.
  id: "capsule-open-cover",
  kind: "archetype",
  pinOnly: true,
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
