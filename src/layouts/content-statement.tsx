import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { sectionNameFor } from "../lib/derive"
import { fitHeadingLines } from "../render/heading-fit"
import { fitSvgLine } from "../lib/svg-text-layout"
import { accessibleInk } from "../render/ink"
import { latinUpper, statementAttribution, trackingPx } from "./minimal-shared"
import { sparseFace } from "./sparse/registry"

/**
 * 未注册的 (themeId, layoutId) 与自定义主题仍走此脸。
 *
 * statement 通用脸：整页就是 heading 的 2 至 4 行诗行 / 金句。主题菜单把
 * `statement` 讲法绑定到本脸，并在需要时用 silent 同时关掉 motif 与页级品牌。
 *
 * 和 quote-stage 的差别不是「再居中一点」：字重 500 斜体（禁止 800），
 * 无短棒，标签语法（tracking 眉 + 出处小字），0 组件合法，1 个组件只渲成
 * 出处小字，不走 SvgContent 卡片。
 *
 * 纪律：本文件禁 theme id、禁颜色 hex 字面量，颜色 / 字体全部来自 ctx。
 */

const CENTER_X = 640
const CONTENT_MAX_W = 920
const KICKER_Y = 80
const TITLE_Y = 300
const KICKER_SIZE = 16
const ATTR_SIZE = 16
const KICKER_TRACKING_EM = 0.35
const ATTR_TRACKING_EM = 0.2
const ATTR_GAP = 56

export function StatementContent(props: SvgTemplateProps) {
  const Face = sparseFace("statement", props.ir.theme.id)
  if (Face) return Face(props)
  return GenericStatementContent(props)
}

function GenericStatementContent({ ir, slide, index, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const defaultBg = ctx.defaultBg ?? colors.bg

  const section = sectionNameFor(ir.slides, index)
  const kickerTracking = trackingPx(KICKER_SIZE, KICKER_TRACKING_EM)
  const kicker = section
    ? fitSvgLine(latinUpper(section), {
        maxWidth: CONTENT_MAX_W,
        fontSize: KICKER_SIZE,
        minFontSize: 16,
        letterSpacing: kickerTracking,
      })
    : null

  const heading = fitHeadingLines(slide.heading, {
    ...layoutDef.headingFit,
    fontFamily: fonts.heading,
    typeScale: ctx.shape?.typeScale,
  })
  const titleLastY = TITLE_Y + Math.max(0, heading.lines.length - 1) * heading.lineHeight

  const attrSource = statementAttribution(slide)
  const attrTracking = trackingPx(ATTR_SIZE, ATTR_TRACKING_EM)
  const attribution = attrSource
    ? fitSvgLine(latinUpper(attrSource), {
        maxWidth: CONTENT_MAX_W,
        fontSize: ATTR_SIZE,
        minFontSize: 16,
        letterSpacing: attrTracking,
      })
    : null
  const attrY = titleLastY + ATTR_GAP

  return (
    <>
      {kicker && (
        <text
          data-truncated={kicker.truncated ? "1" : undefined}
          x={CENTER_X}
          y={KICKER_Y}
          textAnchor="middle"
          fontFamily={fonts.body}
          fontSize={kicker.fontSize}
          fill={accessibleInk(colors.accent, defaultBg, kicker.fontSize)}
          letterSpacing={kickerTracking}
          dominantBaseline="alphabetic"
        >
          {kicker.text}
        </text>
      )}

      {heading.lines.map((line, i) => (
        <text
          key={i}
          data-truncated={heading.truncated && i === heading.lines.length - 1 ? "1" : undefined}
          x={CENTER_X}
          y={TITLE_Y + i * heading.lineHeight}
          textAnchor="middle"
          fontFamily={fonts.heading}
          fontSize={heading.fontSize}
          fontWeight="500"
          fontStyle="italic"
          fill={accessibleInk(colors.text, defaultBg, heading.fontSize)}
          dominantBaseline="alphabetic"
        >
          {line}
        </text>
      ))}

      {attribution && (
        <text
          data-truncated={attribution.truncated ? "1" : undefined}
          x={CENTER_X}
          y={attrY}
          textAnchor="middle"
          fontFamily={fonts.body}
          fontSize={attribution.fontSize}
          fill={accessibleInk(colors.accent, defaultBg, attribution.fontSize)}
          letterSpacing={attrTracking}
          dominantBaseline="alphabetic"
        >
          {attribution.text}
        </text>
      )}
    </>
  )
}

export const layoutDef = {
  branding: "none",
  // content-statement.tsx: a pinOnly editorial-verse page. Heading is the
  // whole visual (2 to 4 italic lines, weight 500). Capacity-1 body is an
  // attribution caption, never a card. Page decor and branding posture belong
  // to the menu entry, not this face declaration.
  id: "statement",
  kind: "standard",
  pinOnly: true,
  slideTypes: ["content"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "body", accepts: ["paragraph", "blockquote", "citation"], capacity: 1 },
    { name: "meta", accepts: [] },
  ],
  arrangements: ["single"],
  headingFit: {
    maxWidth: CONTENT_MAX_W,
    fontSize: 48,
    maxLines: 4,
    minPt: 28,
    bold: false,
    lineHeightRatio: 1.25,
  },
} satisfies LayoutDefinition
