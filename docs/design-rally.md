---
summary: 'The settled rally design system handed to a design tool together with the general design brief: one campaign proposal staged as a show, the ticket stub that names each section, the seeded confetti, the 34px claim, cards a step lighter than the house, charts in the confetti colours, one magenta a page with the dark ink on it, photographs darkened in the house colour, the type sizes, and the parts a new rally page starts from'
read_when:
  - drawing a rally page, face or composition that the 2026-10 board did not draw
  - changing anything rally paints, before opening the code
  - judging whether a rally page in a showcase or the gallery follows the board
---

# Designing for rally

rally was redrawn to one approved board in October 2026, as one campaign proposal staged as a show: a marketing team asking management to back a campaign, an event or a launch, one section a page, from the one-line plan to the requests. This page states the rules that board settled, so the next page drawn for rally follows them without a new argument. Paste it into the design tool after [Design brief](./design-brief.md), which still holds every general rule (vector primitives, contrast, the safe area, what to attach). Where the two disagree, this page wins for rally: its type area runs from x64 to x1216, and its ticket stub, captions, labels, notes, folio and source are 11 to 15px. The board, its source and every place the engine departs from it on purpose are in [`design/rounds/2026-10-06-rally/`](../design/rounds/2026-10-06-rally/README.md).

## Palette

Take the colours from `pptwise themes --json`, not from this page. For reading the rules below:

| role | token | value |
| :-- | :-- | :-- |
| the house, every page type | `bg` | `#2A1E3F`, curtain violet |
| a card, the ticket's stub | `surface` | `#35284E`, a step lighter |
| a scoreboard's panel | `primary` | `#23173A`, the stage's dark, a step darker |
| words, figures | `text` | `#F6F2F9`, stage light |
| labels, notes, the source, the folio | `muted` | `#B3A6C7`, violet grey |
| hairlines, dashed frames | `border` | `#4A3A66`, never words |
| a bar, cell or dot that is not the page's | the hairline lifted toward the grey | about `#5B4B7A` |
| the lead: one thing a page | `accent` | `#E84F8A`, magenta |
| words and icons on the magenta | the primary darkened | `#1A1030`, never white |
| charts and confetti | `chartPalette` | `#E84F8A`, `#F0B429`, `#4FC1E9`, `#9BE36D` |
| a caution, a figure to read with care | `warning` | `#F0B429`, gold |
| a tint under a lit row, behind a schedule's season | the magenta over the house at 18%, and at 10% behind a season | |

The magenta is the lead singer, and it lights exactly one thing a page: the figure, curve, card, row, bar or request a content page is about, and the stamp on every ticket. Charts and decoration share the confetti's four colours, so a bar and a strip of confetti are the same colour. Everything else that has to be told apart steps between the house, the card and the dim violet.

## The stub, the claim and the foot

- Every page: the ticket stub at the top left, x64, on y30 (y64 on the cover, a section page and the close). A stamp of the magenta, 30px tall, with the section's number at 12px bold in the dark ink, its characters 1px apart; a stub of the card colour with the section's name at 14px bold in the light; between them a dashed perforation in the house colour with a hole of the house colour punched at each end.
- The author writes the section's name as the page's `kicker` (「大盘」, "Market"), never its number. The engine numbers the sections in the order their names first appear on a chapter or a content page. The cover's stamp is its own `kicker` (「提案」, "Proposal") with the office and the date on the stub; the close's is its `kicker` (「下一步」, "Next") with its subheading on the stub.
- At the top right of every content page, seven strips of confetti in the box from (1100, 14), 160 by 44, seeded by the page number. Nothing else goes there.
- The claim bold at 34/46 from x64 across 1152px, at most two lines, its last line ending at y172. It stays on one line whenever it fits. When it does not, it breaks after its last comma or colon that lets both lines fit, and a line is never broken early to even the two.
- The body runs from y188 to y640 over a source and to y648 without one. The source at 12/16 in the grey from y650, up to two lines, written as the author writes it (「来源：…」, "Source: …").
- On content pages of a deck with a footer, the folio at y686: 「N / M」 at the right, 12px in the grey (PowerPoint's slide-number field, so 「2 / 18」 and not 「02 / 18」), the office, the footer's label and its notice at the left. The cover, the section pages and the close carry none.

## Cards, photographs and the magenta

- A card is the surface, rounded 12px, with no outline. A scoreboard's panel is the stage's dark with a hairline. A table's rows are bars of the card colour or open rows over hairlines, not boxes inside boxes.
- A figure is set large and bold, in the magenta when it is the page's, its unit and label on one bold line under it, its note in the grey.
- The thing a page is about takes the magenta: a figure, a solid curve against a dotted grey one, the marked bar, a card or ticket of the magenta with its words in the dark ink, a row on the magenta's tint, the bar a schedule is about. Never two things on one page.
- What a plan stays out of is the dim violet, its name grey. What is still unknown is an empty slot: three short dim bars where a figure will stand, and a tag that says when it will be set.
- A whole cut into shares is one bar in the confetti colours with its shares printed on it, the run set apart under a bracket with the author's line. A season is a run of months framed by a dashed outline of the magenta or tinted behind a schedule.
- Photographs are the show and the city around it: a crowd under the lights, a train to the show, a drink station outside a stadium, wristbands in the dark, fans walking out, a riverside at night, confetti on a stage. On the cover and the close the photograph fills the page under a darkening of the house colour from the foot, and the words stand in the dark. Beside a card it is rounded 10px. No readable text and no logos, captioned 「示意图（AI 生成）」 when they are generated.
- Symbols are the built-in lucide icons, in the grey (the magenta on the thing a page is about, the dark ink on the magenta), set wherever a field takes one.

## Type

Microsoft YaHei for everything (PingFang on the board). Weight does the work: bold for claims, titles, figures and names, regular for sentences. The board's 800 and 900 are bold.

| text | size |
| :-- | :-- |
| a figure a page lands on | 130 bold, the magenta |
| cover, section and close titles, the one-line plan's claim | 72 bold |
| figures on cards, a change at a curve's end | 56 to 72 bold |
| claim | 34/46 bold |
| the one-line plan's lead-in, a cover's line | 26 to 28 bold |
| card titles, request names, place names | 17 to 24 bold |
| sentences, notes, cells | 13 to 16 |
| ticket stub, labels, captions, folio, source | 11 to 14 |

## How the author's marks are drawn

| the author marks | how it is drawn |
| :-- | :-- |
| a page's section (`kicker`) | the ticket stub at the top left, numbered by the engine |
| the claim's key words on the one-line plan (`**…**`) | in the magenta, at 72px |
| the figure a page is about (`**…**` around a `kpi_cards` value, or a figure alone) | in the magenta, set large |
| the series a split is about (`emphasis` on a line series) | the solid magenta curve, the other dotted grey |
| the season (`bands` on `heatmap` or `gantt`) | framed in a dashed outline of the magenta, or tinted behind the bars |
| the run of a crowd or a budget (`emphasis` on share bar series, `emphasis_label`) | the run in the magenta's steps under a bracket with the author's line |
| a stop the plan stays out of (`tone: "warning"` on a step) | the dim violet, its second sentence over its disc |
| the place a map leads with (`emphasis: "first"` on `image_grid`) | its card outlined in the magenta |
| the kind of source behind a peer's figure (`evidence` on a `tag`) | the tag outlined in that kind's ink |
| the column a table is about (`emphasis` on a `data_table` column) | bold in the magenta |
| the risk a page leads with (`emphasis: "highlight"` on a table row) | on the magenta's tint, its icon in the magenta |
| the stop a schedule is about (`emphasis` and `icon` on a gantt row) | its bar and name in the magenta, the icon on the bar |
| a measure whose target is not set (`tone: "warning"` on an icon card's tag) | three empty slots and the tag in the gold |
| the request a page leads with (`emphasis` on `numbered_cards`, with a `ballot`) | a ticket of the magenta, a box per choice on its stub |
| the button's words (the close's `paragraph`) | on a button of the magenta in the dark ink |

## Where a new page starts

Before drawing, find the closest part in [Reusable parts](./reusable-parts.md#rally-summer-concert-season-proposal-sample-2026-10). rally's content pages are `marquee-sheet`, which hands its body to a composition in the marquee setting: `crest` for one figure beside the run of years that led to it, `branch` for two things that parted ways, `season` for when in the year things peak, `makeup` for what a crowd is made of, `origins` for where a crowd comes from beside a photograph, `route` for a weekend stop by stop, `spots` for the places a plan meets its crowd, `wall` for what peers did and what they could show, `loop` for steps whose last feeds the first, `stubs` for offers a ticket earns, `fallbacks` for a plan B per risk, `timetable` for a plan month by month, `scoreboard` for measures still to be filled, `allotment` for a budget cut into shares, and `asks` for the requests with a box per choice. The one-line plan is `marquee-statement`. The cover is `marquee-cover`, a section page `marquee-chapter`, the close `marquee-ending`. A new page is usually a new composition in the marquee setting, drawn inside the band from y188 to y640: cards a step off the house, charts in the confetti colours, the magenta once.

A content page none of the compositions takes is drawn by the component renderer in the same band, under the same stub and claim.
