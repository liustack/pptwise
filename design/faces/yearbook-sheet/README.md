# yearbook-sheet

almanac's ordinary content page: the section beside the sprout, the strip of years at the top right, the claim bold over a hairline, the body handed to the shared compositions in the `yearbook` setting, and the source small at the foot.

Code: [`src/layouts/content-yearbook-sheet.tsx`](../../../src/layouts/content-yearbook-sheet.tsx), with the frame (`YearbookSection`, `YearbookHead`, `YearbookStandfirst`, `YearbookSource`) in [`src/layouts/yearbook-shared.tsx`](../../../src/layouts/yearbook-shared.tsx) and the strip of years (`YearStrip`) in [`src/layouts/compositions/yearbook.tsx`](../../../src/layouts/compositions/yearbook.tsx). Used by almanac for points, list, comparison, process, data, photo, fact, evidence and hierarchy pages.

## almanac, CBAM sample, 2026-10

Settled on every content page. The round's decisions are in [rounds/2026-10-05-almanac](../../rounds/2026-10-05-almanac/README.md). The boards and engine renders are in the composition folders each page links from the round.

**What it looks like.** The page's `kicker` at 13px bold in the mark, its characters 2px apart, right of the motif's sprout at x90. At the top right, from x860 to x1216, the run of years the page's `years` names (`from`, `to`): a hairline with a dot for each year, the years the page is about (`marked`) filled in the mark with the year in bold mono over the dot, the first and last year always named, the rest hollow. The claim bold at 30/42 from x64 across 1152px, at most two lines: on one line whenever it fits, and when it does not, broken at a comma, its last line ending at y154 either way. A 1px hairline at y166. A subheading becomes a muted standfirst under the rule. The body runs from y186 to y640 and is offered to the compositions in this order: `motion`, `calendar`, `horizon`, `formula`, `errata`, `breakdown`, `benchmark`, `paired`, `procedure`, `magnitude`, `segments`, `survey`, `outlook`, `phases`. A page none of them takes is drawn by the component renderer in the same band. The page's `tag`, what the whole page rests on, is set by the compositions that place it (`calendar` and `formula` set it under the figures it governs) and otherwise at the body's top left with the body 40px under it. The source sits at 12/16 in the muted ink from y648, up to two lines.

**Why.** A yearbook reads as one run of years: every page under the same head, its section where the eye starts, the years it is about lit where the eye ends, and its point stated before its figures.

**What it gave up.**

- A page the band cannot hold steps aside to the plain sheet, and is declined when that cannot hold it either.
- `years` is refused by validate on a face that does not draw it.
- The chapter and statement pages keep `field-band-chapter` and `statement`: they had no board in this round. The old faces stay registered for theme files that name them.
