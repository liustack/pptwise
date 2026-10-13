import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { SvgContent } from "../render/svg-content"
import { stepAside } from "../render/step-aside"
import { resolveDeckFooter } from "../render/footer-marks"
import { compose, type CompositionId } from "./compositions"
import { accountInks, accountText, fitAccount, paintAccount } from "./compositions/account"
import {
  ACCOUNT_HEAD_FIT,
  AccountClaim,
  AccountSection,
  AccountSource,
  CLAIM,
  accountBandRect,
  accountBodyRect,
  accountClaimIn,
  accountFooterLabel,
  accountKickerIn,
  accountSectionText,
  accountSectionWidth,
  accountSourceIn,
  accountSpeakerLine,
  fitAccountClaim,
  fitAccountSource,
} from "./account-shared"

/*
 * account-sheet: recap's ordinary content page, drawn to its 2026-10 board.
 * The footer row is the motif's. The section line, the claim, the body and
 * the source are the face's. The body is one of the shared compositions in
 * the account setting (`ACCOUNT_COMPOSITIONS`), which places the section
 * line, the claim and the source itself. Or the section line and the claim
 * over the page and the ordinary component renderer under them. A page the
 * band cannot hold steps aside. A page's ballot (the boxes a reviewer ticks
 * beside each request) is drawn by the requests composition. A page whose
 * ballot no composition takes declares it dropped.
 */

/** The compositions an account sheet offers its body, in the account setting. */
export const ACCOUNT_COMPOSITIONS: readonly CompositionId[] = ["gist", "reckoning", "credit", "casefile", "relay", "drawdown", "headcount", "postmortem", "deltas", "stretch", "sequence", "requests"]

/** The subheading, when a content page carries one: lines in the grey under the claim. None of the board's pages carried one. */
const STANDFIRST = { size: 18, lineHeight: 28, maxLines: 2, gap: 10 } as const

export function AccountSheetContent({ ir, slide, ctx, page, index }: SvgTemplateProps) {
  const footer = page?.footer ?? resolveDeckFooter(ir)
  const row = {
    label: accountFooterLabel(footer) || null,
    speaker: accountSpeakerLine(ir),
    folio: footer.pageNumber ? index + 1 : null,
    drawn: page ? page.footerRow === "motif" : true,
  }
  // The compositions have no place for a subheading: a page with one is set under the claim by the ordinary renderer.
  const composed = slide.subheading?.trim()
    ? null
    : compose(
        { components: slide.components, ctx, rect: accountBandRect(), setting: "account", claim: accountClaimIn(slide, ctx), source: accountSourceIn(slide, ctx, row), kicker: accountKickerIn(ir, slide, ctx), ballot: slide.ballot },
        ACCOUNT_COMPOSITIONS,
      )
  if (composed) return composed
  const claim = slide.heading?.trim() ? fitAccountClaim(slide.heading, ctx) : null
  const claimLines = claim ? Math.min(claim.lines.length, CLAIM.maxLines) : 1
  const standfirst = slide.subheading?.trim() ? fitAccount(slide.subheading, { width: CLAIM.w, size: STANDFIRST.size, lineHeight: STANDFIRST.lineHeight, maxLines: STANDFIRST.maxLines }, ctx) : undefined
  const source = fitAccountSource(slide, ctx)
  const body = accountBodyRect(claimLines, source !== null)
  const standfirstTop = CLAIM.top + claimLines * CLAIM.lineHeight + STANDFIRST.gap
  const shift = standfirst ? standfirstTop + standfirst.lines.length * STANDFIRST.lineHeight + STANDFIRST.gap * 2 - body.y : 0
  const rect = { ...body, y: body.y + Math.max(0, shift), h: body.h - Math.max(0, shift) }
  const aside = stepAside({ face: "account-sheet", slide, ctx, bodyRect: rect })
  if (aside) return aside
  const inks = accountInks(ctx)
  const section = accountSectionText(ir, slide)
  const sectionFits = section !== null && accountSectionWidth(section, ctx) <= CLAIM.w
  return (
    <>
      {section && sectionFits ? <AccountSection section={section} ctx={ctx} x={CLAIM.x} /> : null}
      {section && !sectionFits ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {claim ? <AccountClaim ctx={ctx} layout={claim} x={CLAIM.x} top={CLAIM.top} /> : null}
      {standfirst ? (
        <g data-account-standfirst="">{paintAccount(standfirst, { ctx, x: CLAIM.x, top: standfirstTop, fill: accountText(inks.muted, inks.ground, STANDFIRST.size) })}</g>
      ) : slide.subheading?.trim() ? (
        <g data-dropped={1} data-dropped-kind="label" />
      ) : null}
      <SvgContent components={slide.components} rect={rect} ctx={ctx} />
      <AccountSource source={source} ctx={ctx} />
      {slide.ballot ? <g data-dropped={1} data-dropped-kind="label" /> : null}
    </>
  )
}

export const layoutDef = {
  // What was promised against what came in, where the growth came from and
  // whose it was, the things done with the speaker's part apart from the
  // team's, the miss, the market, next year's target, plan and asks: one
  // face, several pages, so several kinds may share it.
  dispatch: "content",
  id: "account-sheet",
  compositions: { setting: "account", offer: ACCOUNT_COMPOSITIONS, subheading: "declines" },
  kind: "standard",
  story: {
    name: "Account Sheet",
    story:
      "Each page reads like a page of a ledger kept on one's own year: a numbered line naming the part, a heavy claim, condensed figures under a black rule, the speaker's part marked apart from the team's, and what went wrong in red.",
    positioning:
      "Serves every content kind it is offered in one grammar. Choose it for a year-end review, a probation review or a promotion defence, where every page answers what was promised, what came in, and whose work it was.",
    audience: "A manager, a review panel or an HR partner reading one person's account of their year.",
    notFor: "A company's annual report or a team's pitch, where marking one person's share on every page is the wrong frame.",
  },
  slideTypes: ["content"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "body", accepts: "any", capacity: 4 },
  ],
  pageFields: ["kicker", "stage", "ballot"],
  headingFit: ACCOUNT_HEAD_FIT,
} satisfies LayoutDefinition
