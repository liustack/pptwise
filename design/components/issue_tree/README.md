# issue_tree

`branches[].icon` and `children_column`.

Code: [`src/ir/components/issue-tree.ts`](../../../src/ir/components/issue-tree.ts), [`src/components/issue-tree.tsx`](../../../src/components/issue-tree.tsx).

## terminal, cloud outage review sample, 2026-10

Settled on the dependency page (p13): see the board in [compositions/paths](../../compositions/paths/terminal.board.png). The round's decisions are in [rounds/2026-10-05-terminal](../../rounds/2026-10-05-terminal/README.md).

**What it looks like.** In the ordinary tree a branch's icon stands 20px before its label. `children_column` names the column of sub-points: the ordinary tree prints it as a header row over them, and the console `paths` sets it after a ✓ in the mark over the right column. The schema requires sub-points when a tree names that column.

**Why.** Each failure point and its fix are two columns of one table, and the reader needs to know what the right column is.

**What it gave up.** Nothing a tree drew before: a tree with neither field is unchanged.
