# Component guide

Read this when choosing the typed content units that fill a page after its theme and `kind` are fixed.

## Read the live contract

Ask the installed CLI for exact fields before writing a page. One page, or one component on that page, at a time, never the whole schema:

```bash
pptwise inspect deck-dir/ --page <id>
pptwise inspect deck-dir/ --page <id> --component <type>
pptwise icons
```

The page query lists the components the bound theme's face draws on that page, with the counts `validate` holds it to, and `validate` rejects a component outside that list. The component query prints one component's story, its limits on that page, and its fields. Icon fields take a name from `pptwise icons`.

Without a deck project, for example on a bare IR file, cut the same contract by kind or by component:

```bash
pptwise schema --kind <kind> --theme <theme>
pptwise schema --component <type>
```

## Naming

The component type is `blockquote`. The page kind is `quote`. Use a `blockquote` for attributed prose inside a `quote` page or as supporting evidence elsewhere. Never write a component type named `quote`.

## Semantic homes

The table gives each component's normal kind home. A component may serve more than one kind when the page's semantic move remains honest. The kind names what the page is doing. The component names the content unit that does the work.

| component | normal kind ownership |
| --- | --- |
| `bullets` | `points`, `list` |
| `paragraph` | `points`, `statement` |
| `blockquote` | `quote` |
| `callout` | `points`, `statement`, `evidence` |
| `code` | `points`, `evidence` |
| `kpi_cards` | `data`, `fact` |
| `chart` | `data`, `evidence` |
| `flowchart` | `process` |
| `architecture` | `hierarchy` |
| `timeline` | `process` |
| `comparison` | `comparison` |
| `icon_cards` | `list`, `points` |
| `row_cards` | `list`, `points` |
| `steps` | `process` |
| `rings` | `data`, `hierarchy` |
| `numbered_cards` | `points`, `process` |
| `roadmap` | `process` |
| `matrix` | `comparison`, `hierarchy` |
| `insight_panel` | `points`, `evidence` |
| `verdict_banner` | `statement`, `points` |
| `image` | `photo`, `evidence` |
| `image_grid` | `photo`, `list` |
| `image_compare` | `comparison`, `evidence` |
| `logo_wall` | `list` |
| `product_cards` | `list`, `comparison` |
| `quote_wall` | `evidence` |
| `swot` | `comparison` |
| `bmc` | `hierarchy` |
| `waterfall` | `data`, `process` |
| `gantt` | `process` |
| `pest` | `comparison` |
| `five_forces` | `hierarchy` |
| `heatmap` | `data`, `comparison` |
| `sankey` | `data`, `process` |
| `data_table` | `data`, `evidence` |
| `device_mockup` | `photo`, `evidence` |
| `cycle` | `process` |
| `people_cards` | `list` |
| `hub_spoke` | `hierarchy` |
| `progress_donuts` | `data` |
| `staircase` | `process` |
| `chevron_process` | `process` |
| `swimlane` | `process` |
| `journey_map` | `process` |
| `decision_tree` | `hierarchy`, `process` |
| `from_to` | `comparison` |
| `org_tree` | `hierarchy` |
| `issue_tree` | `hierarchy` |
| `pyramid` | `hierarchy` |
| `iceberg` | `hierarchy`, `statement` |
| `pillar_model` | `hierarchy` |
| `value_chain` | `process` |
| `harvey_balls` | `data`, `comparison` |
| `scorecard` | `data`, `comparison` |
| `pictogram` | `data`, `fact` |
| `word_cloud` | `data`, `list` |
| `venn` | `comparison` |
| `fishbone` | `hierarchy` |
| `positioning_map` | `comparison` |
| `concept_equation` | `points`, `statement` |
| `segmented_wheel` | `hierarchy`, `list` |
| `pros_cons` | `comparison` |
| `sketch` | `evidence`, `hierarchy` |

## Lookalikes

- Use `org_tree` when a line means reports to, `issue_tree` when it means breaks down into, and `flowchart` when a branch is a decision taken on a condition.
- Use `pyramid` when each level supports the one above — a claim over its evidence, a rank over the ranks that hold it. Use `rings` when the levels nest one inside another, `architecture` when each level holds the parts of a system, and `steps` when they run in order.
- Use `iceberg` when the argument is that the stated reason is the small part. Use `comparison` when the two sets are peers being weighed.
- Use `pillar_model` when a goal only stands if every pillar stands. Use `icon_cards` when the items are merely parallel.
- Use `value_chain` when the question is which link makes the value. Use `steps` when only the order matters and `sankey` when a quantity splits between stages.
- Use `steps` for a linear sequence, `flowchart` for branching decisions, and `cycle` when the final stage returns to the first.
- Use `chevron_process` when work passes through every stage in order and the handover between them is the point. Use `staircase` when the stages climb in degree rather than follow one another, and `swimlane` when who does each step is part of the argument.
- Use `journey_map` when each stage carries a 1-5 feeling and the low point is the argument. Use `chevron_process` when no feeling is attached to the stages.
- Use `decision_tree` when a condition sends the reader down one of two or three paths and each ending has its own cost. Use `flowchart` for one thread with decisions along it.
- Use `from_to` when the same measures carry a value in both states and the size of the move is the point. Use `comparison` when the two sides are different subjects rather than one subject twice. A `from_to` row can carry a `tag` (`{ "text": "New" }`) printed after its values, and `emphasis` on the one measure the page is about, the way a `comparison` row does.
- Use `hub_spoke` for one central concept with unordered peer elements attached to it. Use `cycle` when they close a loop and `rings` when they nest inside one another.
- Use `venn` when two or three sets overlap and the shared region is the point. Use `comparison` when the sides are weighed against each other and `rings` when each set contains the next.
- Use `fishbone` when the result is known and the page sorts the causes behind it into categories. Use `flowchart` when the boxes lead somewhere.
- Use `positioning_map` when where each subject sits on two continuous dimensions is the argument. Use `matrix` when the two dimensions are categories rather than scales.
- Use `concept_equation` when two or three things together produce a fourth and the addition is the argument. Use `icon_cards` when the items produce nothing between them.
- Use `segmented_wheel` when four to eight equal parts together make up one whole. Use `cycle` when the last part returns to the first and `pie` inside `chart` when the parts are unequal shares.
- Use `pros_cons` when both columns argue about the same proposal and the page has to land on a verdict. Use `comparison` when the columns are two different subjects.
- Use `sketch` to show how a study tells its effect apart, a jump at a cutoff or a treated trend leaving its control, before there are figures. Use `chart` when there are real figures to plot.
- Use `roadmap` for workstreams without a shared numeric axis. Use `gantt` for dated bars on one shared axis.
- Use `pest` for the four external macro factors. Use `swot` for internal and external strategic assessment.
- Use `sankey` when band width carries an amount through branches and merges, and a gap should show where a flow is not accounted for. Use `flowchart` when branches carry decisions rather than quantities.
- Use `data_table` when exact values must be read row by row. Use `chart` when the audience should grasp a numeric shape at a glance. Use `comparison` for qualitative attributes.
- Give a `data_table`, a `comparison` or a `timeline` a `title` when the block needs a name of its own, the way a report names a table ("Free cash flow"). It prints over the block, or in the panel's title bar on a theme that sets the block in a panel.
- Give a `progress_donuts` item a `detail` for the amounts behind the rate ("1.18 of 1.3 trillion"), printed under its label, and mark the one rate the page is about with `emphasis`.
- Use `gauge` inside `chart` for one value against one target. Use `progress_donuts` for several completion rates and `kpi_cards` for one or more independent headline values.
- Give a `kpi_cards` item a `tag` for a few words saying what the figure is, such as "Binding" or "Estimate" (`{ "text": "Binding" }`): it prints as a small label with the figure, filled when the figure is the one the page marks.
- Give a `kpi_cards` item a `delta` (`up`, `down` or `flat`) for the way the figure moved. A rise is drawn as good news and a fall as bad. When the direction says the opposite, add `delta_good`: `true` for a fall that is good news, such as a shorter delivery time or a lower cost, `false` for a rise that is bad news, such as a higher return rate. `delta_good` needs `delta` `up` or `down`.
- Give a `kpi_cards` item a `note` for the line that puts the figure in context: the base, the period, or the counts behind it. Where the figure came from goes in `source`. To name the figures a chart page is about, put one or two `kpi_cards` items after the `chart`, and close with a `callout` or a `blockquote` when the page has one. A theme that sets a column of figures beside its charts prints the author's figures there instead of computing its own.
- Mark a target range on a `line`, `area` or upright `bar` chart with `bands` (`[{ "from": 4.5, "to": 5, "label": "2026 target range" }]`): it is tinted across the plot behind the data. Do not draw the range's edges as two flat series.
- Use `stacked` inside `chart` when each category's total and the parts that make it up both matter. Use `percent_stacked` when only the make-up matters and the totals differ too much to compare the parts, and `bar` when the series should stand side by side rather than add up.
- Use `combo` inside `chart` when two measures share one category axis, such as revenue and margin by quarter. Put the measure with a different unit on `axis: "right"`. Use two charts when the measures do not share their categories.
- To set one group of categories apart from another in a `bar` chart, such as full years beside half-years, give each group its own series and leave out the categories it does not cover. Each bar stays centered on its category and takes its series' color. Do not pad a series with zeros or turn the chart into a `stacked` one for this: a zero is a data point, and the chart reads it as one.

- Use `logo_wall` when a set of organization names is itself the claim and every name carries the same weight. Use `image_grid` for photographs and `row_cards` when each name needs a line of its own.

- Use `product_cards` when each item is a thing someone could buy and has its own picture. Use `comparison` when options are weighed on shared attributes and `data_table` when specifications must be read row by row.

- Use `quote_wall` when several people saying the same thing is the argument. Use `blockquote` for one remark set at full size and `people_cards` when the page is about who the speakers are.

- Use `harvey_balls` when options are judged on shared criteria in five steps and the reader should spot the weak column. Use `heatmap` when the values are continuous numbers whose spread across two dimensions is the message, `data_table` when any figure must be read exactly, and `comparison` for qualitative attributes with no shared scale.

- Use `scorecard` when each figure is judged against a target and carries a verdict. Use `data_table` when the numbers are reported without one.

- Use `pictogram` to land a rate as a countable number of people. Use `progress_donuts` when the rate itself is the subject.

- Use `word_cloud` when the point is which words keep coming back. Use `chart` when the counts must be read and `tag_row` for a line of labels that carry no weight against each other.

## Chart types

`chart_type` picks the drawing. Three of them hold their series to rules the others do not:

- `stacked` and `percent_stacked` need two or more series over the same categories. `percent_stacked` takes no negative values, and every category must add up above zero.
- `combo` draws a series as a line when it sets `plot: "line"` and as bars otherwise, and needs at least one of each. A series with `axis: "right"` gets its own scale on a right-hand axis, named by `axes.y2_title` and `axes.y2_unit`.

```json
{
  "type": "chart",
  "chart_type": "combo",
  "axes": { "y_title": "Revenue", "y_unit": "M", "y2_title": "Gross margin", "y2_unit": "%" },
  "series": [
    { "name": "Revenue", "data": [{ "x": "Q1", "y": 72 }, { "x": "Q2", "y": 82 }] },
    { "name": "Gross margin", "plot": "line", "axis": "right", "data": [{ "x": "Q1", "y": 31.5 }, { "x": "Q2", "y": 29.8 }] }
  ]
}
```

`bar` prints each bar's value when every value fits beside its bar, and otherwise none, which stops the export until the numbers are shorter or the categories or series fewer. `stacked` prints each column's total on the same terms. `percent_stacked` prints no numbers on the plot, and `combo` prints none except on a marked line (see "Marking what the page is about" below). When the audience must read a figure exactly, put it in the heading or a `data_table`.

No value on a chart's value axis may pass 1e300 in size. To get under it, divide every series on that axis by the same power of ten and name the unit in the axis's unit field. The same holds for a `waterfall`'s values and the running totals its bars reach: divide every item by one power of ten and name the unit in `unit`.

A `waterfall` whose running totals and totals all stay above zero, with the lowest at least half the highest, starts its axis above zero so the movements get the height. Every total bar then carries a cut mark at its foot.

## Marking what the page is about

Four components let the author single out the part the page argues for. Every mark is optional, and a component with none renders exactly as before.

- `chart`: `emphasis: true` on one series keeps it in the lead color and turns every other series grey. It applies to `bar`, `line`, `area`, `scatter`, `stacked`, `percent_stacked`, and `combo` charts with two or more series, and only one series may carry it. A marked `combo` line also prints its value at each point, with its axis unit, when every label clears the bars, dots, lines, and the other labels. When one does not, none is printed, and the axis still carries the values.
- `waterfall`: `emphasis: true` on the items the page is about fills them in the accent, the totals in the primary color, and the rest grey. Marked items must sit next to each other and cannot be a total. `emphasis_label` prints one line over a bracket that spans the marked bars, and needs at least one marked item.
- `comparison`: `recommended` is the index into `columns`, counted from 0, of the option the page recommends. Its header and cells are set bold in the primary color. Any cell can also mark a run with `**…**`, painted the way the theme marks emphasis everywhere else.
- `comparison`: a row can carry a `tag`, a few words saying what happened to it (`{ "text": "Unchanged", "quiet": true }`), printed as a small label after its cells, with `tag_column` as the header over the tags. Mark the one row the page is about with `emphasis`: it sits on a pale tint and its tag fills in the emphasis colour. Set `quiet` on a tag that says nothing changed.
- `roadmap`: `emphasis: true` on one item keeps the accent bar on that card and turns the other cards' bars primary. Only one item may carry it.

A run written `**…**` is set in the theme's emphasis in a heading and in `paragraph`, `bullets`, `callout` and `blockquote` text, `comparison` labels and cells, `numbered_cards` titles and text, `verdict_banner` text, a `kpi_cards` value or note, image captions, `steps` titles and text, `icon_cards` titles and text, and an `insight_panel` title. Validate refuses one in any other field.

```json
{
  "type": "waterfall",
  "unit": "$",
  "emphasis_label": "Planning drivers: +$1.11 of the +$1.25 rise",
  "items": [
    { "label": "FY2023", "value": 4.1, "kind": "total" },
    { "label": "Failed first attempts", "value": 0.48, "emphasis": true },
    { "label": "Falling route density", "value": 0.37, "emphasis": true },
    { "label": "Driver overtime", "value": 0.26, "emphasis": true },
    { "label": "Fuel", "value": 0.09 },
    { "label": "Other", "value": 0.05 },
    { "label": "FY2026", "value": 5.35, "kind": "total" }
  ]
}
```

`architecture.layers` paints top to bottom by default. Set `direction: "bottom_up"` when the authored order should begin at the foundation. Keep the array in narrative order.

`swot`, `bmc`, `waterfall`, `gantt`, `pest`, `five_forces`, `heatmap`, `sankey`, `harvey_balls`, `scorecard`, `pictogram`, and `word_cloud` are full-body components. Each must be the page's only component.
