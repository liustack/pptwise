# heatmap

Twelve columns and `bands`: a year of months, and a run of them framed.

Code: [`src/components/heatmap.tsx`](../../../src/components/heatmap.tsx), schema in [`src/ir/components/heatmap.ts`](../../../src/ir/components/heatmap.ts).

## rally, summer concert season proposal sample, 2026-10

Settled on the calendar page (p05): see the board and engine render in [compositions/season](../../compositions/season/). The round's decisions are in [rounds/2026-10-06-rally](../../rounds/2026-10-06-rally/README.md).

**What it looks like.** A heat grid takes up to twelve columns, a year of months. `bands` marks a run of columns by name (`{ "from": "6 月", "to": "9 月", "label": "2027 演唱会季 · 6 至 9 月" }`): the ordinary heat grid frames the run across every row in a dashed outline of the accent and names it under the grid. `season` sets the same run as the board drew it.

**Why.** A season is a run of months, not a value. Framing it says the plan is built around those months without inventing figures for them.

**What it gave up.**

- validate refuses a band that names a column the grid does not have, runs backwards, or shares a column with another.

## proposal, rooftop solar and storage proposal sample, 2026-10

Settled on the tariff hours page (p04): see the board and engine render in [compositions/hours](../../compositions/hours/). The round's decisions are in [rounds/2026-10-06-proposal](../../rounds/2026-10-06-proposal/README.md).

**What it looks like.** A heat grid takes up to 24 columns, a day of hours. `steps` names the bands its values fall into, lowest first (`{ "max": 0.5, "label": "低谷", "short": "谷" }`): each cell takes its step's colour and prints its short name, and a key under the grid names every step. `label_every: 6` prints every sixth column label from the first. A band can carry an `icon` before its name. `hours` sets the same grid as the board drew it.

**Why.** A tariff is a step, not a value. Naming the steps lets a grid of 24 hours print 「谷」 and 「峰」 where a number scale would print a gradient nobody can read prices off.

**What it gave up.**

- validate refuses steps out of order, a `max` on the last step, steps together with a `domain`, and a `label_every` outside 2 to 12.
