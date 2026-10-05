---
summary: 'The settled almanac design system handed to a design tool together with the general design brief: the long-run yearbook, the sprout and section label, the strip of years, the claim over a hairline, figures on flat cards in the mono face, a pill on every figure or rule that is not a settled fact, olive for what a page settles on, ochre once a page, the type sizes, and the parts a new almanac page starts from'
read_when:
  - drawing an almanac page, face or composition that the 2026-10 board did not draw
  - changing anything almanac paints, before opening the code
  - judging whether an almanac page in a showcase or the gallery follows the board
---

# Designing for almanac

almanac was redrawn to one approved board in October 2026, as a long-run yearbook: an account kept year by year for a board that has to decide what to do about rules that run for a decade. This page states the rules that board settled, so the next page drawn for almanac follows them without a new argument. Paste it into the design tool after [Design brief](./design-brief.md), which still holds every general rule (vector primitives, contrast, the safe area, what to attach). Where the two disagree, this page wins for almanac: its type area runs from x64 to x1216, and its years, pills, labels, running head, folio and source are 11 to 13px. The board, its source and every place the engine departs from it on purpose are in [`design/rounds/2026-10-05-almanac/`](../design/rounds/2026-10-05-almanac/README.md).

## Palette

Take the colours from `pptwise themes --json`, not from this page. For reading the rules below:

| role | token | value |
| :-- | :-- | :-- |
| page | `bg` | `#EFE9DC`, sand, on every page type |
| a card | `surface` | `#F7F3E8`, over a 1px hairline rounded 6px |
| hairlines | `border` | `#D8D0BC` |
| words | `text` | `#2B2A22` |
| labels, notes, the source, the folio | `muted` | `#656155` |
| what the page settles on | `primary` | `#4D5D39`, olive |
| the money due, the figure argued from, what is estimated, pending or proposed | `accent` | `#B25E38`, ochre |
| clauses, drafts, claims, a quieter series | `chartPalette` | khaki `#8C7B54`, teal `#3E6B63` |
| what a page reads against | khaki over the page at 38% | about `#C9BFA8` |
| a year that is counted, the recommended column | olive over the card at 13.5% | about `#E0DFD0` |
| a year that is paid, the phase the page is about | ochre over the card at 15% | about `#EDDDCE` |

Olive is what the page settles on: the card the committee decides, the line the page follows, a lit year. Ochre is spent once a page as an emphasis, and otherwise only outlines what is estimated, pending or proposed. Nothing else is coloured.

## The running head, the claim and the foot

- Every content page: an 18px sprout in olive at x64, y24, and right of it at x90 the page's section (`kicker`), 13px bold in olive, its characters 2px apart. Write it in one or two words (「决定」「账单」「暴露」, "Decision", "Exposure").
- At the top right, from x860 to x1216, the run of years the deck follows (`years`: `from`, `to`), a dot for each year on a hairline: the years the page is about (`marked`) filled in olive with the year in bold mono over the dot, the first and last years always named, the others hollow. Light the years the page's claim is about, not every year its chart shows.
- On a deck with a footer: the reporting office at the left of the foot and 「N / M」 at the right, 12px muted, on content pages.
- The claim bold at 30/42 from x64 across 1152px, at most two lines, its last line ending at y154. It stays on one line whenever it fits. When it does not, it breaks at a comma, never early to even the two lines. A 1px hairline at y166.
- The page's `tag`, what the whole page rests on (「§ 条例 (EU) 2025/2083 修订后第 6、20、22 至 24 条」), is a pill the compositions set under the figures it governs, or at the top left of the body.
- The body runs from y186 to y640. The source at 12/16 in the muted ink from y648, up to two lines, written as the author writes it (「来源：…」), naming every calculation and every assumption.

## Cards, pills and figures

- A card is the surface over a 1px hairline, rounded 6px. A card the page is about takes a 3px top edge in olive, or ochre for money due, or is filled with olive, its words reversed out.
- Figures, years, dates and formulas are set in the mono face. A formula keeps its own lines and indents, and its parameters are listed as 「符号：含义」.
- Every figure or rule that is not a settled fact carries a pill, 12px bold in a rounded outline: a provision of law with a § before it in khaki (`basis: "law"`), an amount worked out at a stated assumption (`basis: "estimate"`, 「演示 · 碳价冻结在 €75.36，不是预测」), a figure still to be filled in (`basis: "pending"`, 「待核查后填入」) and a rule proposed or negotiated (`basis: "proposal"`) dashed in ochre, a draft or a company's own claim (`evidence`) in khaki. A card, a span or a stem that carries one of the last three is dashed too.
- What a figure is read against (a benchmark, a default path) is a dashed line in olive or a bar in the ghost, never a second colour of its own.
- Photographs are a place or a material: a port, coils, ingots, a furnace, a roof of panels, no readable text, no logos, no faces in close-up, cropped square at the corners, captioned 「示意图：…（AI 生成）」 when they are generated.
- Symbols are the built-in lucide icons, in olive (ochre on the one thing a page is about), set wherever a field takes one.

## Type

Microsoft YaHei for words (PingFang on the board), Consolas for figures, years, dates and formulas (Menlo on the board).

| text | size |
| :-- | :-- |
| cover title | 50/66 bold |
| ending question | 44/60 bold, its decisions 22 bold |
| claim | 30/42 bold |
| the one figure a page is (`magnitude`) | 200 bold |
| figures on cards | 34 to 48 bold, mono |
| card titles, row names | 17 to 21 bold |
| sentences, notes | 14 to 15 |
| pills, labels, years, running head, folio, source | 11 to 13 |

## How the author's marks are drawn

| the author marks | how it is drawn |
| :-- | :-- |
| the years a page is about (`years.marked`) | filled olive dots with their years named on the strip |
| a figure (`**…**` around a `kpi_cards` value) | in ochre |
| the line a page follows (`emphasis` on a line series) | heavy in olive, its first and last values named |
| the bar a page is about (`emphasis` on a point) | in ochre, its name and value too |
| the way a page argues for (`emphasis` on a bar series) | olive, the other way in the ghost |
| the step a sum turns on (`emphasis` on a waterfall bar) | ochre |
| the run of parts a page is about (`emphasis` on share bar series) | olive stepping paler, bracketed in ochre under the author's `emphasis_label` |
| the step a procedure turns on (`**…**` around its title) | its edge, number and icon in ochre |
| the recommended option (`recommended` on `comparison`) | the right card with a check, or the column on olive's tint |
| the marked row of a worked sum (`emphasis` on a `comparison` row) | its figure at 48px, ochre on the right card |
| the milestone that comes due (`highlight`) | larger and in ochre |
| the phase a page is about (`emphasis` on a roadmap item) | ochre for its dot, period and edge, its card on ochre's tint |
| what a figure or rule rests on (`basis` on a `tag`, a period or a roadmap row) | the pill's form: §, dashed ochre |
| the decision to take first (`**…**` in an ending bullet) | its card edged in ochre |
| a run of text (`**…**`) | ochre |

## Where a new page starts

Before drawing, find the closest part in [Reusable parts](./reusable-parts.md#almanac-cbam-sample-2026-10). almanac's content pages are `yearbook-sheet`, which hands its body to a composition in the yearbook setting: `motion` for an ask beside its reasons, `calendar` for months to scale over the figures the dates set, `horizon` for costs over years over the table of what changes each year, `formula` for a sum as a bridge beside its formula, `errata` for a wrong sum beside the right one, `breakdown` for a whole cut into amounts with a bracket, `benchmark` for bars against a reference value, `paired` for two ways of counting side by side, `procedure` for steps over what they change, `magnitude` for one figure as large as the page, `segments` for a whole in two and what each part means, `survey` for routes under their photographs on one scale, `outlook` for rules on a year axis, law and proposal apart, and `phases` for phases with their budget lines. The cover is `yearbook-cover` with a scale of years from its `timeline`, the ending `yearbook-ending` with its decisions from `bullets`. A new page is usually a new composition in the yearbook setting, drawn inside the band from y186 to y640: flat cards over hairlines, figures in mono, a pill on everything not settled, olive for what the page settles on, ochre once.

The chapter and statement pages keep `field-band-chapter` and `statement` under the new motif. They had no board in this round and need one before they change.
