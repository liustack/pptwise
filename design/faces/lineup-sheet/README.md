# lineup-sheet

runway's ordinary content page: a sheet of a show's running order, the serif claim across the whole measure, the body handed to the shared compositions in the `lineup` setting, and the page's source at the foot.

Code: [`src/layouts/content-lineup-sheet.tsx`](../../../src/layouts/content-lineup-sheet.tsx), with the masthead, the claim and the source (`LineupMasthead`, `LineupClaim`, `fitLineupClaim`, `lineupClaimIn`, `LineupSource`, `lineupSourceIn`, `lineupBandRect`, `lineupBodyRect`) in [`src/layouts/lineup-shared.tsx`](../../../src/layouts/lineup-shared.tsx). Used by runway for every content kind it offers.

## runway, graduation collection review sample, 2026-10

Settled on every content page. The boards and engine renders are in the composition folders each page links from the round. The round's decisions are in [2026-10-08-runway](../../rounds/2026-10-08-runway/README.md).

**What it looks like.** The claim at 34/44 in the heading serif at its regular weight across x64 to x1216, on one line whenever it fits at a twelfth under its size or more, broken at a comma or a colon when it does not or where the author broke it, its last line ending on y158, its marked words in crimson. The body is offered to the compositions in this order: `look`, `collage`, `parade`, `thread`, `lengths`, `duet`, `standfirst`, `order`, `shades`, `atelier`, `bounds`. Each places the claim and the source itself. A page none of them takes is drawn by the component renderer under the claim from y190 down to y650. The page's `footnote` stands at the foot on y670, 10/14 in the stone grey. The masthead is the motif's.

**Why.** Every page is the next sheet of the same running order: which part of the show, what it claims, the pictures large and the words that caption them small.

**What it gave up.**

- A subheading is set under the claim in the stone grey, and such a page goes to the component renderer. None of the board's pages carried one.
- A page the band cannot hold steps aside to the plain sheet.
- The body takes up to four components.
