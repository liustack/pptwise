import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { fitHeadingLines } from "../heading-fit"
import { fitSvgLine } from "../../lib/svg-text-layout"
import { accessibleInk, metaInk } from "../ink"
import { hasCjk } from "./minimal-shared"
import { stripEmphasis } from "../emphasis"

/**
 * lookbook-open-cover（第八波 pinOnly）：型录头版。左品牌行、右季/场次、
 * 通栏黑杠、左齐巨号标题、题下副题、右下绯红页码。构图抄
 * `.issues/design-boards/wave8/b3/Runway.dc.html` 封面：品牌 y140 / 26px，
 * 杠 y168 x96–1184 宽 2，标题 y400 / 96px，副题 y480 / 22px，页码 y662。
 *
 * 进共享池，不是 runway 专用。零 theme id、零 baked hex。无 motif。绯红
 * 只落页码。标题钉死板上 96，不吃 typeScale，禁止放大到 132 铺满。空
 * heading 不编造封面句。不要竖排年份。CJK 不加 letter-spacing。渲染不画
 * 省略号。`branding: "none"`。底色走主题 `defaultBackgrounds.cover`，本
 * 文件不自绘满版。
 */

const BRAND_X = 96
const BRAND_Y = 140
const BRAND_SIZE = 26
const BRAND_TRACKING = 16
const BRAND_MAX_W = 680
const BRAND_MAX_W_SOLO = 1088

const SEASON_X = 1184
const SEASON_Y = 140
const SEASON_SIZE = 16
const SEASON_MAX_W = 400

const RULE_X1 = 96
const RULE_X2 = 1184
const RULE_Y = 168
const RULE_STROKE = 2

const TITLE_X = 96
const TITLE_Y = 400
const TITLE_SIZE = 96
const TITLE_MIN_PT = 48
const TITLE_MAX_LINES = 1
const TITLE_MAX_W = 1088

const SUB_X = 96
const SUB_Y = 480
const SUB_SIZE = 22
const SUB_MAX_W = 1088

const FOLIO_X = 1184
const FOLIO_Y = 662
const FOLIO_SIZE = 16
const FOLIO_MAX_W = 240

/** Fit 链可能给末字补上省略号。渲染侧砍掉，不画 … 或 ...。 */
function dropOverflowMark(text: string): string {
  return text.replace(/(?:\u2026|\.{3})$/g, "")
}

function folioLabel(index: number): string {
  return `No.${String(index + 1).padStart(2, "0")}`
}

export function LookbookOpenCover({ ir, slide, index, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const org = ir.meta.organization?.trim() || ""
  const dateText = ir.meta.date?.trim() || ""
  const subText = stripEmphasis(slide.subheading ?? "").trim()
  const headingSource = slide.heading ?? ""
  const plainHeading = stripEmphasis(headingSource)
  const showTitle = plainHeading.trim().length > 0
  const seasonText = dateText

  const brandTracking = org && !hasCjk(org) ? BRAND_TRACKING : undefined
  const brand = org
    ? fitSvgLine(org, {
        maxWidth: seasonText ? BRAND_MAX_W : BRAND_MAX_W_SOLO,
        fontSize: BRAND_SIZE,
        minFontSize: 16,
        letterSpacing: brandTracking,
        fontFamily: fonts.heading,
      })
    : null
  const brandPaint = brand ? dropOverflowMark(brand.text) : ""

  const season = seasonText
    ? fitSvgLine(seasonText, {
        maxWidth: SEASON_MAX_W,
        fontSize: SEASON_SIZE,
        minFontSize: 16,
        fontFamily: fonts.heading,
      })
    : null
  const seasonPaint = season ? dropOverflowMark(season.text) : ""

  const title = fitHeadingLines(plainHeading, {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    fontFamily: fonts.heading,
  })
  const titleInk = accessibleInk(colors.text, bg, title.fontSize)

  const subtitle = subText
    ? fitSvgLine(subText, {
        maxWidth: SUB_MAX_W,
        fontSize: SUB_SIZE,
        minFontSize: 16,
        fontFamily: fonts.heading,
      })
    : null
  const subPaint = subtitle ? dropOverflowMark(subtitle.text) : ""

  const folio = fitSvgLine(folioLabel(index), {
    maxWidth: FOLIO_MAX_W,
    fontSize: FOLIO_SIZE,
    minFontSize: 16,
    fontFamily: fonts.heading,
  })
  const folioPaint = dropOverflowMark(folio.text)
  const folioInk = accessibleInk(colors.accent, bg, folio.fontSize)

  return (
    <>
      {brand && brandPaint && (
        <text
          data-truncated={brand.truncated ? "1" : undefined}
          x={BRAND_X}
          y={BRAND_Y}
          fontFamily={fonts.heading}
          fontSize={brand.fontSize}
          fontWeight="700"
          fill={accessibleInk(colors.primary, bg, brand.fontSize)}
          letterSpacing={brandTracking}
          dominantBaseline="alphabetic"
        >
          {brandPaint}
        </text>
      )}

      {season && seasonPaint && (
        <text
          data-contrast-tier="meta"
          data-truncated={season.truncated ? "1" : undefined}
          x={SEASON_X}
          y={SEASON_Y}
          textAnchor="end"
          fontFamily={fonts.heading}
          fontSize={season.fontSize}
          fill={metaInk(colors.muted, bg)}
          dominantBaseline="alphabetic"
        >
          {seasonPaint}
        </text>
      )}

      <line
        x1={RULE_X1}
        y1={RULE_Y}
        x2={RULE_X2}
        y2={RULE_Y}
        stroke={colors.primary}
        strokeWidth={RULE_STROKE}
      />

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

      {subPaint && subtitle && (
        <text
          data-contrast-tier="meta"
          data-truncated={subtitle.truncated ? "1" : undefined}
          x={SUB_X}
          y={SUB_Y}
          fontFamily={fonts.heading}
          fontSize={subtitle.fontSize}
          fill={metaInk(colors.muted, bg)}
          dominantBaseline="alphabetic"
        >
          {subPaint}
        </text>
      )}

      {folioPaint && (
        <text
          data-truncated={folio.truncated ? "1" : undefined}
          x={FOLIO_X}
          y={FOLIO_Y}
          textAnchor="end"
          fontFamily={fonts.heading}
          fontSize={folio.fontSize}
          fill={folioInk}
          dominantBaseline="alphabetic"
        >
          {folioPaint}
        </text>
      )}
    </>
  )
}

export const layoutDef = {
  // cover-lookbook-open-cover.tsx: lookbook masthead, full-width primary
  // rule, left display title at 96px, season/date, crimson folio. pinOnly.
  // Empty heading draws no title. No motif, no vertical year.
  id: "lookbook-open-cover",
  kind: "archetype",
  pinOnly: true,
  branding: "none",
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
  },
} satisfies LayoutDefinition
