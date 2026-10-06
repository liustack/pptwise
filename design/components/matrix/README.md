# matrix

`title`, `columns`, `rows` and an item's `empty`: a matrix with named columns and rows, and cells that say nothing has been found.

Code: [`src/components/matrix.tsx`](../../../src/components/matrix.tsx), schema in [`src/ir/components/matrix.ts`](../../../src/ir/components/matrix.ts).

## thesis, retirement age thesis proposal sample, 2026-10

Settled on the literature map (p11): see the board and engine render in [compositions/coverage](../../compositions/coverage/). The round's decisions are in [rounds/2026-10-06-thesis](../../rounds/2026-10-06-thesis/README.md).

**What it looks like.** A matrix may name its columns (`columns`, a band of heads over the cells) and its rows (`rows`, each a `label` and an optional `icon`, in a column at the left), and carry a `title`, numbered where the face numbers tables. A cell marked `empty` is a dashed outline with its words in the middle rather than a filled cell, in the accent when its tone is `accent`.

**Why.** A literature map is read by its questions and its sources, and its point is the cell nobody has filled.

**What it gave up.** validate refuses column and row names whose counts do not match the grid.
