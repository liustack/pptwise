import { Children, isValidElement, type ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import type React from "react"
import type { Component, Slide } from "@/ir"
import type { ComponentCtx } from "../components/types"
import { CANVAS_W_PX } from "../constants"
import type { Arrangement, ContentRect } from "./layout"
import { SvgContent } from "./svg-content"
import {
  fitEmphasisHeading,
  fitEmphasisLine,
  fitEmphasisText,
  headingEmphasisPaint,
  renderEmphasisHeading,
  renderEmphasisText,
  type EmphasisHeadingLayout,
} from "./emphasis"
import { scaleTypePx } from "./heading-fit"
import { accessibleInk } from "./ink"
import { footnoteBaselineFor } from "./branding-geometry"
import { cutsHardField } from "./cut-fields"
import { parseSvgRoot } from "./serialize"
import { stripEmphasis } from "./emphasis"
import { fitSvgLine, measureTextUnits } from "../lib/svg-text-layout"
import { ORDINARY_TAG_HEIGHT, ordinaryTagSpec, paintTag, tagInks, tagWidth } from "../components/tag"
import type { LayoutDefinition } from "../layouts/registry"

/**
 * The step-aside a content face owes content its own composition cannot hold.
 *
 * AGENTS.md gives a face two legal postures toward what an author wrote:
 * render it completely, or decline the page. A third shape kept appearing
 * anyway. The face draws its chrome, hands the body slot less room than the
 * component needs, and the component declines inside an otherwise finished
 * page. The reader gets a heading over an empty rectangle and the export
 * refuses the deck. Nobody chose that page; it fell out of a heading
 * wrapping onto a second line.
 *
 * So a face that cannot hold what it was given steps aside, and this is the
 * rendering that takes over: the page's own heading and subheading, set
 * modestly, over a body that owns the rest of the sheet. It keeps nothing of
 * the face's composition. A narrow magazine column, a poster band, a bento
 * grid are all constructions that cost room, and room is the one thing the
 * page is short of.
 *
 * The page's own fields go with it or the page does not
 * ({@link SHEET_DRAWS_PAGE_FIELD}). The sheet sets a kicker over the heading
 * in its source line's type, and a page tag beside it as every renderer sets
 * a tag (`components/tag.tsx`). A stamp, a ballot, a strip of years, a
 * course stage and a form's header lines are each a face's own construction,
 * with nothing shared to draw them in, so a page that carries one keeps its
 * face and whatever that face could not hold stays declared.
 *
 * Theme identity does not go with it. `FullSlideSvg` reads
 * {@link treeStepsAside} off the body it just built and resolves the page's
 * motif and branding again without the face's own suppressions, because
 * those were declarations about a composition that is no longer on the page
 * (`resolvePageRenderContext`). A face passes its ordinary `ctx` here, not a
 * neutralised one, so the theme's accent survives too.
 *
 * The root carries `data-face-mode="fallback"` and `data-face-stepped-aside`
 * names the face that stood down. Neither is a bookkeeping mark in the sense
 * AGENTS.md forbids: nothing is painted, and nothing is lost — the point of
 * the step-aside is that the whole component gets drawn.
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
const TITLE_MIN_PX = 22
const TITLE_WEIGHT = "600"
const SUB_PX = 18
const SUB_MAX_LINES = 2
const FOOTNOTE_PX = 16
const FOOTNOTE_LINE_RATIO = 1.45
/** A source takes two lines before it is cut, as under every claim (`layouts/source-lines.tsx`). */
const FOOTNOTE_MAX_LINES = 2
/** Air between the heading block and the subheading, and before the body. */
const TITLE_TO_SUB = 8
const SUB_TO_BODY = 6
const HEAD_TO_BODY = 26
/** The kicker: the source line's type, muted, on the row the tag takes. */
const KICKER_PX = FOOTNOTE_PX
/** Air between the kicker and the tag beside it, and under their row before the heading. */
const EYEBROW_GAP = 12
const EYEBROW_TO_TITLE = 8

const CONTENT_W = CANVAS_W_PX - MARGIN_X * 2

/** The page fields a face may declare a place for (`LayoutDefinition.pageFields`), less the source line every content page has. */
type FacePageField = Exclude<NonNullable<LayoutDefinition["pageFields"]>[number], "footnote">

/**
 * Which of those fields the sheet draws: the one answer both ways into the
 * sheet read (`stepAside`, `stepAsideForCut`). Keyed by every field, so a
 * field a face learns to draw has to be answered here before it compiles.
 */
export const SHEET_DRAWS_PAGE_FIELD: Readonly<Record<FacePageField, boolean>> = {
  kicker: true,
  tag: true,
  fields: false,
  stamp: false,
  ballot: false,
  years: false,
  stage: false,
}

/**
 * Whether the sheet can draw every field the page carries: none it has no
 * place for, and a tag it can print whole on its row, as a tag always is.
 */
export function sheetDrawsPageFields(slide: Slide, ctx: ComponentCtx): boolean {
  const page = slide as unknown as Record<string, unknown>
  for (const [field, drawn] of Object.entries(SHEET_DRAWS_PAGE_FIELD)) if (!drawn && page[field] !== undefined) return false
  return slide.tag === undefined || tagWidth(slide.tag.text, ordinaryTagSpec(ctx)) <= CONTENT_W
}

/** A `data-dropped` count that is actually a loss. Zero is never emitted. */
const DROPPED = /data-dropped="[1-9]/

/**
 * Whether drawing `components` into `rect` costs the page content.
 *
 * Asked by drawing it. `SvgContent` is the same component the face is about
 * to call, so the probe runs the dispatch the real page will run — the
 * full-body single-component branch that hands one component the whole rect
 * without brief `layoutContentFit`, the arrangement branches, the
 * layout's own gap tiers and drop path — and every component decides for
 * itself, on this box and this instance, whether it can draw.
 *
 * Nothing else was honest enough. Comparing `box.h` against
 * `measureComponent` saw neither the width a cartesian chart refuses below
 * nor the padding a `row_cards` gives up before it drops a card, and a
 * per-type "does this one cut when short" flag was a claim about a type
 * where the question is about an instance in a box. `data-dropped` is the
 * engine's own answer to exactly this question, written by the component
 * that would be doing the losing, and it is what the export gate reads.
 *
 * The cost is one extra render of the body per content page, and a second
 * only on the pages that come up short.
 */
export function bodySlotDropsContent(
  components: readonly Component[],
  rect: ContentRect,
  ctx: ComponentCtx,
  arrangement?: Arrangement,
): boolean {
  if (components.length === 0) return false
  // Inside an `<svg>` root, which is where the real body renders. React
  // resolves tag names against the surrounding namespace, and an SVG subtree
  // probed at the document root logs a casing warning for every
  // `<linearGradient>` a motif or component draws.
  return DROPPED.test(
    renderToStaticMarkup(
      <svg>
        <SvgContent arrangement={arrangement} components={[...components]} rect={rect} ctx={ctx} />
      </svg>,
    ),
  )
}

interface StepAsideGeometry {
  /** The kicker over the heading, unless the page's motif sets it (`ComponentCtx.motifSetsKicker`). */
  kicker: ReturnType<typeof fitSvgLine> | null
  /** The page tag on the kicker's row, after the kicker when there is one. */
  tag: { x: number; width: number } | null
  /** Top of the row the kicker and the tag share. */
  eyebrowTop: number
  title: ReturnType<typeof fitEmphasisHeading>
  sub: ReturnType<typeof fitEmphasisText>
  footnote: ReturnType<typeof fitEmphasisLine>
  /** The footnote on two lines, when one could not hold it. */
  footnoteLines: EmphasisHeadingLayout | null
  titleY: number
  subY: number
  rect: ContentRect
}

/**
 * Where the step-aside sheet puts its heading, subheading and body.
 *
 * Every fit here is a geometry twin of the paint below it: same font family,
 * same weight, same size. A fit measured against the wrong metrics is not a
 * smaller kind of correct — it reports `truncated: false` for a line that
 * runs off the canvas, which is the one failure the fit exists to prevent.
 *
 * Exported for the trigger: whether stepping aside is worth doing is a
 * question about the body rect this returns, so the decision and the drawing
 * read the same numbers.
 */
export function stepAsideGeometry(slide: Slide, ctx: ComponentCtx): StepAsideGeometry {
  const { fonts } = ctx
  // The kicker and the tag share one row over the heading, the tag's height,
  // the kicker's words on the tag's centre line. The tag is printed whole
  // (`sheetDrawsPageFields`), and the kicker takes what the row has left.
  const tagW = slide.tag ? tagWidth(slide.tag.text, ordinaryTagSpec(ctx)) : 0
  const kickerWords = ctx.motifSetsKicker ? "" : stripEmphasis(slide.kicker ?? "").trim()
  const kicker = kickerWords
    ? fitSvgLine(kickerWords, {
        maxWidth: CONTENT_W - (tagW > 0 ? tagW + EYEBROW_GAP : 0),
        fontSize: KICKER_PX,
        minFontSize: KICKER_PX,
        fontFamily: fonts.body,
        bold: false,
      })
    : null
  const kickerW = kicker ? Math.ceil(measureTextUnits(kicker.text, { bold: false, fontFamily: fonts.body }) * kicker.fontSize) : 0
  const tag = slide.tag ? { x: MARGIN_X + (kicker ? kickerW + EYEBROW_GAP : 0), width: tagW } : null
  const eyebrowTop = HEAD_TOP
  const title = fitEmphasisHeading(slide.heading, {
    maxWidth: CONTENT_W,
    fontSize: scaleTypePx(TITLE_PX, ctx.shape?.typeScale),
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PX,
    lineHeightRatio: 1.2,
    fontFamily: fonts.heading,
    bold: true,
  })
  const sub = fitEmphasisText(slide.subheading, {
    maxWidth: Math.min(CONTENT_W, 900),
    fontSize: SUB_PX,
    maxLines: SUB_MAX_LINES,
    lineHeightRatio: 1.3,
    fontFamily: fonts.body,
    bold: false,
  })
  let cursor = kicker || tag ? eyebrowTop + ORDINARY_TAG_HEIGHT + EYEBROW_TO_TITLE : HEAD_TOP
  const titleY = cursor + title.lineHeight - 10
  cursor += title.lines.length * title.lineHeight + TITLE_TO_SUB
  const subY = cursor + sub.lineHeight - 8
  if (sub.lines.length > 0) cursor += sub.lines.length * sub.lineHeight + SUB_TO_BODY
  const bodyTop = cursor + HEAD_TO_BODY
  const line = fitEmphasisLine(slide.footnote, {
    maxWidth: CONTENT_W,
    fontSize: FOOTNOTE_PX,
    minFontSize: FOOTNOTE_PX,
    fontFamily: fonts.body,
    bold: false,
  })
  // A source too long for one line takes a second, rising from the
  // footnote baseline, and only past two is it cut, as under every claim
  // (`layouts/source-lines.tsx`).
  const wrapped = line?.truncated
    ? fitEmphasisText(slide.footnote, {
        maxWidth: CONTENT_W,
        fontSize: FOOTNOTE_PX,
        minPt: FOOTNOTE_PX,
        maxLines: FOOTNOTE_MAX_LINES,
        lineHeightRatio: FOOTNOTE_LINE_RATIO,
        fontFamily: fonts.body,
        bold: false,
      })
    : null
  const footnote = wrapped ? null : line
  const bottom = wrapped
    ? BODY_BOTTOM_WITH_FOOTNOTE - (wrapped.lines.length - 1) * wrapped.lineHeight
    : footnote
      ? BODY_BOTTOM_WITH_FOOTNOTE
      : BODY_BOTTOM
  return {
    kicker,
    tag,
    eyebrowTop,
    title,
    sub,
    footnote,
    footnoteLines: wrapped,
    titleY,
    subY,
    rect: { x: MARGIN_X, y: bodyTop, w: CONTENT_W, h: Math.max(80, bottom - bodyTop) },
  }
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
   * into regions (`asymmetric-triptych`) has to probe once per region, and
   * passing the verdict is honest where passing one of the three rects would
   * not be. Exactly one of `bodyRect` and `cramped`.
   */
  cramped?: boolean
}

/**
 * The step-aside rendering, or `null` when the face should draw its own page.
 *
 * Null on both sides of the question. A body slot that loses nothing needs no
 * help. A body slot that loses something, on a page the *full* sheet would
 * lose something on too, gets none: stepping aside there would trade a
 * face's composition for a plain one and still end in a declared drop, so
 * the face keeps its page and the component's own decline stands. A page
 * carrying a field the sheet has no place for ({@link sheetDrawsPageFields})
 * is one the sheet would lose something on. The step-aside never ships a
 * loss of its own, which is what lets a face call it without checking.
 */
export function stepAside(props: StepAsideProps): React.ReactElement | null {
  const { face, slide, ctx, bodyRect, arrangement, cramped } = props
  const short =
    cramped ?? (bodyRect !== undefined && bodySlotDropsContent(slide.components, bodyRect, ctx, arrangement))
  if (!short) return null
  if (!sheetDrawsPageFields(slide, ctx)) return null
  const geometry = stepAsideGeometry(slide, ctx)
  if (bodySlotDropsContent(slide.components, geometry.rect, ctx)) return null
  // Called, not mounted. `FullSlideSvg` reads {@link treeStepsAside} off the
  // tree a face hands back, and a `<StepAsidePage/>` element keeps its markup
  // (the marker included) inside an unrendered component — the same reason
  // `FullSlideSvg` calls a face's own component rather than mounting it.
  return StepAsidePage({ face, slide, ctx, geometry })
}

/**
 * The step-aside for a face that cut one of the page's hard fields
 * (`../ir/truncation-tiers.ts`), or `null` when the sheet cannot take the
 * page: the page carries a field the sheet has no place for
 * ({@link sheetDrawsPageFields}, the same answer {@link stepAside} reads),
 * which stepping aside would drop outright, or the sheet would lose content
 * of its own or cut a hard field too. Asked by drawing the sheet once, the
 * way {@link bodySlotDropsContent} asks. `FullSlideSvg` draws it when
 * `slideToSvgMarkup` (`./render-slide.tsx`) found the face's cut.
 */
export function stepAsideForCut(props: { face: string; slide: Slide; ctx: ComponentCtx }): React.ReactElement | null {
  const { face, slide, ctx } = props
  if (!sheetDrawsPageFields(slide, ctx)) return null
  const sheet = StepAsidePage({ face, slide, ctx, geometry: stepAsideGeometry(slide, ctx) })
  const markup = renderToStaticMarkup(<svg>{sheet}</svg>)
  if (DROPPED.test(markup)) return null
  if (markup.includes('data-truncated="1"') && cutsHardField(parseSvgRoot(markup), slide)) return null
  return sheet
}

/** The attribute `FullSlideSvg` reads to know a face handed its page over. */
export const STEP_ASIDE_ATTR = "data-face-mode"

/**
 * Whether a face's rendered body is the step-aside rather than the face's own
 * composition.
 *
 * Read off the element tree rather than the markup because `FullSlideSvg`
 * has the tree in hand and needs the answer before it decides the page's
 * motif and branding. A face may wrap the step-aside in furniture that costs
 * the body nothing (`tone-adaptive-content` keeps the white plate its ink
 * needs to be legible over a background image), so the search is a walk, not
 * a look at the root.
 */
export function treeStepsAside(node: ReactNode): boolean {
  if (Array.isArray(node)) return node.some(treeStepsAside)
  if (!isValidElement(node)) return false
  const props = node.props as Record<string, unknown> & { children?: ReactNode }
  if (props[STEP_ASIDE_ATTR] === "fallback") return true
  let found = false
  Children.forEach(props.children, (child) => {
    if (!found && treeStepsAside(child)) found = true
  })
  return found
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
  const { kicker, tag, eyebrowTop, title, sub, titleY, subY, rect, footnote, footnoteLines } = geometry
  const titleFill = accessibleInk(colors.text, bg, title.fontSize)
  const tagSpec = ordinaryTagSpec(ctx)
  // The kicker's words on the row's centre line, where a tag's words sit (`paintTag`).
  const eyebrowBaseline = Math.round(eyebrowTop + ORDINARY_TAG_HEIGHT / 2 + KICKER_PX * 0.385)
  const footnoteSize = footnote?.fontSize ?? footnoteLines?.fontSize
  const footnoteFill = footnoteSize !== undefined ? accessibleInk(colors.muted, bg, footnoteSize) : colors.muted
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
      {kicker && (
        <text
          data-truncated={kicker.truncated ? "1" : undefined}
          x={MARGIN_X}
          y={eyebrowBaseline}
          fontSize={kicker.fontSize}
          fontFamily={fonts.body}
          fill={accessibleInk(colors.muted, bg, kicker.fontSize)}
          dominantBaseline="alphabetic"
        >
          {kicker.text}
        </text>
      )}
      {tag && slide.tag && paintTag({ tag: slide.tag, x: tag.x, y: eyebrowTop, spec: tagSpec, width: tag.width, inks: tagInks(ctx, slide.tag, false, bg, tagSpec.size) })}
      {renderEmphasisHeading(
        title,
        headingEmphasisPaint(ctx, title, {
          baseFill: titleFill,
          fontWeight: TITLE_WEIGHT,
          fontFamily: fonts.heading,
        }),
        (_line, i) => (
          <text
            key={i}
            data-truncated={title.truncated && i === title.lines.length - 1 ? "1" : undefined}
            x={MARGIN_X}
            y={titleY + i * title.lineHeight}
            fontSize={title.fontSize}
            fontWeight={TITLE_WEIGHT}
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
      {footnote &&
        renderEmphasisText(
          footnote.segments,
          {
            accent: colors.accent,
            padFill: colors.accent,
            baseFill: footnoteFill,
            fontWeight: "700",
            emphasis: ctx.emphasis,
          },
          <text
            data-truncated={footnote.truncated ? "1" : undefined}
            x={MARGIN_X}
            y={footnoteBaselineFor(footnote.fontSize)}
            fontFamily={fonts.body}
            fontSize={footnote.fontSize}
            fill={footnoteFill}
            dominantBaseline="alphabetic"
          />,
        )}
      {footnoteLines &&
        renderEmphasisHeading(
          footnoteLines,
          { accent: colors.accent, padFill: colors.accent, baseFill: footnoteFill, fontWeight: "700", emphasis: ctx.emphasis },
          (_line, i) => (
            <text
              key={i}
              data-truncated={footnoteLines.truncated && i === footnoteLines.lines.length - 1 ? "1" : undefined}
              x={MARGIN_X}
              y={footnoteBaselineFor(footnoteLines.fontSize) - (footnoteLines.lines.length - 1 - i) * footnoteLines.lineHeight}
              fontFamily={fonts.body}
              fontSize={footnoteLines.fontSize}
              fill={footnoteFill}
              dominantBaseline="alphabetic"
            />
          ),
        )}
    </g>
  )
}
