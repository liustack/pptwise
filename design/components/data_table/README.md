# data_table

`rows[].icon`.

Code: [`src/ir/components/data-table.ts`](../../../src/ir/components/data-table.ts), [`src/components/data-table.tsx`](../../../src/components/data-table.tsx).

## terminal, cloud outage review sample, 2026-10

Settled on the redundancy matrix (p09): see the board in [compositions/records](../../compositions/records/terminal-p09.board.png). The round's decisions are in [rounds/2026-10-05-terminal](../../rounds/2026-10-05-terminal/README.md).

**What it looks like.** An icon before a row's first cell, 18px with 8px after it, in the ordinary table. The console records form draws ✓, ✕ and — cells as icons on its own.

**Why.** A matrix of failure kinds reads faster when each row has a symbol.

**What it gave up.** Faces that set tables by hand without room for an icon decline a row that carries one.
