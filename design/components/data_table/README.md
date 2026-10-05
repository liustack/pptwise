# data_table

`rows[].icon`.

Code: [`src/ir/components/data-table.ts`](../../../src/ir/components/data-table.ts), [`src/components/data-table.tsx`](../../../src/components/data-table.tsx).

## terminal, cloud outage review sample, 2026-10

Settled on the redundancy matrix (p09): see the board in [compositions/records](../../compositions/records/terminal-p09.board.png). The round's decisions are in [rounds/2026-10-05-terminal](../../rounds/2026-10-05-terminal/README.md).

**What it looks like.** An icon before a row's first cell, 18px with 8px after it, in the ordinary table. The console records form draws ✓, ✕ and — cells as icons on its own.

**Why.** A matrix of failure kinds reads faster when each row has a symbol.

**What it gave up.** Faces that set tables by hand without room for an icon decline a row that carries one.

## memo, four-day week decision sample, 2026-10

`rows[].tag`. Settled on the staying power page (p07): see the board in [compositions/records](../../compositions/records/memo-p07.board.png). The round's decisions are in [rounds/2026-10-05-memo](../../rounds/2026-10-05-memo/README.md).

**What it looks like.** A few words leading a row's last cell as a small outlined tag in the ordinary table. The memo records form gives each kind of tag its own quiet ink and the marked row's tag the mark.

**Why.** A table that mixes sources tells them apart at a glance.

**What it gave up.** The memo records form draws tags. The other hand-set table forms decline a row that carries one.

## ember, low-altitude delivery pitch sample, 2026-10

`columns[].emphasis` and `columns[].icon`. Settled on the pioneers page (p06): see the board in [compositions/rivals](../../compositions/rivals/ember.board.png). The round's decisions are in [rounds/2026-10-06-ember](../../rounds/2026-10-06-ember/README.md).

**What it looks like.** In the ordinary table the marked column's header and cells are bold in the primary and the column is outlined. A column's icon sits before each of its cells. `rivals` frames the marked column in the fire over a tint of it, a question mark in a ring before each 「未公布」 ("Not published").

**Why.** A landscape table in a pitch is read for the one column no rival can fill. Marking it is the author's call, not a guess from the data.

**What it gave up.**

- At most one marked column. An icon on a left-aligned column only.
- A table with a marked column or a column icon is offered to `rivals` alone among the hand-set tables, and the other faces draw it with the ordinary table.
