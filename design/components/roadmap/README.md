# roadmap

`items[].emphasis`: the author marks the one phase the page is about.

Code: [`src/components/roadmap.tsx`](../../../src/components/roadmap.tsx), schema in [`src/ir/components/roadmap.ts`](../../../src/ir/components/roadmap.ts).

## brief, 2026-10

Settled on the plan page. See the board and engine render in [compositions/waves](../../compositions/waves/).

**What it looks like.** In the ordinary roadmap component, the marked card keeps the accent bar and every other card's bar turns primary. With nothing marked every bar stays accent, as before. In `waves`, the marked phase's bar is the accent and the rest are primary.

**Why.** A plan page usually asks for one phase now. Spending the accent on that phase alone says so without another label.

**What it gave up.**

- At most one marked phase.
