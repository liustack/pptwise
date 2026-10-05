---
summary: 'The settled ember design system handed to a design tool together with the general design brief: one pitch on a dark stage, the deck label and the running order with the beat of each page lit, the 34px claim, charcoal cards, one fire a page with the dark ink on it, photographs darkened in the colour of the stage, the type sizes, and the parts a new ember page starts from'
read_when:
  - drawing an ember page, face or composition that the 2026-10 board did not draw
  - changing anything ember paints, before opening the code
  - judging whether an ember page in a showcase or the gallery follows the board
---

# Designing for ember

ember was redrawn to one approved board in October 2026, as one pitch: a founder on a dark stage asking a room for money or belief, one beat a page, from the opening to the ask. This page states the rules that board settled, so the next page drawn for ember follows them without a new argument. Paste it into the design tool after [Design brief](./design-brief.md), which still holds every general rule (vector primitives, contrast, the safe area, what to attach). Where the two disagree, this page wins for ember: its type area runs from x64 to x1216, and its label, running order, captions, labels, notes, folio and source are 11 to 15px. The board, its source and every place the engine departs from it on purpose are in [`design/rounds/2026-10-06-ember/`](../design/rounds/2026-10-06-ember/README.md).

## Palette

Take the colours from `pptwise themes --json`, not from this page. For reading the rules below:

| role | token | value |
| :-- | :-- | :-- |
| the stage, every page type | `bg` | `#241B14`, charcoal |
| a card | `surface` | `#2C221A`, a step lighter |
| words, figures | `text` | `#F2E9DF`, ivory |
| labels, notes, the source, the folio, the deck label | `muted` | `#C4AE97`, warm grey |
| hairlines, card bands | `border` | `#6B5648`, never words |
| the fire: one thing a page | `accent` (and `primary`) | `#E56A2C` |
| words on the fire | the readable ink on the accent | `#0A0E14`, never white |
| a grid, a track, a rule between rows | the hairline over the stage at 54% | about `#4A3B30` |
| a band in the middle of a funnel | the hairline over the stage at 73% | about `#5A4638` |
| a bar, band or part that is not the page's | the palette's quietest ink | `#A89888`, sand |
| the running order's other beats | the warm grey over the stage, lifted to 4.5:1 | about `#948370` |
| a tint under a lit column or row | the fire over the stage at 8% to 10% | |

The fire is the one light on stage, and it lights exactly one thing a page: the wedge on the cover and the close (and the close's button), the outlined number on an act, the figure, column, bar, card, row or gate a content page is about. Everything else that has to be told apart steps down from the hairline toward the stage or takes the sand.

## The head, the claim and the foot

- Every content page: the deck's `footer.label` at 12px bold in the warm grey at the top left, x64, on y28, its characters 3px apart (「种子轮路演」, "Seed round"). Write it as the occasion.
- At the top right, ending at x1216 on y28, the deck's `course` as a row of words, 12px in boxes 20px tall and 14px apart. The page's `stage` in the ivory, bold, with a 2px underline 2px under its box, the others in the dimmed grey. Eight beats fit: 机会, 时机, 竞争, 切入, 证明, 风险, 计划, 请求 (Opportunity, Timing, Rivals, Wedge, Proof, Risks, Plan, Ask). A content page carries no `kicker`: the running order names the beat.
- The claim bold at 34/46 from x64 across 1152px, at most two lines, its last line ending at y160. It stays on one line whenever it fits. When it does not, it breaks after its last comma or colon that lets both lines fit, and a line is never broken early to even the two.
- The body runs from y196 to y640. The source at 12/16 in the warm grey from y650, up to two lines, written as the author writes it (「来源：…」, "Source: …").
- On content pages of a deck with a footer, the folio at y686: the page number at the right, 12px in the warm grey (PowerPoint's slide-number field, so 「3」 and not 「03」), the office and the footer's notice at the left. The cover, the acts and the close carry none.

## Cards, photographs and the fire

- A card is the surface, rounded 4px, with no outline. A card's band across its top is the hairline (the ivory on the one a page is about). A row of a table or register is divided by the dark band, not by a card.
- A figure is set large and bold in the ivory, its unit small in the warm grey after it, what it measures under it at 14 to 16px in the warm grey.
- The thing a page is about takes the fire: a figure in the fire, a card or bar of the fire with its words in the dark ink, a column or row in a 1px frame of the fire over the fire's tint, a diamond of the fire on a track. Never two things on one page.
- A conclusion is a bar of the fire across the band, its icon and words in the dark ink. A rule that can stop the plan is a 1.5px outline of the fire. What a page leaves out on purpose is a dashed outline of the hairline, the thing struck through.
- Photographs are the pitch's world at dusk: a drone over a city, a street from above, a pad on a roof, a sample box. On the cover and an act the photograph fills the page under a darkening of the stage's own colour (from the foot on the cover, from the left on an act), and the words stand in the dark. On the photograph page it fills the left 560px from edge to edge, its caption at 11px on a strip of the stage. No readable text and no logos, captioned 「示意图，AI 生成」 when they are generated.
- Symbols are the built-in lucide icons, in the warm grey (the fire on the thing a page is about), set wherever a field takes one.

## Type

Microsoft YaHei for everything (PingFang on the board). Weight does the work: bold for claims, titles, figures and names, regular for sentences.

| text | size |
| :-- | :-- |
| an act's number | 200, outlined in the fire, no fill |
| a lit figure beside a photograph | 120 bold, the fire |
| cover and close titles | 64/76 and 64/80 bold |
| an act's title | 46/60 bold |
| figures on cards, the ask | 30 to 64 bold |
| claim | 34/46 bold |
| card titles, gate and bet names | 19 to 22 bold |
| the page's point, a conclusion | 16 to 22 |
| sentences, notes, cells | 14 to 17 |
| deck label, running order, captions, labels, folio, source | 11 to 14 |

## How the author's marks are drawn

| the author marks | how it is drawn |
| :-- | :-- |
| the pitch's beats (`course` on the deck) and a page's beat (`stage`) | the running order at the top right, that beat in the ivory, bold, underlined |
| the occasion (`footer.label`) | the label at the top left of every content page |
| the figure a page is about (`**…**` around a `kpi_cards` value) | in the fire, set large |
| the part a funnel narrows to | its last level, in the fire |
| the column no rival can fill (`emphasis` on a `data_table` column) | framed in the fire over its tint, every cell bold in the fire |
| the row a register leads with (`emphasis: "highlight"` on a table row) | on the fire's tint, its icon in the fire |
| the bet a plan leads with (`emphasis` on a gantt row) | its edge, number and stretch in the fire |
| the year a climb lands on (`highlight` on a milestone) | its year and icon in the fire |
| the gate that opens the business | the last chevron stage, a card of the fire |
| the check that can stop the plan (`checkpoint` on a roadmap phase) | a diamond of the fire on the run, the rule as an outline of the fire |
| what the wedge leaves for later (`excluded` on `concept_equation`) | a dashed box under the sum, the thing struck through |
| figures that cannot be compared (a `tag` per run of `kpi_cards`) | two groups apart with a dashed line between |
| the button's words (the close's `paragraph`) | on a button of the fire in the dark ink |

## Where a new page starts

Before drawing, find the closest part in [Reusable parts](./reusable-parts.md#ember-low-altitude-delivery-pitch-sample-2026-10). ember's content pages are `pitch-sheet`, which hands its body to a composition in the pitch setting: `expanse` for how small one thing is beside another, `stairs` for why now as steps that climb, `funnel` for a plan narrowed to the part the pitch is about, `rivals` for who is in the market and what none of them has said, `equation` for where the pitch cuts in worked out as a sum, `bets` for what the plan must prove and when, `divide` for two sets of figures that cannot be compared, `locks` for the gates before the business can run, `register` for risks with what happened and the response, `runway` for what the round buys phase by phase with the gate that can stop it, and `uses` for the ask and where its money goes. The photograph page is `pitch-photo`, with `spotlight` for one figure lit beside the photograph. The cover is `pitch-cover`, an act `pitch-chapter`, the close `pitch-ending`. A new page is usually a new composition in the pitch setting, drawn inside the band from y196 to y640: charcoal cards a step off the stage, figures large in the ivory, the fire once.

A content page none of the compositions takes is drawn by the component renderer in the same band, under the same head.
