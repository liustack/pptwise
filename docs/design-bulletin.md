---
summary: 'The settled bulletin design system handed to a design tool together with the general design brief: the IKB field pages, the one content header, how a page spends its one mark, the type sizes, and the parts a new bulletin page starts from'
read_when:
  - drawing a bulletin page, face or composition that the 2026-10 board did not draw
  - changing anything bulletin paints, before opening the code
  - judging whether a bulletin page in a showcase or the gallery follows the board
---

# Designing for bulletin

bulletin was redrawn to one approved board in October 2026. This page states the rules that board settled, so the next page drawn for bulletin follows them without a new argument. Paste it into the design tool after [Design brief](./design-brief.md), which still holds every general rule (vector primitives, contrast, the safe area, what to attach). Where the two disagree, this page wins for bulletin: its type area runs from x80 to x1200, and its source line is 14px. The board, its source and every place the engine departs from it on purpose are in [`design/rounds/2026-10-03-bulletin/`](../design/rounds/2026-10-03-bulletin/README.md).

## Palette

Take the colours from `pptwise themes --json`, not from this page. For reading the rules below:

| role | token | value |
| :-- | :-- | :-- |
| page | `bg` | `#F7F7F4`, a warm gallery white |
| card, lifted column | `surface` | `#FFFFFF` |
| ink | `text` | `#17181A` |
| quiet ink | `muted` | `#5C6066` |
| hairline | `border` | `#DEE0DB` |
| the one mark | `primary` | `#0032A0`, IKB |
| a marked row's ground | primary over surface at 10% | about `#E6EAF6` |
| unmarked data | muted blended a third of the way toward the page | about `#C4C5C5` |
| closing panel | `panel` | `#F0F0EC` |

No warm colour marks anything, ever. The maintainer ruled orange beside IKB out in an earlier review, and the theme file records why. `accent` is an industrial blue (`#2F6FBF`), the chart palette's second colour, which the ordinary components may use for a second series or a small mark but never for emphasis: `emphasisInk` is IKB.

## The two field pages

The cover and the ending paint the whole page IKB. Everything on them is white or white blended back toward IKB, each held to the contrast its size needs on the field.

- Top right, the motif's three white steps at 44, 30 and 20px, 10px apart, from x1080 at y96.
- Cover: one 18px line at y96 (the organization or the occasion), the title bold at 80/98 from y232 in at most two lines of 1040px, a 64 by 6 white bar, the subtitle at 22px, the date at 16px near the foot.
- Ending: one 18px line at y96 (what the page is for, such as 「需要管理层拍板」), the title bold at 56/74 from y196 in at most two lines of 1000px, a 40% white rule at y404, then two to four next steps as equal numbered columns at 24/34.
- A marked run in either title cannot turn IKB on IKB. It keeps the white and gets a straight white underline.

## The content header

Every content page, whatever its kind, has one header and nothing else at the top.

- The claim: black, bold, 34/46, at most two lines in a 1040px box from x80, y44 to y144, bottom-aligned, so the last line always sits on the same baseline.
- Under it, a 1px hairline in the border colour from x80 to x1200 at y163, and a 96 by 3 IKB bar on its left end.
- Top right, the motif's small IKB steps: 14, 10 and 7px, 5px apart, from x1158 at y58.
- The body starts at y196. The source sits at the foot in 14/20 muted type, its last line on y666. This is the one place bulletin goes below 16px, and only because the board asks for it.
- No title band, no ruler, no corner marks, no other decoration.

On the photo page the same header runs in the column beside a 560px photograph, from x624.

## Spending the mark

A page argues about one thing, so IKB appears once in the body, on what the author marked:

| the author marks | how it is drawn |
| :-- | :-- |
| a chart series (`series[].emphasis`) | its bars in IKB with bold IKB values, every other series in the receded grey with muted values |
| a waterfall step (`items[].emphasis`) | the bar in IKB with its value reversed out of it at 24px |
| a table row (`emphasis: "highlight"`) | the row on the pale IKB ground, its text bold in IKB |
| a figure (`**…**` around a `kpi_cards` value) | the figure in IKB, the others black |
| a numbered card (`items[].emphasis`) | the row reversed out of an IKB block, as the page's answer |
| a calendar stretch (`gantt.items[].emphasis`) | the block in IKB with white text, the others on the panel |
| a milestone (`highlight`) | a filled IKB node, its line, date and title in IKB |
| the recommended option (`comparison.recommended`) | its header reversed out of IKB, its cells black and bold |
| a run of text (`**…**`) | IKB bold |

A closing note is not a mark. It sits on the light panel in 20px ink, with a stroked circle and an exclamation mark before it when it is a warning. A forecast is hatched, a target is a dashed outline over a pale tint: they say what a number is, not that it matters, so they take the series' own colour.

## Type

| text | size |
| :-- | :-- |
| claim | 34 bold |
| body, table cells, closing note | 19 to 20 |
| labels, legends, units, categories | 16 to 17 |
| headline figures | 50 beside a chart, 76 in a figure column, 40 for a marked pair |
| source | 14 |

One family, the theme's body face, everywhere. No letter spacing: the export does not carry it.

## Charts

The board draws its charts by hand, and so does the engine on bulletin: no value axis, no gridlines, the legend and unit over the plot on the left, every bar carrying its value, and the author's figures in a column right of a hairline at x780. Draw a new chart page the same way. When a chart cannot be read without a scale, say so on the board: the engine then falls back to the ordinary chart component with its axis.

## Where a new page starts

Before drawing, find the closest part in [Reusable parts](./reusable-parts.md#bulletin-nev-sample-2026-10). bulletin's content pages are one face, `notice-sheet`, which hands its body to a composition in the notice setting: `rows`, `table`, `records`, `rail` with `columns`, `bars` or `bridge`, `stack`, `window` and `lanes`. A new page is usually a new composition in that setting, drawn inside the band from y196 to the source line, with the header above it untouched.

bulletin offers no statement, fact or evidence page yet. Each of those needs its own board before it is built.
