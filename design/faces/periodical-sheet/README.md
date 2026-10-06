# periodical-sheet

journal's ordinary content page: the masthead with the page's section, the claim in the heading serif, the body handed to the shared compositions in the `periodical` setting, and the page's source at the foot.

Code: [`src/layouts/content-periodical-sheet.tsx`](../../../src/layouts/content-periodical-sheet.tsx), with the frame (`MastheadRules`, `MastheadSection`, `MastheadColumn`, `MastheadIssue`, `PeriodicalClaim`, `PeriodicalStandfirst`, `PeriodicalSource`, `periodicalExhibitKind`) in [`src/layouts/periodical-shared.tsx`](../../../src/layouts/periodical-shared.tsx). Used by journal for every content kind but statement and quote.

## journal, annual letter to readers sample, 2026-10

Settled on every content page. The boards and engine renders are in the composition folders each page links from the round. The round's decisions are in [2026-10-07-journal](../../rounds/2026-10-07-journal/README.md).

**What it looks like.** The masthead: the page's section in brick red in the middle (its `kicker`, 「十年」, 11px bold, Chinese tracked wide as 「十 年」), over a heavy rule on y50 and a hairline on y55 across the type area. The column's name at the left and the issue at the right are the motif's. The claim at 32/44 bold in the heading serif in the ink from x64 across 1152px, on one line whenever it fits and broken at a comma or a colon when it does not, its last line ending on y158, or in the column a composition gives it beside a photograph that runs up to the masthead. The body is offered to the compositions in this order: `foreword`, `chronicle`, `measures`, `elapsed`, `headline`, `witness`, `census`, `contrast`, `bracket`, `mix`, `twins`, `parallel`, `effects`, `longform`, `pledges`. A page none of them takes is drawn by the component renderer under the claim from y186, and no bar there turns brick red for being the tallest. Figures are numbered across the deck (a titled chart, timeline, table, comparison or grid) and the numbers handed to whatever draws the body. A photograph takes no number. The page's `footnote` stands at the foot on y648, 11/15 in the grey, one line or two.

**Why.** Every page is a page of the same small magazine: which section, what it claims, which figure it is and where the numbers come from.

**What it gave up.**

- A subheading becomes a standfirst under the claim, and such a page goes to the component renderer.
- A page the band cannot hold steps aside to the plain sheet.
- The body takes up to five components.
