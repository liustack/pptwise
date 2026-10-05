# almanac, CBAM sample, 2026-10-05

The round that redrew almanac to one approved board: a seventeen-page Chinese and English briefing from a steel and aluminium exporter's sustainability department to its board ESG committee (「CBAM 开始计费：先改报实际排放」), on the EU's carbon border charge now that 2026 imports count: when it is settled, what it costs a tonne on default values from 2026 to 2034 and how that sum is worked, the shortcut that gets it wrong, which products and which rival countries it hits hardest, what verified actual emissions save and what verification takes, what China's own carbon price can offset, what green power and new steel routes can and cannot do, which rules are still proposals, the roadmap, and the three decisions. It turned almanac into a long-run yearbook: a sprout and the section's label at the top left, a strip of years at the top right that lights the years a page is about, the claim bold over a hairline, figures, years, dates and formulas in the mono face, and a small pill on every figure or rule that is not a settled fact. It settled a content page that hands its body to the compositions in a new `yearbook` setting, fourteen new compositions, a cover and an ending over a photograph and a redrawn motif, with new fields on the page (`years`), on tags (`basis`), on timelines (`periods`, a milestone's `tag` and `source`), on callouts (`title`, `tag`), on waterfall bars and chart bars (`note`), on bar charts (`reference`), on share bars (`emphasis_label`) and on roadmap rows (`basis`).

## Source

- `design-gen.py` writes every board page as absolutely positioned HTML at 1280 by 720. It is the only source of the boards' geometry. Its photograph references are placeholders the design tool filled in, so the script records the boards rather than rebuilding them outside that tool. It reads the icon catalogue from this repository.
- The `almanac*.board.png` files in the part folders are those pages rendered at 1280 by 720 in a browser. The `almanac*.engine.png` files are `pptwise preview` of the Chinese showcase deck ([showcase/almanac/zh](../../../showcase/almanac/zh/)), rasterized with `rsvg-convert`. The board and the engine show the same deck, so the words match as well as the drawing, except where the decisions below say otherwise.

## The design system

Every almanac page follows these, not only the pages the sample uses. [docs/design-almanac.md](../../../docs/design-almanac.md) states them for the next round.

1. A running head on every content page: an 18px sprout in the mark at x64, y24, and right of it at x90 the page's section (`kicker`) at 13px bold in the mark, its characters 2px apart. At the top right, from x860 to x1216, the run of years the deck follows on a hairline, a dot for each year: the years the page is about (`years.marked`) filled in the mark with the year in bold mono over the dot, the first and the last year always named, the others hollow. On a deck that asks for a footer, the reporting office at the left of the foot and 「N / M」 at the right, both 12px muted.
2. The claim bold at 30/42 from x64 across 1152px, on one line whenever it fits and broken at a comma when it does not, its last line ending at y154 either way. A 1px hairline at y166. The body runs from y186 to y640, the source at 12/16 in the muted ink from y648.
3. Colours: the sand page `#EFE9DC`, cards `#F7F3E8` over a 1px hairline `#D8D0BC` rounded 6px, ink `#2B2A22`, muted `#656155`, olive `#4D5D39` for what the page settles on (the decision card, the line it follows, a lit year), ochre `#B25E38` for the money that comes due or the figure the page argues from, khaki `#8C7B54` and teal `#3E6B63` for the quieter series and for clauses and claims, a ghost of khaki `#C9BFA8` for what a page reads against, olive's pale tint for a year that is counted and the recommended column, ochre's pale tint for a year that is paid and the phase the page is about.
4. Pills: a rounded outline, 12px bold. A provision of law with a § before it, outlined in khaki (`basis: "law"`). An amount worked out at an assumption (「演示 · 碳价冻结在 €75.36，不是预测」, `basis: "estimate"`), a figure still to be filled in (「待核查后填入」, `basis: "pending"`) and a rule only proposed or negotiated (「提案」「谈判中」, `basis: "proposal"`) dashed in ochre, the card, span or stem that carries them dashed too. A draft or a company's own claim (`evidence`) in khaki.
5. Ochre once a page as an emphasis: the money due, the figure argued from, the step a page turns on. Ochre also outlines what is estimated, pending or proposed.
6. Figures, years, dates and formulas in the mono face (Consolas, Menlo on the board), titles and sentences in Microsoft YaHei (PingFang on the board).
7. Type: figures 34 to 200px, card titles 17 to 21px, sentences 14 to 15px, pills, labels, years, the running head, the folio and the source 11 to 13px.

## Pages and the parts they settled

| board page | part | folder |
| :-- | :-- | :-- |
| every content page | motif `almanac-motif` (redrawn) | [motifs/almanac-motif](../../motifs/almanac-motif/) |
| every content page | face `yearbook-sheet` (new), compositions in the `yearbook` setting (new), the page's `years` and `tag` | [faces/yearbook-sheet](../../faces/yearbook-sheet/) |
| p01 cover | face `yearbook-cover` (new), a scale of years from the page's `timeline` | [faces/yearbook-cover](../../faces/yearbook-cover/) |
| p02 decision | composition `motion` (new), with `icon` on `insight_panel` | [compositions/motion](../../compositions/motion/) |
| p03 timeline | composition `calendar` (new), with `periods` on `timeline`, `basis` on a figure's `tag`, `title` on `callout` and the page's `tag` | [compositions/calendar](../../compositions/calendar/), [components/timeline](../../components/timeline/), [components/tag](../../components/tag/), [components/callout](../../components/callout/) |
| p04 long curve | composition `horizon` (new), with `tag` on `chart` | [compositions/horizon](../../compositions/horizon/) |
| p05 bridge | composition `formula` (new), with `note` on waterfall bars | [compositions/formula](../../compositions/formula/), [components/waterfall](../../components/waterfall/) |
| p06 miscalculation | composition `errata` (new) | [compositions/errata](../../compositions/errata/) |
| p07 exposure | composition `breakdown` (new), with `emphasis_label` on a share bar | [compositions/breakdown](../../compositions/breakdown/), [components/chart](../../components/chart/) |
| p08 products | composition `benchmark` (new), with `reference` on a bar chart | [compositions/benchmark](../../compositions/benchmark/) |
| p09 countries | composition `benchmark` | [compositions/benchmark](../../compositions/benchmark/) |
| p10 actual values | composition `paired` (new), with `tag` on `callout` | [compositions/paired](../../compositions/paired/) |
| p11 verification | composition `procedure` (new) | [compositions/procedure](../../compositions/procedure/) |
| p12 China's carbon price | composition `magnitude` (new), with `note` on a chart bar | [compositions/magnitude](../../compositions/magnitude/) |
| p13 green power | composition `segments` (new) | [compositions/segments](../../compositions/segments/) |
| p14 routes | composition `survey` (new) | [compositions/survey](../../compositions/survey/) |
| p15 rules | composition `outlook` (new), with `basis` on periods and a milestone's `tag` and `source` | [compositions/outlook](../../compositions/outlook/), [components/timeline](../../components/timeline/) |
| p16 roadmap | composition `phases` (new), with `basis` on roadmap rows | [compositions/phases](../../compositions/phases/), [components/roadmap](../../components/roadmap/) |
| p17 decisions | face `yearbook-ending` (new) | [faces/yearbook-ending](../../faces/yearbook-ending/) |

The compositions read the `yearbook` setting from the face that offers them (`CompositionSetting` in [`src/layouts/compositions/shared.tsx`](../../../src/layouts/compositions/shared.tsx)). The inks, the pills, the cards, the icons, the strip of years, the figure cards and the fitting of text at its exact size are in [`yearbook.tsx`](../../../src/layouts/compositions/yearbook.tsx), the page frame in [`src/layouts/yearbook-shared.tsx`](../../../src/layouts/yearbook-shared.tsx). Every ink comes from the theme's tokens: the primary for the mark, the accent, the chart palette for the quieter series, the border for hairlines. The tests draw every board page on almanac and on ember and crayon.

## Decisions

Where the engine departs from the board, it does so on purpose, for these reasons.

1. The years a page is about are a field on the page (`years`: `from`, `to`, `marked`) rather than worked out from its data. A page about the rules of 2027 may chart 2026 to 2034, and only the author knows which years the page is about. validate refuses `years` on a face that does not draw it.
2. What a pill says about its figure is a `basis` on the shared `tag` (law, estimate, pending, proposal), beside clinic's `evidence`. What a figure rests on is a different question from what kind of source reported it, and a tag takes one or the other.
3. The chapter and statement pages had no board and keep `field-band-chapter` and `statement`. The motif draws nothing on the chapter's full olive page, where an olive sprout would vanish.
4. Olive's pale tint is the mark blended over the card at a fixed share and comes out `#E0DFD0`, where the board used `#DFE2CF`. It reads the theme's tokens, so a fork recolours it.
5. The third price card sets its state as a pill (「官方待公布」, "Pending", `basis: "pending"` on the figure's tag) over the note 「按法定方法复算」. The board wrote both in the note. The card is dashed and its figure ochre, as on the board.
6. The long curve page has no value axis title (the claim says what the lines count). The plot starts about 30px further right than the board's so the table row's name 「CBAM 因子」 stays inside the band, and the followed line's first value moves below any gridline it would graze.
7. The bridge page's parameter card lists five parameters and its formula ends 「P = €75.36」. The board listed P as a sixth parameter, one more than a list holds at the deck's balanced pacing.
8. The miscalculation page's last row sets its label and its value apart with no colon (「出处 多家媒体和咨询网站」). The board wrote 「出处：」.
9. The countries page's source line says how the countries were chosen and in what order they stand (「国家取 2025 年对欧进口额靠前的几个，按默认值排列」). The board said 「按 2025 年对欧进口额排序」 while drawing them by default value.
10. The green power page's parts read 「3」 and 「7，占 70%」. A share bar prints a value as written in the page's JSON, where 3.0 is 3, and adds the unmarked part's share. The board wrote 3.0 and 7.0.
11. On the rules page each rule's dashed stem starts under its year's name, so no line runs through the year.
12. Photographs are cropped square at their corners. A rounded picture needs a clip path, which nothing in PowerPoint's shape subset keeps.
13. Ochre and khaki words under 24px step darker until they read on what they sit on. Ochre on the sand page measures 3.81:1, under the 4.5:1 that smaller words need. Figures of 24px and over keep the board's ochre.
14. In English the pills are shorter (「A demo at €75.36, not a forecast」, 「Pending」, 「Verification: TBD」), and the cover's office and occasion fall back to two untracked lines when one tracked line is too long.
15. The cover's scale of years comes from the page's `timeline` (milestones dated by years, the highlighted one in ochre), and the ending's decisions from its `bullets`, each written 「类别：事项」, the one written `**…**` edged in ochre.
16. The small type is the board's: 11px years on the strip, 12 and 13px labels, pills, sources, the running head and the folio, 14 and 15px notes. Everything under the engine's 16px floor carries the `yearbook-spec` exemption by name, which the L1 audit and the corpus scan know.
17. The board's photographs were sample images. All eight in the showcase were generated for it, with no readable text, no logos and no faces in close-up, and their pages say so.
