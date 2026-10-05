# comparison

`recommended`: the author names the one option the page recommends.

Code: [`src/components/comparison.tsx`](../../../src/components/comparison.tsx), schema in [`src/ir/components/comparison.ts`](../../../src/ir/components/comparison.ts).

## brief, 2026-10

Settled on the options page. See the board and engine render in [compositions/table](../../compositions/table/), which lifts the recommended column onto its own ground.

**What it looks like.** In the ordinary comparison component, the recommended option's header and cells are set bold in primary. Cells also accept `**…**` marks, which take the theme's highlight.

**Why.** An options table almost always ends in a pick, and the reader should not have to find it in the heading. Primary bold reads as "this one" on every theme without a new colour.

**What it gave up.**

- One pick per table. The index counts columns from 0 and must name an existing column.

## vermilion, government work report sample, 2026-10

`rows[].tag`, `tag_column` and `rows[].emphasis`: a row says what happened to it, and the author marks the row the page is about. Settled on the targets page. See the board and engine render in [compositions/table](../../compositions/table/vermilion.board.png). The round's decisions are in [rounds/2026-10-04-vermilion](../../rounds/2026-10-04-vermilion/README.md).

**What it looks like.** A tag is a few words in a small label after the row's cells, under the header `tag_column`: outlined in the accent when it says something changed, in a grey outline when `quiet: true` says nothing did, and filled in the emphasis colour on the marked row. The marked row sits on a pale tint of the emphasis colour. Every theme's ordinary table sets them, and vermilion's seal table sets them at its right edge.

**Why.** Comparing two years' targets, what changed is the point, and it should not take the reader's own comparison of two cells to find it.

**What it gave up.**

- At most one marked row, and `tag_column` only with tags: validate refuses either.

## memo, four-day week decision sample, 2026-10

`recommended_label`. Settled on the three models page (p09): see the board in [compositions/catalog](../../compositions/catalog/memo.board.png). The round's decisions are in [rounds/2026-10-05-memo](../../rounds/2026-10-05-memo/README.md).

**What it looks like.** A few words that say who the recommended option is for (「客服用这个」, "For support"), as a filled tag in the mark after the option's name. It needs `recommended`.

**Why.** A recommendation is clearer when it says for whom.

**What it gave up.** The `table` composition declines a comparison that carries one.
