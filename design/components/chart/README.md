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

## swiss, power sample, 2026-10

Two author fields, settled on the solar page and the capacity page: see [compositions/columns](../../compositions/columns/swiss-p05.board.png) and [compositions/share](../../compositions/share/swiss.board.png). The round's decisions are in [rounds/2026-10-03-swiss](../../rounds/2026-10-03-swiss/README.md).

**What it looks like.**

- `series[].data[].emphasis` marks the one bar a page is about, such as the latest year in a run of years, which series emphasis cannot say on a chart of one series. The ordinary chart keeps that bar in its series' colour and steps the others back to the grey a marked series leaves the rest in. The hand-set plots set it in their mark colour: primary in the notice setting, the accent with the rest black in the grid setting.
- A `stacked` chart with `direction: "horizontal"` and one category is a share bar: one whole as a single bar across the page, cut into its parts, each named with its value. Marking a run of adjacent parts adds their total and share under the bar, beside the largest other part's. Every theme draws it, from the same code ([`share-bar.tsx`](../../../src/components/share-bar.tsx)), in its palette.

**What it gave up.**

- A marked point only on a `bar` chart, one per chart, and not beside a marked series.
- A share bar takes no second category, no value below zero and no `status`. Several marked series are allowed only there, and only as one run of adjacent parts.

## ledger, AI capex sample, 2026-10

Three fixes to the ordinary chart, found while the board's charts were drawn in panels. See [compositions/shifts](../../compositions/shifts/ledger.board.png) and [compositions/columns](../../compositions/columns/ledger-p06.board.png). The round's decisions are in [rounds/2026-10-04-ledger](../../rounds/2026-10-04-ledger/README.md).

**What it looks like.**

- A dumbbell names its axes on one line under its rows, the rows' title and the values' title and unit, the way a horizontal bar chart does. It used to ignore them, so a guidance chart in 亿美元 never said what its figures counted.
- A marked line in a combo prints its first and last values when the values between would land on taller bars. It used to print none.
- Every chart in a deck prints its figures one way. The language of a chart's figures comes from the deck's headings, and a Chinese deck groups four-digit figures (「3,291」) when its author writes one grouped anywhere in the deck, otherwise leaves them whole (「3291」). Five digits and more are grouped either way.

**Why.** One Chinese deck printed 「1,650」 on a chart of quarters and 「3291」 on a chart of company names, because each chart judged its language by its own labels. GB/T 15835-2011 §5.1.1 allows a four-digit integer either way, so the deck's author decides, and every chart follows.

**What it gave up.**

- A dumbbell still draws no grid, so validate keeps warning about `show_grid` on it.
- A Chinese deck that never writes a grouped four-digit figure keeps 「8490」 beside 「10,575」, as swiss's does.

## vermilion, government work report sample, 2026-10

Three changes, settled on the fiscal, growth, indicators and funds pages. See the boards and engine renders in [compositions/rail](../../compositions/rail/) and [compositions/columns](../../compositions/columns/vermilion.board.png). The round's decisions are in [rounds/2026-10-04-vermilion](../../rounds/2026-10-04-vermilion/README.md).

**What it looks like.**

- `bands: [{ from, to, label }]` tints a value range across the plot behind the data, with its label inside it, and the value axis grows to hold it. Line, area and upright bar charts take up to two. The seal setting's trend sets one in a tint of the accent.
- A whole value prints with the decimals its neighbours carry: an author's 5.0 reaches the chart as 5 (JSON keeps no trailing zero) and prints 「5.0」 beside 「5.4」, and 4.4 beside 5.66 stays 「4.4」.
- A percent chart whose values all lie between 0 and 100 ends its axis at 100%, where the headroom used to push a progress chart out to a 150% tick.

**Why.** A growth path is argued against its target range, and a reader trusts figures that are written the way the source wrote them.

**What it gave up.**

- A theme's hand-set plot with no value axis leaves a banded chart to the ordinary chart.

## memo, four-day week decision sample, 2026-10

`series[].tone`, and a marked point on a `stacked` or `percent_stacked` chart. Settled on the cost page (p05): see the board in [compositions/diverging](../../compositions/diverging/memo.board.png). The round's decisions are in [rounds/2026-10-05-memo](../../rounds/2026-10-05-memo/README.md).

**What it looks like.** A series with `tone: "success"`, `"danger"` or `"warning"` takes that ink in place of its palette colour. A point marked with `emphasis` on a stacked chart keeps its column at full strength and lets the other columns recede.

**Why.** On a page about who got better and who got worse, the colours have to say which is which, and the reader's eye goes to the column the page is about.

**What it gave up.** Tone is refused on a share bar and a pie, whose colours are the parts.

## clinic, GLP-1 formulary review sample, 2026-10

`tag` on a chart. Settled on the head-to-head page (p06): see the board in [compositions/duel](../../compositions/duel/clinic.board.png). The round's decisions are in [rounds/2026-10-05-clinic](../../rounds/2026-10-05-clinic/README.md).

**What it looks like.** A chart may carry one tag, set at the left of its header row in the ordinary chart and beside the chart's title in clinic's `duel` (「企业口径」, outlined in brown as a company's own figures).

**Why.** One chart on a page can rest on weaker evidence than the rest of it, and the reader has to see that on the chart.

**What it gave up.** A share bar refuses a tag, and the hand-set plots that have no place for one decline the chart.

## almanac, CBAM sample, 2026-10

`reference`, `data[].note` and `emphasis_label`. Settled on the exposure page (p07), the products and countries pages (p08, p09), the carbon price page (p12), the green power page (p13) and the routes page (p14): see the boards in [compositions/benchmark](../../compositions/benchmark/README.md), [compositions/breakdown](../../compositions/breakdown/almanac.board.png) and [compositions/segments](../../compositions/segments/almanac.board.png). The round's decisions are in [rounds/2026-10-05-almanac](../../rounds/2026-10-05-almanac/README.md).

**What it looks like.** `reference` draws one value across a bar chart's bars as a dashed line with its label, and the legend names it with a short dashed line. A bar's `note` follows its value after a middle dot (「7.68 · 62.36 元」). A share bar's `emphasis_label` is the author's own line for the marked run, set where the run's computed total would stand, whole or not at all.

**Why.** Default values are read against the EU benchmark, a price is read with its own currency beside it, and the run a page marks is named in the deck's words.

**What it gave up.** A reference on bar charts only. A share bar whose `emphasis_label` is wider than the bar is not drawn.

## homeroom, AI-at-work training sample, 2026-10

`series[].data[].upper`. Settled on the two ways it backfires page (p07): see the board in [compositions/diptych](../../compositions/diptych/homeroom.board.png). The round's decisions are in [rounds/2026-10-06-homeroom](../../rounds/2026-10-06-homeroom/README.md).

**What it looks like.** On a bar chart on its side, a value known only as a range: the bar solid to `y` and dashed on to `upper` over a pale tint of its colour, its label naming both ends (「60 至 70」, "60–70").

**Why.** Two groups that scored about 60% and 70% are one finding with a spread, not two bars.

**What it gave up.**

- Bars on their side only, at zero or above, and not beside a status.
- A page whose chart carries a range is offered to `diptych` alone among the hand-set plots.

## ember, low-altitude delivery pitch sample, 2026-10

`axes.y_unit` on a pie, a donut and a funnel. Settled on the landing points page (p05): see the board in [compositions/funnel](../../compositions/funnel/ember.board.png), and the ask page (p15) in [compositions/uses](../../compositions/uses/ember.board.png). The round's decisions are in [rounds/2026-10-06-ember](../../rounds/2026-10-06-ember/README.md).

**What it looks like.** A pie, a donut and a funnel print the value axis's unit after every value they name (「1200 个」, "30%"), and a donut after its centre total. `funnel` prints it on each level and `uses` on each part of the share bar.

**Why.** 「1200」 alone on a funnel could be points, yuan or orders. These charts have no axis to carry the unit, so the values carry it.

**What it gave up.** A `y_unit` alone no longer draws the `chart_axes_ignored` warning on these charts. Their other axis settings still do.
