import type { Slide } from "@/ir"
import type { ComponentCtx } from "../components/types"
import type { ContentRect } from "../render/layout"
import { accessibleInk } from "../render/ink"
import { centredBaseline as noticeBaseline } from "./compositions/type"
import {
  fitEmphasisHeading,
  fitEmphasisText,
  headingEmphasisPaint,
  renderEmphasisHeading,
  type EmphasisHeadingLayout,
} from "../render/emphasis"

/*
 * The notice frame: the one heading every bulletin content page wears, and
 * the source line under its body. Settled on bulletin's 2026-10 board
 * (`design/rounds/2026-10-03-bulletin/`).
 *
 * The claim is set black and bold at 34px, at most two lines, bottom-aligned
 * in a 100px box so a one-line and a two-line claim end in the same place.
 * Under it a grey hairline runs the width of the type area with a short
 * 96 by 3 bar of primary laid over its left end: the only colour in the
 * frame, so the page's one emphasis below is never competing with it. The
 * small steps in the top right corner are the theme's motif, not this frame.
 *
 * The source line is 14px muted, the size the board gives it, on a fixed
 * baseline near the foot. It is the one text a bulletin page sets under
 * 16px, and carries the `notice-spec` exemption the L1 audit knows.
 */

/** Left edge of the type area. */
export const NOTICE_LEFT = 80
/** Right edge of the type area. */
export const NOTICE_RIGHT = 1200
/** Top of the heading box. */
export const NOTICE_HEAD_TOP = 44
/** Foot of the heading box: the last line box ends here. */
export const NOTICE_HEAD_FOOT = 144
/** The heading's measure, short of the corner the motif's steps sit in. */
export const NOTICE_HEAD_W = 1040
/** The hairline under the heading. */
export const NOTICE_RULE_Y = 163
/** The primary bar laid over the hairline's left end. */
export const NOTICE_BAR_W = 96
export const NOTICE_BAR_H = 3
/** Top of the body band. */
export const NOTICE_BODY_TOP = 196
/** Lowest y body ink may reach when the page has a source line. */
export const NOTICE_BODY_BOTTOM_WITH_SOURCE = 640
/** Lowest y body ink may reach on a page without one. */
export const NOTICE_BODY_BOTTOM = 660
/** Baseline of a one-line source. A second line sits 20px under it. */
export const NOTICE_SOURCE_BASELINE = 666

const HEAD_SIZE = 34
const HEAD_LINE_HEIGHT = 46
const SOURCE_SIZE = 14
const SOURCE_LINE_HEIGHT = 20
const SOURCE_MAX_LINES = 2


/**
 * The heading fit `NoticeHead` runs, in the shape `LayoutDefinition.headingFit`
 * takes, so the declared contract and the painted heading cannot drift.
 */
export const NOTICE_HEAD_FIT = {
  maxWidth: NOTICE_HEAD_W,
  fontSize: HEAD_SIZE,
  maxLines: 2,
  minPt: 28,
  bold: true,
  lineHeightRatio: HEAD_LINE_HEIGHT / HEAD_SIZE,
} as const

/** Where a notice heading sits and how wide it may run. A photo page moves it beside the picture. */
export interface NoticeHeadPlace {
  x: number
  /** The heading's measure. */
  w: number
  /** The hairline's right end. */
  right: number
}

export const NOTICE_HEAD_PLACE: NoticeHeadPlace = { x: NOTICE_LEFT, w: NOTICE_HEAD_W, right: NOTICE_RIGHT }

/** Fits a notice heading. `**marked**` runs survive the fit and paint in the theme's emphasis. */
export function fitNoticeHead(heading: string | undefined, ctx: ComponentCtx, w = NOTICE_HEAD_W): EmphasisHeadingLayout {
  return fitEmphasisHeading(heading, { ...NOTICE_HEAD_FIT, maxWidth: w, fontFamily: ctx.fonts.heading })
}

/**
 * The heading band of a notice page: the claim in the theme's text ink at
 * 34px bold, up to two lines bottom-aligned in its box, the hairline, and the
 * primary bar on its left end. A heading too long for two lines shrinks
 * toward 28px and is then cut with `data-truncated` on its last line.
 *
 * Draws the hairline and the bar even when the heading is empty: they are
 * the page's frame, not the heading's underline.
 */
export function NoticeHead({
  heading,
  ctx,
  place = NOTICE_HEAD_PLACE,
}: {
  heading: string | undefined
  ctx: ComponentCtx
  place?: NoticeHeadPlace
}) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const title = fitNoticeHead(heading, ctx, place.w)
  const ink = accessibleInk(colors.text, bg, title.fontSize)
  const lastTop = NOTICE_HEAD_FOOT - HEAD_LINE_HEIGHT
  const lastBaseline = noticeBaseline(lastTop, HEAD_LINE_HEIGHT, title.fontSize)
  const firstBaseline = lastBaseline - Math.max(0, title.lines.length - 1) * title.lineHeight
  return (
    <g data-notice-head="">
      {renderEmphasisHeading(
        title,
        headingEmphasisPaint(ctx, title, { baseFill: ink, fontWeight: "700", fontFamily: fonts.heading, bold: true }),
        (_line, index) => (
          <text
            key={index}
            data-truncated={title.truncated && index === title.lines.length - 1 ? "1" : undefined}
            x={place.x}
            y={firstBaseline + index * title.lineHeight}
            fontFamily={fonts.heading}
            fontSize={title.fontSize}
            fontWeight="700"
            fill={ink}
            dominantBaseline="alphabetic"
          />
        ),
      )}
      <rect x={place.x} y={NOTICE_RULE_Y} width={place.right - place.x} height={1} fill={colors.border ?? colors.muted} />
      <rect x={place.x} y={NOTICE_RULE_Y - 1} width={NOTICE_BAR_W} height={NOTICE_BAR_H} fill={colors.primary} />
    </g>
  )
}

/** A fitted source line: its painted lines and the y its first line's ink starts at. */
export interface NoticeSourceLayout {
  layout: EmphasisHeadingLayout
  /** Baseline of the first line. */
  firstBaseline: number
  /** Top of the first line's ink, so the body above can keep clear of it. */
  top: number
}

/**
 * The source line set at 14px in up to two lines of `w`, its last line on
 * `lastBaseline`, or `null` for an empty source.
 */
export function fitNoticeSource(
  text: string | undefined,
  ctx: ComponentCtx,
  w = NOTICE_RIGHT - NOTICE_LEFT,
  lastBaseline = NOTICE_SOURCE_BASELINE,
): NoticeSourceLayout | null {
  const source = text?.trim()
  if (!source) return null
  const layout = fitEmphasisText(source, {
    maxWidth: w,
    fontSize: SOURCE_SIZE,
    minPt: SOURCE_SIZE,
    maxLines: SOURCE_MAX_LINES,
    lineHeightRatio: SOURCE_LINE_HEIGHT / SOURCE_SIZE,
    fontFamily: ctx.fonts.body,
    bold: false,
  })
  const firstBaseline = lastBaseline - Math.max(0, layout.lines.length - 1) * SOURCE_LINE_HEIGHT
  return { layout: { ...layout, lineHeight: SOURCE_LINE_HEIGHT }, firstBaseline, top: firstBaseline - SOURCE_SIZE }
}

/**
 * The source line of a notice page: the author's `footnote`, set as written,
 * with no "Source:" composed by the face. A source past two lines at 14px is
 * cut and carries `data-truncated`.
 */
export function NoticeSource({ source, ctx, x = NOTICE_LEFT }: { source: NoticeSourceLayout | null; ctx: ComponentCtx; x?: number }) {
  if (!source) return null
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const ink = accessibleInk(colors.muted, bg, SOURCE_SIZE)
  const { layout } = source
  return (
    <g data-notice-source="">
      {renderEmphasisHeading(
        layout,
        headingEmphasisPaint(ctx, layout, { baseFill: ink, fontWeight: "700", fontFamily: fonts.body, bold: false }),
        (_line, index) => (
          <text
            key={index}
            data-font-floor-exempt="notice-spec"
            data-truncated={layout.truncated && index === layout.lines.length - 1 ? "1" : undefined}
            x={x}
            y={source.firstBaseline + index * SOURCE_LINE_HEIGHT}
            fontFamily={fonts.body}
            fontSize={layout.fontSize}
            fill={ink}
            dominantBaseline="alphabetic"
          />
        ),
      )}
    </g>
  )
}

/** How far the body stops above the source line's ink. */
const SOURCE_CLEARANCE = 12

/**
 * The body band a notice page hands its content: the type area from under
 * the heading rule down to the source line, or to the foot clearance when the
 * page has none.
 */
export function noticeBodyRect(slide: Pick<Slide, "footnote">, ctx: ComponentCtx): ContentRect {
  const source = fitNoticeSource(slide.footnote, ctx)
  const bottom = source ? Math.min(NOTICE_BODY_BOTTOM_WITH_SOURCE, source.top - SOURCE_CLEARANCE) : NOTICE_BODY_BOTTOM
  return { x: NOTICE_LEFT, y: NOTICE_BODY_TOP, w: NOTICE_RIGHT - NOTICE_LEFT, h: bottom - NOTICE_BODY_TOP }
}
