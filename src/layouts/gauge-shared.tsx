import type { PptxIR, Slide } from "@/ir"
import type { ComponentCtx } from "../components/types"
import type { ContentRect } from "../render/layout"
import { accessibleInk, metaInk } from "../render/ink"
import { fitSvgLine } from "../lib/svg-text-layout"
import { footnoteBaselineFor } from "../render/branding-geometry"
import { footerOrganization, showsDocumentMeta } from "../render/document-meta"
import type { PageRenderContext } from "../render/page-context"
import {
  fitEmphasisHeading,
  fitEmphasisLine,
  headingEmphasisPaint,
  renderEmphasisHeading,
  renderEmphasisText,
  type EmphasisHeadingLayout,
} from "../render/emphasis"

const META_X = 1184
const META_FIRST_Y = 100
const META_SECOND_Y = 122
const META_SIZE = 14
const META_MAX_W = 440

/** 定稿在 brief 藏青底上给的次级墨色。它是**起点**不是终点：
 *  `metaInk` 会先看它压当前底色够不够 3:1，不够就朝可读墨走最小的一步。
 *  烤死这个 hex 会在别家更浅的 primary 上跌到 2.90:1，contrast-system.md
 *  正是为此规定次级文字必须推导。 */
export const GAUGE_DARK_META = "#B7BBC4"

export function withoutOverflowMark(text: string): string {
  return text.replace(/(?:\u2026|\.{3})$/u, "")
}

/**
 * gauge 五页共用的右上两行 meta。第一行机构，第二行版本与日期。
 *
 * 这两行是 deck 的页眉信息，不是版式自带的字（2026-10-02 页脚裁决：默认不印
 * 机构名、日期，版式不能自己开口子）：机构名只在 deck 的页脚要印机构名时出现
 * （`footer.organization`，或旧式 `branding: "full"`），版本与日期和封面日期
 * 同一个开关（`showsDocumentMeta`）。
 */
export function GaugeMeta({
  ir,
  ctx,
  tone,
  page,
}: {
  ir: PptxIR
  ctx: ComponentCtx
  tone: "light" | "dark"
  page?: PageRenderContext
}) {
  const firstSource = footerOrganization(page, ir) ?? ""
  const secondSource = showsDocumentMeta(page, ir)
    ? [ir.meta.version?.trim(), ir.meta.date?.trim()].filter(Boolean).join(" · ")
    : ""
  const first = firstSource
    ? fitSvgLine(firstSource, {
        maxWidth: META_MAX_W,
        fontSize: META_SIZE,
        minFontSize: META_SIZE,
        fontFamily: ctx.fonts.body,
      })
    : null
  const second = secondSource
    ? fitSvgLine(secondSource, {
        maxWidth: META_MAX_W,
        fontSize: META_SIZE,
        minFontSize: META_SIZE,
        fontFamily: ctx.fonts.body,
      })
    : null
  const bg = ctx.defaultBg ?? ctx.colors.bg
  const fill =
    tone === "dark" ? metaInk(GAUGE_DARK_META, ctx.colors.primary) : metaInk(ctx.colors.muted, bg)

  return (
    <>
      {first && (
        <text
          data-contrast-tier="meta"
          data-font-floor-exempt="gauge-spec"
          data-truncated={first.truncated ? "1" : undefined}
          x={META_X}
          y={META_FIRST_Y}
          textAnchor="end"
          fontFamily={ctx.fonts.body}
          fontSize={first.fontSize}
          fill={fill}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(first.text)}
        </text>
      )}
      {second && (
        <text
          data-contrast-tier="meta"
          data-font-floor-exempt="gauge-spec"
          data-truncated={second.truncated ? "1" : undefined}
          x={META_X}
          y={META_SECOND_Y}
          textAnchor="end"
          fontFamily={ctx.fonts.body}
          fontSize={second.fontSize}
          fill={fill}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(second.text)}
        </text>
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Content-page frame: the heading band over its rule, and the source line.
//
// Every brief content page sets its claim the same way: a 36px regular-weight
// heading in primary, at most two lines, sitting on a 1px primary rule at
// y172 that runs the width of the type area (x96 to x1184). The heading is
// bottom-aligned to that rule, so a one-line claim and a two-line claim both
// end in the same place and the body below always starts at the same y.
// The source line (`slide.footnote`) closes the body at 16px muted, on the
// baseline the shared footer geometry gives a footnote of that size.
//
// The footer rule and its organization / confidentiality row are not here:
// the theme's motif paints them on every content page, so a face that used
// these two helpers and drew its own footer would draw it twice.
// ─────────────────────────────────────────────────────────────────────────

/** Left edge of the brief type area. */
export const GAUGE_LEFT = 96
/** Right edge of the brief type area. */
export const GAUGE_RIGHT = 1184
/** The rule the heading sits on. */
export const GAUGE_HEAD_RULE_Y = 172
/**
 * Baseline of the heading's last line. Read off the approved board, where a
 * 36/46 line box ends at y160: Georgia's descent puts the baseline ten
 * pixels above that, which leaves the descenders clear of the rule.
 */
export const GAUGE_HEAD_LAST_BASELINE = 150
/** Top of the body band under the heading rule. */
export const GAUGE_BODY_TOP = 200
/** Lowest y body ink may reach on a page with no source line. */
export const GAUGE_BODY_BOTTOM = 648
/** Lowest y body ink may reach when the source line is drawn under it. */
export const GAUGE_BODY_BOTTOM_WITH_SOURCE = 612

const HEAD_SIZE = 36
const HEAD_LINE_HEIGHT = 46
const SOURCE_SIZE = 16

/**
 * The heading fit `GaugeHead` runs, in the shape `LayoutDefinition.headingFit`
 * takes. A face built on `GaugeHead` spreads this into its own `headingFit`
 * so the declared contract and the painted heading cannot drift apart.
 * Regular weight (`bold: false`): the board sets every brief heading at 400.
 */
export const GAUGE_HEAD_FIT = {
  maxWidth: 1000,
  fontSize: HEAD_SIZE,
  maxLines: 2,
  minPt: 28,
  bold: false,
  lineHeightRatio: HEAD_LINE_HEIGHT / HEAD_SIZE,
} as const

/**
 * Fits a brief content heading. `**marked**` runs survive the fit and come
 * back as per-line segments, so `GaugeHead` can lay the theme's pad under
 * them. Exposed for a face that needs to know the fitted size or line count
 * before it lays out the body; most faces just mount `GaugeHead`.
 */
export function fitGaugeHead(heading: string | undefined, ctx: ComponentCtx): EmphasisHeadingLayout {
  return fitEmphasisHeading(heading, { ...GAUGE_HEAD_FIT, fontFamily: ctx.fonts.heading })
}

/**
 * The heading band of a brief content page: the claim in primary at 36px
 * regular, up to two lines bottom-aligned on the y172 rule, plus the rule
 * itself. A heading too long for two lines shrinks toward 28px and is then
 * cut with `data-truncated` on its last line, so validate and the audit both
 * see the loss.
 *
 * Draws the rule even when the heading is empty, because the rule is the
 * page's frame, not the heading's underline.
 */
export function GaugeHead({ heading, ctx }: { heading: string | undefined; ctx: ComponentCtx }) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const title = fitGaugeHead(heading, ctx)
  const ink = accessibleInk(colors.primary, bg, title.fontSize)
  const firstBaseline = GAUGE_HEAD_LAST_BASELINE - Math.max(0, title.lines.length - 1) * title.lineHeight
  return (
    <>
      {renderEmphasisHeading(
        title,
        headingEmphasisPaint(ctx, title, {
          baseFill: ink,
          fontWeight: "400",
          fontFamily: fonts.heading,
          bold: false,
        }),
        (_line, index) => (
          <text
            key={index}
            data-truncated={title.truncated && index === title.lines.length - 1 ? "1" : undefined}
            x={GAUGE_LEFT}
            y={firstBaseline + index * title.lineHeight}
            fontFamily={fonts.heading}
            fontSize={title.fontSize}
            fontWeight="400"
            fill={ink}
            dominantBaseline="alphabetic"
          />
        ),
      )}
      <line
        x1={GAUGE_LEFT}
        y1={GAUGE_HEAD_RULE_Y}
        x2={GAUGE_RIGHT}
        y2={GAUGE_HEAD_RULE_Y}
        stroke={colors.primary}
        strokeWidth={1}
      />
    </>
  )
}

/**
 * The source line of a brief page: `text` (normally `slide.footnote`) at
 * 16px muted on `footnoteBaselineFor(16)`, one line across the type area.
 * Renders nothing for an empty source. The author's text is set as written,
 * with no "Source:" prefix composed by the face. A source too long for the
 * line is cut and carries `data-truncated`.
 *
 * Body content above it must stop at `GAUGE_BODY_BOTTOM_WITH_SOURCE`.
 */
export function GaugeSource({ text, ctx }: { text: string | undefined; ctx: ComponentCtx }) {
  const { colors, fonts } = ctx
  const source = fitEmphasisLine(text?.trim(), {
    maxWidth: GAUGE_RIGHT - GAUGE_LEFT,
    fontSize: SOURCE_SIZE,
    minFontSize: SOURCE_SIZE,
    fontFamily: fonts.body,
    bold: false,
  })
  if (!source) return null
  const bg = ctx.defaultBg ?? colors.bg
  const ink = accessibleInk(colors.muted, bg, source.fontSize)
  return renderEmphasisText(
    source.segments,
    headingEmphasisPaint(ctx, source, { baseFill: ink, fontWeight: "400", fontFamily: fonts.body, bold: false }),
    <text
      data-truncated={source.truncated ? "1" : undefined}
      x={GAUGE_LEFT}
      y={footnoteBaselineFor(source.fontSize)}
      fontFamily={fonts.body}
      fontSize={source.fontSize}
      fill={ink}
      dominantBaseline="alphabetic"
    />,
  )
}

/**
 * The body band a brief content page hands its components: the full type
 * width, from under the heading rule down to the source line when the page
 * has one, or to the footer clearance when it does not.
 */
export function gaugeBodyRect(slide: Pick<Slide, "footnote">): ContentRect {
  const bottom = slide.footnote?.trim() ? GAUGE_BODY_BOTTOM_WITH_SOURCE : GAUGE_BODY_BOTTOM
  return { x: GAUGE_LEFT, y: GAUGE_BODY_TOP, w: GAUGE_RIGHT - GAUGE_LEFT, h: bottom - GAUGE_BODY_TOP }
}
