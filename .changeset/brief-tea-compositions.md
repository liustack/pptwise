---
"@liustack/pptwise": minor
---

Pages that sit a chart, a row of figures, a timeline or a table next to a takeaway now lay out as designed in brief instead of falling back to a grey note box:

- A chart followed by `kpi_cards` puts the figures in a column beside the chart, with an optional `callout` as the conclusion or a `blockquote` as a quote. A chart on its own still derives its column from the data.
- `kpi_cards` items take a `note` line under the value.
- Two to four figures followed by a `blockquote` set the figures in a row and the quote below, with its `attribution`.
- A `timeline`, `comparison` (now up to four columns) or `rows` page followed by a `callout` closes with a full-width block in the theme's primary colour.
- A fact page's `kpi_cards` can carry one or two supporting figures beside the hero figure.

Every face now draws the page's `footnote`. Photo pages and several statement, pull-quote and two-column faces used to drop it without a word, and `audit` now reports a source line that a page leaves out. Headings no longer count `**` marks toward their length, and `**…**` in a blockquote is drawn as emphasis instead of printing the asterisks.
