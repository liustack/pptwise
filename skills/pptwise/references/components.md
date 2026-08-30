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
| `citation` | `quote`, `evidence` |
| `image` | `photo`, `evidence` |
| `image_grid` | `photo`, `list` |
| `image_compare` | `comparison`, `evidence` |
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
| `tag_row` | `list` |

## Lookalikes

- Use `steps` for a linear sequence, `flowchart` for branching decisions, and `cycle` when the final stage returns to the first.
- Use `roadmap` for workstreams without a shared numeric axis. Use `gantt` for dated bars on one shared axis.
- Use `pest` for the four external macro factors. Use `swot` for internal and external strategic assessment.
- Use `sankey` when band width carries a conserved quantity through branches and merges. Use `flowchart` when branches carry decisions rather than quantities.
- Use `data_table` when exact values must be read row by row. Use `chart` when the audience should grasp a numeric shape at a glance. Use `comparison` for qualitative attributes.
- Use `gauge` inside `chart` for one value against one target. Use `kpi_cards` for several independent headline values.
- Use `tag_row` only for short labels. Use `bullets` for prose items and cards for items with their own description.

`architecture.layers` paints top to bottom by default. Set `direction: "bottom_up"` when the authored order should begin at the foundation. Keep the array in narrative order.

`swot`, `bmc`, `waterfall`, `gantt`, `pest`, `five_forces`, `heatmap`, and `sankey` are full-body components. Each must be the page's only component.
