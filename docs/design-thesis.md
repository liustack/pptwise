---
summary: 'The settled thesis design system handed to a design tool together with the general design brief: the pages of a thesis manuscript, the running head with its section, the bottom-aligned serif claim, figures and tables numbered across the deck, sources as numbered notes over a centred folio, one emerald or gold lead a page, the type sizes, and the parts a new thesis page starts from'
read_when:
  - drawing a thesis page, face or composition that the 2026-10 board did not draw
  - changing anything thesis paints, before opening the code
  - judging whether a thesis page in a showcase or the gallery follows the board
---

# Designing for thesis

thesis was drawn to one approved board in October 2026, as a master's thesis proposal set as the pages of a manuscript: a student putting a research question, the literature, a design and a plan to a committee, one section at a time, from the question to the requests for the committee's guidance. This page states the rules that board settled, so the next page drawn for thesis follows them without a new argument. Paste it into the design tool after [Design brief](./design-brief.md), which still holds every general rule (vector primitives, contrast, the safe area, what to attach). Where the two disagree, this page wins for thesis: its type area runs from x64 to x1216, and its running head, captions, chips, notes and folio are 11 to 15px. The board, its source and every place the engine departs from it on purpose are in [`design/rounds/2026-10-06-thesis/`](../design/rounds/2026-10-06-thesis/README.md).

## Palette

Take the colours from `pptwise themes --json`, not from this page. For reading the rules below:

| role | token | value |
| :-- | :-- | :-- |
| the paper | `bg` | `#F5F3EC`, warm ivory |
| a card | `surface` | `#FCFBF6`, manuscript white, a hairline round it |
| figures, a figure's number, a note's number, the lead line | `primary` | `#0E6245`, emerald |
| words | `text` | `#23251F`, ink |
| labels, notes, the folio, the running head's label | `muted` | `#62655B`, pencil grey |
| hairlines | `border` | `#DDD9C8`, never words |
| rules, dots, a dashed threshold, a pale ground | `accent` | `#A8861D`, scholar's gold, never small words |
| the second and third series | `chartPalette` | `#3F5B8C` indigo, `#8A8471` pebble |
| a band behind a marked column, a chip | the emerald at 9.5% over the card | about `#E5ECE5` |
| a caveat, a lead row, a span after a reform | the gold at 15% over the card | about `#EFE9D5` |
| small words that must be gold | the gold toward the ink until 4.5:1 | about `#80691E` |

One thing a page leads, in emerald or in gold: the figure, column, row, cell or moment the page is about. Gold draws only lines, dots and pale grounds. Where a gold word is small, it is moved toward the ink until it reads at 4.5:1.

## The running head, the claim and the notes

- Every content page of a deck with a footer: at the top left the deck's label (the footer's `label`, 「硕士学位论文开题报告」) at 12/18 bold in the grey, its characters 3px apart. At the top right the page's section in emerald, its number and name a full em apart (「§2　文献与缺口」): the page's `stage`, numbered by its place in the deck's `course`. Under both, a gold hairline across the type area on y52.
- The claim bold at 30/42 in the heading serif from x64 across 1152px, its last line ending on y150. It stays on one line whenever it fits, and breaks at a comma or a colon when it does not.
- The body runs from y168 down to 16px over the notes' rule, or to y648 on a page without notes. A subheading becomes a standfirst at the body's top.
- Sources are notes. The author writes the page's `footnote` one note a line and points to each from the text with a superscript (「¹」, 「²」), which the engine sets in emerald bold. The notes stand over the folio under a 180px pebble rule, each its number in emerald bold, a full-width space and its words at 11/17 in the grey, at most two lines each, the last line on y676. Three notes at most: a fourth is declared dropped.
- The page number centred at the foot in the heading serif, 13px in the grey (PowerPoint's slide-number field). The office and the footer's notice at the bottom left, the draft and confidentiality marks at the bottom right, 11px. The cover, the section pages and the close carry none of these.

## Figures, tables and the lead

- Figures and tables are numbered across the deck as a paper numbers them. A chart or a timeline with a `title` is a figure, a table, a comparison or a matrix with a `title` is a table, and a captioned photograph on a `photo` page is a figure. The engine counts them in reading order and prints the number in emerald bold before the title (「图 3　参保职工 ÷ 参保离退休人员」, "Figure 3  Insured workers ÷ insured retirees"). The author writes only the title.
- A table is open, between two rules of ink, never boxes inside boxes. The column a table is about is set in emerald bold on the pale emerald, a row it leads with sits on the pale gold with a gold bar at its left.
- A figure is set large in the heading serif, its label small in the grey. The one the page lands on (`**…**`) is in emerald.
- A threshold is a dashed gold line with its name over it, a moment a plan turns on is a gold line with a gold diamond, the span after an event is the pale gold behind the lanes, a gap in the literature is a dashed gold frame. What is not settled is drawn as such: a hollow dot for a round carried out and not released, a dashed bar for a stretch of work not decided.
- A page closes on a line with a 3px gold bar at its left.
- Photographs illustrate rather than prove: a worker at a bench, older people exercising in a park, a grandparent on the school run, a library. On the cover the photograph runs down the right 460px, on a section page it fills the page under ivory from the left, beside a figure it sits with a plain caption under it. No readable text and no logos, captioned 「示意：…（AI 生成）」 when they are generated.
- Symbols are the built-in lucide icons, in emerald (gold for a hypothesis's direction, pebble for a question's).

## Type

The heading serif is Times New Roman with SimSun (the board was set in Songti), for claims, titles, figures, names and the folio. The body is Microsoft YaHei (PingFang on the board) for sentences, labels and notes. Weight does the work: bold for claims, titles, figures and names, regular for sentences.

| text | size |
| :-- | :-- |
| a section's number on its section page | 120 bold, emerald |
| a dose against its whole | 88 bold, emerald |
| the closing line | 46 bold, emerald |
| section title | 44 bold |
| cover title | 40 bold, emerald |
| figures on cards | 26 to 40 bold |
| claim | 30/42 bold |
| the close's points | 28 bold |
| a question set large | 26 bold, emerald |
| a card's thing, a row's name | 14 to 20 bold |
| sentences, cells, captions | 12 to 15 |
| running head, chips, axis names, notes, folio | 11 to 13 |

## How the author's marks are drawn

| the author marks | how it is drawn |
| :-- | :-- |
| a page's section (`stage`, with `course` on the deck) | its number and name in emerald at the top right, its row lit in the contents on its section page |
| a figure or table's name (`title` on a chart, timeline, table, comparison or matrix) | numbered across the deck before its title |
| a source (`footnote`, one a line, and a superscript in the text) | a numbered note over the folio |
| the figure a page lands on (`**…**` around a `kpi_cards` value) | in emerald |
| a staircase (`steps` on a `scatter` series) | stepped lines with a dot where each ends |
| a point's reading on a line (`note` on a line point) | named beside the point |
| a threshold (`markers` on a `line` chart) | a dashed gold line with its name over it |
| a matrix's questions and sources (`columns`, `rows`) and a gap (`empty`, `tone: "accent"`) | headed columns and rows, the gap a dashed gold frame |
| a round not yet released (`status: "pending"` on a milestone) | a hollow dot |
| a moment and a stretch not settled (`milestones` and `basis` on a `gantt`) | a gold line and diamond, a dashed bar |
| how an effect is told apart (`sketch`) | a discontinuity or a difference in differences, drawn small, the cutoff dashed in gold |
| the cover's report fields (`fields`) and the close's small title (`kicker`) | ruled lines under the title, emerald tracked words over the points |

## Where a new page starts

Before drawing, find the closest part in [Reusable parts](./reusable-parts.md#thesis-retirement-age-thesis-proposal-sample-2026-10). thesis's content pages are `manuscript-sheet`, which hands its body to a composition in the manuscript setting: `inquiry` for a question beside its figure, `ladder` for schedules that climb in steps, `reach` for a dose against its whole, `backdrop` for figures beside a trend, `thresholds` for a line that falls at the ages a rule turns on, `tabulation` for a table of comparable studies, `partition` for a whole and where it went, `findings` for studies in their own units, `coverage` for a literature map, `propositions` for hypotheses, `cadence` for survey rounds against a reform, `designs` for two designs with their sketches, `hazards` for threats and answers, `itinerary` for a schedule with its gate, and `queries` for questions to a committee. The cover is `manuscript-cover`, a section page `manuscript-chapter`, the close `manuscript-ending`. A statement and a quote keep `statement` and `pull-quote`. A new page is usually a new composition in the manuscript setting, drawn inside the band from y168: ivory paper, emerald figures, gold rules, the lead once.

A content page none of the compositions takes is drawn by the component renderer in the same band, under the same running head, claim and notes.
