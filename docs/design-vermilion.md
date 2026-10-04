---
summary: 'The settled vermilion design system handed to a design tool together with the general design brief: the gold double rule, the letterhead cover, the one centred red content header, items numbered in red squares, open tables, red once a page and gold only for drawing, the type sizes, and the parts a new vermilion page starts from'
read_when:
  - drawing a vermilion page, face or composition that the 2026-10 board did not draw
  - changing anything vermilion paints, before opening the code
  - judging whether a vermilion page in a showcase or the gallery follows the board
---

# Designing for vermilion

vermilion was redrawn to one approved board in October 2026, as the page of an official document. This page states the rules that board settled, so the next page drawn for vermilion follows them without a new argument. Paste it into the design tool after [Design brief](./design-brief.md), which still holds every general rule (vector primitives, contrast, the safe area, what to attach). Where the two disagree, this page wins for vermilion: its type area runs from x80 to x1200, its gold rules from x64 to x1216, and its headers, labels, tags and source line are 14 and 15px. The board, its source and every place the engine departs from it on purpose are in [`design/rounds/2026-10-04-vermilion/`](../design/rounds/2026-10-04-vermilion/README.md).

## Palette

Take the colours from `pptwise themes --json`, not from this page. For reading the rules below:

| role | token | value |
| :-- | :-- | :-- |
| page | `bg` | `#F6EFE3`, warm paper |
| panel | `surface` | `#FCF8EF` |
| hairlines, a panel's edge | `border` | `#E0D2B8` |
| ink | `text` | `#33231C` |
| archive grey: labels, subtitles, the source | `muted` | `#6E5B4B` |
| the one mark, the claim, the letterhead | `primary` and the emphasis ink | `#B02318`, vermilion red |
| drawing only: rules, bars, arrows, rings, outlines | `accent` | `#C79A3B`, gold |
| unmarked series, nearest the mark first | `chartPalette` after red | `#A89480`, then `#CDBBA5` |
| a marked row's ground | red over the panel at 11% | about `#F4E1D7` |
| a value range's tint | gold over the page at 14% | about `#EFE3CC` |

Gold presses the page at 2.26:1 and never carries a word: a tag that says something changed is outlined in gold and lettered a step toward the ink. Red is spent once a page.

## The rules and the header

- A gold double rule, 2px and 1px six pixels apart, from x64 to x1216: at the head of every content page (y26 and y32), at the foot of the cover (y668 and y674), and both on the ending. The chapter page draws its own closing rule. The photo page draws it in its column, from the photograph's edge.
- The claim centred and bold in red at 34/44 across the full 1120px from x80, at most two lines, set on its last line at y140. It wraps only when it does not fit, and then its lines are evened: a Chinese claim breaks at its comma. It shrinks toward 28px before it is cut.
- A 64 by 2 gold bar centred at y154.
- A subheading becomes an 18px archive-grey standfirst under the bar, up to two lines.
- The body runs from y186 to y648. The source sits at the foot at 14/20 in archive grey from y660, up to two lines.

The fact page keeps the claim and sets its figure under it. The photo page sets the claim at 32/44 beside the photograph, its last line at y146, with the bar under it on the left.

## The cover and the ending

The cover is a letterhead: the issuing body (`meta.organization`) centred in red, bold, 52px, its Chinese characters 12px apart, a Latin name unspaced. A 4px and a 1px red rule from x80 to x1200 at y184 and y194. The title centred in the ink at 56/72, evened over two lines, its last line on a box ending at y400. The subtitle at 22px and the date with the authors at 18px in archive grey. No body text, no picture.

The ending asks for a decision: what the page asks of the room in an 18px grey line (`subheading`), the decision centred in red at 52px (`heading`), a 64 by 2 gold bar, and two to four cards from the first `bullets`: the panel with a hairline edge, a 60px numbered square, the label at 28px bold and the gloss at 18/28. An item written 「标签：说明」 splits at the colon.

## Numbers and the mark

Items are numbered in the deck's own numerals: 一 to 十 in a Chinese deck, 1 to 10 in an English one, white on small red squares (44px in a row, 40px in a panel or a cell, 60px on the ending). The language comes from the deck's headings.

| the author marks | how it is drawn |
| :-- | :-- |
| a numbered card (`emphasis`) | as a row: reversed out of red, its square turned white. As a panel: a red bar along its top and its title in red. In a two-column list: the cell reversed out of red |
| a comparison or `from_to` row (`emphasis`) | the row on red's pale tint, its words in the focus column bold in red, its tag filled red |
| a goal off track (`scorecard` `status: "off_track"`) | the row on red's tint, its goal, figure and gap in red, its verdict a filled red tag |
| a figure (`**…**` around a `kpi_cards` value) | the figure in red |
| a chart point (`data[].emphasis`) | its series in red and its category's name bold in red, the other series in the warm greys |
| a chart series (`series[].emphasis`) | its bars or line in red |
| a milestone (`highlight`) | a filled red node, its stem, date and title in red |
| a rate (`progress_donuts` `emphasis`) | its ring, rate and name in red, the other rings in gold |
| a run of text (`**…**`) | red |

## Open tables and tags

A table is open: its headers at 15px in archive grey over a 2px red rule, hairlines between rows, no fill but the marked row's. A comparison reads toward one column, the recommended one or else the later of two: its header bold in red, its cells in the ink, the other columns grey. A row's tag stands at the right edge under the table's `tag_column` header: outlined in gold when it says what changed, outlined in grey when it says nothing changed (`quiet`), filled red on the marked row. Tags are 14px in a 26px label.

## Type

| text | size |
| :-- | :-- |
| cover issuing body | 52, bold, Chinese spaced 12px |
| cover title | 56, bold |
| ending decision | 52, bold |
| claim | 34, bold |
| fact page figure | 240, bold, set 8px tight, stepping to 200, 160 and 128 |
| figures beside a chart or a photograph | 32 to 44 |
| table figures | 24 |
| row and panel titles, ending labels | 19 to 28, bold |
| body, glosses, notes | 17 to 19 |
| headers, legends, labels | 15 |
| tags, the source | 14 |

Microsoft YaHei for every word, Chinese and English: the theme gives its faces by role, and the English hyphen in YaHei is an ordinary hyphen. Letter spacing only where the export carries it (a `<tspan dx>`): the cover's issuing body and the fact page's figure.

## Where a new page starts

Before drawing, find the closest part in [Reusable parts](./reusable-parts.md#vermilion-government-work-report-sample-2026-10). vermilion's content pages are `seal-sheet`, which hands its body to a composition in the seal setting: `rows` and `tiles` for numbered points, `roster` for a list of six to ten, `scores` for a scorecard, `table` for a comparison, `targets` for a plan's statement beside its targets, `rail` for a chart beside figures, `columns` for grouped bars, `trend` for one line over a value range, `lanes` for a timeline and `rings` for completion rates. The fact page is `seal-figure`, the photo page `image-split` with its `seal` column, the cover `red-head-cover` and the ending `deliberation-ending`. A new page is usually a new composition in the seal setting, drawn inside the band from y186 to y648: numbers in squares, open tables, red once.

The chapter, statement and quote pages keep their earlier faces (`seal-numeral-chapter`, `statement`, and no quote page) and have no board in this round. Each needs its board before it changes.
