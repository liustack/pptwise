import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { SvgContent } from "../render/svg-content"
import { stepAside } from "../render/step-aside"
import { compose, type CompositionId } from "./compositions"
import { BINDER_BODY_TOP, BINDER_HEAD_FIT, BinderHead, BinderSource, BinderStandfirst, binderBodyRect, fitBinderSource, fitBinderStandfirst } from "./binder-shared"

/*
 * binder-sheet: proposal's ordinary content page, drawn to its 2026-10 board.
 * One frame on every content page (the binder's tabs down the right edge
 * with the page's stage lit, the claim bold in petrol, `BinderHead`, and the
 * 12px source at the foot; the deck's label and the folio are the motif's),
 * and between them the body: one of the shared compositions in the binder
 * setting (`BINDER_COMPOSITIONS`) when the content has a shape the board
 * drew, or the ordinary component renderer in the same band. A page the band
 * cannot hold steps aside.
 */

/** The compositions a binder sheet offers its body, in the binder setting. */
export const BINDER_COMPOSITIONS: readonly CompositionId[] = [
  "gains",
  "hours",
  "regions",
  "workings",
  "levers",
  "cycles",
  "drift",
  "parts",
  "plans",
  "precedents",
  "safeguards",
  "remedies",
  "checkpoints",
  "quote",
  "papers",
]

export function BinderSheetContent({ ir, slide, ctx }: SvgTemplateProps) {
  const source = fitBinderSource(slide, ctx)
  const standfirst = fitBinderStandfirst(slide, ctx)
  const rect = binderBodyRect(source !== null, BINDER_BODY_TOP + (standfirst?.h ?? 0))
  const composed = compose({ components: slide.components, ctx, rect, setting: "binder" }, BINDER_COMPOSITIONS)
  if (!composed) {
    const aside = stepAside({ face: "binder-sheet", slide, ctx, bodyRect: rect })
    if (aside) return aside
  }
  return (
    <>
      <BinderHead ir={ir} slide={slide} ctx={ctx} />
      <BinderStandfirst standfirst={standfirst} ctx={ctx} />
      {composed ?? <SvgContent components={slide.components} rect={rect} ctx={ctx} />}
      <BinderSource source={source} ctx={ctx} />
    </>
  )
}

export const layoutDef = {
  // What the client gets, a day's tariff bands, places side by side, the
  // sum worked out, what moves the result, a store's day, what has moved,
  // what the solution is made of, how to pay, public records, what a risk is
  // held to, a risk register, the steps with their papers, the price list and
  // what to hand over: one face, several pages, so several kinds may share it.
  dispatch: "content",
  id: "binder-sheet",
  kind: "standard",
  story: {
    name: "Binder Sheet",
    story:
      "Each page is a leaf of a proposal binder, its section's tab sticking out at the right. The claim stands in petrol at the top, the case on white paper in sand cards and petrol figures, with one brick-red mark on what the page lands on.",
    positioning:
      "Serves every content kind in one proposal grammar. Choose it for a proposal a client's management reads section by section, where every page should say what the client gets, what it costs and what has to be decided.",
    audience: "A client's management weighing a proposal: the owner, the plant manager, the finance lead.",
    notFor: "An internal report or a research paper, where one brick-red mark a page and a client's name in the margins would read as a sales piece.",
  },
  slideTypes: ["content"],
  slots: [
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "body", accepts: "any", capacity: 4 },
  ],
  pageFields: ["stage"],
  headingFit: BINDER_HEAD_FIT,
  // A day's tariff bands set a figure beside each row.
  fullBodyCompanions: ["kpi_cards"],
} satisfies LayoutDefinition
