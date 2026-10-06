import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { SvgContent } from "../render/svg-content"
import { stepAside } from "../render/step-aside"
import { compose, type CompositionId } from "./compositions"
import { manuscriptChinese } from "./compositions/manuscript"
import {
  MANUSCRIPT_BODY_TOP,
  MANUSCRIPT_HEAD_FIT,
  ManuscriptHead,
  ManuscriptNotes,
  ManuscriptStandfirst,
  exhibitLabels,
  fitManuscriptNotes,
  fitManuscriptStandfirst,
  manuscriptBodyRect,
} from "./manuscript-shared"

/*
 * manuscript-sheet: thesis's ordinary content page, drawn to its 2026-10
 * board. One frame on every content page (the section in emerald at the top
 * right, the gold rule, the claim in the heading serif, `ManuscriptHead`,
 * and the numbered notes over the folio; the deck's label and the folio are
 * the motif's), and between them the body: one of the shared compositions in
 * the manuscript setting (`MANUSCRIPT_COMPOSITIONS`) when the content has a
 * shape the board drew, or the ordinary component renderer in the same band.
 * A page the band cannot hold steps aside.
 *
 * Figures and tables are numbered across the deck as a paper numbers them:
 * the face counts the titled charts, timelines, tables, comparisons and grids
 * on the pages before this one, and a captioned photograph on a photo page,
 * and hands the numbers to whatever draws the body (`ctx.exhibitLabels`).
 */

/** The compositions a manuscript sheet offers its body, in the manuscript setting. */
export const MANUSCRIPT_COMPOSITIONS: readonly CompositionId[] = [
  "inquiry",
  "ladder",
  "reach",
  "backdrop",
  "thresholds",
  "tabulation",
  "partition",
  "findings",
  "coverage",
  "propositions",
  "cadence",
  "designs",
  "hazards",
  "itinerary",
  "queries",
]

export function ManuscriptSheetContent({ ir, slide, index, ctx }: SvgTemplateProps) {
  const labels = exhibitLabels(ir, index, manuscriptChinese(ctx, [slide.heading ?? ""]))
  const pageCtx = labels.size > 0 ? { ...ctx, exhibitLabels: labels } : ctx
  const notes = fitManuscriptNotes(slide, ctx)
  const standfirst = fitManuscriptStandfirst(slide, ctx)
  const rect = manuscriptBodyRect(notes, MANUSCRIPT_BODY_TOP + (standfirst?.h ?? 0))
  const composed = compose({ components: slide.components, ctx: pageCtx, rect, setting: "manuscript" }, MANUSCRIPT_COMPOSITIONS)
  if (!composed) {
    const aside = stepAside({ face: "manuscript-sheet", slide, ctx: pageCtx, bodyRect: rect })
    if (aside) return aside
  }
  return (
    <>
      <ManuscriptHead ir={ir} slide={slide} ctx={ctx} />
      <ManuscriptStandfirst standfirst={standfirst} ctx={ctx} />
      {composed ?? <SvgContent components={slide.components} rect={rect} ctx={pageCtx} />}
      <ManuscriptNotes notes={notes} ctx={ctx} />
    </>
  )
}

export const layoutDef = {
  // A question beside its figure, a statutory ladder, a dose against its
  // whole, figures beside a trend, a line with its thresholds, a table of
  // studies, a whole and where it went, studies side by side, a literature
  // map, hypotheses, survey rounds, two designs, threats, a schedule and
  // questions: one face, several pages, so several kinds may share it.
  dispatch: "content",
  id: "manuscript-sheet",
  kind: "standard",
  story: {
    name: "Manuscript Sheet",
    story:
      "Each page is a page of a thesis: a running head naming its section over a gold rule, the claim in a bookish serif, figures and tables numbered across the deck, and every source a numbered footnote the text points to.",
    positioning:
      "Serves every content kind but a statement and a quote in one research grammar. Choose it for a proposal, a defense or a seminar where the reader should be able to check each figure against its source.",
    audience: "A committee or a room of peers reading the evidence for a claim and probing where it comes from.",
    notFor: "A pitch or a campaign, where numbered figures and footnotes would slow a page meant to move.",
  },
  slideTypes: ["content"],
  slots: [
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "body", accepts: "any", capacity: 4 },
  ],
  pageFields: ["stage"],
  headingFit: MANUSCRIPT_HEAD_FIT,
  // A schedule closes on the line it turns on.
  fullBodyCompanions: ["callout"],
} satisfies LayoutDefinition
