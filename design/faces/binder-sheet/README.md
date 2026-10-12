# binder-sheet

proposal's ordinary content page: a running head naming the part of the deck the page sits in, the claim bold in petrol across the page, the body handed to the shared compositions in the `binder` setting, and the source small at the foot.

Code: [`src/layouts/content-binder-sheet.tsx`](../../../src/layouts/content-binder-sheet.tsx), with the frame (`BinderHead`, `BinderRunningHead`, `BinderTitle`, `BinderStandfirst`, `BinderSource`) in [`src/layouts/binder-shared.tsx`](../../../src/layouts/binder-shared.tsx). Used by proposal for every content kind but statement and quote.

## proposal, rooftop solar and storage proposal sample, 2026-10

Settled on every content page. The boards and engine renders are in the composition folders each page links from the round. The round's decisions are in [rounds/2026-10-06-proposal](../../rounds/2026-10-06-proposal/README.md).

**What it looks like.** Along the top a running head on y36: the deck's label at the left in the grey at 13px (the motif's), and at the right the page's section in petrol bold at 13px, the label of its `stage` in the deck's `course` with no number (「算账」, "Numbers"). A hairline under both on y64 across the measure. The claim bold at 30/42 in petrol from y92 across 1152px, x64 to x1216, on one line whenever it fits, a second line lifting it 20px. A subheading becomes a standfirst at 16/24 in the grey at the body's top. The body runs from y176 to y640 over a source and to y648 without one, and is offered to the compositions in this order: `gains`, `hours`, `regions`, `workings`, `levers`, `cycles`, `drift`, `parts`, `plans`, `precedents`, `safeguards`, `remedies`, `checkpoints`, `quote`, `papers`. A page none of them takes is drawn by the component renderer in the same band, where proposal's tokens keep a card to one white layer inside a hairline with square corners. The source at 11/16 in the grey at the foot's left, its last line on the page number's baseline, y686.

**Why.** A printed proposal names its section at the head of every leaf, so a reader who opens it anywhere knows where they are before the claim says what the page shows.

**What it gave up.**

- A page with no `stage`, or a stage the course does not have, leaves the right of the running head empty.
- The section is named without a number, since a part of the deck may span several stages (the round's decision 17).
- A page the band cannot hold steps aside to the plain sheet, and is declined when that cannot hold it either.
- The body takes up to four components.
