import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { SvgContent } from "../render/svg-content"
import { stepAside } from "../render/step-aside"
import { compose, type CompositionId } from "./compositions"
import { MEMO_BODY_TOP, MEMO_HEAD_FIT, MemoHead, MemoSource, MemoStandfirst, exhibitNumberAt, fitMemoSource, fitMemoStandfirst, memoBodyRect } from "./memo-shared"

/*
 * memo-sheet: memo's ordinary content page, drawn to its 2026-10 board. One
 * frame on every content page (the section's label in the margin, the claim
 * over a rule of ink, `MemoHead`, and the 12px source at the foot; the
 * running head and the folio are the motif's), and between them the body:
 * one of the shared compositions in the memo setting (`MEMO_COMPOSITIONS`)
 * when the content has a shape the board drew, or the ordinary component
 * renderer in the same band. A page the band cannot hold steps aside.
 *
 * Photographs are pasted in as exhibits, numbered across the deck: the face
 * counts the pictures on the pages before this one and hands the
 * compositions the first number (`exhibitNumberAt`).
 */

/** The compositions a memo sheet offers its body, in the memo setting. */
const MEMO_COMPOSITIONS: readonly CompositionId[] = [
  // A body beside an exhibit hands the body back to the others.
  "annex",
  "catalog",
  "rota",
  "records",
  "rows",
  "tallies",
  "slopes",
  "diverging",
  "citation",
  "scales",
  "sum",
  "schedule",
  "checks",
]

export function MemoSheetContent({ ir, slide, index, ctx }: SvgTemplateProps) {
  const source = fitMemoSource(slide, ctx)
  const standfirst = fitMemoStandfirst(slide, ctx)
  const rect = memoBodyRect(MEMO_BODY_TOP + (standfirst?.h ?? 0))
  const composed = compose({ components: slide.components, ctx, rect, setting: "memo", exhibitNumber: exhibitNumberAt(ir, index) }, MEMO_COMPOSITIONS)
  if (!composed) {
    const aside = stepAside({ face: "memo-sheet", slide, ctx, bodyRect: rect })
    if (aside) return aside
  }
  return (
    <>
      <MemoHead slide={slide} ctx={ctx} />
      <MemoStandfirst standfirst={standfirst} ctx={ctx} />
      {composed ?? <SvgContent components={slide.components} rect={rect} ctx={ctx} />}
      <MemoSource source={source} ctx={ctx} />
    </>
  )
}

export const layoutDef = {
  // Clauses, reasons beside an exhibit, a slope chart, bars that diverge, a
  // quoted original, a weighing, options under their photographs, a rota, a
  // sum, a calendar and a checklist: one face, several pages, so several kinds
  // may share it.
  dispatch: "content",
  id: "memo-sheet",
  kind: "standard",
  story: {
    name: "Memo Sheet",
    story:
      "Each page carries its section in the margin and its point in a serif over a rule of ink, then sets its evidence the way a typed memo does: numbered clauses, open tables, figures in typewriter type, photographs pasted in as exhibits.",
    positioning:
      "Serves points, lists, comparisons, processes, data, photos, quotes, facts, evidence and hierarchies in one document grammar. Choose it for a decision written down to be read later, where every page should look like part of the same memo.",
    audience: "Staff and managers reading a decision on their own, who want the reasons, the evidence and the rules in one place.",
    notFor: "A single statement set large, which has a page of its own.",
  },
  slideTypes: ["content"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "rule", accepts: [] },
    { name: "body", accepts: "any", capacity: 4 },
  ],
  pageFields: ["kicker"],
  // `schedule` sets a full-body gantt over the dates it runs to.
  fullBodyCompanions: ["timeline"],
  headingFit: MEMO_HEAD_FIT,
} satisfies LayoutDefinition
