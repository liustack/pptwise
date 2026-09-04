import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { sectionNameFor } from "../lib/derive"
import {
  fitEmphasisHeading,
  fitEmphasisText,
  headingEmphasisPaint,
  renderEmphasisHeading,
} from "../render/emphasis"
import { fitSvgLine } from "../lib/svg-text-layout"
import { accessibleInk } from "../render/ink"
import { heroCaption, heroSource, heroUnit, heroValue, latinUpper, trackingPx } from "./minimal-shared"
import { SvgContent } from "../render/svg-content"
import { stripEmphasis } from "../render/emphasis"
import { fitHeadingLines } from "../render/heading-fit"
import { sparseFace } from "./sparse/registry"
import { stepAside } from "../render/step-aside"

/**
 * 未注册的 (themeId, layoutId) 与自定义主题仍走此脸。
 *
 * stat-hero 通用脸：整页只落地一个数字或短语。这一页没有标题槽、没有下方配角。
 * 菜单可用 silent 同时关掉 motif 与页级品牌，让四周只剩这一件事。
 *
 * 数字优先 kpi_cards 第一项的 value（单位单独一行），否则 heading 自己就是
 * 英雄位——无 kpi 组件时 heading 即主体，是本脸的明示语义。说明一行来自
 * kpi.label（有 kpi 时）或 subheading。出处来自 kpi.source / footnote /
 * citation / paragraph。
 *
 * 这一页只有一个英雄位。作者写下两个以上指标时本脸退位（`heroExact` 返回
 * false），整页交给通用组件渲染，四个指标一个不少地画出来——不是画第一个、
 * 悄悄扔掉其余三个。
 *
 * 纪律：本文件禁 theme id、禁颜色 hex 字面量，颜色 / 字体全部来自 ctx。
 * 单个数字用比例数字，不用等宽 tabular。
 */

const PAD_X = 160
const CONTENT_MAX_W = 960
const KICKER_Y = 80
const VALUE_Y = 388
const KICKER_SIZE = 16
const UNIT_SIZE = 22
const CAPTION_SIZE = 26
const SOURCE_SIZE = 16
const SOURCE_Y = 656
const KICKER_TRACKING_EM = 0.35
const UNIT_GAP_RATIO = 0.32
const CAPTION_GAP = 40
const CAPTION_MAX_LINES = 2
const CAPTION_LINE_RATIO = 1.25

/**
 * Whether this page is the one thing this face can draw: a single hero
 * figure.
 *
 * A `kpi_cards` component carrying more than one item is four numbers, and
 * this face has exactly one place to put a number. Drawing the first and
 * dropping the rest is the posture the face discipline forbids, so it steps
 * aside instead and the page is drawn by the ordinary component renderer,
 * which shows every card. Same guard shape as `show-statement` and
 * `show-spotlight`.
 */
function heroExact(slide: SvgTemplateProps["slide"]): boolean {
  return !slide.components.some((component) => component.type === "kpi_cards" && component.items.length > 1)
}

export function StatHeroContent(props: SvgTemplateProps) {
  if (!heroExact(props.slide)) return StatHeroFallbackContent(props)
  const Face = sparseFace("stat-hero", props.ir.theme.id)
  if (Face) return Face(props)
  return GenericStatHeroContent(props)
}

const FALLBACK_HEADING_Y = 150
const FALLBACK_RECT = { x: PAD_X, y: 230, w: 1280 - PAD_X * 2, h: 400 } as const

/** The whole page, drawn plainly, when the hero construction cannot hold it. */
function StatHeroFallbackContent({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const defaultBg = ctx.defaultBg ?? colors.bg
  const heading = fitHeadingLines(stripEmphasis(slide.heading ?? ""), {
    maxWidth: CONTENT_MAX_W,
    fontSize: 44,
    maxLines: 2,
    minPt: 28,
    lineHeightRatio: 1.28,
    fontFamily: fonts.heading,
  })
  const headingStart = FALLBACK_HEADING_Y - Math.max(0, heading.lines.length - 1) * heading.lineHeight
  // A fixed 400px band inside a 960px column. The hero page gives its body
  // less room than an ordinary page would, so ask before drawing it.
  const aside = stepAside({ face: "stat-hero", slide, ctx, bodyRect: FALLBACK_RECT })
  if (aside) return aside
  return (
    <g data-hero-mode="fallback">
      {heading.lines.map((line, i) => (
        <text
          key={`heading-${i}`}
          data-truncated={heading.truncated && i === heading.lines.length - 1 ? "1" : undefined}
          x={PAD_X}
          y={headingStart + i * heading.lineHeight}
          fontFamily={fonts.heading}
          fontSize={heading.fontSize}
          fontWeight="700"
          fill={accessibleInk(colors.text, defaultBg, heading.fontSize)}
          dominantBaseline="alphabetic"
        >
          {line}
        </text>
      ))}
      <SvgContent components={slide.components} rect={FALLBACK_RECT} ctx={ctx} />
    </g>
  )
}

function GenericStatHeroContent({ ir, slide, index, ctx }: SvgTemplateProps) {
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

  const value = heroValue(slide)
  const heading = fitEmphasisHeading(value, {
    ...layoutDef.headingFit,
    fontFamily: fonts.heading,
    typeScale: ctx.shape?.typeScale,
  })
  const titleLastY = VALUE_Y + Math.max(0, heading.lines.length - 1) * heading.lineHeight

  const unitSource = heroUnit(slide)
  const unit = unitSource
    ? fitSvgLine(unitSource, {
        maxWidth: CONTENT_MAX_W,
        fontSize: UNIT_SIZE,
        minFontSize: 16,
      })
    : null
  const unitY = titleLastY + Math.round(heading.fontSize * UNIT_GAP_RATIO)

  const caption = fitEmphasisText(heroCaption(slide), {
    maxWidth: CONTENT_MAX_W,
    fontSize: CAPTION_SIZE,
    maxLines: CAPTION_MAX_LINES,
    minPt: 16,
    lineHeightRatio: CAPTION_LINE_RATIO,
    fontFamily: fonts.body,
  })
  const captionStartY = (unit ? unitY : titleLastY) + CAPTION_GAP

  const sourceSource = heroSource(slide)
  const source = sourceSource
    ? fitSvgLine(sourceSource, {
        maxWidth: CONTENT_MAX_W,
        fontSize: SOURCE_SIZE,
        minFontSize: 16,
      })
    : null

  return (
    <>
      {kicker && (
        <text
          data-truncated={kicker.truncated ? "1" : undefined}
          x={PAD_X}
          y={KICKER_Y}
          fontFamily={fonts.body}
          fontSize={kicker.fontSize}
          fill={accessibleInk(colors.accent, defaultBg, kicker.fontSize)}
          letterSpacing={kickerTracking}
          dominantBaseline="alphabetic"
        >
          {kicker.text}
        </text>
      )}

      {renderEmphasisHeading(
        heading,
        headingEmphasisPaint(ctx, heading, { baseFill: accessibleInk(colors.primary, defaultBg, heading.fontSize), fontWeight: "700", fontFamily: fonts.heading }),
        (_line, i) => (
          <text
            key={i}
            data-truncated={heading.truncated && i === heading.lines.length - 1 ? "1" : undefined}
            x={PAD_X}
            y={VALUE_Y + i * heading.lineHeight}
            fontFamily={fonts.heading}
            fontSize={heading.fontSize}
            fontWeight="700"
            fill={accessibleInk(colors.primary, defaultBg, heading.fontSize)}
            dominantBaseline="alphabetic"
            />
        ),
      )}

      {unit && (
        <text
          data-truncated={unit.truncated ? "1" : undefined}
          x={PAD_X}
          y={unitY}
          fontFamily={fonts.body}
          fontSize={unit.fontSize}
          fill={accessibleInk(colors.muted, defaultBg, unit.fontSize)}
          dominantBaseline="alphabetic"
        >
          {unit.text}
        </text>
      )}

      {renderEmphasisHeading(
        caption,
        headingEmphasisPaint(ctx, caption, {
          baseFill: accessibleInk(colors.text, defaultBg, caption.fontSize),
          fontWeight: "600",
          fontFamily: fonts.body,
          bold: false,
        }),
        (_line, i) => (
          <text
            key={`caption-${i}`}
            data-truncated={caption.truncated && i === caption.lines.length - 1 ? "1" : undefined}
            x={PAD_X}
            y={captionStartY + i * caption.lineHeight}
            fontFamily={fonts.body}
            fontSize={caption.fontSize}
            fill={accessibleInk(colors.text, defaultBg, caption.fontSize)}
            dominantBaseline="alphabetic"
          />
        ),
      )}

      {source && (
        <text
          data-truncated={source.truncated ? "1" : undefined}
          x={PAD_X}
          y={SOURCE_Y}
          fontFamily={fonts.body}
          fontSize={source.fontSize}
          fill={accessibleInk(colors.muted, defaultBg, source.fontSize)}
          dominantBaseline="alphabetic"
        >
          {source.text}
        </text>
      )}
    </>
  )
}

export const layoutDef = {
  branding: "none",
  // content-stat-hero.tsx: a whole-page number. Hero value from
  // kpi_cards[0] or the heading, one caption line, optional source.
  // Page decor and branding posture belong to the menu entry. The page is
  // intentionally sparse and uses the full canvas.
  id: "stat-hero",
  kind: "standard",
  slideTypes: ["content"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "body", accepts: ["kpi_cards", "paragraph", "citation"], capacity: 1 },
    { name: "meta", accepts: [] },
  ],
  headingFit: {
    maxWidth: CONTENT_MAX_W,
    fontSize: 180,
    maxLines: 2,
    minPt: 64,
    lineHeightRatio: 1.05,
  },
} satisfies LayoutDefinition
