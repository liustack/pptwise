---
summary: 'The settled lecture design system handed to a design tool together with the general design brief: a night class at a green board, the wooden frame and the chalk ledge, the step of the lesson and the serif title, one stroke of yellow chalk a page, the stamp on an example, the type sizes, and the parts a new lecture page starts from'
read_when:
  - drawing a lecture page, face or composition that the 2026-10 board did not draw
  - changing anything lecture paints, before opening the code
  - judging whether a lecture page in a showcase or the gallery follows the board
---

# Designing for lecture

lecture was drawn to one approved board in October 2026, as an evening class on China's annual individual income tax reconciliation for people a few years into work: what tonight covers, two withholding paths meeting at year end, one formula with braces under its terms, who has to file, four incomes and their factors, what is taken off, seven deductions with three ringed, the rate table as a staircase, one example and its working, the bars that show where the refund comes from, three exercises and their answers, four traps, the national figures with the misquoted one struck out, the next window and the homework. This page states the rules that board settled, so the next page drawn for lecture follows them without a new argument. Paste it into the design tool after [Design brief](./design-brief.md), which still holds every general rule (vector primitives, contrast, the safe area, what to attach). Where the two disagree, this page wins for lecture: its title runs the whole measure from x64 to x1216 and rests on y142, its ledge runs along the foot below the footer line, and its step, captions, the source and the stamp are 10 to 15px. The board, its source and every place the engine departs from it on purpose are in [`design/rounds/2026-10-08-lecture/`](../design/rounds/2026-10-08-lecture/README.md).

## Palette

Take the colours from `pptwise themes --json`, not from this page. For reading the rules below:

| role | token | value |
| :-- | :-- | :-- |
| the board | `bg` | `#1C2823`, an ink green |
| a box of the board (a path, a card, a dashed note) | `surface` six tenths of the way back to the board | about `#22302A` |
| words | `text` | `#EFF3EC`, chalk white |
| what is quieter: notes, signs, a wiped grey | `muted` | `#A9BCAF` |
| sources, captions, ticks | the grey seven tenths of the way into the board | about `#7F9488` |
| ruled and dashed lines | the grey a fifth of the way into the board | about `#3A4A42` |
| the one stroke of yellow chalk | `accent` | `#E9C46A` |
| the frame and the ledge | the yellow chalk dulled to a stain | about `#5A4632` |

Yellow once a page: the thing to remember, the ring round the recommended answer, the box of a result, the example's stamp. Everything else is chalk white and the greys.

## The board, the step, the title and the source

- Every page, photograph pages too: a 2px wooden frame from (10, 10) 1260 by 700, and a ledge 26px deep from y684 with a lit lip, white chalk at x1120, yellow chalk at x1176 and an eraser at x80. The deck's footer marks are written small on the ledge from x170 at 10px tracked 2px, and the count 「3 / 18」 stands at the top right at 15px in the serif, the page number PowerPoint's slide-number field.
- At the top left of a content page from y34: the lesson's step (the page's `kicker`, 「二　算对」) at 12px in the chalk grey tracked 3px.
- The title: 34/46 in the heading serif at its regular weight across the measure, its last line resting on y142, on one line whenever it fits at a twelfth under its size, broken at a comma or a colon when it does not, the second line growing upward.
- The source at the foot from y646, 11/15 in the dim, one line or two, its last line ending by y676 over the ledge.
- An example's stamp: 「例题 · 数字为虚构」 bold at 12px in yellow in a dashed yellow box at least 150 by 24, under the title, at the top right or beside the photograph.

## Chalk

- One stroke under a word: a line bowed slightly up, laid twice, the second pass half as thick, lower and broken (runs of 14, 30 apart by 6 and 5).
- A box of chalk: its edges skip (runs of 80 and 40 apart by 4 and 3), 2px in the grey, 2.6px in yellow for a result.
- A ring round a word: an ellipse tipped 4 degrees back, 2.6px in yellow, skipping as it goes round.
- A brace under a term, its tip 20px down. A cross through a mistake, 3.4px in yellow.
- Photographs are rectangles cut to the column, their captions 10px in the dim.

## Type

The heading face is Times New Roman over SimSun, set at its regular weight for titles, terms, figures, the working and names. The body face is Microsoft YaHei for notes, labels, captions and the source. Small Chinese labels are tracked 3 to 8px as the board tracks them. A line with lower-case Latin is tracked a quarter as wide.

| text | size |
| :-- | :-- |
| the cover's topic | 104, the line over it 84 |
| a numeral of what tonight covers, a minus sign | 64 |
| the dismissal, a figure | 52 to 54 |
| a formula, an answer | 48 |
| a struck figure, a factor, a bar's figure | 40 to 44 |
| a part's name, a rate, a title | 34 |
| a line of working, a homework task | 30 to 32 |
| a name, a question, an example's given | 22 to 26 |
| a lead-in, a note, a fact, the next date | 15 to 18 |
| the step, captions, keys, the source, the stamp, the ledge, the count | 10 to 15 |

## How the author's marks are drawn

| the author marks | how it is drawn |
| :-- | :-- |
| a page's lesson step (`kicker`) | small at the top left |
| the cover's topic (a part written wholly `**…**`) | yellow at 104px with one stroke under it |
| a run in a title (`**…**`) | chalk white with one stroke of yellow chalk under it |
| a run in the body | yellow |
| the part tonight lands on (an `icon_cards` title written wholly `**…**`) | its numeral in yellow, a stroke under its name |
| a recommended outcome (`recommended`) | yellow in a ring of yellow chalk |
| a highlighted row (`highlight`, `emphasis: "highlight"`) | its factor in yellow, its step filled in yellow |
| a tagged card (`tag`) | a yellow edge, the tag in a ring |
| a marked result, amount or figure (`**…**`) | yellow with one stroke under it |
| a marked waterfall step (`emphasis`) | dashed in yellow |
| a mistake (`tone: "danger"` on `row_cards`) | a yellow cross |
| a misquoted figure (a warning `callout` titled by it) | dim and struck with yellow |
| the window ahead (a `periods` span holding the highlighted dates) | a box of yellow chalk |
| an example (`stamp`) | the dashed yellow stamp |

## Where a new page starts

Before drawing, find the closest part in [Reusable parts](./reusable-parts.md#lecture-annual-tax-reconciliation-evening-class-sample-2026-10). lecture's content pages are `chalkboard-sheet`, which hands its body to a composition in the chalkboard setting: `agenda` for what tonight covers, `confluence` for two paths meeting in one result, `braces` for a formula with notes under its terms, `boughs` for a decision, `factors` for things beside their factors, `subtractions` for what is taken off, `flashcards` for cards with the changed ones ringed, `risers` for a rate table, `givens` for an example's givens beside photographs, `derivation` for a sum worked line by line, `cascade` for a bridge of bars, `exercises` for questions to answer, `solutions` for the answers, `pitfalls` for mistakes, `strikeout` for figures with a misquoted one struck out and `chronology` for dates at their true distance. The cover is `chalkboard-cover`, a part's opening `chalkboard-chapter`, the close `chalkboard-ending`. A new page is usually a new composition in the chalkboard setting, handed the whole page: the board, the serif, one stroke of yellow chalk.

A content page none of the compositions takes is drawn by the component renderer under the same step, title and source.
