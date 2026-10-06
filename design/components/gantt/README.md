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

## rally, summer concert season proposal sample, 2026-10

`bands`. Settled on the schedule page (p14): see the board and engine render in [compositions/timetable](../../compositions/timetable/). The round's decisions are in [rounds/2026-10-06-rally](../../rounds/2026-10-06-rally/README.md).

**What it looks like.** A gantt marks a span of its axis (`{ "from": 8, "to": 12, "label": "演唱会季 6 至 9 月" }`), such as the season a plan is built around: the ordinary gantt tints the span behind the bars and names it in a line under its axis. `timetable` sets the same span as the board drew it, with a thin rule at every month.

**Why.** A schedule is read against the season it has to land in.

**What it gave up.**

- validate refuses a span outside the axis, one that runs backwards, and two that overlap.
- A gantt with bands is offered to `timetable` alone among the hand-set gantts, and the other faces draw it with the ordinary gantt.

## thesis, retirement age thesis proposal sample, 2026-10

`milestones` and an item's `basis`. Settled on the schedule page (p16): see the board and engine render in [compositions/itinerary](../../compositions/itinerary/). The round's decisions are in [rounds/2026-10-06-thesis](../../rounds/2026-10-06-thesis/README.md).

**What it looks like.** A gantt names up to two moments on its axis (`{ "at": 9, "label": "数据闸门：2027 年 6 月" }`): the ordinary gantt draws a line down the rows, a diamond under them and the moment's name beside it. A stretch whose `basis` is not settled is drawn as a dashed outline rather than a filled bar.

**Why.** The plan turns on one moment, the data gate, and one stretch of work depends on what happens there.

**What it gave up.**

- validate refuses a moment outside the axis and more than two.
- A gantt with a moment is offered to `itinerary` alone among the hand-set gantts, and the other faces draw it with the ordinary gantt.
