---
summary: 'The settled journal design system handed to a design tool together with the general design brief: the pages of a small periodical, the masthead with the column, the section and the issue, the bottom-aligned serif claim, figures numbered across the deck with the editor comment under each, the source at the foot over a centred folio, one brick red lead a page, the type sizes, and the parts a new journal page starts from'
read_when:
  - drawing a journal page, face or composition that the 2026-10 board did not draw
  - changing anything journal paints, before opening the code
  - judging whether a journal page in a showcase or the gallery follows the board
---

# Designing for journal

journal was drawn to one approved board in October 2026, as a small magazine's annual letter to its subscribers: the editors reading ten years of a national reading survey to their readers, one section at a time, from the editor's note to the afterword. This page states the rules that board settled, so the next page drawn for journal follows them without a new argument. Paste it into the design tool after [Design brief](./design-brief.md), which still holds every general rule (vector primitives, contrast, the safe area, what to attach). Where the two disagree, this page wins for journal: its type area runs from x64 to x1216, and its masthead, captions, sources and folio are 11 to 13px. The board, its source and every place the engine departs from it on purpose are in [`design/rounds/2026-10-07-journal/`](../design/rounds/2026-10-07-journal/README.md).

## Palette

Take the colours from `pptwise themes --json`, not from this page. For reading the rules below:

| role | token | value |
| :-- | :-- | :-- |
| the paper | `bg` | `#EFEBE1`, magazine paper |
| a card | `surface` | `#F8F5EC`, the inner page's white |
| bars, the heavy rule, the lead series | `primary` | `#2C2C2A`, lead black |
| words | `text` | `#26261F`, ink |
| labels, comments, the source, the issue | `muted` | `#626159`, grey |
| hairlines | `border` | `#D9D3C2`, never words |
| the one lead, a figure's number, the section | `accent` | `#8C4A3C`, brick red |
| the other series | `chartPalette` | `#4E5E4A` moss, `#827C6B` linen grey |
| a dashed place for a year nobody published | the linen grey a fifth of the way over the hairline | about `#C8C2B1` |

One thing a page leads, in brick red: the bar, figure, line or plan the page is about, as the author marked it. Nothing turns red for being the tallest. Small words that would read below 4.5:1 on what they sit on are moved toward the ink until they do.

## The masthead, the claim and the foot

- Every content page of a deck with a footer: at the top left the column's name (the deck's `organization`, 「致读者」) at 13px bold in the heading serif, Chinese 6px apart. In the middle the page's section in brick red (its `kicker`, 「十年」), 11px bold, Chinese tracked wide (「十 年」). At the top right the issue (the footer's `label`, 「二〇二六年秋 · 年度长信」) at 11px in the grey. Under all three a heavy rule on y50 and a hairline on y55 across the type area.
- The claim bold at 32/44 in the heading serif from x64 across 1152px, its last line ending on y158. It stays on one line whenever it fits, and breaks at a comma or a colon when it does not. Beside a photograph that runs the height of the page up to the masthead, it takes the column beside the photograph.
- A composition is handed the band from y70, the top of the claim's box, down to the source. A page set by the component renderer starts its body at y186. A subheading becomes a standfirst under the claim.
- The page's `footnote` is its source, at the foot on y648, 11/15 in the grey, one line or two, never cut.
- The folio 「· 3 ·」 centred at the foot in the heading serif, the number 13px (PowerPoint's slide-number field). The office and the footer's notice at the bottom left, the draft and confidentiality marks at the bottom right, 11px. The cover and the close carry none of these.

## Figures, captions and the lead

- Figures are numbered across the deck. A chart, a timeline, a table, a comparison or a grid with a `title` is a figure. The engine counts them in reading order and prints 「图 3」 ("Figure 3") in brick red bold before the title at 12px. The author writes only the title. Two small multiples share one caption (「图 8、图 9」, "Figures 8 and 9").
- Under the caption the editor's comment: one line in the italic serif at 13px in the grey. The author writes it as a `callout` with words alone after the figure.
- A photograph only illustrates and takes no number. Its caption is plain, 11px italic in the grey, ending 「（AI 生成示意）」 ("(AI-generated)") when it is generated.
- A bar is lead black, its value over it or after it, and the one the page is about brick red. A second series is linen grey, a third moss. A year nobody published is a dashed outline with its label, never a zero. A line breaks at such a year.
- A figure is set large in the heading serif with its unit small after it. The one the page lands on (`**…**`) is in brick red.
- An effect size prints with its sign as the effect size it is (「−0.21」), never as a percentage, on a scale whose two sides are named.
- A pull quote stands between two rules of the type's ink, its words in brick red in the heading serif, a large brick red quotation mark at its left.
- Photographs illustrate rather than prove: a reading lamp at night, someone listening by a window, a metro car at rush hour, a stack of old magazines, a corner bookshop, a library. On the cover the photograph runs down the right 660px. No readable text and no logos.
- Symbols are the built-in lucide icons, in lead black (brick red beside the lead).

## Type

The heading serif is Times New Roman with SimSun (the board was set in Songti), for the masthead, claims, captions, figures, quotes and the folio. The body is Microsoft YaHei (PingFang on the board) for labels, tables and the source. Long text, the editor's note and the long read, is set in the heading serif. Weight does the work: bold for claims, figures and names, regular for sentences, italic for comments.

| text | size |
| :-- | :-- |
| a figure set alone | 200 bold, brick red |
| the cover's masthead | 96 extra bold |
| the cover story | 50 extra bold, brick red |
| the closing words | 44/74 bold |
| a quotation on its own page | 40/64 bold |
| figures in a column or on a card | 30 to 40 bold |
| claim | 32/44 bold |
| a pull quote | 32/50 bold, brick red |
| the editor's note and the long read | 20/38 |
| a row's name, a plan | 14 to 18 |
| comments, cells, labels | 12 to 13 |
| masthead, captions, the source, the folio | 11 to 13 |

## How the author's marks are drawn

| the author marks | how it is drawn |
| :-- | :-- |
| a page's section (`kicker`) | in brick red in the middle of the masthead |
| the column and the issue (`organization`, `footer.label`) | at the left and the right of the masthead |
| a figure's name (`title` on a chart, timeline, table, comparison or grid) | numbered across the deck before its title |
| the editor's comment (a `callout` with words alone after a figure) | an italic line under the caption |
| the source (`footnote`) | at the foot, one line or two |
| the one thing a page is about (`emphasis` on a point or a series, `**…**` around a figure) | brick red |
| a symbol before a bar's name (`icon` on a point of a bar chart on its side) | a symbol in the row's ink before the name |
| a year nobody published (`gaps` on a bar or line chart) | a dashed outline with its label, a break in the line |
| a change across a run (`changes`) and its basis (`tag` on a chart) | a bracket from the first bar to the last, the basis in brick red over the chart |
| what each side of zero means (`bands` on a bar chart on its side) | each range named at its own end under the scale |
| the cover lines (`fields`, the page as the name) | the page number in brick red beside each line |
| the afterword's section and sign-off (`kicker`, `subheading`) | the section in the masthead, the sign-off right-aligned under a rule, as the author breaks it |

## Where a new page starts

Before drawing, find the closest part in [Reusable parts](./reusable-parts.md#journal-annual-letter-to-readers-sample-2026-10). journal's content pages are `periodical-sheet`, which hands its body to a composition in the periodical setting: `foreword` for an editor's note beside its figures, `chronicle` for years of a reading on one line, `measures` for ways of doing one thing as bars with their symbols, `elapsed` for a day's habits now against an earlier year, `headline` for one figure huge beside its trend, `witness` for figures over a pull quote beside a photograph, `census` for a run of years with the years nobody published, `contrast` for two groups year by year beside a card, `bracket` for a run with its change bracketed beside a column of figures, `mix` for shares by column beside a share bar, `twins` for two small multiples on their own scales, `parallel` for findings side by side and never ranked, `effects` for effect sizes on one scale, `longform` for a long read under its pull quote, and `pledges` for plans with why. The cover is `periodical-cover`, a quotation `periodical-quote`, the close `periodical-ending`. A section page keeps `fascicle-ghost-chapter` and a statement `statement`. A new page is usually a new composition in the periodical setting, drawn inside the band from y70: magazine paper, lead black bars, the lead once in brick red, every figure numbered with its comment.

A content page none of the compositions takes is drawn by the component renderer under the same masthead, claim and source.
