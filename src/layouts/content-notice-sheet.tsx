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
function sourceBaseline(page: PageRenderContext | undefined): number {
  return page?.footerRow ? footnoteBaselineFor(14) : NOTICE_SOURCE_BASELINE
}

/** Frames the page and asks the compositions whether one of them takes its body. */
export function composeNotice(slide: Slide, ctx: ComponentCtx, page?: PageRenderContext): NoticeSheet {
  const source = fitNoticeSource(slide.footnote, ctx, NOTICE_RIGHT - NOTICE_LEFT, sourceBaseline(page))
  const floor = page?.footerRow ? footnoteBaselineFor(14) - 26 : source ? NOTICE_BODY_BOTTOM_WITH_SOURCE : NOTICE_BODY_BOTTOM
  const bottom = source ? Math.min(floor, source.top - 12) : floor
  let top = NOTICE_BODY_TOP
  let standfirst: React.ReactElement | null = null
  const sub = slide.subheading?.trim()
  if (sub) {
    const { colors, fonts } = ctx
    const bg = ctx.defaultBg ?? colors.bg
    const layout = fitEmphasisText(sub, {
      maxWidth: NOTICE_RIGHT - NOTICE_LEFT,
      fontSize: STANDFIRST.size,
      minPt: STANDFIRST.size,
      maxLines: STANDFIRST.maxLines,
      lineHeightRatio: STANDFIRST.box / STANDFIRST.size,
      fontFamily: fonts.body,
      bold: false,
    })
    const ink = accessibleInk(colors.muted, bg, layout.fontSize)
    const first = centredBaseline(top, STANDFIRST.box, STANDFIRST.size)
    standfirst = (
      <g data-notice-standfirst="">
        {renderEmphasisHeading(
          layout,
          headingEmphasisPaint(ctx, layout, { baseFill: ink, fontWeight: "700", fontFamily: fonts.body, bold: false }),
          (_line, index) => (
            <text
              key={index}
              data-truncated={layout.truncated && index === layout.lines.length - 1 ? "1" : undefined}
              x={NOTICE_LEFT}
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
    top += layout.lines.length * STANDFIRST.box + STANDFIRST.gap
  }
  const rect = { x: NOTICE_LEFT, y: top, w: NOTICE_RIGHT - NOTICE_LEFT, h: bottom - top }
  const composed = compose({ components: slide.components, ctx, rect, setting: "notice" }, NOTICE_COMPOSITIONS)
  return { standfirst, rect, source, composed }
}

export function NoticeSheetContent({ slide, ctx, page }: SvgTemplateProps) {
  const sheet = composeNotice(slide, ctx, page)
  if (!sheet.composed) {
    const aside = stepAside({ face: "notice-sheet", slide, ctx, bodyRect: sheet.rect })
    if (aside) return aside
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
