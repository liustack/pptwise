---
summary: 'The settled ledger design system handed to a design tool together with the general design brief: the status bar, the one content header, evidence in dark panels with title bars, amber once a page, green and red only for direction, the type sizes, and the parts a new ledger page starts from'
read_when:
  - drawing a ledger page, face or composition that the 2026-10 board did not draw
  - changing anything ledger paints, before opening the code
  - judging whether a ledger page in a showcase or the gallery follows the board
---

# Designing for ledger

ledger was redrawn to one approved board in October 2026, as a market screen. This page states the rules that board settled, so the next page drawn for ledger follows them without a new argument. Paste it into the design tool after [Design brief](./design-brief.md), which still holds every general rule (vector primitives, contrast, the safe area, what to attach). Where the two disagree, this page wins for ledger: its type area runs from x64 to x1216, and its status bar, panel titles and source line are 12 and 13px. The board, its source and every place the engine departs from it on purpose are in [`design/rounds/2026-10-04-ledger/`](../design/rounds/2026-10-04-ledger/README.md).

## Palette

Take the colours from `pptwise themes --json`, not from this page. For reading the rules below:

| role | token | value |
| :-- | :-- | :-- |
| page | `bg`, and the content gradient | `#0F1216`, the pages run `#151B23` to `#0C1016` top to bottom |
| panel | `surface` | `#171C22` |
| panel edge, hairlines | `border` | `#2A3440` |
| ink, figures | `text` | `#F2EFE8`, a warm paper white |
| quiet ink, labels, panel titles | `muted` | `#9AA7B4` |
| the one mark | `accent` | `#F0A63C`, terminal amber |
| up | `success` | `#2FA97C` |
| down | `danger` | `#DA6354` |
| unmarked series, nearest the mark first | `chartPalette` after amber | `#56677A`, `#3D4B5A`, `#2E3A47` |
| a quiet line, a hollow ring, a fall on a dot plot | `chartPalette` last | `#7E93A8` |
| a marked row's or column's ground | amber over the page at 12% | about `#2A2418` |
| the status bar | the page pressed toward the darkest ink | about `#0B0F15` |

Green and red never carry a series and never say good or bad: they say only which way a value moved. Amber is spent once a page.

## The status bar

A 32px bar across the top of every page, one step darker than the page, with a 1px border line under it. On the left a 6px amber dot and the organization at 12px muted from x78. On the right the date at 12px muted, right-aligned to x1216. No page number. The cover and the ending print `meta.organization`, the other pages print it when the deck asks its footer for it (`footer.organization`). The photo page's photograph starts under the bar.

## The content header

Every content page except the fact page and the photo page has one header and nothing else at the top.

- The claim in the heading face (a serif), regular weight, 31/42, across the full 1152px from x64, at most two lines, set on its last line at y130. It wraps only when it does not fit, and shrinks toward 26px before it is cut.
- A subheading becomes a 17px muted standfirst under the claim.
- The body runs from y152 to y648. The source sits at the foot in 13/18 muted type from y664, up to two lines.

The fact page keeps the claim and sets its figure under it. The photo page sets the claim at 30/42 beside the photograph, its last line at y136.

## Panels

Evidence sits in panels: the surface colour, a 1px border edge, square corners. The top 36px is a title bar: the panel's name on the left and its unit on the right, both 13px muted, over a 1px divider. The name comes from the block itself: a table's, comparison's or timeline's `title`, a chart's series or value axis title, a figure's label. The right side prints the unit and nothing else: how the figures were counted goes in the source line. A note (`callout`) after a table, timeline or chart is a panel of its own at 19/30, and a note written 「标签：说明」 is named by its label.

## Spending the mark

| the author marks | how it is drawn |
| :-- | :-- |
| a chart series (`series[].emphasis`) | its bars or line in amber, the other series in the slates nearest the top first |
| a bar (`series[].data[].emphasis`) | that bar in amber with its value bold, the others in the first slate |
| a change (`changes`) | a bracket over the two columns with its figure after an arrow: amber when no single bar is marked, the direction's colour when one is |
| a figure (`**…**` around a `kpi_cards` value) | the figure amber, and in a figure panel the panel's edge and name too |
| a table row (`emphasis: "highlight"`) | the row on the amber ground with a 3px amber bar down its left edge, its name bold in amber |
| a recommended option (`recommended`) | its column on the amber ground inside an amber edge, the header bold amber with 「（建议）」 after it |
| a numbered card (`emphasis`) | its panel's edge, number and title in amber |
| a milestone (`highlight`) | a larger amber node, its date and title in amber |
| a run of text (`**…**`) | amber |

A figure written with its sign ("+15.5%", "−7.1%") is itself a change and takes its direction's colour. A negative figure in a table is red. A `delta` puts an arrow after the figure in its direction's colour.

## Type

| text | size |
| :-- | :-- |
| cover title | 76, regular, down to 56 on one line, then two lines |
| ending decision | 52, regular |
| claim | 31, regular |
| fact page figure | 200 |
| −56% style lead in a panel | up to 110 |
| ticker figures | 52 |
| figure panels | 56, 48, 40 or 34, the largest that fits |
| table figures | 36 large, 28 compact |
| numbered panel titles, ending labels | 28 to 30 in the heading face |
| body, notes, paragraphs | 17 to 20 |
| labels, dates, legends | 14 to 15 |
| panel titles, source | 13 |
| status bar | 12 |

Figures and titles in the heading face (Lora, Georgia, Source Han Serif SC), everything else in the body face (Inter). No letter spacing: the export does not carry it.

## Where a new page starts

Before drawing, find the closest part in [Reusable parts](./reusable-parts.md#ledger-ai-capex-sample-2026-10). ledger's content pages are `panel-sheet`, which hands its body to a composition in the panel setting: `tiles`, `records`, `table`, `rail` with any panel chart beside figure panels, `figures`, `lanes`, `shifts`, `columns` and `bars`. The fact page is `panel-figure`, the photo page `image-split` with its `panel` column, the cover `stat-cover` with its ticker and the ending `close-word-ending`. A new page is usually a new composition in the panel setting, drawn inside the band from y152 to y648, every block in a panel with its title bar.

The chapter, statement and quote pages keep their earlier faces (`ghost-section-chapter`, `statement`, `pull-quote`) and have no board in the market-screen grammar yet. Each needs its board before it changes.
