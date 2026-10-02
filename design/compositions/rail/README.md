# rail

A trend chart with a column beside it that states what each series did from its first value to its last.

Code: [`src/layouts/compositions/rail.tsx`](../../../src/layouts/compositions/rail.tsx). The header comment there is the contract.

## brief, 2026-10

| board (p03) | engine |
| :-: | :-: |
| ![board](brief.board.png) | ![engine](brief.engine.png) |

**What it looks like.** The chart keeps the left of the band. A hairline stands 280px from the right edge, and the column right of it has one block per series: the series' swatch and name small and muted, the change as a whole-number percentage in the heading font (56px, stepping down to 44 or 36 when three series need the room), and "first → last" in the axis unit. A series whose axis is in percent changes by points instead: "+10.9 pts", or 「+10.9 个百分点」 on a chart written in Chinese, to one decimal, with the unit set smaller and muted beside the figure. The marked series (`series[].emphasis`) sets its change in primary over the theme's highlight. The others recede to muted.

**Why.** A trend page's headline is a pair of percentages. Computing them from the series means the column can never disagree with the chart, and the author never writes a number twice.

**What it gave up.**

- The column is derived, not written. Change is (last − first) / first, except on a percent axis, where it is last − first in points (maintainer's call, 2026-10-02: 80.1% to 91.0% used to print +14%, which reads as the rate itself moving fourteen points). The figure's language follows the chart's own words: its series names, categories and axis titles.
- One to three series on a category axis, each starting above zero unless its axis is in percent. Anything else, or a chart that would drop content in the narrower plot, goes back to the face and draws at full width with no column.
- The board's unmarked bars were a pale grey (#C9CCD2). The engine uses one that clears 3:1 against the page, so the bars still read as data.
