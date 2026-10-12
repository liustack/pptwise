---
summary: 'The settled proposal design system handed to a design tool together with the general design brief: a client proposal printed for a ring binder, the running head that names each section, the 30px claim, hairlines and ruled tables on white paper, petrol figures, one brick red a page, the type sizes, and the parts a new proposal page starts from'
read_when:
  - drawing a proposal page, face or composition that the 2026-10 board did not draw
  - changing anything proposal paints, before opening the code
  - judging whether a proposal page in a showcase or the gallery follows the board
---

# Designing for proposal

proposal was drawn to one approved board in October 2026 and set as print in a second round the same month: a client proposal printed for a ring binder, a supplier asking a client's management to sign off a proposal, a solution or a bid, from what the client gets to the decisions they are asked to make. This page states the rules those boards settled, so the next page drawn for proposal follows them without a new argument. Paste it into the design tool after [Design brief](./design-brief.md), which still holds every general rule (vector primitives, contrast, the safe area, what to attach). Where the two disagree, this page wins for proposal: its type area runs from x64 to x1216, and its running head, notes, page number and source are 11 to 15px. The boards, their source and every place the engine departs from them on purpose are in [`design/rounds/2026-10-06-proposal/`](../design/rounds/2026-10-06-proposal/README.md).

## Palette

Take the colours from `pptwise themes --json`, not from this page. For reading the rules below:

| role | token | value |
| :-- | :-- | :-- |
| the paper, every page but a section page | `bg` | `#FFFFFF` |
| a card or a missing photograph, inside a hairline frame | `surface` | `#FFFFFF`, the paper's own white, with `cardStroke` `#E2DDD4` and `radius` 0 |
| claims, figures, the running head's section, a section page's half | `primary` | `#0E3B53`, petrol |
| words, the 2px rules of a table | `text` | `#14212B`, ink |
| labels, notes, the source, the running head's label | `muted` | `#55606A`, grey |
| hairlines | `border` | `#E2DDD4`, never words |
| the lead: one thing a page | `accent` | `#B8412C`, brick red |
| small words in the brick red, a marked run | `emphasisInk` | `#B8412C`, the brick red itself |
| bars and steps that are not the page's | `chartPalette` | `#2F6A8A` second petrol, `#8DBBD3` sky, `#B0956A` sand |
| an incident | `danger` | `#812920`, a deep red apart from the brick red |
| an answer, a shield | `success` | `#2A7554` |

The brick red lights exactly one thing a page: the figure, bar, step or row a content page is about, the payback and a short rule under the title on the cover, the numbers of the decisions on the close. It is a mark or words, never a block with words on it. Everything else steps between the paper, hairlines, the ink and petrol. The sky and the sand never carry words.

No orange. The board drew the lead in a tangerine, and on 2026-10-06 the maintainer moved it to this brick red because petrol blue beside an orange is a taboo in every theme (`src/themes/chart-palette-taboo.test.ts`). A new page does not bring an orange back, in a chart or anywhere else.

## The running head, the claim and the foot

- Every content page and the close: a running head on y36. At the left the deck's label (the footer's `label`) at 13px regular in the grey. At the right the page's section in petrol bold at 13px, named by its label in the deck's `course` with no number (「算账」, "Numbers"), since one part of a deck may span several stages. A hairline under both on y64, across the whole measure.
- The author writes the deck's sections once as `course.stages` and each page's section as its `stage`. No tabs, no index down the edge.
- The claim bold at 30/42 in petrol from x64 across 1152px, from y92, at most two lines. It stays on one line whenever it fits, and a second line lifts it 20px.
- The body runs from y176 to y640 over a source and to y648 without one.
- The foot: the source at 11/16 in the grey at the left, its last line on y686 (on the line above when the office is printed there), written as the author writes it (「来源：…」, "Source: …"). The page number at the right on y686, 13px bold in the ink, right-aligned at x1216 (PowerPoint's slide-number field, so 「2」 and not 「02」). The office and the footer's notice at 11px in the grey at the bottom left. The cover, the section pages and the close carry no page number.

## Rules, figures and the brick red

- Print, not web parts: no cards, chips, pills, tabs or buttons. Rows and columns are parted by hairlines, a table opens under a 2px ink rule below its headers and closes on another. A column of figures stands between vertical hairlines.
- A figure is set large and bold in petrol, its label and note in small grey under it. The figure the page lands on (`**…**`) is in the brick red.
- What a sum rests on is named next to it: a symbol in italic petrol, the kind of source as plain small grey words in a column of its own headed 「来源」 or 「口径」.
- What is not settled is shown as such: a dashed rule under an optional part, an empty square box to tick, a blank of dashes in a quote, 「（示意）」 in small grey after a worked example.
- A page closes on one plain line after a small grey icon, its title bold before its text, or on a closing line under a 2px rule of petrol with its first sentence bold. No bars or boxes of colour.
- Photographs are the client's own kind of site: a factory roof under panels, battery cabinets on a plant floor, a switch room, a worker on a roof. On the cover the photograph runs down the right 560px beside the white page, on a section page it fills the right half beside the petrol, and above a part it runs across the column's top with square corners. No readable text and no logos, captioned 「图为 AI 生成的示意图」 when they are generated.
- Symbols are the built-in lucide icons, as line icons: in petrol on the paper, white on petrol, grey before a closing note, the brick red on what the page is about, the danger ink on an incident, the success ink on an answer.

## The cover, the section page and the close

- The cover: on the white page, the deck's name bold in petrol and the date in grey over an ink hairline. Who it is for (the page's `kicker`, 「呈 贵司管理层」) at 16px in the grey, its characters spaced 3px, over the title. The title bold at 46/60 in petrol across 592px, a 56 by 3px brick-red rule under it, the subtitle at 18px. Three figures along the foot between hairlines, the one marked whole (`**…**`) in the brick red. The photograph down the right, its caption small in grey under the figures.
- A section page: petrol on the left half, the page's photograph bled off the right half with its caption (the page's `footnote`) small in white at its bottom right. Over the petrol a running head in white: the deck's name at the left, the part (the `kicker` before 「 · 」, 「第一部分」) at the right, a white hairline at 35% under them. The section's number at 120px in the brick red lifted to read on petrol, its name spaced out at 18px, the title bold at 36/50 in white, and the questions the part answers on ruled rows, each with a white line icon.
- The close: the running head and the claim as on a content page, then one ruled row a decision: its number in two digits bold in the brick red, the decision bold at 20px with a grey note under it, and its choices as empty square boxes at the right. Under the rows, the author's line to fill in (「约踏勘时间 ＿＿＿ 年 ＿＿ 月 ＿＿ 日」): the words bold in petrol, each run of 「＿」 a line to write on. Nothing is drawn where the author wrote no words for it.

## Type

Microsoft YaHei for everything (PingFang on the board). Weight does the work: bold for claims, titles, figures and names, regular for sentences. The board's 600, 800 and 900 are bold.

| text | size |
| :-- | :-- |
| a section's number | 120 bold, the brick red, lifted toward white until it reads at 3:1 on petrol |
| the answer a sum lands on | 72 bold |
| cover title | 46 bold |
| section title | 36 bold |
| figures | 24 to 52 bold |
| claim, the close's title | 30/42 bold |
| a decision, a column's name | 17 to 21 bold |
| sentences, notes, cells | 13 to 16 |
| running head, page number, source | 11 to 13 |

## How the author's marks are drawn

| the author marks | how it is drawn |
| :-- | :-- |
| a page's section (`stage`, with `course` on the deck) | the right of the running head, its name with no number |
| the figure a page lands on (`**…**` around a `kpi_cards` value) | in the brick red |
| a day's tariff (`steps`, `label_every` and a band with an `icon` on `heatmap`) | runs of hours in four blues, the band framed in a dashed outline of the brick red |
| the case a payback is read at (`emphasis` on a bar) | the bar in the brick red |
| a measure that moved (`icon` and `note` on a `from_to` row) | its icon and its source under its name, the old value faded |
| an optional part (`tag` on an `image_grid` picture, with a `basis` not settled) | a dashed rule under its number, its tag in small grey |
| the way to pay a client is pointed to (`**…**` after a 「 · 」 in a comparison cell) | in bold brick red under who the way suits |
| the record or risk a page leads with (`emphasis: "highlight"` on a row) | its icon, its key figures and its basis or tag in bold brick red, on the paper like the other rows |
| a lesson from an incident (`tone: "danger"` on an icon card, `title` on the set) | its icon in the danger ink under the set's small title |
| the step a plan dwells on (`highlight` on a milestone) | its date and the rule under it in the brick red |
| a decision with choices of its own (`item_choices` on the `ballot`) | its own boxes on its row |
| the line to fill in (the close's `paragraph`, blanks written as 「＿」) | its words in petrol bold, each blank a line to write on |

## Where a new page starts

Before drawing, find the closest part in [Reusable parts](./reusable-parts.md#proposal-rooftop-solar-and-storage-proposal-sample-2026-10). proposal's content pages are `binder-sheet`, which hands its body to a composition in the binder setting: `gains` for what the client gets, `hours` for a day's tariff place by place, `regions` for places side by side, `workings` for a sum worked line by line, `levers` for how a result moves, `cycles` for what a store of energy earns a day, `drift` for measures that moved, `parts` for what a solution is made of, `plans` for ways to pay, `precedents` for public records, `safeguards` for rules, lessons and who answers, `remedies` for a risk register, `checkpoints` for steps closed by papers, `quote` for a price list with blanks, and `papers` for what the client hands over. The cover is `binder-cover`, a section page `binder-chapter`, the close `binder-ending`. A new page is usually a new composition in the binder setting, drawn inside the band from y176 to y640: hairlines and ruled tables on white paper, petrol figures, the brick red once.

A content page none of the compositions takes is drawn by the component renderer in the same band, under the same running head and claim. The tokens keep that renderer's cards to one layer: a card is as white as the paper, framed by a hairline with square corners. Tints and filled marks that the shared renderer mixes from the accent or the petrol are not yet set as print.
