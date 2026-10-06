---
summary: 'The settled proposal design system handed to a design tool together with the general design brief: a client proposal in a ring binder, the tabs that name each section, the deck label, the 32px claim, sand cards on white paper, petrol figures, one brick red a page with white on it, the type sizes, and the parts a new proposal page starts from'
read_when:
  - drawing a proposal page, face or composition that the 2026-10 board did not draw
  - changing anything proposal paints, before opening the code
  - judging whether a proposal page in a showcase or the gallery follows the board
---

# Designing for proposal

proposal was drawn to one approved board in October 2026, as a client proposal in a ring binder: a supplier asking a client's management to sign off a proposal, a solution or a bid, one section a tab, from what the client gets to the decisions they are asked to make. This page states the rules that board settled, so the next page drawn for proposal follows them without a new argument. Paste it into the design tool after [Design brief](./design-brief.md), which still holds every general rule (vector primitives, contrast, the safe area, what to attach). Where the two disagree, this page wins for proposal: its type area runs from x64 to x1196, leaving the right edge to the binder's tabs, and its label, tabs, chips, notes, page number and source are 11 to 15px. The board, its source and every place the engine departs from it on purpose are in [`design/rounds/2026-10-06-proposal/`](../design/rounds/2026-10-06-proposal/README.md).

## Palette

Take the colours from `pptwise themes --json`, not from this page. For reading the rules below:

| role | token | value |
| :-- | :-- | :-- |
| the paper, every page but a section page | `bg` | `#FFFFFF` |
| a card, an idle tab | `surface` | `#F3F0EA`, warm sand, no outline |
| claims, figures, dark blocks, the lit tab | `primary` | `#0E3B53`, petrol |
| words | `text` | `#14212B`, ink |
| labels, notes, the source, the page number | `muted` | `#55606A`, grey |
| hairlines | `border` | `#E2DDD4`, never words |
| the lead: one thing a page | `accent` | `#B8412C`, brick red |
| small words in the brick red, a marked run | `emphasisInk` | `#B8412C`, the brick red itself |
| words on the brick red | white | `#FFFFFF`, never the ink |
| bars and steps that are not the page's | `chartPalette` | `#2F6A8A` second petrol, `#8DBBD3` sky, `#B0956A` sand |
| a bar of words under the cards | the second petrol at 12% over the paper | about `#E4EDF2` |
| a lead row's tint | the brick red at 14% over the paper | about `#F5E4E1` |
| an incident | `danger` | `#812920`, a deep red apart from the brick red |
| an answer, a shield | `success` | `#2A7554` |

The brick red lights exactly one thing a page: the figure, bar, step, row, card or button a content page is about. Everything else steps between the paper, the sand, the pale petrol and petrol. The sky and the sand never carry words.

No orange. The board drew the lead in a tangerine, and on 2026-10-06 the maintainer moved it to this brick red because petrol blue beside an orange is a taboo in every theme (`src/themes/chart-palette-taboo.test.ts`). A new page does not bring an orange back, in a chart or anywhere else.

## The tabs, the label and the claim

- Every page but the cover: the binder's tabs down the right edge from y118, a tab every 98px and 92px tall, one a section of the deck's `course`, at most five. The page's own section (its `stage`) is 52px wide in petrol, rounded 8px on its left, with its name at 15px bold in white. The others are 36px wide on sand (white at 86% over a photograph), rounded 6px, with their names at 13px in the grey. A Chinese name stands one character under another, 6px apart. A Latin name is turned a quarter, reading down.
- The author writes the deck's sections once as `course.stages` and each page's section as its `stage`. A section page and the close light their own tabs too.
- On content pages of a deck with a footer, the deck's label at the top left on y34: the footer's `label` at 12/18 bold, its characters 1px apart, the part before the first 「 · 」 in petrol and the rest in the grey.
- The claim bold at 32/44 in petrol from x64 across 1132px, at most two lines, its last line ending at y150. It stays on one line whenever it fits.
- The body runs from y172 to y640 over a source and to y648 without one. The source at 12/17 in the grey from y650, up to two lines, written as the author writes it (「来源：…」, "Source: …").
- The page number at y678, 13px bold in the grey, right-aligned at x1196 (PowerPoint's slide-number field, so 「2」 and not 「02」). The office and the footer's notice at the bottom left. The cover, the section pages and the close carry none.

## Cards, figures and the brick red

- A card is the sand, rounded 12px, with no outline. A table is open rows under a 2px rule of petrol with hairlines between them, or bars of sand a row, not boxes inside boxes.
- A figure is set large and bold in petrol, its label and note in small grey under it. The figure the page lands on (`**…**`) is in the brick red, or on a block of the brick red with white on it.
- What a sum rests on is named next to it: a symbol in a petrol disc, an outlined chip for the kind of source (「政策原文」, 「行业协会」, 「企业口径」).
- What is not settled is shown as such: a dashed card for an optional part, an empty box to tick, a blank of dashes in a quote, a grey chip for a worked example (「示意」).
- A page closes on one of four lines: a bar of the pale petrol with an icon, a line under a hairline in grey, a bare grey line, or a closing line under a 2px rule of petrol with its first sentence bold.
- Photographs are the client's own kind of site: a factory roof under panels, battery cabinets on a plant floor, a switch room, a worker on a roof. On the cover the photograph runs down the right 560px beside the white page, on a section page it fills the page under petrol from the left, and beside a card it runs across the card's top. No readable text and no logos, captioned 「图为 AI 生成的示意图」 when they are generated.
- Symbols are the built-in lucide icons, in petrol (white on petrol, the brick red on what the page is about, the danger ink on an incident, the success ink on an answer).

## Type

Microsoft YaHei for everything (PingFang on the board). Weight does the work: bold for claims, titles, figures and names, regular for sentences. The board's 800 and 900 are bold.

| text | size |
| :-- | :-- |
| a section's number | 120 bold, the brick red, lifted toward white until it reads at 3:1 on petrol |
| the answer a sum lands on | 60 bold |
| cover title | 50 bold |
| section and close titles | 44 bold |
| figures on cards | 28 to 44 bold |
| claim | 32/44 bold |
| a card's thing, a decision | 20 to 21 bold |
| sentences, notes, cells | 13 to 16 |
| label, tabs, chips, page number, source | 11 to 15 |

## How the author's marks are drawn

| the author marks | how it is drawn |
| :-- | :-- |
| a page's section (`stage`, with `course` on the deck) | its tab lit in petrol |
| the figure a page lands on (`**…**` around a `kpi_cards` value) | in the brick red, or a block of the brick red with white on it |
| a day's tariff (`steps`, `label_every` and a band with an `icon` on `heatmap`) | runs of hours in four blues, the band framed in a dashed outline of the brick red |
| the case a payback is read at (`emphasis` on a bar) | the bar in the brick red |
| a measure that moved (`icon` and `note` on a `from_to` row) | its icon and its source under its name, the old value faded |
| an optional part (`tag` on an `image_grid` picture, with a `basis` not settled) | a dashed card with its tag as a chip |
| the way to pay a client is pointed to (`**…**` after a 「 · 」 in a comparison cell) | a chip of the brick red |
| the record or risk a page leads with (`emphasis: "highlight"` on a row) | a brick-red edge at its left, its chip in the brick red or the row on the tint |
| a lesson from an incident (`tone: "danger"` on an icon card, `title` on the set) | its icon in the danger ink under the set's small title |
| the step a plan dwells on (`highlight` on a milestone) | its arrow in the brick red |
| a decision with choices of its own (`item_choices` on the `ballot`) | its own boxes on its card |
| the button's words (the close's `paragraph`) | on a button of the brick red in white |

## Where a new page starts

Before drawing, find the closest part in [Reusable parts](./reusable-parts.md#proposal-rooftop-solar-and-storage-proposal-sample-2026-10). proposal's content pages are `binder-sheet`, which hands its body to a composition in the binder setting: `gains` for what the client gets, `hours` for a day's tariff place by place, `regions` for places side by side, `workings` for a sum worked line by line, `levers` for how a result moves, `cycles` for what a store of energy earns a day, `drift` for measures that moved, `parts` for what a solution is made of, `plans` for ways to pay, `precedents` for public records, `safeguards` for rules, lessons and who answers, `remedies` for a risk register, `checkpoints` for steps closed by papers, `quote` for a price list with blanks, and `papers` for what the client hands over. The cover is `binder-cover`, a section page `binder-chapter`, the close `binder-ending`. A new page is usually a new composition in the binder setting, drawn inside the band from y172 to y640: sand cards on white paper, petrol figures, the brick red once.

A content page none of the compositions takes is drawn by the component renderer in the same band, under the same tabs and claim.
