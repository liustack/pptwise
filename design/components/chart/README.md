# chart

`series[].emphasis`: the author marks the one series the page is about.

Code: [`src/components/chart.tsx`](../../../src/components/chart.tsx), [`src/components/chart-svg.tsx`](../../../src/components/chart-svg.tsx), [`src/render/chart-palette.ts`](../../../src/render/chart-palette.ts), schema in [`src/ir/components/chart.ts`](../../../src/ir/components/chart.ts).

## brief, 2026-10

Settled on the trend page. See the board and engine render in [compositions/rail](../../compositions/rail/), which sets the marked series' change over the highlight beside the chart.

**What it looks like.** The marked series takes the palette's lead colour and every other series one receded grey that still clears 3:1 against the page. In a combo chart, only the marked line prints its point values, each just above its point in its axis's unit. Bars print no values.

**Why.** A chart with several series usually argues about one of them. Greying the rest says which one without a callout, and printing values only on that line keeps the plot clear.

**What it gave up.**

- At most one marked series, on bar, line, area, scatter, stacked, percent stacked or combo charts with at least two series. validate refuses anything else.
- The combo point labels are never moved to make room. If any one would touch a bar, a dot, a line, another label or the plot edge, none of them is drawn and the axis carries the values.

## bulletin, NEV sample, 2026-10

Two fields: a point's `status` and the chart's `changes`. Settled on the chart pages. See the boards and engine renders in [compositions/columns](../../compositions/columns/) (status, brackets) and [compositions/bars](../../compositions/bars/) (a change at one row). The round's decisions are in [rounds/2026-10-03-bulletin](../../rounds/2026-10-03-bulletin/README.md).

**What it looks like.** `series[].data[].status: "forecast"` hatches a bar in its own colour over a pale tint of it, and `"target"` draws it as a dashed outline over the same tint, in the hand-set plots and in the ordinary bar and stacked charts alike. A series that mixes statuses gets a 「预测」/"Forecast" or 「目标」/"Target" legend entry. `changes: [{ from, to }]` draws a bracket over two columns with the relative change on it, or the change in points on a percent axis. With `at`, it compares two series at one category, and a horizontal chart writes it after the later bar's value.

**Why.** A September figure that is a forecast, or a fourth quarter that is a target, must not look like a reported number. A change the page argues about should be drawn where it happens, not left to the reader's arithmetic.

**What it gave up.**

- `status` only on bar and stacked charts, `changes` only on bar and stacked charts, at most three.
- A change from zero or less has no relative figure: validate asks for a bar above zero or a percent axis.
