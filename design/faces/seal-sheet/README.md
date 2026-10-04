# seal-sheet

vermilion's ordinary content page: the claim centred in red over a short gold bar, and the body handed to the shared compositions in the `seal` setting.

Code: [`src/layouts/content-seal-sheet.tsx`](../../../src/layouts/content-seal-sheet.tsx), with the frame (`SealHead`, `SealSource`) in [`src/layouts/seal-shared.tsx`](../../../src/layouts/seal-shared.tsx). Used by vermilion for points, list, comparison, process, data, evidence and hierarchy pages.

## vermilion, government work report sample, 2026-10

Settled on every content page. The round's decisions are in [rounds/2026-10-04-vermilion](../../rounds/2026-10-04-vermilion/README.md). The boards and engine renders are in the composition folders each page links from the round.

**What it looks like.** The claim bold in the primary colour at 34/44, centred across the full 1120px from x80, at most two lines evened when it breaks, set on its last line at y140. A 64 by 2 bar in the accent centred at y154. A subheading becomes an 18px standfirst under the bar, up to two lines. The body runs from y186 to y648 and is offered to the compositions in this order: `rows` then `tiles` (`tiles` first with the menu parameter `cards: "tiles"`), `roster`, `scores`, `table`, `targets`, `rail`, `columns`, `trend`, `lanes`, `rings`. A page none of them takes is drawn by the component renderer in the same band. The source sits at the foot at 14/20 from y660.

**Why.** Every page of a document reads under the same head. The compositions carry the board's grammar into every shape the page may hold.

**What it gave up.**

- A page the band cannot hold steps aside to the plain sheet, and is declined when that cannot hold it either.
