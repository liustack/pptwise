import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { SvgContent } from "../render/svg-content"
import { stepAside } from "../render/step-aside"
import { compose, type CompositionId } from "./compositions"
import { fitInvitation, invitationInks, invitationText, paintInvitation } from "./compositions/invitation"
import {
  CLAIM,
  INVITATION_HEAD_FIT,
  InvitationClaim,
  InvitationChapter,
  InvitationSource,
  fitInvitationSource,
  invitationBandRect,
  invitationBodyRect,
  invitationClaimIn,
  invitationSourceIn,
} from "./invitation-shared"

/*
 * invitation-sheet: luxe's ordinary content page, drawn to its 2026-10
 * board. One card stock on every content page (the hairline frame, the
 * occasion at the foot and the folio struck as a hallmark are the motif's;
 * the chapter over the claim, the claim in gold and its diamond are the
 * face's), and inside it the body: one of the shared compositions in the
 * invitation setting (`INVITATION_COMPOSITIONS`), which places the claim and
 * the source itself, centred over the body, beside a photograph that runs
 * to the page's edge, or inside a reply card. Or the claim over the page and
 * the ordinary component renderer under it. A page the band cannot hold
 * steps aside.
 *
 * A page with a stamp is a reply card: only the composition that sets the
 * stamp down the card's torn edge takes it, and the page declares the stamp
 * dropped when that one declines.
 */

/** The compositions an invitation sheet offers its body, in the invitation setting. */
export const INVITATION_COMPOSITIONS: readonly CompositionId[] = ["programme", "climb", "solo", "balance", "swing", "ebb", "facing", "lapse", "triptych", "mirror", "vitrine", "reply", "descent", "doubles"]

/** The subheading, when a content page carries one: lines in old gold centred under the diamond. None of the board's pages carried one. */
const STANDFIRST = { top: 170, size: 15, lineHeight: 24, maxLines: 2, gap: 10 } as const

export function InvitationSheetContent({ slide, ctx }: SvgTemplateProps) {
  const standfirst = slide.subheading?.trim() ? fitInvitation(slide.subheading, { width: CLAIM.w, size: STANDFIRST.size, lineHeight: STANDFIRST.lineHeight, maxLines: STANDFIRST.maxLines }, ctx) : undefined
  // The compositions have no place for a subheading: a page with one is set under the claim by the ordinary renderer.
  const composed = slide.subheading?.trim()
    ? null
    : compose({ components: slide.components, ctx, rect: invitationBandRect(), setting: "invitation", claim: invitationClaimIn(slide, ctx), source: invitationSourceIn(slide, ctx), stamp: slide.stamp }, INVITATION_COMPOSITIONS)
  if (composed) return composed
  const body = invitationBodyRect()
  const shift = standfirst ? standfirst.lines.length * STANDFIRST.lineHeight + STANDFIRST.gap - (body.y - STANDFIRST.top) : 0
  const rect = { ...body, y: body.y + Math.max(0, shift), h: body.h - Math.max(0, shift) }
  const aside = stepAside({ face: "invitation-sheet", slide, ctx, bodyRect: rect })
  if (aside) return aside
  const inks = invitationInks(ctx)
  return (
    <>
      <InvitationChapter text={slide.kicker} ctx={ctx} cx={CLAIM.x + CLAIM.w / 2} />
      <InvitationClaim heading={slide.heading} ctx={ctx} column={{ x: CLAIM.x, w: CLAIM.w }} />
      {standfirst ? (
        <g data-invitation-standfirst="">{paintInvitation(standfirst, { ctx, x: CLAIM.x + CLAIM.w / 2, top: STANDFIRST.top, anchor: "middle", fill: invitationText(inks.muted, inks.ground, STANDFIRST.size) })}</g>
      ) : slide.subheading?.trim() ? (
        <g data-dropped={1} data-dropped-kind="label" />
      ) : null}
      <SvgContent components={slide.components} rect={rect} ctx={ctx} />
      <InvitationSource source={fitInvitationSource(slide, ctx)} ctx={ctx} />
      {slide.stamp ? <g data-dropped={1} data-dropped-kind="stamp" /> : null}
    </>
  )
}

export const layoutDef = {
  // A programme, bars of a price run with its record, a figure beside its
  // chart, two quantities weighed on a balance, a swing in three houses,
  // stores closed and opened, a tax rule before and after, a standard's
  // years, three pieces of a range, two ways of pricing and a reply card:
  // one face, several pages, so several kinds may share it.
  dispatch: "content",
  id: "invitation-sheet",
  kind: "standard",
  story: {
    name: "Invitation Sheet",
    story:
      "Each page is a card from one invitation: a hairline frame on black stock, the chapter small in gold over a centred gold serif claim, a diamond under it, the page number struck like a hallmark, gold kept for lines, letters and one figure.",
    positioning:
      "Serves every content kind but a statement and a quote in one grammar. Choose it for a house's annual gathering, a heritage brand's briefing or a gala programme that should read as one engraved invitation.",
    audience: "Partners and guests a house already knows, who read each page as it is spoken and keep the figures they are shown.",
    notFor: "A dashboard, a handout or anything loud, where gold on black and a centred serif slow pages meant to be scanned.",
  },
  slideTypes: ["content"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "body", accepts: "any", capacity: 5 },
  ],
  pageFields: ["kicker", "stamp"],
  headingFit: INVITATION_HEAD_FIT,
} satisfies LayoutDefinition
