import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { SvgContent } from "../render/svg-content"
import { stepAside } from "../render/step-aside"
import { compose, type CompositionId } from "./compositions"
import { fitPlacard, paintPlacard, placardInks, placardText } from "./compositions/placard"
import { CLAIM, PLACARD_HEAD_FIT, PlacardClaim, PlacardSource, fitPlacardClaim, fitPlacardSource, placardBandRect, placardBodyRect, placardClaimIn, placardSourceIn } from "./placard-shared"

/*
 * placard-sheet: museum's ordinary content page, drawn to its 2026-10 board.
 * The hall sign, the seam under it, the talk's label and the door plate are
 * the motif's. The claim, the body and the source are the face's. The body
 * is one of the shared compositions in the placard setting
 * (`PLACARD_COMPOSITIONS`), which places the claim and the source itself. Or
 * the claim over the page and the ordinary component renderer under it. A
 * page the band cannot hold steps aside.
 */

/** The compositions a placard sheet offers its body, in the placard setting. */
export const PLACARD_COMPOSITIONS: readonly CompositionId[] = ["specimen", "halo", "floorplan", "jars", "squares", "decades", "lenses", "dateline", "slice", "blanks", "cabinet"]

/** The subheading, when a content page carries one: lines in old paper under the claim. None of the board's pages carried one. */
const STANDFIRST = { top: 166, size: 15, lineHeight: 24, maxLines: 2, gap: 12 } as const

export function PlacardSheetContent({ slide, ctx }: SvgTemplateProps) {
  // The compositions have no place for a subheading: a page with one is set under the claim by the ordinary renderer.
  const composed = slide.subheading?.trim()
    ? null
    : compose({ components: slide.components, ctx, rect: placardBandRect(), setting: "placard", claim: placardClaimIn(slide, ctx), source: placardSourceIn(slide, ctx) }, PLACARD_COMPOSITIONS)
  if (composed) return composed
  const standfirst = slide.subheading?.trim() ? fitPlacard(slide.subheading, { width: CLAIM.w, size: STANDFIRST.size, lineHeight: STANDFIRST.lineHeight, maxLines: STANDFIRST.maxLines }, ctx) : undefined
  const body = placardBodyRect()
  const shift = standfirst ? STANDFIRST.top + standfirst.lines.length * STANDFIRST.lineHeight + STANDFIRST.gap - body.y : 0
  const rect = { ...body, y: body.y + Math.max(0, shift), h: body.h - Math.max(0, shift) }
  const aside = stepAside({ face: "placard-sheet", slide, ctx, bodyRect: rect })
  if (aside) return aside
  const inks = placardInks(ctx)
  const claim = slide.heading?.trim() ? fitPlacardClaim(slide.heading, ctx, { x: CLAIM.x, w: CLAIM.w }) : null
  return (
    <>
      {claim ? <g data-truncated={claim.truncated ? "1" : undefined}><PlacardClaim ctx={ctx} layout={claim} column={{ x: CLAIM.x, w: CLAIM.w }} /></g> : null}
      {standfirst ? (
        <g data-placard-standfirst="">{paintPlacard(standfirst, { ctx, x: CLAIM.x, top: STANDFIRST.top, fill: placardText(inks.muted, inks.ground, STANDFIRST.size) })}</g>
      ) : slide.subheading?.trim() ? (
        <g data-dropped={1} data-dropped-kind="label" />
      ) : null}
      <SvgContent components={slide.components} rect={rect} ctx={ctx} />
      <PlacardSource source={fitPlacardSource(slide, ctx)} ctx={ctx} />
    </>
  )
}

export const layoutDef = {
  // A floor plan, two samples side by side, quantities as squares, one
  // exhibit beside its label, ranges on a log scale, exhibits under a
  // microscope, one figure in a pool of light, a timeline to scale, a whole
  // and its part, open questions on blank labels and a case beside what to
  // look for: one face, several pages, so several kinds may share it.
  dispatch: "content",
  id: "placard-sheet",
  kind: "standard",
  story: {
    name: "Placard Sheet",
    story:
      "Each page is a wall of a darkened gallery: the hall's name small in copper over a seam, a serif claim across the measure, the exhibit in a pool of warm light, its label on a board with a copper edge, the page's number on a door plate.",
    positioning:
      "Serves every content kind it is offered in one grammar. Choose it for an exhibition talk, a curator's tour or a science lecture where each page shows one object and says what it taught us.",
    audience: "Visitors following a guide from one exhibit to the next, reading each label as they go.",
    notFor: "A dense report or a page of tables, which a gallery wall leaves too dark to read.",
  },
  slideTypes: ["content"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "body", accepts: "any", capacity: 4 },
  ],
  pageFields: ["kicker"],
  headingFit: PLACARD_HEAD_FIT,
} satisfies LayoutDefinition
