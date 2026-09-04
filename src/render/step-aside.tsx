import type React from "react"
import type { Slide } from "@/ir"
import type { Component } from "@/ir"
import type { ComponentCtx } from "../components/types"
import { measureComponent } from "../components"
import { CANVAS_W_PX } from "../constants"
import { layoutContentFit, type Arrangement, type ContentRect } from "./layout"
import { CUTS_CONTENT_WHEN_SHORT_TYPES } from "./component-traits"
import { SvgContent } from "./svg-content"
import { fitEmphasisText, headingEmphasisPaint, renderEmphasisHeading } from "./emphasis"
import { fitSvgLine } from "../lib/svg-text-layout"
import { scaleTypePx } from "./heading-fit"
import { accessibleInk } from "./ink"
import { footnoteBaselineFor } from "./branding-geometry"

/**
 * The step-aside a content face owes content its own composition cannot hold.
 *
 * AGENTS.md gives a face two legal postures toward what an author wrote:
 * render it completely, or decline the page. A third shape kept appearing
 * anyway — the face draws its chrome, hands the body slot less height than
 * the component measured for itself, and the component declines inside an
 * otherwise finished page. The reader gets a heading over an empty rectangle
 * and the export refuses the deck. Nobody chose that page; it fell out of a
 * heading wrapping onto a second line.
 *
 * So a face that cannot hold what it was given steps aside, and this is the
 * rendering that takes over: the page's own heading and subheading, set
 * modestly, over a body that owns the rest of the sheet. It keeps nothing of
 * the face's composition — a narrow magazine column, a poster band, a bento
 * grid are all constructions that cost height, and height is the one thing
 * the page is short of. Identity survives elsewhere: background, motif and
 * page branding are painted by `FullSlideSvg` around the face, so a
 * stepped-aside page still reads as its theme.
 *
 * The root carries `data-face-mode="fallback"` and `data-face-stepped-aside`
 * names the face that stood down, so a sweep can tell a designed page from a
 * degraded one without reading pixels. Neither is a bookkeeping mark in the
 * sense AGENTS.md forbids: nothing is painted, and nothing is lost — the
 * point of the step-aside is that the whole component gets drawn.
 *
 * This is not the takeover fallback in `image-pages.tsx`. That one answers a
 * different question (a single-picture frame handed something other than one
 * picture) and its bytes are pinned by the gallery hashes. The compositions
 * are cousins on purpose: past either guard the page is no longer a
 * composition of any kind, it is "draw everything, honestly".
 */

/** Left and right page margin of the step-aside sheet. */
const MARGIN_X = 88
/** Baseline of the hairline the heading hangs under. */
const RULE_Y = 76
/** Top of the heading block. */
const HEAD_TOP = 96
/** Body floor without a footnote, and with one. */
const BODY_BOTTOM = 648
const BODY_BOTTOM_WITH_FOOTNOTE = 612
const TITLE_PX = 34
const TITLE_MAX_LINES = 2
const SUB_PX = 18
const SUB_MAX_LINES = 2
const FOOTNOTE_PX = 16
/** Air between the heading block and the subheading, and before the body. */
const TITLE_TO_SUB = 8
const SUB_TO_BODY = 6
const HEAD_TO_BODY = 26

const CONTENT_W = CANVAS_W_PX - MARGIN_X * 2

interface StepAsideGeometry {
  title: ReturnType<typeof fitEmphasisText>
  sub: ReturnType<typeof fitEmphasisText>
  titleY: number
  subY: number
  rect: ContentRect
  footnote: ReturnType<typeof fitSvgLine> | null
}

/**
 * Where the step-aside sheet puts its heading, subheading and body.
 *
 * Exported for the trigger: whether stepping aside is worth doing is a
 * question about the body rect this returns, so the decision and the drawing
 * read the same numbers.
 */
export function stepAsideGeometry(slide: Slide, ctx: ComponentCtx): StepAsideGeometry {
  const title = fitEmphasisText(slide.heading, {
    maxWidth: CONTENT_W,
    fontSize: scaleTypePx(TITLE_PX, ctx.shape?.typeScale),
    maxLines: TITLE_MAX_LINES,
    lineHeightRatio: 1.2,
  })
  const sub = fitEmphasisText(slide.subheading, {
    maxWidth: Math.min(CONTENT_W, 900),
    fontSize: SUB_PX,
    maxLines: SUB_MAX_LINES,
    lineHeightRatio: 1.3,
  })
  let cursor = HEAD_TOP
  const titleY = cursor + title.lineHeight - 10
  cursor += title.lines.length * title.lineHeight + TITLE_TO_SUB
  const subY = cursor + sub.lineHeight - 8
  if (sub.lines.length > 0) cursor += sub.lines.length * sub.lineHeight + SUB_TO_BODY
  const bodyTop = cursor + HEAD_TO_BODY
  const footnote = slide.footnote
    ? fitSvgLine(slide.footnote, { maxWidth: CONTENT_W, fontSize: FOOTNOTE_PX, minFontSize: FOOTNOTE_PX })
    : null
  const bottom = footnote ? BODY_BOTTOM_WITH_FOOTNOTE : BODY_BOTTOM
  return {
    title,
    sub,
    titleY,
    subY,
    footnote,
    rect: { x: MARGIN_X, y: bodyTop, w: CONTENT_W, h: Math.max(80, bottom - bodyTop) },
  }
}

/**
 * Whether laying `components` into `rect` costs one of them content.
 *
 * Two shapes count, and they are the same defect seen from either end. The
 * layout can refuse to place a block at all (`dropped`), and it can place
 * one with a `box.h` below the height it measured for itself — the one path
 * in `layoutContentFit` that hands out a budget rather than a box.
 *
 * The second shape only counts for a component that answers a short budget
 * by cutting its content or declining outright
 * (`CUTS_CONTENT_WHEN_SHORT_TYPES`). The third legal answer is to ignore
 * `box.h` and draw at natural size, and a component that gives it has lost
 * nothing: a `waterfall` or a `numbered_cards` in a short band is still the
 * whole component, on a page the geometry gate already proves the ink stays
 * inside. Reading "short" as "cannot hold it" cost 37 gallery pages their
 * face for no gain at all — none of the 37 was losing anything.
 *
 * `measureComponent` is the same call the density gate and every face's own
 * capacity arithmetic make, so "the minimum a caller owes this component"
 * means one thing across the engine.
 *
 * A single full-body component never reaches `layoutContentFit` —
 * `SvgContent` hands it the whole rect and it fills that itself — so it is
 * outside this question, and a short rect there is answered by the
 * component's own declaration if it ever does cost anything. The
 * `big_number` and `assertion_evidence` arrangements are not mirrored
 * because no content face passes them: they are internal words `SvgContent`
 * reaches through other callers, and IR v5 has no `arrangement` field for an
 * author to set.
 */
export function bodySlotUnderAllocates(
  components: readonly Component[],
  rect: ContentRect,
  ctx: ComponentCtx,
  arrangement?: Arrangement,
): boolean {
  if (components.length === 0) return false
  const { placed, dropped } = layoutContentFit(arrangement, [...components], rect, ctx)
  if (dropped > 0) return true
  return placed.some(
    (p) =>
      p.box.h !== undefined &&
      CUTS_CONTENT_WHEN_SHORT_TYPES.has(p.component.type) &&
      p.box.h + 0.5 < measureComponent(p.component, p.box.w, ctx),
  )
}

export interface StepAsideProps {
  face: string
  slide: Slide
  ctx: ComponentCtx
  /** The body rect the face was about to hand `SvgContent`. */
  bodyRect?: ContentRect
  /** The arrangement the face was about to pass, if any. */
  arrangement?: Arrangement
  /**
   * The answer, when the face already has it. A face that splits its body
   * into regions (`asymmetric-triptych`) has to ask `bodySlotUnderAllocates`
   * once per region, and passing the verdict is honest where passing one of
   * the three rects would not be. Exactly one of `bodyRect` and `cramped`.
   */
  cramped?: boolean
}

/**
 * The step-aside rendering, or `null` when the face should draw its own page.
 *
 * Null on both sides of the question. A body slot that holds everything needs
 * no help. A body slot that does not, on a page the *full* sheet cannot hold
 * either, gets none: stepping aside there would trade a face's composition
 * for a plain one and still end in the same declared drop, so the face keeps
 * its page and the component's own decline stands. The step-aside never
 * under-allocates, which is what lets a face call it without checking.
 */
export function stepAside(props: StepAsideProps): React.ReactElement | null {
  const { face, slide, ctx, bodyRect, arrangement, cramped } = props
  const short =
    cramped ?? (bodyRect !== undefined && bodySlotUnderAllocates(slide.components, bodyRect, ctx, arrangement))
  if (!short) return null
  const geometry = stepAsideGeometry(slide, ctx)
  if (bodySlotUnderAllocates(slide.components, geometry.rect, ctx)) return null
  return <StepAsidePage face={face} slide={slide} ctx={ctx} geometry={geometry} />
}

function StepAsidePage({
  face,
  slide,
  ctx,
  geometry,
}: {
  face: string
  slide: Slide
  ctx: ComponentCtx
  geometry: StepAsideGeometry
}) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const { title, sub, titleY, subY, rect, footnote } = geometry
  const titleFill = accessibleInk(colors.text, bg, title.fontSize)
  return (
    <g data-face-mode="fallback" data-face-stepped-aside={face}>
      <line
        x1={MARGIN_X}
        y1={RULE_Y}
        x2={CANVAS_W_PX - MARGIN_X}
        y2={RULE_Y}
        stroke={colors.border ?? colors.muted}
        strokeWidth="1.2"
      />
      {renderEmphasisHeading(
        title,
        headingEmphasisPaint(ctx, title, {
          baseFill: titleFill,
          fontWeight: "600",
          fontFamily: fonts.heading,
        }),
        (_line, i) => (
          <text
            key={i}
            data-truncated={title.truncated && i === title.lines.length - 1 ? "1" : undefined}
            x={MARGIN_X}
            y={titleY + i * title.lineHeight}
            fontSize={title.fontSize}
            fontWeight={600}
            fontFamily={fonts.heading}
            fill={titleFill}
            dominantBaseline="alphabetic"
          />
        ),
      )}
      {renderEmphasisHeading(
        sub,
        headingEmphasisPaint(ctx, sub, { baseFill: colors.muted, fontFamily: fonts.body, bold: false }),
        (_line, i) => (
          <text
            key={i}
            data-truncated={sub.truncated && i === sub.lines.length - 1 ? "1" : undefined}
            x={MARGIN_X}
            y={subY + i * sub.lineHeight}
            fontSize={sub.fontSize}
            fontFamily={fonts.body}
            fill={colors.muted}
            dominantBaseline="alphabetic"
          />
        ),
      )}
      <SvgContent components={slide.components} rect={rect} ctx={ctx} />
      {footnote && (
        <text
          data-truncated={footnote.truncated ? "1" : undefined}
          x={MARGIN_X}
          y={footnoteBaselineFor(footnote.fontSize)}
          fontFamily={fonts.body}
          fontSize={footnote.fontSize}
          fill={colors.muted}
          dominantBaseline="alphabetic"
        >
          {footnote.text}
        </text>
      )}
    </g>
  )
}
