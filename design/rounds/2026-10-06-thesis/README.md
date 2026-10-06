# thesis, retirement age thesis proposal sample, 2026-10-06

The round that redrew thesis to one approved board: an eighteen-page Chinese and English master's thesis proposal on how China's gradual rise in the statutory retirement age, in force from 1 January 2025, affects the employment of urban workers aged 50 to 60 (「渐进式延迟法定退休年龄对 50 至 60 岁城镇职工就业的影响」, "How the gradual rise in China's retirement age affects the employment of urban workers aged 50 to 60"). It runs the order a proposal defense runs: the research question, the statutory ladder by date of birth, how far the reform has gone by the end of 2026, why it matters, the employment cliff at the old ages, six comparable studies abroad, where France's lost retirement went, four Chinese studies, the literature map and its gap, three hypotheses, the data gate, two identification designs, the threats, the schedule, and four questions for the committee. It made thesis the pages of a thesis manuscript: a running head with the page's section, a bookish serif claim, figures and tables numbered across the deck, sources as numbered notes, and one emerald or gold lead a page. It settled a content page that hands its body to the compositions in a new `manuscript` setting, fifteen new compositions, a cover, a section page, a close, a redrawn motif, a `sketch` component, and fields on `chart`, `matrix`, `timeline` and `gantt`.

## Source

- `design-gen.py` writes every board page as absolutely positioned HTML at 1280 by 720. It is the only source of the boards' geometry. Its photograph references are placeholders the design tool filled in, so the script records the boards rather than rebuilding them outside that tool.
- The `thesis.board.png` files in the part folders are those pages rendered at 1280 by 720 in a browser. The `thesis.engine.png` files are `pptwise preview` of the Chinese showcase deck ([showcase/thesis/zh](../../../showcase/thesis/zh/)), rasterized with `rsvg-convert`. The board and the engine show the same deck, so the words match as well as the drawing, except where the decisions below say otherwise.
- `rsvg-convert` has no SimSun and no Microsoft YaHei, the faces the deck names, and sets the preview in Songti and PingFang, the board's own faces. PowerPoint's PDF export of the sample sets it in Times New Roman, SimSun and Microsoft YaHei.

## The design system

Every thesis page follows these, not only the pages the sample uses. [docs/design-thesis.md](../../../docs/design-thesis.md) states them for the next round.

1. The running head: the deck's label at the top left (the footer's `label`, 「硕士学位论文开题报告」) at 12/18 bold in the grey, its characters 3px apart, the page's section at the top right in emerald (its `stage`, numbered by its place in the deck's `course`, 「§2　文献与缺口」), and a gold hairline across the type area on y52.
2. The claim: bold at 30/42 in the heading serif in the ink from x64 across 1152px, on one line whenever it fits, broken at a comma or a colon when it does not, its last line ending on y150.
3. Figures and tables numbered as a paper numbers them: 「图 3」 and 「表 1」 in emerald bold before the title. The engine counts them across the deck, and the author writes only the title.
4. Sources as notes: the text points to each with a superscript in emerald, and the notes stand over the folio under a short pebble rule, each with its number, at 11/17 in the grey, at most three.
5. The folio: the page number centred at the foot in the heading serif, 13px in the grey.
6. One lead a page, in emerald or in gold. Gold draws only lines, dots and pale grounds, never small words.
7. Colours: ivory paper `#F5F3EC`, manuscript white cards `#FCFBF6` with a hairline, emerald `#0E6245` for figures and the lead line, scholar's gold `#A8861D` for rules, dots and pale grounds, the ink `#23251F`, the pencil grey `#62655B`, indigo `#3F5B8C` and pebble `#8A8471` for the other series, hairlines `#DDD9C8`.
8. Photographs illustrate rather than prove: shelves of statistical yearbooks, an older worker on a shop floor, older people exercising in a park, a grandparent collecting a grandchild, a library, a sketch in a notebook. On the cover the photograph runs down the right 460px beside the title page. On a section page it fills the page under ivory from the left.

## Pages and the parts they settled

| board page | part | folder |
| :-- | :-- | :-- |
| every content page | motif `rail-motif` (redrawn) | [motifs/rail-motif](../../motifs/rail-motif/) |
| every content page | face `manuscript-sheet` (new), compositions in the `manuscript` setting (new), the page's `stage` as its section, its `footnote` as numbered notes | [faces/manuscript-sheet](../../faces/manuscript-sheet/) |
| p01 cover | face `manuscript-cover` (new), with the page's `fields` | [faces/manuscript-cover](../../faces/manuscript-cover/) |
| p02 research question | composition `inquiry` (new) | [compositions/inquiry](../../compositions/inquiry/) |
| p03 statutory ladder | composition `ladder` (new), with `title` on `chart` and `steps` on a scatter series | [compositions/ladder](../../compositions/ladder/), [components/chart](../../components/chart/) |
| p04 dose | composition `reach` (new) | [compositions/reach](../../compositions/reach/) |
| p05 why it matters | composition `backdrop` (new), with `note` on a line point | [compositions/backdrop](../../compositions/backdrop/), [components/chart](../../components/chart/) |
| p06 employment cliff | composition `thresholds` (new), with `markers` on a line chart | [compositions/thresholds](../../compositions/thresholds/), [components/chart](../../components/chart/) |
| p07 section | face `manuscript-chapter` (new) | [faces/manuscript-chapter](../../faces/manuscript-chapter/) |
| p08 comparable studies | composition `tabulation` (new) | [compositions/tabulation](../../compositions/tabulation/) |
| p09 France | composition `partition` (new) | [compositions/partition](../../compositions/partition/) |
| p10 Chinese studies | composition `findings` (new) | [compositions/findings](../../compositions/findings/) |
| p11 literature map | composition `coverage` (new), with `title`, `columns`, `rows` and `empty` on `matrix` | [compositions/coverage](../../compositions/coverage/), [components/matrix](../../components/matrix/) |
| p12 hypotheses | composition `propositions` (new) | [compositions/propositions](../../compositions/propositions/) |
| p13 data gate | composition `cadence` (new), with `status: "pending"` on a milestone | [compositions/cadence](../../compositions/cadence/), [components/timeline](../../components/timeline/) |
| p14 identification | composition `designs` (new), with the `sketch` component (new) | [compositions/designs](../../compositions/designs/), [components/sketch](../../components/sketch/) |
| p15 threats | composition `hazards` (new) | [compositions/hazards](../../compositions/hazards/) |
| p16 schedule | composition `itinerary` (new), with `milestones` and `basis` on `gantt` | [compositions/itinerary](../../compositions/itinerary/), [components/gantt](../../components/gantt/) |
| p17 questions | composition `queries` (new) | [compositions/queries](../../compositions/queries/) |
| p18 close | face `manuscript-ending` (new), with the page's `kicker` as its small title | [faces/manuscript-ending](../../faces/manuscript-ending/) |

The compositions read the `manuscript` setting from the face that offers them (`CompositionSetting` in [`src/layouts/compositions/shared.tsx`](../../../src/layouts/compositions/shared.tsx)). The inks, text at its exact size, superscripts, captions, cards, chips, icons, photographs and closing lines are in [`manuscript.tsx`](../../../src/layouts/compositions/manuscript.tsx), the running head, the claim, the notes and the numbering in [`manuscript-shared.tsx`](../../../src/layouts/manuscript-shared.tsx). Every ink comes from the theme's tokens: the page and the surface for the paper and the cards, the primary for emerald, the accent for gold, the chart palette's third and fourth for indigo and pebble. The tests draw each composition on thesis and on brief and rally, a light theme and a dark one that share nothing with it.

## Decisions

Where the engine departs from the board, it does so on purpose, for these reasons.

1. The heading serif is Times New Roman with SimSun. The board was set in Songti, which Windows does not carry, and Georgia, the face thesis named before, sets old-style figures that drop below the baseline in 「5 个月」 and 「23.0%」. Times New Roman's bold figures read a little heavier than Songti's.
2. The section mark 「§」 is the Latin face's, narrower than Songti's full-em mark, so the section page sets a thin space after it (「§ 2」).
3. The page number reads 「6」, not 「06」. It is PowerPoint's slide-number field, which keeps counting when pages move and cannot be padded with a zero.
4. The cover, the section pages and the close carry no running head and no folio. The engine prints footer marks on content pages only, across every theme. Their faces set the deck's label themselves.
5. A note may take two lines and a page three notes. The board set every note on one line, and a fourth note is declared dropped.
6. On the employment cliff (p06) each age group stands at the middle of its slot and each threshold at the edge between two slots. The board placed the points a few pixels off those positions.
7. Gridlines and hairlines are cut clear of the words on them (the cliff's point values, the data gate's round names and the reform's name). The board drew them through. A rule through a figure reads as a strikethrough.
8. The reform's name on the data gate (p13) stays on its pale gold span, broken at a word space onto a second line when one line would run past the span's end. The board ran it past the span.
9. Small gold words, such as a threshold's name over the plot, are moved toward the ink until they read at 4.5:1. The board's gold reads at 3.10:1 on the paper.
10. On France's decomposition (p09) a part too narrow to be named inside its bar is named after the bar, and only those parts. The pebble parts carry their names in the ink.
11. The table's column widths (p08) are derived from what each column holds, within about three pixels of the board's.
12. The pale emerald and the pale gold are the theme's primary and accent mixed toward the card, close to the board's `#E3EEE7` and `#F1EAD2`.
13. The data gate's caption reads 「（实心为已公开，空心为已实施、未见发布）」. The board wrote it with a semicolon, which the sample's copy rules do not use.
14. Every photograph is a sample image generated for the proposal: shelves of statistical yearbooks, an older worker on a shop floor, older people exercising in a park, a grandparent collecting a grandchild, a library, a sketch in a notebook. None shows readable text or a real logo. A content page says so in the caption (「示意：…（AI 生成）」, "Illustration: … (AI-generated)"), the cover and the section page in their footnote (「图为 AI 生成的示意图」, "Image is AI-generated and illustrative").
