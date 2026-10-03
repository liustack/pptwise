---
"@liustack/pptwise": minor
---

A stacked chart with `direction: "horizontal"` now draws a share bar: one whole as a single bar across the page, cut into its parts, each with its name and value. Write one series per part with its one value at the chart's one category, whose name captions the bar. Marking a run of adjacent parts with `emphasis` adds their total and share of the whole under the bar, beside the largest other part's. Before, a stacked chart refused `direction`.
