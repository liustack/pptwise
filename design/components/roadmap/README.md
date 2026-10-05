# roadmap

`items[].emphasis`: the author marks the one phase the page is about.

Code: [`src/components/roadmap.tsx`](../../../src/components/roadmap.tsx), schema in [`src/ir/components/roadmap.ts`](../../../src/ir/components/roadmap.ts).

## brief, 2026-10

Settled on the plan page. See the board and engine render in [compositions/waves](../../compositions/waves/).

**What it looks like.** In the ordinary roadmap component, the marked card keeps the accent bar and every other card's bar turns primary. With nothing marked every bar stays accent, as before. In `waves`, the marked phase's bar is the accent and the rest are primary.

**Why.** A plan page usually asks for one phase now. Spending the accent on that phase alone says so without another label.

**What it gave up.**

- At most one marked phase.

## terminal, cloud outage review sample, 2026-10

`items[].icon`. Settled on the roadmap page (p15): see the board in [compositions/waves](../../compositions/waves/terminal.board.png). The round's decisions are in [rounds/2026-10-05-terminal](../../rounds/2026-10-05-terminal/README.md).

**What it looks like.** The ordinary roadmap sets a phase's icon where its badge number stood. The console form sets it at the card's top right.

**Why.** A phase named "限流与退避" and one named "第二区域温备" read faster with a symbol each.

**What it gave up.** Nothing a roadmap drew before: a phase with no icon keeps its number.
