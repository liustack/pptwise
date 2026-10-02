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
