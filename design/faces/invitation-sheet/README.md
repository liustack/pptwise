# invitation-sheet

luxe's ordinary content page: a card of the gilt invitation, the chapter between two gold rules, the claim centred in gold with a diamond under it, the body handed to the shared compositions in the `invitation` setting, and the page's source at the foot.

Code: [`src/layouts/content-invitation-sheet.tsx`](../../../src/layouts/content-invitation-sheet.tsx), with the chapter, the claim and the source (`InvitationChapter`, `InvitationClaim`, `fitInvitationClaim`, `invitationClaimIn`, `InvitationSource`, `invitationSourceIn`, `invitationBandRect`, `invitationBodyRect`) in [`src/layouts/invitation-shared.tsx`](../../../src/layouts/invitation-shared.tsx). Used by luxe for every content kind but statement and quote.

## luxe, gold dealer conference sample, 2026-10

Settled on every content page. The boards and engine renders are in the composition folders each page links from the round. The round's decisions are in [2026-10-08-luxe](../../rounds/2026-10-08-luxe/README.md).

**What it looks like.** At the top, centred, the chapter the page belongs to at 12px in old gold tracked 3px with a short gold rule each side (the page's `kicker`, 「第一章　顾客变了」). The claim at 30/38 in the heading serif, bold, in gold, centred across x120 to x1160, on one line whenever it fits at 95% of its size or more, broken at a comma or a colon when it does not or where the author broke it, its last line ending on y142, and a gold diamond with a short rule each side 14px under its last line. The body is offered to the compositions in this order: `programme`, `climb`, `solo`, `balance`, `swing`, `ebb`, `facing`, `lapse`, `triptych`, `mirror`, `vitrine`, `reply`, `descent`, `doubles`. Each places the chapter, the claim and the source itself, centred, beside a photograph or inside a reply card. A page none of them takes is drawn by the component renderer under the claim from y186. The page's `footnote` stands at the foot on y628, 11/15 in the dim gold. The frame, the occasion and the hallmark folio are the motif's.

**Why.** Every page is a card from the same invitation: which chapter, what it claims and where the figures come from, with the house's occasion and the page struck at the foot.

**What it gave up.**

- A subheading is set centred under the diamond, and such a page goes to the component renderer. None of the board's pages carried one.
- A page with a `stamp` that the reply card does not take declares the stamp dropped.
- A page the band cannot hold steps aside to the plain sheet.
- The body takes up to five components.
