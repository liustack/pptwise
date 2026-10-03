import type React from "react"
import type { Slide } from "@/ir"
import type { ComponentCtx } from "../components/types"
import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import type { ContentRect } from "../render/layout"
import type { PageRenderContext } from "../render/page-context"
import { SvgContent } from "../render/svg-content"
import { stepAside } from "../render/step-aside"
import { compose, type CompositionId } from "./compositions"
import { PANEL_HEAD_FIT, PanelHead, PanelSource, PanelStandfirst, fitPanelSource, fitPanelStandfirst, panelBodyRect, type PanelSourceLayout } from "./panel-shared"

/*
 * panel-sheet: ledger's ordinary content page, drawn to its 2026-10 board.
 * One frame on every content page (the claim in the heading face across the
 * whole measure, `PanelHead`, and the 13px source at the foot), and between
 * them the body: one of the shared compositions in the panel setting
 * (`PANEL_COMPOSITIONS`) when the content has a shape the board drew, every
 * one of them set in dark panels with a title bar, or the ordinary component
 * renderer in the same band. A page the band cannot hold steps aside.
 */

/** The compositions a panel sheet offers its body, in the panel setting. */
const PANEL_COMPOSITIONS: readonly CompositionId[] = [
  "records",
  "table",
  // Before the lone charts: a chart beside the author's figures.
  "rail",
  "figures",
  "lanes",
  "columns",
  "bars",
]

export interface PanelSheet {
  standfirst: React.ReactElement | null
  rect: ContentRect
  source: PanelSourceLayout | null
  composed: React.ReactElement | null
}

/** Frames the page and asks the compositions whether one of them takes its body. */
export function composePanel(slide: Slide, ctx: ComponentCtx, page?: PageRenderContext): PanelSheet {
  const source = fitPanelSource(slide, ctx, page)
  const standfirst = fitPanelStandfirst(slide.subheading, ctx)
  const rect = panelBodyRect(source, page, standfirst?.bodyTop)
  const composed = compose({ components: slide.components, ctx, rect, setting: "panel" }, PANEL_COMPOSITIONS)
  return { standfirst: standfirst ? <PanelStandfirst layout={standfirst} ctx={ctx} /> : null, rect, source, composed }
}

export function PanelSheetContent({ slide, ctx, page }: SvgTemplateProps) {
  const sheet = composePanel(slide, ctx, page)
  if (!sheet.composed) {
    const aside = stepAside({ face: "panel-sheet", slide, ctx, bodyRect: sheet.rect })
    if (aside) return aside
  }
  return (
    <>
      <PanelHead heading={slide.heading} ctx={ctx} />
      {sheet.standfirst}
      {sheet.composed ?? <SvgContent components={slide.components} rect={sheet.rect} ctx={ctx} />}
      <PanelSource source={sheet.source} ctx={ctx} />
    </>
  )
}

export const layoutDef = {
  // Numbered panels, a table, options, a timeline, figures beside a chart:
  // one face, several pages, so several kinds may share it.
  dispatch: "content",
  id: "panel-sheet",
  kind: "standard",
  story: {
    name: "Panel Sheet",
    story: "The claim runs across the page in a serif, and the evidence sits in dark panels under it, each named in a small title bar with its unit on the right. One thing is in the signal colour, and green and red only say which way a number moved.",
    positioning: "Serves points, lists, comparisons, processes, data, evidence and team pages in one terminal grammar. Choose it when every page after the cover should read as the same market screen, with the figures framed and the argument stated over them.",
    audience: "A committee that allocates money and reads every panel for the number it will be held to.",
    notFor: "A single figure or a photograph, which have pages of their own.",
  },
  slideTypes: ["content"],
  slots: [
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "body", accepts: "any", capacity: 4 },
  ],
  headingFit: PANEL_HEAD_FIT,
} satisfies LayoutDefinition
