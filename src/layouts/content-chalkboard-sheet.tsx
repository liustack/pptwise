import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { SvgContent } from "../render/svg-content"
import { stepAside } from "../render/step-aside"
import { compose, type CompositionId } from "./compositions"
import { ChalkStamp, STAMP_TOP_RIGHT, chalkStampWidth, chalkText, chalkboardInks, fitChalk, paintChalk } from "./compositions/chalkboard"
import { CHALKBOARD_HEAD_FIT, ChalkClaim, ChalkSource, ChalkStep, TITLE, chalkClaimIn, chalkSourceIn, chalkboardBandRect, chalkboardBodyRect, fitChalkClaim, fitChalkSource } from "./chalkboard-shared"

/*
 * chalkboard-sheet: lecture's ordinary content page, drawn to its 2026-10
 * board. The wooden frame, the chalk ledge and the period's count are the
 * motif's. The lesson's step at the top left, the title, the body and the
 * source are the face's. The body is one of the shared compositions in the
 * chalkboard setting (`CHALKBOARD_COMPOSITIONS`), which places the title, the
 * source and the example's stamp itself. Or the title over the page, the
 * ordinary component renderer under it, the stamp at the top right and the
 * source at the foot. A page the band cannot hold steps aside.
 */

/** The compositions a chalkboard sheet offers its body, in the chalkboard setting. */
export const CHALKBOARD_COMPOSITIONS: readonly CompositionId[] = [
  "agenda",
  "confluence",
  "braces",
  "boughs",
  "factors",
  "subtractions",
  "flashcards",
  "risers",
  "givens",
  "derivation",
  "cascade",
  "exercises",
  "solutions",
  "pitfalls",
  "strikeout",
  "chronology",
]

/** The subheading, when a content page carries one: lines in the chalk grey under the title. None of the board's pages carried one. */
const STANDFIRST = { size: 16, lineHeight: 26, maxLines: 2, gap: 8 } as const

export function ChalkboardSheetContent({ slide, ctx }: SvgTemplateProps) {
  const step = slide.kicker?.trim() ? <ChalkStep ctx={ctx} text={slide.kicker} /> : null
  const stepDropped = slide.kicker?.trim() && !step ? <g data-dropped={1} data-dropped-kind="label" /> : null
  // The compositions have no place for a subheading: a page with one is set under the title by the ordinary renderer.
  const composed = slide.subheading?.trim()
    ? null
    : compose({ components: slide.components, ctx, rect: chalkboardBandRect(), setting: "chalkboard", claim: chalkClaimIn(slide, ctx), source: chalkSourceIn(slide, ctx), stamp: slide.stamp }, CHALKBOARD_COMPOSITIONS)
  if (composed) {
    return (
      <>
        {step}
        {stepDropped}
        {composed}
      </>
    )
  }
  const stampW = slide.stamp ? chalkStampWidth(slide.stamp.text, ctx) : 0
  let claim = slide.heading?.trim() ? fitChalkClaim(slide.heading, ctx) : null
  // Beside a stamp the title keeps to one line across the measure, or breaks short of the stamp.
  if (claim && stampW > 0 && claim.lines.length > 1) claim = fitChalkClaim(slide.heading, ctx, TITLE.w - stampW - 24)
  const standfirst = slide.subheading?.trim() ? fitChalk(slide.subheading, { width: TITLE.w, size: STANDFIRST.size, lineHeight: STANDFIRST.lineHeight, maxLines: STANDFIRST.maxLines }, ctx) : undefined
  const body = chalkboardBodyRect()
  const shift = standfirst ? standfirst.lines.length * STANDFIRST.lineHeight + STANDFIRST.gap * 2 : 0
  const rect = { ...body, y: body.y + shift, h: body.h - shift }
  const aside = stepAside({ face: "chalkboard-sheet", slide, ctx, bodyRect: rect })
  if (aside) return aside
  const inks = chalkboardInks(ctx)
  return (
    <>
      {step}
      {stepDropped}
      {claim ? (
        <g data-truncated={claim.truncated ? "1" : undefined}>
          <ChalkClaim ctx={ctx} layout={claim} column={{ x: TITLE.x, w: TITLE.w, foot: TITLE.foot }} />
        </g>
      ) : null}
      {slide.stamp && !slide.stamp.date?.trim() ? <ChalkStamp ctx={ctx} text={slide.stamp.text} x={STAMP_TOP_RIGHT.x} y={STAMP_TOP_RIGHT.y} anchor="end" /> : null}
      {slide.stamp?.date?.trim() ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {standfirst ? (
        <g data-chalk-standfirst="">{paintChalk(standfirst, { ctx, x: TITLE.x, top: body.y, fill: chalkText(inks.muted, inks.ground, STANDFIRST.size) })}</g>
      ) : slide.subheading?.trim() ? (
        <g data-dropped={1} data-dropped-kind="label" />
      ) : null}
      <SvgContent components={slide.components} rect={rect} ctx={ctx} />
      <ChalkSource source={fitChalkSource(slide, ctx)} ctx={ctx} />
    </>
  )
}

export const layoutDef = {
  // What tonight covers, two paths meeting, a formula with braces, a
  // decision tree, factors, what is taken off, cards, a staircase of rates,
  // an example's givens, a derivation, a bridge, exercises, answers,
  // pitfalls, figures with one struck out and a timeline to scale: one face,
  // several pages, so several kinds may share it.
  dispatch: "content",
  id: "chalkboard-sheet",
  kind: "standard",
  story: {
    name: "Chalkboard Sheet",
    story:
      "Each page is the board at a night class: a green board in a wooden frame with chalk on its ledge, the lesson's step in the corner, the working in chalk white, and one stroke of yellow chalk under the thing to remember.",
    positioning:
      "Serves every content kind it is offered in one grammar. Choose it for an evening class, a course or a training session that teaches one thing a page and works it through on the spot: a formula, a worked example, exercises and their answers.",
    audience: "Adults after work in a classroom, copying down what the teacher writes.",
    notFor: "A pitch, a report to a board, or a class of children, which a night-school blackboard does not suit.",
  },
  slideTypes: ["content"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "body", accepts: "any", capacity: 4 },
  ],
  pageFields: ["kicker", "stamp"],
  headingFit: CHALKBOARD_HEAD_FIT,
  // A bridge of bars closes on the line that says where the difference came from.
  fullBodyCompanions: ["paragraph"],
} satisfies LayoutDefinition
