# Component guide

Read this when choosing the typed content units that fill a page after its theme and `kind` are fixed.

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
- Use `from_to` when the same measures carry a value in both states and the size of the move is the point. Use `comparison` when the two sides are different subjects rather than one subject twice.
- Use `hub_spoke` for one central concept with unordered peer elements attached to it. Use `cycle` when they close a loop and `rings` when they nest inside one another.
- Use `roadmap` for workstreams without a shared numeric axis. Use `gantt` for dated bars on one shared axis.
- Use `pest` for the four external macro factors. Use `swot` for internal and external strategic assessment.
- Use `sankey` when band width carries an amount through branches and merges, and a gap should show where a flow is not accounted for. Use `flowchart` when branches carry decisions rather than quantities.
- Use `data_table` when exact values must be read row by row. Use `chart` when the audience should grasp a numeric shape at a glance. Use `comparison` for qualitative attributes.
- Use `gauge` inside `chart` for one value against one target. Use `progress_donuts` for several completion rates and `kpi_cards` for one or more independent headline values.

- Use `logo_wall` when a set of organization names is itself the claim and every name carries the same weight. Use `image_grid` for photographs and `row_cards` when each name needs a line of its own.

- Use `product_cards` when each item is a thing someone could buy and has its own picture. Use `comparison` when options are weighed on shared attributes and `data_table` when specifications must be read row by row.

- Use `quote_wall` when several people saying the same thing is the argument. Use `blockquote` for one remark set at full size and `people_cards` when the page is about who the speakers are.

- Use `harvey_balls` when options are judged on shared criteria in five steps and the reader should spot the weak column. Use `heatmap` when the values are continuous numbers whose spread across two dimensions is the message, `data_table` when any figure must be read exactly, and `comparison` for qualitative attributes with no shared scale.

- Use `scorecard` when each figure is judged against a target and carries a verdict. Use `data_table` when the numbers are reported without one.

- Use `pictogram` to land a rate as a countable number of people. Use `progress_donuts` when the rate itself is the subject.

`architecture.layers` paints top to bottom by default. Set `direction: "bottom_up"` when the authored order should begin at the foundation. Keep the array in narrative order.

`swot`, `bmc`, `waterfall`, `gantt`, `pest`, `five_forces`, `heatmap`, `sankey`, `harvey_balls`, `scorecard`, and `pictogram` are full-body components. Each must be the page's only component.
