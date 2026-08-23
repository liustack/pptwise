import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { fitHeadingLines } from "../heading-fit"
import { fitSvgLine } from "../../lib/svg-text-layout"
import { accessibleInk, metaInk } from "../ink"
import { hasCjk } from "./minimal-shared"
import { SIBLING_AIR_PX } from "../spacing"
import { underlineDescentRatio } from "./underline"

/**
 * stat-cover layout（2026-08-22 第八波批 1，新表达）：
 * **左齐巨号标题（heading 本文）+ 其下衬线结论句**。构图抄 insight 设计板
 * 封面（`.issues/design-boards/wave8/b1/Insight.dc.html`）：一个数扛封面，
 * 行情线归 motif，本版式不画。
 *
 * **它进共享池，不是 insight 专用**。零 theme id、零 hex。巨号吃 heading
 * 本文，不编造数字。结论句走 subheading。accent 是巨号的墨，text 是结论。
 *
 * 服务场景：财报解读开场、投资分析封面、数据周报首页。任何需要「先甩一个
 * 数，再跟一句读法」而不是居中海报的主题都可以抽。
 *
 * 板上做不到、最近落地：
 *   1. 板上 `+34%` 是样例 heading，引擎原样画 `slide.heading`。空 heading
 *      不补数字。
 *   2. CJK 眉行不加 letter-spacing。
 *   3. 底缘暗线不在本文件，见 poster-motif。
 */

const TITLE_X = 96
const TITLE_Y = 392
const TITLE_SIZE = 200
const TITLE_MIN_PT = 72
const TITLE_PREFERRED_LINES = 1
const TITLE_MAX_LINES = 2
const TITLE_MAX_W = 1088
const CONCLUSION_SIZE = 30
const CONCLUSION_MAX_W = 1088
/** 与渲染审计一致，以 0.75em 估算字顶。 */
const CONCLUSION_ASCENT_RATIO = 0.75
const CONCLUSION_Y_WITHOUT_TITLE = 470

const KICKER_X = 96
const KICKER_Y = 140
const KICKER_SIZE = 17
const KICKER_TRACKING = 6
const KICKER_MAX_W = 1088

const FOOT_X = 96
const FOOT_Y = 662
const FOOT_SIZE = 16

export function StatCover({ ir, slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const org = ir.meta.organization
  const date = ir.meta.date
  const author = ir.meta.authors?.[0]
  const authorText = author ? [author.name, author.role].filter(Boolean).join(" · ") : null
  const version = ir.meta.version

  const titleFit = {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    minPt: TITLE_MIN_PT,
    fontFamily: fonts.heading,
    typeScale: ctx.shape?.typeScale,
    bold: false,
  } as const
  const oneLineTitle = fitHeadingLines(slide.heading, {
    ...titleFit,
    maxLines: TITLE_PREFERRED_LINES,
  })
  // 数字和短标题维持单行板式。只有单行会真实截断时才启用第二行，避免为了
  // 放大字号把原本完整的一行主动拆开。
  const title = oneLineTitle.truncated
    ? fitHeadingLines(slide.heading, { ...titleFit, maxLines: TITLE_MAX_LINES })
    : oneLineTitle
  const titleInk = accessibleInk(colors.accent, bg, title.fontSize)

  const kickerSource = [org, date].filter((part): part is string => Boolean(part)).join(" · ")
  const kickerTracking = kickerSource && !hasCjk(kickerSource) ? KICKER_TRACKING : undefined
  const kicker = kickerSource
    ? fitSvgLine(kickerSource, {
        maxWidth: KICKER_MAX_W,
        fontSize: KICKER_SIZE,
        minFontSize: 16,
        letterSpacing: kickerTracking,
        fontFamily: fonts.body,
      })
    : null

  const conclusion = slide.subheading
    ? fitSvgLine(slide.subheading, {
        maxWidth: CONCLUSION_MAX_W,
        fontSize: CONCLUSION_SIZE,
        minFontSize: 16,
        fontFamily: fonts.heading,
      })
    : null
  const titleLastY = TITLE_Y + Math.max(0, title.lines.length - 1) * title.lineHeight
  const conclusionY =
    title.lines.length > 0
      ? titleLastY +
        Math.round(title.fontSize * underlineDescentRatio(slide.heading ?? "")) +
        SIBLING_AIR_PX +
        Math.round((conclusion?.fontSize ?? CONCLUSION_SIZE) * CONCLUSION_ASCENT_RATIO)
      : CONCLUSION_Y_WITHOUT_TITLE

  const footParts = [authorText, version].filter((part): part is string => Boolean(part))
  const foot =
    footParts.length > 0
      ? fitSvgLine(footParts.join(" · "), {
          maxWidth: 1000,
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
          {kicker.text}
        </text>
      )}

      {title.lines.map((line, i) => (
        <text
          key={i}
          data-truncated={title.truncated && i === title.lines.length - 1 ? "1" : undefined}
          x={TITLE_X}
          y={TITLE_Y + i * title.lineHeight}
          fontFamily={fonts.heading}
          fontSize={title.fontSize}
          fill={titleInk}
          dominantBaseline="alphabetic"
        >
          {line}
        </text>
      ))}

      {conclusion && (
        <text
          data-truncated={conclusion.truncated ? "1" : undefined}
          x={TITLE_X}
          y={conclusionY}
          fontFamily={fonts.heading}
          fontSize={conclusion.fontSize}
          fill={accessibleInk(colors.text, bg, conclusion.fontSize)}
          dominantBaseline="alphabetic"
        >
          {conclusion.text}
        </text>
      )}

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
          {foot.text}
        </text>
      )}
    </>
  )
}

export const layoutDef = {
  // cover-stat-cover.tsx: left-aligned giant heading from slide.heading,
  // serif conclusion from subheading, org/date kicker, author/version foot.
  // Does not invent a statistic. pinOnly board lock.
  id: "stat-cover",
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
    bold: false,
  },
} satisfies LayoutDefinition
