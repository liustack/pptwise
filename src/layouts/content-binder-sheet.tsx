import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { SvgContent } from "../render/svg-content"
import { stepAside } from "../render/step-aside"
import { compose, type CompositionId } from "./compositions"
import { resolveDeckFooter } from "../render/footer-marks"
import { BINDER_BODY_TOP, BINDER_HEAD_FIT, BinderHead, BinderSource, BinderStandfirst, binderBodyRect, binderSourcePlace, fitBinderSource, fitBinderStandfirst } from "./binder-shared"

/*
 * binder-sheet: proposal's ordinary content page, drawn to its 2026-10 print
 * board. One frame on every content page (the running head with the part of
 * the deck the page sits in at its right and a hairline under it, the claim
 * bold in petrol across the measure, `BinderHead`, and the 11px source at
 * the left of the foot; the deck's label and the folio are the motif's), and
 * between them the body: one of the shared compositions in the binder
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

export function BinderSheetContent({ ir, slide, ctx, page, index }: SvgTemplateProps) {
  // The source takes the left of the folio row, short of the marks the motif prints at its right.
  const place = binderSourcePlace({ footer: page?.footer ?? resolveDeckFooter(ir), folio: index + 1, drawn: page ? page.footerRow === "motif" : true }, ctx)
  const source = fitBinderSource(slide, ctx, place.w)
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
      <BinderSource source={source} ctx={ctx} lastBaseline={place.lastBaseline} />
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
  compositions: { setting: "binder", offer: BINDER_COMPOSITIONS },
  kind: "standard",
  story: {
    name: "Binder Sheet",
    story:
      "Each page is a printed leaf of a proposal: a running head naming the part it sits in, the claim in petrol across the page, the case on white paper in ruled tables and petrol figures, with one brick-red mark on what the page lands on.",
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
