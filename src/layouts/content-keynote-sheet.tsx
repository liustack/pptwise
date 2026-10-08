import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { SvgContent } from "../render/svg-content"
import { stepAside } from "../render/step-aside"
import { compose, type CompositionId } from "./compositions"
import { fitKeynote, keynoteInks, keynoteText, paintKeynote } from "./compositions/keynote"
import { CLAIM, KEYNOTE_HEAD_FIT, KICKER, KeynoteClaim, KeynoteKicker, KeynoteSource, fitKeynoteClaim, fitKeynoteSource, keynoteBandRect, keynoteBodyRect, keynoteClaimIn, keynoteKickerIn, keynoteSourceIn } from "./keynote-shared"

/*
 * keynote-sheet: stage's ordinary content page, drawn to its 2026-10 board.
 * The clicker along the foot is the motif's. The chapter, the claim, the
 * body and the source are the face's. The body is one of the shared
 * compositions in the keynote setting (`KEYNOTE_COMPOSITIONS`), which places
 * the chapter, the claim and the source itself. Or the chapter at the top
 * left, the claim over the page and the ordinary component renderer under
 * it. A page the band cannot hold steps aside.
 */

/** The compositions a keynote sheet offers its body, in the keynote setting. */
export const KEYNOTE_COMPOSITIONS: readonly CompositionId[] = ["hush", "crowd", "giant", "contour", "faceoff", "tilt", "podiums", "gulf", "tower", "toll", "arches", "slate"]

/** The subheading, when a content page carries one: lines in the sand under the claim. None of the board's pages carried one. */
const STANDFIRST = { size: 18, lineHeight: 28, maxLines: 2, gap: 10 } as const

export function KeynoteSheetContent({ slide, ctx }: SvgTemplateProps) {
  // The compositions have no place for a subheading: a page with one is set under the claim by the ordinary renderer.
  const composed = slide.subheading?.trim()
    ? null
    : compose({ components: slide.components, ctx, rect: keynoteBandRect(), setting: "keynote", claim: keynoteClaimIn(slide, ctx), source: keynoteSourceIn(slide, ctx), kicker: keynoteKickerIn(slide, ctx) }, KEYNOTE_COMPOSITIONS)
  if (composed) return composed
  const claim = slide.heading?.trim() ? fitKeynoteClaim(slide.heading, ctx) : null
  const claimLines = claim ? Math.min(claim.lines.length, CLAIM.maxLines) : 1
  const standfirst = slide.subheading?.trim() ? fitKeynote(slide.subheading, { width: CLAIM.w, size: STANDFIRST.size, lineHeight: STANDFIRST.lineHeight, maxLines: STANDFIRST.maxLines }, ctx) : undefined
  const body = keynoteBodyRect(claimLines)
  const standfirstTop = CLAIM.top + claimLines * CLAIM.lineHeight + STANDFIRST.gap
  const shift = standfirst ? standfirstTop + standfirst.lines.length * STANDFIRST.lineHeight + STANDFIRST.gap * 2 - body.y : 0
  const rect = { ...body, y: body.y + Math.max(0, shift), h: body.h - Math.max(0, shift) }
  const aside = stepAside({ face: "keynote-sheet", slide, ctx, bodyRect: rect })
  if (aside) return aside
  const inks = keynoteInks(ctx)
  const kicker = slide.kicker?.trim() ? <KeynoteKicker ctx={ctx} text={slide.kicker} column={{ x: KICKER.x, top: KICKER.top, w: KICKER.w }} /> : null
  return (
    <>
      {kicker}
      {slide.kicker?.trim() && !kicker ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {claim ? (
        <g data-truncated={claim.truncated ? "1" : undefined}>
          <KeynoteClaim ctx={ctx} layout={claim} column={{ x: CLAIM.x, w: CLAIM.w, top: CLAIM.top }} />
        </g>
      ) : null}
      {standfirst ? (
        <g data-keynote-standfirst="">{paintKeynote(standfirst, { ctx, x: CLAIM.x, top: standfirstTop, fill: keynoteText(inks.muted, inks.ground, STANDFIRST.size) })}</g>
      ) : slide.subheading?.trim() ? (
        <g data-dropped={1} data-dropped-kind="label" />
      ) : null}
      <SvgContent components={slide.components} rect={rect} ctx={ctx} />
      <KeynoteSource source={fitKeynoteSource(slide, ctx)} ctx={ctx} />
    </>
  )
}

export const layoutDef = {
  // One sentence alone, one figure under its lead-in, a decade as one line,
  // two figures face to face, a slope chart, two leaderboards, quantities to
  // scale, a share as a hundred dots, a photograph beside stacked figures,
  // two bars beside their sentence, gates as doors and a short list: one
  // face, several pages, so several kinds may share it.
  dispatch: "content",
  id: "keynote-sheet",
  kind: "standard",
  story: {
    name: "Keynote Sheet",
    story:
      "Each page is a moment of a talk on a dark stage: one sentence or one figure large in a warm white on the black, the one thing that matters in matte silver, and the presenter's clicker along the foot showing how far the talk has come.",
    positioning:
      "Serves every content kind it is offered in one grammar. Choose it for a keynote or a launch where each page carries one claim, one figure or one short list, and the speaker carries the rest.",
    audience: "A full room watching a big screen, reading a page in the second before the speaker goes on.",
    notFor: "A dense report, a table or a page with several ideas, which a dark stage leaves no room for.",
  },
  slideTypes: ["content"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "body", accepts: "any", capacity: 4 },
  ],
  pageFields: ["kicker"],
  headingFit: KEYNOTE_HEAD_FIT,
} satisfies LayoutDefinition
