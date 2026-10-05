import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { SvgContent } from "../render/svg-content"
import { stepAside } from "../render/step-aside"
import { compose, type CompositionId } from "./compositions"
import { fitMarqueeSource, fitMarqueeStandfirst, MARQUEE_BODY_TOP, MARQUEE_HEAD_FIT, MarqueeHead, MarqueeSource, MarqueeStandfirst, marqueeBodyRect } from "./marquee-shared"

/*
 * marquee-sheet: rally's ordinary content page, drawn to its 2026-10 board.
 * One frame on every content page (the section's ticket stub at the top
 * left, the claim bold under it, `MarqueeHead`, and the 12px source at the
 * foot; the confetti and the folio are the motif's), and between them the
 * body: one of the shared compositions in the marquee setting
 * (`MARQUEE_COMPOSITIONS`) when the content has a shape the board drew, or
 * the ordinary component renderer in the same band. A page the band cannot
 * hold steps aside.
 *
 * A page's ballot (`ballot`, the boxes a decision is ticked in beside each
 * request) is drawn by the asks composition. A page whose ballot no
 * composition draws declares it dropped, so the export refuses it until the
 * page has a shape the asks take.
 */

/** The compositions a marquee sheet offers its body, in the marquee setting. */
export const MARQUEE_COMPOSITIONS: readonly CompositionId[] = [
  "crest",
  "branch",
  "season",
  "makeup",
  "origins",
  "route",
  "spots",
  "wall",
  "loop",
  "stubs",
  "fallbacks",
  "timetable",
  "scoreboard",
  "allotment",
  "asks",
]

export function MarqueeSheetContent({ ir, slide, ctx }: SvgTemplateProps) {
  const source = fitMarqueeSource(slide, ctx)
  const standfirst = fitMarqueeStandfirst(slide, ctx)
  const rect = marqueeBodyRect(source !== null, MARQUEE_BODY_TOP + (standfirst?.h ?? 0))
  const composed = compose({ components: slide.components, ctx, rect, setting: "marquee", ballot: slide.ballot }, MARQUEE_COMPOSITIONS)
  if (!composed) {
    const aside = stepAside({ face: "marquee-sheet", slide, ctx, bodyRect: rect })
    if (aside) return aside
  }
  return (
    <>
      <MarqueeHead ir={ir} slide={slide} ctx={ctx} />
      <MarqueeStandfirst standfirst={standfirst} ctx={ctx} />
      {composed ?? <SvgContent components={slide.components} rect={rect} ctx={ctx} />}
      {!composed && slide.ballot ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      <MarqueeSource source={source} ctx={ctx} />
    </>
  )
}

export const layoutDef = {
  // One big figure over its run of bars, two branches from one start, a
  // year's heat with the season framed, crowds cut by age, where the crowd
  // comes from, a weekend route, touchpoints beside their photographs, a
  // wall of peers' cases, a loop that brings results back, tickets cities
  // honour, a plan B for each risk, a month-by-month schedule, a scoreboard
  // still to be filled, a budget cut into shares and the requests: one face,
  // several pages, so several kinds may share it.
  dispatch: "content",
  id: "marquee-sheet",
  kind: "standard",
  story: {
    name: "Marquee Sheet",
    story:
      "Each page names its section on a ticket stub and states its claim bold across the page, then makes the case under a fistful of confetti: cards a step lighter than the house, charts in the confetti's colours, the lead on one thing.",
    positioning:
      "Serves every content kind in one campaign grammar. Choose it for a marketing or event proposal read section by section, where every page should say which part of the plan it is and what it asks the room to believe.",
    audience: "Managers deciding whether to fund a campaign, event or launch, and the team that will run it.",
    notFor: "A sober report or a board paper, where confetti and a magenta lead would read as salesmanship.",
  },
  slideTypes: ["content"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "body", accepts: "any", capacity: 4 },
  ],
  pageFields: ["kicker", "ballot"],
  headingFit: MARQUEE_HEAD_FIT,
  // The season's heat grid sets its key and note beside it.
  fullBodyCompanions: ["callout"],
} satisfies LayoutDefinition
