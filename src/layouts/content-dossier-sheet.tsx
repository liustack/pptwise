import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { SvgContent } from "../render/svg-content"
import { stepAside } from "../render/step-aside"
import { compose, type CompositionId } from "./compositions"
import {
  DOSSIER_BODY_TOP,
  DOSSIER_HEAD_FIT,
  DOSSIER_TAG_BAND,
  DossierHead,
  DossierSource,
  DossierStandfirst,
  DossierTag,
  dossierBodyRect,
  fitDossierSource,
  fitDossierStandfirst,
} from "./dossier-shared"

/*
 * dossier-sheet: clinic's ordinary content page, drawn to its 2026-10 board.
 * One frame on every content page (the section's label beside the motif's
 * heartbeat, the claim over a hairline with a bar of the mark, `DossierHead`,
 * and the 12px source at the foot; the deck's subject and the folio are the
 * motif's), and between them the body: one of the shared compositions in the
 * dossier setting (`DOSSIER_COMPOSITIONS`) when the content has a shape the
 * board drew, or the ordinary component renderer in the same band. A page the
 * band cannot hold steps aside.
 *
 * A page's tag (`tag`, the evidence the whole page rests on) is a capsule at
 * the body's top left. The compositions drawn with one keep their left column
 * under it (`tagBand`); any other body starts under it.
 */

/** The compositions a dossier sheet offers its body, in the dossier setting. */
const DOSSIER_COMPOSITIONS: readonly CompositionId[] = [
  // A body beside a photograph hands the body back to the others.
  "inset",
  "watch",
  "rows",
  "readings",
  "docket",
  "controlled",
  "duel",
  "forest",
  "multiples",
  "fork",
  "lanes",
  "ruler",
  "dumbbells",
  "table",
  "cards",
  "gate",
]

export function DossierSheetContent({ slide, ctx }: SvgTemplateProps) {
  const source = fitDossierSource(slide, ctx)
  const standfirst = fitDossierStandfirst(slide, ctx)
  const top = DOSSIER_BODY_TOP + (standfirst?.h ?? 0)
  const tagBand = slide.tag ? DOSSIER_TAG_BAND : 0
  const rect = dossierBodyRect(top)
  let composed = compose({ components: slide.components, ctx, rect, setting: "dossier", section: slide.kicker, tagBand }, DOSSIER_COMPOSITIONS)
  // With a tag no composition takes, the body starts under it.
  const below = dossierBodyRect(top + tagBand)
  if (!composed && tagBand > 0) composed = compose({ components: slide.components, ctx, rect: below, setting: "dossier", section: slide.kicker }, DOSSIER_COMPOSITIONS)
  const bodyRect = tagBand > 0 ? below : rect
  if (!composed) {
    const aside = stepAside({ face: "dossier-sheet", slide, ctx, bodyRect })
    if (aside) return aside
  }
  return (
    <>
      <DossierHead slide={slide} ctx={ctx} />
      <DossierStandfirst standfirst={standfirst} ctx={ctx} />
      <DossierTag slide={slide} ctx={ctx} top={top} />
      {composed ?? <SvgContent components={slide.components} rect={bodyRect} ctx={ctx} />}
      <DossierSource source={source} ctx={ctx} />
    </>
  )
}

export const layoutDef = {
  // Proposals, figures over a share bar, cases beside a photograph, trials
  // against their controls, a head-to-head, a forest plot, rates against
  // controls, a trajectory that forks, approvals on two lanes, thresholds on a
  // scale, costs as dumbbells, options with their proposals, rules on cards,
  // a gated review and a monitoring plan: one face, several pages, so several
  // kinds may share it.
  dispatch: "content",
  id: "dossier-sheet",
  kind: "standard",
  story: {
    name: "Dossier Sheet",
    story:
      "Each page sets its section beside a short heartbeat and its point bold over a hairline, then lays out the evidence as an assessment file does: figures on rounded cards, each source named in a capsule, controls drawn in outline.",
    positioning:
      "Serves every content kind in one assessment grammar. Choose it for a submission a committee decides on, where every figure should say where it comes from and every page should read as part of one file.",
    audience: "A committee or a reviewer weighing evidence before a decision, who wants each figure's source in plain view.",
    notFor: "A single statement or a quotation set large, which want a stage rather than a file.",
  },
  slideTypes: ["content"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "rule", accepts: [] },
    { name: "body", accepts: "any", capacity: 4 },
  ],
  pageFields: ["kicker", "tag"],
  headingFit: DOSSIER_HEAD_FIT,
} satisfies LayoutDefinition
