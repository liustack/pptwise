import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { SvgContent } from "../render/svg-content"
import { stepAside } from "../render/step-aside"
import { compose, type CompositionId } from "./compositions"
import { fitPitchSource, fitPitchStandfirst, PITCH_BODY_TOP, PITCH_HEAD_FIT, PitchHead, PitchSource, PitchStandfirst, pitchBodyRect } from "./pitch-shared"

/*
 * pitch-sheet: ember's ordinary content page, drawn to its 2026-10 board.
 * One frame on every content page (the pitch's running order at the top
 * right with the page's beat lit, the claim bold under it, `PitchHead`, and
 * the 12px source at the foot; the deck's label and the folio are the
 * motif's), and between them the body: one of the shared compositions in the
 * pitch setting (`PITCH_COMPOSITIONS`) when the content has a shape the
 * board drew, or the ordinary component renderer in the same band. A page
 * the band cannot hold steps aside.
 */

/** The compositions a pitch sheet offers its body, in the pitch setting. */
export const PITCH_COMPOSITIONS: readonly CompositionId[] = ["expanse", "stairs", "funnel", "rivals", "equation", "bets", "divide", "locks", "register", "runway", "uses"]

export function PitchSheetContent({ ir, slide, ctx }: SvgTemplateProps) {
  const source = fitPitchSource(slide, ctx)
  const standfirst = fitPitchStandfirst(slide, ctx)
  const rect = pitchBodyRect(PITCH_BODY_TOP + (standfirst?.h ?? 0))
  const composed = compose({ components: slide.components, ctx, rect, setting: "pitch" }, PITCH_COMPOSITIONS)
  if (!composed) {
    const aside = stepAside({ face: "pitch-sheet", slide, ctx, bodyRect: rect })
    if (aside) return aside
  }
  return (
    <>
      <PitchHead ir={ir} slide={slide} ctx={ctx} />
      <PitchStandfirst standfirst={standfirst} ctx={ctx} />
      {composed ?? <SvgContent components={slide.components} rect={rect} ctx={ctx} />}
      <PitchSource source={source} ctx={ctx} />
    </>
  )
}

export const layoutDef = {
  // How small one market is beside another, why now as steps that climb, a
  // plan narrowed to its part, the rivals with what none has said, the wedge
  // worked out as a sum, the bets and when each is proved, two sets of
  // figures that cannot be compared, the gates to pass, the risks, the
  // runway with its gate and the ask with its uses: one face, several pages,
  // so several kinds may share it.
  dispatch: "content",
  id: "pitch-sheet",
  kind: "standard",
  story: {
    name: "Pitch Sheet",
    story:
      "Each page lights its beat on the pitch's running order and states its claim, then makes the case on a dark stage: figures set large, cards a step lighter than the ground, and one thing a page in the single fire colour.",
    positioning:
      "Serves every content kind in one pitching grammar. Choose it for a pitch that runs a set order, from the opening to the ask, where every page should say which beat it is and what it proves.",
    audience: "Investors or early partners hearing a founder out in one sitting.",
    notFor: "A report that has to stay neutral, where a single lit figure a page would read as salesmanship.",
  },
  slideTypes: ["content"],
  slots: [
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "body", accepts: "any", capacity: 4 },
  ],
  pageFields: ["stage"],
  headingFit: PITCH_HEAD_FIT,
} satisfies LayoutDefinition
