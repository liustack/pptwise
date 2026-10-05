---
summary: 'The settled clinic design system handed to a design tool together with the general design brief: the clinical assessment file, the heartbeat and section label, the claim over a hairline, figures on rounded cards, a capsule naming the kind of source behind every figure, controls drawn in outline, deep teal once a page, warning brown for risk and cost, the type sizes, and the parts a new clinic page starts from'
read_when:
  - drawing a clinic page, face or composition that the 2026-10 board did not draw
  - changing anything clinic paints, before opening the code
  - judging whether a clinic page in a showcase or the gallery follows the board
---

# Designing for clinic

clinic was redrawn to one approved board in October 2026, as a clinical assessment file: evidence laid out for a committee that has to decide, page by page, and wants to know where every figure comes from. This page states the rules that board settled, so the next page drawn for clinic follows them without a new argument. Paste it into the design tool after [Design brief](./design-brief.md), which still holds every general rule (vector primitives, contrast, the safe area, what to attach). Where the two disagree, this page wins for clinic: its type area runs from x64 to x1216, and its capsules, labels, legends, running head, folio and source are 12 to 13px. The board, its source and every place the engine departs from it on purpose are in [`design/rounds/2026-10-05-clinic/`](../design/rounds/2026-10-05-clinic/README.md).

## Palette

Take the colours from `pptwise themes --json`, not from this page. For reading the rules below:

| role | token | value |
| :-- | :-- | :-- |
| page | `bg` | `#F2F7F4`, mint white, on every page type |
| a card | `surface` | `#FBFDFC`, over a 1px hairline |
| hairlines | `border` | `#D5E2DC` |
| words | `text` | `#1E2B27` |
| labels, notes, the source, the folio | `muted` | `#5A6C66` |
| the one mark | `emphasisInk` and `primary` | `#0E6B5C`, deep teal |
| under the row a page is about | the mark over the page at 6% | about `#E3EFEA` |
| lines and dots only | `accent` | `#3D9B82`, light teal, never under words |
| the second and third series, the quieter kinds of source | `chartPalette` | vein blue `#4A7FB5`, slate `#2E4257` |
| risk and cost | `warning` | `#B9722F`, brown |
| a breach, a stop | `danger` | `#B3282B` |
| what steps back, an outline | the muted ink over the page at 36% | about `#B9C7C1` |

Deep teal is spent once a page on what the page is about: a filled card, a figure, a row on its tint, a line. Brown says risk or cost. Nothing else is coloured.

## The running head, the claim and the foot

- Every page but the cover: a heartbeat 34px long from x64 on y38 in the accent at 1.6px, flat, one sharp rise and fall, flat again. Right of it at x106 the page's section (`kicker`), 13px bold in deep teal, its characters 2px apart. Write it in two to four characters (「提议」「疗效」「安全性」).
- On content pages of a deck with a footer: the deck's subject (the footer `label`) at the top right in 12px muted type, and the folio at the foot, the reporting office at the left and 「N / M」 at the right, 12px muted. The chapter page and the ballot carry the heartbeat without them.
- The claim bold at 30/42 from x64 across 1152px, at most two lines, its last line ending at y154. It stays on one line whenever it fits. When it does not, it breaks at a comma, never early to even the two lines. A 1px hairline at y166 with a 56 by 3 bar of deep teal over its left end.
- The page's `tag`, the evidence the whole page rests on (「RCT · NEJM 2025 · 751 例 · 72 周」), is a capsule at the top left of the body.
- The body runs from y186 to y640. The source at 12/16 in the muted ink from y648, up to two lines, written as the author writes it (「来源：…」), with 「不同试验，不能直接比较」 wherever trials stand side by side.

## Cards, capsules and controls

- A card is the surface over a 1px hairline, rounded 10 to 12px. The card the page is about takes a 3px top edge of deep teal, or is filled with it, its words reversed out.
- Every figure names the kind of source it rests on in a capsule: a rounded outline 22px tall, 12px bold, one ink per kind. A trial in a journal and an official document in deep teal, a drug label and a trial registry in vein blue, a company's own figures in brown, a press report in grey, a draft out for comment in slate. Write it as the reader would say it: 「RCT · 期刊」「说明书」「企业口径」「媒体报道」「征求意见稿」「官方文件」.
- What a result is read against is hollow: a placebo bar as an outline, a control as a tick, a before as a hollow dot. Never a solid bar of its own.
- A proposal's verdict is a capsule that says how settled it is: filled deep teal for a settled yes, outlined deep teal for a conditional one, outlined grey for an open no or a deferral, filled grey for a settled no.
- A step that can stop a process sends a dashed line in clinic red into a stop box on red's pale tint.
- Photographs are a person's hands, a room, an object: no readable text, no logos, no faces in close-up, cropped square at the corners, captioned 「示意图：…（AI 生成）」 when they are generated.
- Symbols are the built-in lucide icons, in deep teal (brown for a risk, red for a breach), set wherever a field takes one.

## Type

Microsoft YaHei, bold for titles and figures (PingFang on the board).

| text | size |
| :-- | :-- |
| cover title | 44/60 bold |
| ballot question | 40/56 bold, its items 22 bold after 36px numbers |
| claim | 30/42 bold |
| figures the page argues from | 40 to 64 bold, in deep teal when marked |
| card titles, row names | 17 to 24 bold |
| sentences, notes | 14 to 17 |
| capsules, labels, legends, running head, folio, source | 12 to 13 |

## How the author's marks are drawn

| the author marks | how it is drawn |
| :-- | :-- |
| a proposal (`emphasis` on `numbered_cards`) | the card filled with deep teal |
| a figure (`**…**` around a `kpi_cards` value) | in deep teal, its card's top edge a 3px rule of it |
| a table row (`emphasis: "highlight"` on a `data_table` row, `emphasis` on a `comparison` row) | on deep teal's tint, bold |
| the drug group against its control (`emphasis` on a chart series) | a solid bar or line in deep teal, the control hollow |
| the parts of a share bar the page adds up (`emphasis` on their series) | deep teal and then the accent made dark enough for white words, their total under the bar |
| a group that regains (`tone: "warning"` on a chart series) | a dashed line in brown |
| a milestone or review date (`highlight`) | in deep teal, its dot filled |
| the kind of source (`evidence` on a `tag`) | the capsule's ink |
| a settled verdict (`settled` on a `tag`) | a filled capsule |
| a breach (`tone: "danger"` on a `tag`) | the row's bands dashed in red, its capsule red |
| a case or a step that is bad news (`tone: "danger"`) | its icon and figure in red, or a dashed line into the stop box |
| a run of text (`**…**`) | deep teal |

## Where a new page starts

Before drawing, find the closest part in [Reusable parts](./reusable-parts.md#clinic-glp-1-formulary-review-sample-2026-10). clinic's content pages are `dossier-sheet`, which hands its body to a composition in the dossier setting: `rows` for proposals on cards or duties beside a photograph, `readings` for why-now figures over a share bar, `inset` for a photograph beside the rest of the page, `docket` for cases on file, `controlled` for trials against their controls, `duel` for a head-to-head, `forest` for endpoints and their hazard ratios, `multiples` for rates against controls with the risks to watch, `fork` for groups that part, `lanes` for two kinds of event on one calendar, `ruler` for thresholds on one scale, `dumbbells` for before and after with a reminder, `table` for options and their proposals, `cards` for rules two by two, `gate` for a review that can stop, and `watch` for checks and review dates. The cover is `dossier-cover` with its header lines (`fields`), the ending `dossier-ending` with its `ballot`. A new page is usually a new composition in the dossier setting, drawn inside the band from y186 to y640: cards over hairlines, every figure with its source capsule, controls hollow, deep teal once.

The chapter page keeps `subject-rule-chapter` under the new heartbeat. It had no board in this round and needs one before it changes.
