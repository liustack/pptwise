---
summary: 'The settled swiss design system handed to a design tool together with the general design brief: the red edge, the one content header, black data with one red mark a page, the type sizes, and the parts a new swiss page starts from'
read_when:
  - drawing a swiss page, face or composition that the 2026-10 board did not draw
  - changing anything swiss paints, before opening the code
  - judging whether a swiss page in a showcase or the gallery follows the board
---

# Designing for swiss

swiss was redrawn to one approved board in October 2026. This page states the rules that board settled, so the next page drawn for swiss follows them without a new argument. Paste it into the design tool after [Design brief](./design-brief.md), which still holds every general rule (vector primitives, contrast, the safe area, what to attach). Where the two disagree, this page wins for swiss: its type area runs from x80 to x1200, its chapter line is 15px and its source line 14px. The board, its source and every place the engine departs from it on purpose are in [`design/rounds/2026-10-03-swiss/`](../design/rounds/2026-10-03-swiss/README.md).

## Palette

Take the colours from `pptwise themes --json`, not from this page. For reading the rules below:

| role | token | value |
| :-- | :-- | :-- |
| page | `bg` | `#F7F7F5`, a cold white |
| card | `surface` | `#FFFFFF` |
| ink, data, rules | `text` | `#101010` |
| quiet ink | `muted` | `#5F5F5C` |
| hairline | `border` | `#E3E3E0` |
| the one mark, the edge | `accent` | `#D7282F`, Swiss red |
| what steps back furthest | muted blended a third of the way toward the page | about `#C5C5C3` |
| baselines, connectors, a mid-grey part | muted blended two thirds of the way toward the page | about `#90908D` |
| a marked row's ground | accent over surface at 10% | about `#FBEAEA` |

`primary` is the same black as the ink. Red never carries text as a block: a block that carries text is black, with white on it. The red is the edge of the page and the one thing each page marks.

## The edge

An 8px red bar across the top of every page, the photo page included, where it runs over the photograph. No other decoration on any page.

## The content header

Every content page except the statement and the photo page has one header and nothing else at the top.

- At y44, the chapter's number in 15px bold red and the chapter's name in 15px muted, read off the deck. A page before the first chapter prints no line.
- The claim: black, bold, 34/46, at most two lines across the full 1120px from x80, set on its last line so the last baseline is always y156. A one-line claim leaves no hole under it.
- A 2px black rule from x80 to x1200 at y180.
- The body runs from y196. The source sits at the foot in 14/20 muted type, its last line on y666.

The statement page sets its conclusion at 56/70 on its last line at y231 over a 2px rule at y284, with no chapter line. The photo page runs the photograph to y330 and sets the claim on its last line at y392 over a 2px rule at y418.

## Spending the mark

Data is black. What steps back is grey. Red appears once in the body:

| the author marks | how it is drawn |
| :-- | :-- |
| a bar (`series[].data[].emphasis`) | that bar red with its value bold red, the other bars black |
| a chart series (`series[].emphasis`) | its bars red, the other series light grey |
| waterfall steps (`items[].emphasis`, `emphasis_label`) | the steps red with their values over them, a red bracket over the run with the label |
| a run of share-bar parts (`emphasis` on adjacent series) | the parts red stepping lighter, the run's total and share in red under the bar |
| a table row (`emphasis: "highlight"`) | the row on the pale red ground, its text bold and red |
| a figure (`**…**` around a `kpi_cards` value) | the figure red, the others black |
| a milestone (`highlight`) | a filled red node, its stem, date and title red |
| a run of text (`**…**`) | red bold |

A forecast is hatched in red and the bracket that states a chart's change is red: on a swiss page the change is what the page says. Everything else on a chart is black or grey. A closing note sits on the light panel in 20px ink.

## Type

| text | size |
| :-- | :-- |
| cover title | 88 bold |
| statement | 56 bold |
| claim | 34 bold |
| ending title | 64 bold |
| chapter name | 48 bold |
| body, table cells, notes under figures, closing note | 19 to 20 |
| labels, legends, units, categories | 16 to 17 |
| figures | 176 lead, 104 in a statement's row, 56 beside a lead, 52 beside a chart, 46 to 72 under a photo |
| chapter line | 15 |
| source | 14 |

One family, the theme's body face, everywhere. No letter spacing: the export does not carry it.

## Where a new page starts

Before drawing, find the closest part in [Reusable parts](./reusable-parts.md#swiss-power-sample-2026-10). swiss's content pages are `grid-sheet`, which hands its body to a composition in the grid setting: `records`, `share`, `rail` with `columns` or `bridge`, and `lanes`. The statement page is `grid-statement` and the photo page `image-top` with its grid band, both setting their figures with `figures`. The fact page is `grid-figure`. A new page is usually a new composition in the grid setting, drawn inside the band from y196 to the source line, with the header above it untouched.

Rows, options tables, stacks, calendar windows and horizontal bars have notice forms that bulletin settled, and no swiss board yet. Each needs its board before the grid setting offers it.
