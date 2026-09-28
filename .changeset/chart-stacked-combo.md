---
"@liustack/pptwise": minor
---

Three new `chart_type` values for the charts business decks use most. `stacked` piles each category's series into one column and prints the column total above it, stacking negative values down from a zero line. `percent_stacked` scales every column to 100% on a fixed 0% to 100% axis. `combo` draws series marked `plot: "line"` as lines over the bars of the rest, and a series on `axis: "right"` gets its own scale on a right-hand axis, titled by the new `axes.y2_title` and `axes.y2_unit`. Colors come from the theme's `chartPalette`, and the charts export as native editable shapes like every other chart.

validate explains what to change when a chart asks for something these types cannot draw: one series on a stacked chart, a negative value or a category adding up to zero on `percent_stacked`, a combo without both a bar and a line series or with every series on the right axis, `plot`, `axis`, `y2_title` or `y2_unit` anywhere they do nothing, and a stacked total or combo value past 1e300, which no axis can draw. Stacked totals are printed together or not at all: when they do not fit above their columns, none is printed and the export stops on that page until the numbers are shorter. Existing IR is unchanged and renders byte for byte as before. See the Charts section of `docs/ir.md`.
