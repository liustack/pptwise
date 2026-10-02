# columns

An upright bar chart set by hand with no value axis: the legend and the unit over the plot, every bar carrying its value, the marked series alone in the primary colour.

Code: [`src/layouts/compositions/columns.tsx`](../../../src/layouts/compositions/columns.tsx), with the plots' shared pieces in [`plot.tsx`](../../../src/layouts/compositions/plot.tsx). The header comment there is the contract.

## bulletin, NEV sample, 2026-10

Settled on two pages, both beside the figure column of [`rail`](../rail/). The round's decisions are in [rounds/2026-10-03-bulletin](../../rounds/2026-10-03-bulletin/README.md).

| board (p03) | engine |
| :-: | :-: |
| ![board](bulletin-p03.board.png) | ![engine](bulletin-p03.engine.png) |

| board (p09) | engine |
| :-: | :-: |
| ![board](bulletin-p09.board.png) | ![engine](bulletin-p09.engine.png) |

**What it looks like.** The legend runs along the top left at 16px with 14px swatches, the unit under it, and no axis, ticks or grid. Bars stand on one baseline: a lone bar per category is up to 104px wide, grouped bars up to 76px with 8px between them. Every bar prints its value: 20px bold over a lone bar, 18px over a grouped one, bold primary on the marked series and muted on the rest. A forecast bar (`status: "forecast"`) is hatched in its own colour over a pale tint and its value says 「（预测）」 or "(forecast)". A target bar (`status: "target"`) is a dashed outline over a pale tint. A change the author asks for (`chart.changes`) is a square bracket over the two columns with the change on it, in primary when it ends on the marked series and muted otherwise.

**Why.** On a page that argues about one series, an axis is one more thing to read before the bar the page is about. Printing every value lets the reader check the claim without measuring. A forecast drawn solid would read as a reported figure, and a target drawn solid as something already sold.

**What it gave up.**

- One to three upright series (two to four stacked) over two to six categories, every value zero or more. Negative values, a numeric x axis and an x axis title go to the ordinary chart.
- No gridlines and no axis: a page that needs the reader to compare against a scale should use the ordinary chart.
- When the labels, brackets and legend cannot be set apart, the bars shrink toward half the board's height before the composition declines.
