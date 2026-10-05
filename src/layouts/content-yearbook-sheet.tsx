import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { SvgContent } from "../render/svg-content"
import { stepAside } from "../render/step-aside"
import { compose, type CompositionId } from "./compositions"
import { paintPill, PILL, pillText, pillWidth, yearbookInks } from "./compositions/yearbook"
import {
  YEARBOOK_BODY_TOP,
  YEARBOOK_HEAD_FIT,
  YEARBOOK_LEFT,
  YEARBOOK_W,
  YearbookHead,
  YearbookSource,
  YearbookStandfirst,
  fitYearbookSource,
  fitYearbookStandfirst,
  yearbookBodyRect,
} from "./yearbook-shared"

/*
 * yearbook-sheet: almanac's ordinary content page, drawn to its 2026-10
 * board. One frame on every content page (the section's label beside the
 * motif's sprout, the strip of years at the top right, the claim over a
 * hairline, `YearbookHead`, and the 12px source at the foot; the folio is
 * the motif's), and between them the body: one of the shared compositions in
 * the yearbook setting (`YEARBOOK_COMPOSITIONS`) when the content has a shape
 * the board drew, or the ordinary component renderer in the same band. A page
 * the band cannot hold steps aside.
 *
 * A page's tag (`tag`, the law the page rests on) is a pill the compositions
 * that take it set where the board did, under the figures it governs. On any
 * other page the face sets it at the body's top left and the body under it.
 */

/** The compositions a yearbook sheet offers its body, in the yearbook setting. */
const YEARBOOK_COMPOSITIONS: readonly CompositionId[] = [
  "motion",
  "calendar",
  "horizon",
  "formula",
  "errata",
  "breakdown",
  "benchmark",
  "paired",
  "procedure",
  "magnitude",
  "segments",
  "survey",
  "outlook",
  "phases",
]

/** The band a page's tag takes at the body's top when no composition sets it. */
const TAG_BAND = 40

export function YearbookSheetContent({ slide, ctx }: SvgTemplateProps) {
  const source = fitYearbookSource(slide, ctx)
  const standfirst = fitYearbookStandfirst(slide, ctx)
  const top = YEARBOOK_BODY_TOP + (standfirst?.h ?? 0)
  const rect = yearbookBodyRect(top)
  let composed = compose({ components: slide.components, ctx, rect, setting: "yearbook", section: slide.kicker, pageTag: slide.tag }, YEARBOOK_COMPOSITIONS)
  // With a tag no composition sets, the face sets it and the body starts under it.
  const tagged = !composed && slide.tag !== undefined
  const below = tagged ? yearbookBodyRect(top + TAG_BAND) : rect
  if (!composed && tagged) composed = compose({ components: slide.components, ctx, rect: below, setting: "yearbook", section: slide.kicker }, YEARBOOK_COMPOSITIONS)
  if (!composed) {
    const aside = stepAside({ face: "yearbook-sheet", slide, ctx, bodyRect: below })
    if (aside) return aside
  }
  const inks = yearbookInks(ctx)
  const tagFits = !tagged || pillWidth(pillText(slide.tag!), ctx) <= YEARBOOK_W
  return (
    <>
      <YearbookHead slide={slide} ctx={ctx} />
      <YearbookStandfirst standfirst={standfirst} ctx={ctx} />
      {tagged ? (
        tagFits ? (
          <g data-yearbook-page-tag="">{paintPill({ ctx, tag: slide.tag!, x: YEARBOOK_LEFT, y: top + (TAG_BAND - PILL.height) / 2 - 6, ground: inks.ground, inks })}</g>
        ) : (
          <g data-dropped={1} data-dropped-kind="label" />
        )
      ) : null}
      {composed ?? <SvgContent components={slide.components} rect={below} ctx={ctx} />}
      <YearbookSource source={source} ctx={ctx} />
    </>
  )
}

export const layoutDef = {
  // Background beside a decision, a calendar to scale, long curves over a
  // table of years, a bridge beside its formula, a wrong sum beside the right
  // one, a whole cut into amounts, bars against a benchmark, paired columns,
  // a procedure over its table, one figure set huge, a whole cut in two,
  // routes under their photographs, rules on a year axis and phases with
  // their budget lines: one face, several pages, so several kinds may share it.
  dispatch: "content",
  id: "yearbook-sheet",
  kind: "standard",
  story: {
    name: "Yearbook Sheet",
    story:
      "Each page names its section beside a sprout, lights its years on a strip of the whole run and sets its point bold over a hairline, then keeps the account: figures on flat cards, sums in mono, a pill on every figure not yet settled.",
    positioning:
      "Serves every content kind in one long-term grammar. Choose it for a report a board decides on over several years, where every figure should say how firm it is and every page where it falls in the run.",
    audience: "A board or a committee weighing a decision whose costs and rules run for a decade, who wants the law told apart from a scenario.",
    notFor: "A single statement set large, which wants a stage rather than an account.",
  },
  slideTypes: ["content"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "rule", accepts: [] },
    { name: "body", accepts: "any", capacity: 4 },
  ],
  pageFields: ["kicker", "tag", "years"],
  // The bridge beside its formula: a waterfall with the formula's lines and
  // its parameters.
  fullBodyCompanions: ["code", "bullets"],
  headingFit: YEARBOOK_HEAD_FIT,
} satisfies LayoutDefinition
