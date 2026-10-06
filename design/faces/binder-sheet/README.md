# binder-sheet

proposal's ordinary content page: the binder's tabs down the right edge with the page's section lit, the claim bold in petrol, the body handed to the shared compositions in the `binder` setting, and the source small at the foot.

Code: [`src/layouts/content-binder-sheet.tsx`](../../../src/layouts/content-binder-sheet.tsx), with the frame (`BinderHead`, `BinderTabsFor`, `BinderStandfirst`, `BinderSource`) in [`src/layouts/binder-shared.tsx`](../../../src/layouts/binder-shared.tsx) and the tabs (`BinderTabs`) in [`src/layouts/compositions/binder.tsx`](../../../src/layouts/compositions/binder.tsx). Used by proposal for every content kind but statement and quote.

## proposal, rooftop solar and storage proposal sample, 2026-10

Settled on every content page. The boards and engine renders are in the composition folders each page links from the round. The round's decisions are in [rounds/2026-10-06-proposal](../../rounds/2026-10-06-proposal/README.md).

**What it looks like.** Down the right edge, from y118 a tab every 98px, the binder's tabs: one a section of the deck's `course`, the page's own section (its `stage`) 52px wide in petrol with its name in white, the others 36px wide on sand with their names in grey. A Chinese name stands one character under another, a Latin name is turned a quarter. The deck's label at the top left and the folio are the motif's. The claim bold at 32/44 in petrol from x64 across 1132px, on one line whenever it fits, its last line ending at y150. A subheading becomes a standfirst at 16/24 in the grey at the body's top. The body runs from y172 to y640 over a source and to y648 without one, and is offered to the compositions in this order: `gains`, `hours`, `regions`, `workings`, `levers`, `cycles`, `drift`, `parts`, `plans`, `precedents`, `safeguards`, `remedies`, `checkpoints`, `quote`, `papers`. A page none of them takes is drawn by the component renderer in the same band. The source at 12/17 in the grey from y650, up to two lines.

**Why.** A proposal is a binder a client flips through by section. The lit tab says where a page sits before the claim says what it shows.

**What it gave up.**

- A page with no `stage`, or a course of more than five sections, carries no tabs, and a course too long for them is declared dropped rather than cut.
- A page the band cannot hold steps aside to the plain sheet, and is declined when that cannot hold it either.
- The body takes up to four components.
