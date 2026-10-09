import type React from "react"
import type { Slide } from "@/ir"
import type { ComponentCtx } from "../components/types"
import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import type { ContentRect } from "../render/layout"
import type { PageRenderContext } from "../render/page-context"
import { SvgContent } from "../render/svg-content"
import { stepAside } from "../render/step-aside"
import { footnoteBaselineFor } from "../render/branding-geometry"
import { accessibleInk } from "../render/ink"
import { fitEmphasisText, headingEmphasisPaint, renderEmphasisHeading } from "../render/emphasis"
import { compose, type CompositionId } from "./compositions"
import { centredBaseline } from "./compositions/type"
import {
  NOTICE_BODY_BOTTOM,
  NOTICE_BODY_BOTTOM_WITH_SOURCE,
  NOTICE_BODY_TOP,
  NOTICE_HEAD_FIT,
  NOTICE_LEFT,
  NOTICE_RIGHT,
  NOTICE_SOURCE_BASELINE,
  NoticeHead,
  NoticeSource,
  fitNoticeSource,
  type NoticeSourceLayout,
} from "./notice-shared"

/*
 * notice-sheet: bulletin's ordinary content page, drawn to its 2026-10 board.
 * One frame on every content page (the black bold claim over a hairline with
 * a short primary bar, `NoticeHead`, and the 14px source at the foot), and
 * between them the body: one of the shared compositions in the notice
 * setting (`NOTICE_COMPOSITIONS`) when the content has a shape the board
 * drew, or the ordinary component renderer in the same band. A page the band
 * cannot hold steps aside.
 */

/** The compositions a notice sheet offers its body, in the notice setting. */
const NOTICE_COMPOSITIONS: readonly CompositionId[] = [
  "rows",
  "table",
  "records",
  // Before rail: a share bar over figures runs the page's width, not rail's plot.
  "share",
  "rail",
  "columns",
  "bars",
  "bridge",
  "stack",
  "window",
  "lanes",
]

/** The subheading, when a page carries one: muted lines under the rule, the body below them. */
const STANDFIRST = { size: 18, box: 26, maxLines: 2, gap: 16 }

export interface NoticeSheet {
  standfirst: React.ReactElement | null
  rect: ContentRect
  source: NoticeSourceLayout | null
  composed: React.ReactElement | null
}

/** The source's last baseline: the board's, or above the footer rule when the page carries a footer row. */
export function sourceBaseline(page: PageRenderContext | undefined): number {
  return page?.footerRow ? footnoteBaselineFor(14) : NOTICE_SOURCE_BASELINE
}

/**
 * The page's subheading as the frame's standfirst, set at `place` on its
 * measure: the sheet's body top, or the column beside a photograph
 * (`render/image-pages.tsx`). `h` is how far it moves the body down.
 */
export function noticeStandfirst(text: string | undefined, ctx: ComponentCtx, place: { x: number; w: number; top: number }): { node: React.ReactElement; h: number } | null {
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
    <g data-notice-standfirst="">
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
/**
 * The page's source line and the body band under the notice head, before any
 * standfirst: x80 to x1200 from y196 down to the source line, the footer row
 * or the foot clearance.
 */
export function noticeBand(slide: Pick<Slide, "footnote">, ctx: ComponentCtx, page?: PageRenderContext): { source: NoticeSourceLayout | null; rect: ContentRect } {
  const source = fitNoticeSource(slide.footnote, ctx, NOTICE_RIGHT - NOTICE_LEFT, sourceBaseline(page))
  const floor = page?.footerRow ? footnoteBaselineFor(14) - 26 : source ? NOTICE_BODY_BOTTOM_WITH_SOURCE : NOTICE_BODY_BOTTOM
  const bottom = source ? Math.min(floor, source.top - 12) : floor
  return { source, rect: { x: NOTICE_LEFT, y: NOTICE_BODY_TOP, w: NOTICE_RIGHT - NOTICE_LEFT, h: bottom - NOTICE_BODY_TOP } }
}

export function composeNotice(slide: Slide, ctx: ComponentCtx, page?: PageRenderContext): NoticeSheet {
  const { source, rect: band } = noticeBand(slide, ctx, page)
  const bottom = band.y + band.h
  let top = NOTICE_BODY_TOP
  const standfirstBlock = noticeStandfirst(slide.subheading, ctx, { x: NOTICE_LEFT, w: NOTICE_RIGHT - NOTICE_LEFT, top })
  const standfirst = standfirstBlock?.node ?? null
  if (standfirstBlock) top += standfirstBlock.h
  const rect = { x: NOTICE_LEFT, y: top, w: NOTICE_RIGHT - NOTICE_LEFT, h: bottom - top }
  const composed = compose({ components: slide.components, ctx, rect, setting: "notice" }, NOTICE_COMPOSITIONS)
  return { standfirst, rect, source, composed }
}

/**
 * The notice sheet's page: the sheet itself, or a face of bulletin's that
 * hands a page its own composition cannot hold to the sheet
 * (`notice-statement`, `notice-figure`, `notice-exhibit`). A page the sheet
 * cannot hold either steps aside the way the calling face says (`aside`, the
 * face's own `stepAside` call, so the step-aside names that face).
 */
export function noticeSheetPage({ slide, ctx, page }: Pick<SvgTemplateProps, "slide" | "ctx" | "page">, aside: (bodyRect: ContentRect) => React.ReactElement | null) {
  const sheet = composeNotice(slide, ctx, page)
  if (!sheet.composed) {
    const stepped = aside(sheet.rect)
    if (stepped) return stepped
  }
  return (
    <>
      <NoticeHead heading={slide.heading} ctx={ctx} />
      {sheet.standfirst}
      {sheet.composed ?? <SvgContent components={slide.components} rect={sheet.rect} ctx={ctx} />}
      <NoticeSource source={sheet.source} ctx={ctx} />
    </>
  )
}

export function NoticeSheetContent(props: SvgTemplateProps) {
  const { slide, ctx } = props
  return noticeSheetPage(props, (bodyRect) => stepAside({ face: "notice-sheet", slide, ctx, bodyRect }))
}

export const layoutDef = {
  // Lists, tables, charts beside their figures, a calendar window and a
  // two-lane timeline: one face, several pages, so several kinds may share it.
  dispatch: "content",
  id: "notice-sheet",
  kind: "standard",
  story: {
    name: "Notice Sheet",
    story: "A black bold claim on a grey hairline with one short bar of the brand colour, the evidence beneath it, and the source in small type at the foot. The brand colour is spent once a page, on whatever the author marked.",
    positioning: "Serves points, lists, comparisons, processes, data and team pages in one announcement grammar. Choose it when every page after the cover should read as the same notice, with one thing on each page set apart.",
    audience: "A whole organization reading what changes and why, one claim at a time.",
    notFor: "A photograph with its facts, which belongs on the photo page beside it.",
  },
  slideTypes: ["content"],
  slots: [
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "rule", accepts: [] },
    { name: "body", accepts: "any", capacity: 4 },
  ],
  headingFit: NOTICE_HEAD_FIT,
  // A waterfall or a gantt sets its figures beside it on this face.
  fullBodyCompanions: ["kpi_cards"],
} satisfies LayoutDefinition
