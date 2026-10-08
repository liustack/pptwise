import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { SvgContent } from "../render/svg-content"
import { stepAside } from "../render/step-aside"
import { compose, type CompositionId } from "./compositions"
import { fitLineup, lineupInks, lineupText, paintLineup } from "./compositions/lineup"
import { CLAIM, LINEUP_HEAD_FIT, LineupClaim, LineupSource, fitLineupSource, lineupBandRect, lineupBodyRect, lineupClaimIn, lineupSourceIn } from "./lineup-shared"

/*
 * lineup-sheet: runway's ordinary content page, drawn to its 2026-10 board.
 * The running order's masthead across the top is the motif's. The claim, the
 * body and the source are the face's. The body is one of the shared
 * compositions in the lineup setting (`LINEUP_COMPOSITIONS`), which places
 * the claim and the source itself. Or the claim over the page and the
 * ordinary component renderer under it. A page the band cannot hold steps
 * aside.
 */

/** The compositions a lineup sheet offers its body, in the lineup setting. */
export const LINEUP_COMPOSITIONS: readonly CompositionId[] = ["look", "collage", "parade", "thread", "lengths", "duet", "standfirst", "order", "shades", "atelier", "bounds"]

/** The subheading, when a content page carries one: lines in the stone grey under the claim. None of the board's pages carried one. */
const STANDFIRST = { top: 168, size: 15, lineHeight: 24, maxLines: 2, gap: 12 } as const

export function LineupSheetContent({ slide, ctx }: SvgTemplateProps) {
  // The compositions have no place for a subheading: a page with one is set under the claim by the ordinary renderer.
  const composed = slide.subheading?.trim()
    ? null
    : compose({ components: slide.components, ctx, rect: lineupBandRect(), setting: "lineup", claim: lineupClaimIn(slide, ctx), source: lineupSourceIn(slide, ctx) }, LINEUP_COMPOSITIONS)
  if (composed) return composed
  const standfirst = slide.subheading?.trim() ? fitLineup(slide.subheading, { width: CLAIM.w, size: STANDFIRST.size, lineHeight: STANDFIRST.lineHeight, maxLines: STANDFIRST.maxLines }, ctx) : undefined
  const body = lineupBodyRect()
  const shift = standfirst ? STANDFIRST.top + standfirst.lines.length * STANDFIRST.lineHeight + STANDFIRST.gap - body.y : 0
  const rect = { ...body, y: body.y + Math.max(0, shift), h: body.h - Math.max(0, shift) }
  const aside = stepAside({ face: "lineup-sheet", slide, ctx, bodyRect: rect })
  if (aside) return aside
  const inks = lineupInks(ctx)
  return (
    <>
      <LineupClaim heading={slide.heading} ctx={ctx} column={{ x: CLAIM.x, w: CLAIM.w }} />
      {standfirst ? (
        <g data-lineup-standfirst="">{paintLineup(standfirst, { ctx, x: CLAIM.x, top: STANDFIRST.top, fill: lineupText(inks.muted, inks.ground, STANDFIRST.size) })}</g>
      ) : slide.subheading?.trim() ? (
        <g data-dropped={1} data-dropped-kind="label" />
      ) : null}
      <SvgContent components={slide.components} rect={rect} ctx={ctx} />
      <LineupSource source={fitLineupSource(slide, ctx)} ctx={ctx} />
    </>
  )
}

export const layoutDef = {
  // A running order, a standfirst over its figures, two figures never
  // added, a moodboard, steps along a hairline, lengths to scale, a picture
  // bracketed into grades, a sample beside its joins, the looks in a row,
  // one look a page and what the work did and did not do: one face, several
  // pages, so several kinds may share it.
  dispatch: "content",
  id: "lineup-sheet",
  kind: "standard",
  story: {
    name: "Lineup Sheet",
    story:
      "Each page is a sheet of a show's running order: the show and the section over a black hairline, a serif claim across the whole measure, rules and air instead of cards, the pictures large, the words small, one drop of crimson.",
    positioning:
      "Serves every content kind it is offered in one grammar. Choose it for a collection, a lookbook or a portfolio review where the pictures make the case and each page should read as the next exit of one show.",
    audience: "A jury, a client or an audience that came to see the work and reads the words as captions.",
    notFor: "A data-heavy report or a page of paragraphs, which this lean grammar leaves too thin.",
  },
  slideTypes: ["content"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "body", accepts: "any", capacity: 4 },
  ],
  pageFields: ["kicker"],
  headingFit: LINEUP_HEAD_FIT,
} satisfies LayoutDefinition
