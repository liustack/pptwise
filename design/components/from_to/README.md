# from_to

`rows[].tag`, `rows[].emphasis` and `label_column`: a measure says what it is, the author marks the measure the page is about, and the table names its column of measures.

Code: [`src/components/from-to.tsx`](../../../src/components/from-to.tsx), schema in [`src/ir/components/from-to.ts`](../../../src/ir/components/from-to.ts).

## vermilion, government work report sample, 2026-10

Settled on the plan page. See the board and engine render in [compositions/targets](../../compositions/targets/vermilion.board.png). The round's decisions are in [rounds/2026-10-04-vermilion](../../rounds/2026-10-04-vermilion/README.md).

**What it looks like.** A row's `tag` prints a few words such as 「新增」 or "New" after its values, and `emphasis` marks one measure: its name and starting value on a pale tint and its tag filled. `label_column` heads the names' column, such as 「指标」 or "Measure", on the state titles' baseline in the quiet ink. Every theme's ordinary before-and-after table sets all three, and vermilion's `targets` sets them in its open table.

**Why.** A plan's targets are not all of one kind: some are new to its table, and one is the one the page is about.

**What it gave up.**

- At most one marked row: validate refuses two.

## proposal, rooftop solar and storage proposal sample, 2026-10

Settled on the storage discount page (p09): see the board and engine render in [compositions/drift](../../compositions/drift/). The round's decisions are in [rounds/2026-10-06-proposal](../../rounds/2026-10-06-proposal/README.md).

**What it looks like.** A row can carry an `icon` before its name and a `note` under it (「CNESA 估算，426 号新政前后」). The ordinary renderer sets the icon before the row's name and the note under it in the muted ink.

**Why.** A measure that moved needs to say who measured it. The note keeps the source on the row it belongs to.

**What it gave up.**

- vermilion's `targets` composition leaves a row with an icon or a note to the ordinary renderer, which draws both.
