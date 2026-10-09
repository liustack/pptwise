import type React from "react"
import type { Slide } from "@/ir"
import type { ComponentCtx } from "../components/types"
import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import type { ContentRect } from "../render/layout"
import type { PageRenderContext } from "../render/page-context"
import { SvgContent } from "../render/svg-content"
import { stepAside } from "../render/step-aside"
import { accessibleInk } from "../render/ink"
import { fitEmphasisText, headingEmphasisPaint, renderEmphasisHeading } from "../render/emphasis"
import { compose, type CompositionId } from "./compositions"
import { centredBaseline } from "./compositions/type"
import type { NoticeSourceLayout } from "./notice-shared"
import { GRID_BODY_TOP, GRID_HEAD_FIT, GRID_LEFT, GRID_W, GridHead, GridSource, fitGridSource, gridBodyRect, gridKicker } from "./grid-shared"

/*
 * grid-sheet: swiss's ordinary content page, drawn to its 2026-10 board.
 * One frame on every content page (the chapter line, the black bold claim
 * over a 2px rule, `GridHead`, and the 14px source at the foot), and
 * between them the body: one of the shared compositions in the grid setting
 * (`GRID_COMPOSITIONS`) when the content has a shape the board drew, or the
 * ordinary component renderer in the same band. A page the band cannot hold
 * steps aside.
 */

/** The compositions a grid sheet offers its body, in the grid setting. */
const GRID_COMPOSITIONS: readonly CompositionId[] = [
  "records",
  // Before rail: a share bar over a chart and its figures runs the page's width.
  "share",
  "rail",
  "columns",
  "bridge",
  "lanes",
]

/** The subheading, when a page carries one: muted lines under the rule, the body below them. */
const STANDFIRST = { size: 18, box: 26, maxLines: 2, gap: 16 }

export interface GridSheet {
  standfirst: React.ReactElement | null
  rect: ContentRect
  source: NoticeSourceLayout | null
  composed: React.ReactElement | null
}

/**
 * The page's subheading as the frame's standfirst, set at `place` on its
 * measure: the sheet's body top, or the column beside a photograph
 * (`render/image-pages.tsx`). `h` is how far it moves the body down.
 */
export function gridStandfirst(text: string | undefined, ctx: ComponentCtx, place: { x: number; w: number; top: number }): { node: React.ReactElement; h: number } | null {
  const sub = text?.trim()
  if (!sub) return null
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const layout = fitEmphasisText(sub, {
    maxWidth: place.w,
    fontSize: STANDFIRST.size,
    minPt: STANDFIRST.size,
    maxLines: STANDFIRST.maxLines,
    lineHeightRatio: STANDFIRST.box / STANDFIRST.size,
    fontFamily: fonts.body,
    bold: false,
  })
  const ink = accessibleInk(colors.muted, bg, layout.fontSize)
  const first = centredBaseline(place.top, STANDFIRST.box, STANDFIRST.size)
  const node = (
    <g data-grid-standfirst="">
      {renderEmphasisHeading(
        layout,
        headingEmphasisPaint(ctx, layout, { baseFill: ink, fontWeight: "700", fontFamily: fonts.body, bold: false }),
        (_line, index) => (
          <text
            key={index}
            data-truncated={layout.truncated && index === layout.lines.length - 1 ? "1" : undefined}
            x={place.x}
            y={first + index * STANDFIRST.box}
            fontFamily={fonts.body}
            fontSize={layout.fontSize}
            fill={ink}
            dominantBaseline="alphabetic"
          />
        ),
      )}
    </g>
  )
  return { node, h: layout.lines.length * STANDFIRST.box + STANDFIRST.gap }
}

/** Frames the page and asks the compositions whether one of them takes its body. */
export function composeGrid(slide: Slide, ctx: ComponentCtx, page?: PageRenderContext): GridSheet {
  const source = fitGridSource(slide, ctx, page)
  let top = GRID_BODY_TOP
  const standfirstBlock = gridStandfirst(slide.subheading, ctx, { x: GRID_LEFT, w: GRID_W, top })
  const standfirst = standfirstBlock?.node ?? null
  if (standfirstBlock) top += standfirstBlock.h
  const rect = gridBodyRect(source, page, top)
  const composed = compose({ components: slide.components, ctx, rect, setting: "grid" }, GRID_COMPOSITIONS)
  return { standfirst, rect, source, composed }
}

export function GridSheetContent({ ir, slide, index, ctx, page }: SvgTemplateProps) {
  const sheet = composeGrid(slide, ctx, page)
  if (!sheet.composed) {
    const aside = stepAside({ face: "grid-sheet", slide, ctx, bodyRect: sheet.rect })
    if (aside) return aside
  }
  return (
    <>
      <GridHead heading={slide.heading} ctx={ctx} kicker={gridKicker(ir, index)} />
      {sheet.standfirst}
      {sheet.composed ?? <SvgContent components={slide.components} rect={sheet.rect} ctx={ctx} />}
      <GridSource source={sheet.source} ctx={ctx} />
    </>
  )
}

export const layoutDef = {
  // Charts beside their figures, a bridge, a share bar, a table and a
  // two-lane timeline: one face, several pages, so several kinds may share it.
  dispatch: "content",
  id: "grid-sheet",
  kind: "standard",
  story: {
    name: "Grid Sheet",
    story: "A small line names the chapter, a black bold claim sits on a heavy black rule across the full measure, and the evidence follows in black with one thing in the signal colour. The source closes the page in small type.",
    positioning: "Serves points, lists, comparisons, processes, data, evidence and team pages in one report grammar. Choose it when every page after the cover should read as the same institutional report, with one figure on each page set apart.",
    audience: "A board or the public reading a report that is accountable for every number.",
    notFor: "A single statement or a single figure, which have pages of their own.",
  },
  slideTypes: ["content"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "rule", accepts: [] },
    { name: "body", accepts: "any", capacity: 4 },
  ],
  headingFit: GRID_HEAD_FIT,
  // A waterfall sets its figures beside it on this face.
  fullBodyCompanions: ["kpi_cards"],
} satisfies LayoutDefinition
