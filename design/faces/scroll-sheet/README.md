# scroll-sheet

ink's ordinary content page: the page hung as a scroll, the volume down the left margin in cinnabar, the claim in the heading face across the measure, the body handed to the shared compositions in the `scroll` setting, and the page's source at the foot.

Code: [`src/layouts/content-scroll-sheet.tsx`](../../../src/layouts/content-scroll-sheet.tsx), with the frame (`ScrollVolume`, `ScrollHall`, `ScrollClaim`, `fitScrollClaim`, `scrollClaimIn`, `ScrollSource`, `scrollSourceIn`, `scrollBandRect`, `scrollBodyRect`) in [`src/layouts/scroll-shared.tsx`](../../../src/layouts/scroll-shared.tsx). Used by ink for every content kind but statement and quote.

## ink, intangible heritage public lecture sample, 2026-10

Settled on every content page. The boards and engine renders are in the composition folders each page links from the round. The round's decisions are in [2026-10-07-ink](../../rounds/2026-10-07-ink/README.md).

**What it looks like.** Down the left margin from y48 the volume the page belongs to stands upright in cinnabar, 15px in the heading face, tracked 8px (the page's `kicker`, 「卷之一　先看名录」), turned a quarter to read from the top in a Latin deck. The scroll's edges, the hall and the date down the right margin and the folio are the motif's. The claim at 34/46 in the heading face in the ink from x110 across 1060px, on one line whenever it fits at 95% of its size or more, broken at a comma or a colon when it does not or where the author broke it, its last line ending on y152, or in the column a composition gives it beside a photograph that runs the height of the page. The body is offered to the compositions in this order: `opening`, `strata`, `handscroll`, `revival`, `nations`, `genres`, `bases`, `ages`, `archive`, `scenes`, `daily`, `excerpts`, `glyphs`. Each places the claim and the source itself. A page none of them takes is drawn by the component renderer under the claim from y190, and no bar there turns cinnabar for being the tallest. The page's `footnote` stands at the foot on y648, 11/15 in the grey, one line or two.

**Why.** Every page is a length of the same scroll: which volume, what it claims and where the numbers come from, with the hall and the date in the margin as a hanging scroll carries its inscription.

**What it gave up.**

- A subheading becomes a grey standfirst under the claim, and such a page goes to the component renderer. None of the board's pages carried one.
- A page the band cannot hold steps aside to the plain sheet.
- The body takes up to five components.
