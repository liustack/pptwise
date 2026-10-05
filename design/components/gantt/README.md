# gantt

`items[].text` and `items[].emphasis`: a line under a stretch's label, and the one stretch the page is about.

Code: [`src/components/gantt.tsx`](../../../src/components/gantt.tsx), schema in [`src/ir/components/gantt.ts`](../../../src/ir/components/gantt.ts).

## bulletin, NEV sample, 2026-10

Settled on the subsidy page. See the board and engine render in [compositions/window](../../compositions/window/), which sets a calendar of whole months as one band. The round's decisions are in [rounds/2026-10-03-bulletin](../../rounds/2026-10-03-bulletin/README.md).

**What it looks like.** In the ordinary component, `text` sits under the label at 16/20, up to three lines, and the row grows to hold it. The marked bar takes the theme's emphasis colour and the others recede to grey.

**Why.** "Window: help buyers claim local money" needs both the name and what to do in it. One marked stretch says which one the page is about.

**What it gave up.**

- One marked stretch per chart. validate refuses a second.

## ember, low-altitude delivery pitch sample, 2026-10

`range`, `items[].icon` and `items[].period`. Settled on the hypotheses page (p10): see the board in [compositions/bets](../../compositions/bets/ember.board.png). The round's decisions are in [rounds/2026-10-06-ember](../../rounds/2026-10-06-ember/README.md).

**What it looks like.** The ordinary gantt runs its axis over the `range` (`{ "from": 0, "to": 18 }` for a whole 18-month plan) when it is longer than the bars, sets a row's icon before its label and its period under it (「第 16 至 18 个月」, "Months 16 to 18"). `bets` lays each bar on its own track across the range, with the period named under its end.

**Why.** A bet proved in months 16 to 18 means something only against the whole 18 months.

**What it gave up.**

- Every bar inside the range: validate refuses one outside it.
- A gantt with a range, a row icon or a period is offered to `bets` alone among the hand-set gantts, and the other faces draw it with the ordinary gantt.
