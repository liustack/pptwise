# memo-sheet

memo's ordinary content page: the section's label in the left margin, the claim in a serif over a rule of ink, the body handed to the shared compositions in the `memo` setting, and the source typed small at the foot.

Code: [`src/layouts/content-memo-sheet.tsx`](../../../src/layouts/content-memo-sheet.tsx), with the frame (`MemoMargin`, `MemoHead`, `MemoStandfirst`, `MemoSource`, `exhibitNumberAt`) in [`src/layouts/memo-shared.tsx`](../../../src/layouts/memo-shared.tsx). Used by memo for points, list, comparison, process, data, photo, quote, fact, evidence and hierarchy pages.

## memo, four-day week decision sample, 2026-10

Settled on every content page. The round's decisions are in [rounds/2026-10-05-memo](../../rounds/2026-10-05-memo/README.md). The boards and engine renders are in the composition folders each page links from the round.

**What it looks like.** The page's `kicker` in the margin column from x64, 22/30 bold in the heading face in the mark, over a 24 by 2 bar of the mark. The claim bold in the heading face at 31/42 from x240 across 976px, at most two lines: on one line whenever it fits, and when it does not, broken at the last comma that keeps the first line full, its last line on the same baseline either way. A 1px rule of ink at y170. A subheading becomes a muted standfirst under the rule. The body runs from y186 to y640 and is offered to the compositions in this order: `annex`, `catalog`, `rota`, `records`, `rows`, `tallies`, `slopes`, `diverging`, `citation`, `scales`, `sum`, `schedule`, `checks`. A page none of them takes is drawn by the component renderer in the same band. The source sits at 12/16 in the muted ink from y650, up to two lines. The face counts the pictures pasted in on the pages before it and hands the compositions the first exhibit number.

**Why.** A memo reads as one document: every page under the same head, its section where a reader's eye finds it in the margin, and its point stated before its evidence.

**What it gave up.**

- A page the band cannot hold steps aside to the plain sheet, and is declined when that cannot hold it either.
- The statement page keeps its own face, and the chapter page keeps `issue-line-chapter`: neither had a board in this round.
