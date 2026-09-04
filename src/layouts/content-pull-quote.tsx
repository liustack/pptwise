import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { sectionNameFor } from "../lib/derive"
import {
  fitEmphasisHeading,
  fitEmphasisLine,
  headingEmphasisPaint,
  renderEmphasisHeading,
  renderEmphasisText,
} from "../render/emphasis"
import { fitSvgLine, layoutSvgText } from "../lib/svg-text-layout"
import { accessibleInk } from "../render/ink"
import {
  latinUpper,
  pullQuoteAttribution,
  pullQuoteBody,
  pullQuoteContext,
  pullQuoteText,
  trackingPx,
} from "./minimal-shared"
import { sparseFace } from "./sparse/registry"

/**
 * 未注册的 (themeId, layoutId) 与自定义主题仍走此脸。
 *
 * pull-quote 通用脸：居中引言页。章节眉 + 页首语境行 + 大引言 + 出处小字 +
 * 一段散文。不自己铺暗底，暗不暗由主题 `colors.bg` / `slide.background`
 * 决定。菜单可用 silent 同时关掉 motif 与页级品牌。
 *
 * 大字位是作者写的引文本体（`blockquote.text`），heading 降为页首小字语境
 * 行；页面没有 blockquote 组件时 heading 自己就是引文（本脸明示语义），此时
 * 语境行留空，同一句不会印两遍。出处只取组件字段，没有 subheading 兜底。
 * 正文只接受一个 paragraph，走 layoutSvgText，不走 SvgContent 卡片。
 * 取哪个字段的完整契约见 `minimal-shared.ts` 的 pullQuote* 四件套。
 *
 * 纪律：本文件禁 theme id、禁颜色 hex 字面量，颜色 / 字体全部来自 ctx。
 */

const CENTER_X = 640
const HEADING_MAX_W = 920
const BODY_MAX_W = 760
const KICKER_Y = 100
const CONTEXT_Y = 148
const QUOTE_TOP = 250
const KICKER_SIZE = 16
const CONTEXT_SIZE = 18
const ATTR_SIZE = 16
const BODY_SIZE = 17
const KICKER_TRACKING_EM = 0.42
const ATTR_TRACKING_EM = 0.2
const ATTR_GAP = 40
const BODY_GAP = 50
const BODY_MAX_LINES = 6
const BODY_LINE_RATIO = 1.8

export function PullQuoteContent(props: SvgTemplateProps) {
  const Face = sparseFace("pull-quote", props.ir.theme.id)
  if (Face) return Face(props)
  return GenericPullQuoteContent(props)
}

function GenericPullQuoteContent({ ir, slide, index, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const defaultBg = ctx.defaultBg ?? colors.bg

  const section = sectionNameFor(ir.slides, index)
  const kickerTracking = trackingPx(KICKER_SIZE, KICKER_TRACKING_EM)
  const kicker = section
    ? fitSvgLine(latinUpper(section), {
        maxWidth: HEADING_MAX_W,
        fontSize: KICKER_SIZE,
        minFontSize: 16,
        letterSpacing: kickerTracking,
      })
    : null

  const context = fitEmphasisLine(pullQuoteContext(slide), {
    maxWidth: HEADING_MAX_W,
    fontSize: CONTEXT_SIZE,
    minFontSize: 16,
    fontFamily: fonts.body,
  })

  // The quote is the page. It gets the emphasis-aware heading fit so a
  // `**marked**` run inside an authored quote paints the same way it would
  // in any other big type on this deck.
  const heading = fitEmphasisHeading(pullQuoteText(slide), {
    ...layoutDef.headingFit,
    fontFamily: fonts.heading,
    typeScale: ctx.shape?.typeScale,
  })
  // Centre the quote block on the page rather than hanging it from a fixed
  // baseline: an authored quote runs anywhere from one line to four, and a
  // fixed top leaves a one-liner floating above a hole.
  const titleY = Math.round(
    QUOTE_TOP + (4 - heading.lines.length) * heading.lineHeight * 0.5,
  )
  const titleLastY = titleY + Math.max(0, heading.lines.length - 1) * heading.lineHeight

  const attrSource = pullQuoteAttribution(slide)
  const attrTracking = trackingPx(ATTR_SIZE, ATTR_TRACKING_EM)
  const attribution = attrSource
    ? fitSvgLine(latinUpper(attrSource), {
        maxWidth: HEADING_MAX_W,
        fontSize: ATTR_SIZE,
        minFontSize: 16,
        letterSpacing: attrTracking,
      })
    : null
  const attrY = titleLastY + ATTR_GAP

  const bodySource = pullQuoteBody(slide)
  const bodyLayout = bodySource
    ? layoutSvgText(bodySource, {
        maxWidth: BODY_MAX_W,
        fontSize: BODY_SIZE,
        maxLines: BODY_MAX_LINES,
        minPt: 16,
        lineHeightRatio: BODY_LINE_RATIO,
        fontFamily: fonts.body,
      })
    : null
  const bodyStartY = (attribution ? attrY : titleLastY) + BODY_GAP

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

      {context &&
        renderEmphasisText(
          context.segments,
          headingEmphasisPaint(ctx, context, {
            baseFill: accessibleInk(colors.muted, defaultBg, context.fontSize),
            fontWeight: "600",
            fontFamily: fonts.body,
            bold: false,
          }),
          <text
            data-truncated={context.truncated ? "1" : undefined}
            x={CENTER_X}
            y={CONTEXT_Y}
            textAnchor="middle"
            fontFamily={fonts.body}
            fontSize={context.fontSize}
            fill={accessibleInk(colors.muted, defaultBg, context.fontSize)}
            dominantBaseline="alphabetic"
          />,
        )}

      {renderEmphasisHeading(
        heading,
        headingEmphasisPaint(ctx, heading, { baseFill: accessibleInk(colors.text, defaultBg, heading.fontSize), fontWeight: "400", fontFamily: fonts.heading }),
        (_line, i) => (
          <text
            key={i}
            data-truncated={heading.truncated && i === heading.lines.length - 1 ? "1" : undefined}
            x={CENTER_X}
            y={titleY + i * heading.lineHeight}
            textAnchor="middle"
            fontFamily={fonts.heading}
            fontSize={heading.fontSize}
            fontWeight="400"
            fontStyle="italic"
            fill={accessibleInk(colors.text, defaultBg, heading.fontSize)}
            dominantBaseline="alphabetic"
            />
        ),
      )}

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

      {bodyLayout &&
        bodyLayout.lines.map((line, i) => (
          <text
            key={`body-${i}`}
            data-truncated={bodyLayout.truncated && i === bodyLayout.lines.length - 1 ? "1" : undefined}
            x={CENTER_X}
            y={bodyStartY + i * bodyLayout.lineHeight}
            textAnchor="middle"
            fontFamily={fonts.body}
            fontSize={bodyLayout.fontSize}
            fill={accessibleInk(colors.muted, defaultBg, bodyLayout.fontSize)}
            dominantBaseline="alphabetic"
          >
            {line}
          </text>
        ))}
    </>
  )
}

export const layoutDef = {
  branding: "none",
  // content-pull-quote.tsx: a centered-quote page. Kicker (section
  // name) + a small context line carrying heading and subheading + the
  // authored quote in italic + accent attribution + one muted paragraph.
  // Page decor and branding posture belong to the menu entry. The whole page
  // is intentionally sparse.
  id: "pull-quote",
  kind: "standard",
  story: {
    name: "Attributed Voice",
    story: "Large italic centred text carries the words, with the heading set small above it as context. Lead with a quotation and the speaker prints beneath it, lead with a paragraph and the heading itself becomes the quote.",
    positioning: "Serves quote at exactly one block, in one of two modes: a quotation that prints its speaker, or a heading quote with a paragraph of background beneath it. It draws one mode or the other, never both.",
    audience: "A presentation where the exact words matter and the speaker deserves a byline.",
    notFor: "A bare sentence with no source or speaker, which reads better as Verse.",
  },
  slideTypes: ["content"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "body", accepts: ["paragraph", "blockquote"], capacity: 1 },
    { name: "meta", accepts: [] },
  ],
  // Unchanged since the registry capture, and it already suits the quote:
  // 920px over four lines at 40pt holds a forty-character CJK quote in two
  // lines and an English one in three or four, which is what the corpus
  // actually authors.
  headingFit: {
    maxWidth: HEADING_MAX_W,
    fontSize: 40,
    maxLines: 4,
    minPt: 22,
    bold: false,
    lineHeightRatio: 1.32,
  },
} satisfies LayoutDefinition
