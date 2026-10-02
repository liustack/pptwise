# comparison

`recommended`: the author names the one option the page recommends.

Code: [`src/components/comparison.tsx`](../../../src/components/comparison.tsx), schema in [`src/ir/components/comparison.ts`](../../../src/ir/components/comparison.ts).

## brief, 2026-10

Settled on the options page. See the board and engine render in [compositions/table](../../compositions/table/), which lifts the recommended column onto its own ground.

**What it looks like.** In the ordinary comparison component, the recommended option's header and cells are set bold in primary. Cells also accept `**…**` marks, which take the theme's highlight.

**Why.** An options table almost always ends in a pick, and the reader should not have to find it in the heading. Primary bold reads as "this one" on every theme without a new colour.

**What it gave up.**

- One pick per table. The index counts columns from 0 and must name an existing column.
