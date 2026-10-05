# clinic, GLP-1 formulary review sample, 2026-10-05

The round that redrew clinic to one approved board: an eighteen-page Chinese and English submission from a hospital pharmacy department to its pharmacy and therapeutics committee ("GLP-1 类减重药进院评估与院内管理方案"), asking which GLP-1 weight-loss drugs to list, who may prescribe them and under which rules, with the evidence behind each answer: the trials in Chinese patients, the one head-to-head, the cardiovascular outcome trial, the side effects against placebo, the regain on stopping, the approvals in China, the label thresholds, the prices, the review steps and the monitoring plan, ending on the three items the committee votes on. It turned clinic into a clinical assessment file: a short heartbeat and the section's label at the top left of every page, the point bold over a hairline with a short bar of deep teal, figures on rounded cards, the kind of source behind every figure named in a small capsule, the result in deep teal and what it is read against drawn in outline. It settled a content page that hands its body to the compositions in a new `dossier` setting, twelve new compositions, dossier forms of `rows`, `table`, `lanes` and `cards`, a cover, a ballot and a redrawn motif.

## Source

- `design-gen.py` writes every board page as absolutely positioned HTML at 1280 by 720. It is the only source of the boards' geometry. Its photograph references are placeholders the design tool filled in, so the script records the boards rather than rebuilding them outside that tool.
- The `clinic*.board.png` files in the part folders are those pages rendered at 1280 by 720 in a browser. The `clinic*.engine.png` files are `pptwise preview` of the Chinese showcase deck ([showcase/clinic/zh](../../../showcase/clinic/zh/)), rasterized with `rsvg-convert`. The board and the engine show the same deck, so the words match as well as the drawing, except where the decisions below say otherwise.

## The design system

Every clinic page follows these, not only the pages the sample uses. [docs/design-clinic.md](../../../docs/design-clinic.md) states them for the next round.

1. A running head on every page but the cover: a short heartbeat at the top left, 34px long from x64 on y38, in the accent at 1.6px, and right of it the page's section (`kicker`) at 13px bold in deep teal, its characters 2px apart. On content pages of a deck that asks for a footer, the deck's subject (the footer `label`) at the top right in 12px muted type, and at the foot the reporting office at the left and 「N / M」 at the right, both 12px muted.
2. The claim bold at 30/42 from x64 across 1152px, on one line whenever it fits and broken at a comma when it does not, its last line ending at y154 either way. A 1px hairline at y166 with a 56 by 3 bar of deep teal over its left end. The body runs from y186 to y640, the source at 12/16 in the muted ink from y648.
3. Colours: the mint page `#F2F7F4`, white cards `#FBFDFC` over a 1px hairline `#D5E2DC`, ink `#1E2B27`, muted `#5A6C66`, deep teal `#0E6B5C` for the one thing a page is about, the light teal accent `#3D9B82` for lines and dots only, vein blue `#4A7FB5` and slate `#2E4257` for the second and third series, warning brown `#B9722F` for risks and costs, clinic red `#B3282B` for a breach or a stop. Deep teal's pale tint under the row a page is about.
4. Evidence capsules: a rounded outline in 12px bold type at the top right of a card or beside a heading, one ink per kind of source. A trial in a journal (「RCT · 期刊」) and an official document (「官方文件」) in deep teal, a drug label (「说明书」) in vein blue, a company's own figures (「企业口径」) in warning brown, a press report (「媒体报道」) in grey, a draft out for comment (「征求意见稿」) in slate.
5. What a result is read against (a placebo, a control) is always hollow: an outlined bar, a hollow dot or a thin tick, never a solid bar of its own.
6. One emphasis a page, in deep teal: a filled card, a figure, a row on the tint. Warning brown is spent on risk and cost only.
7. Type: Microsoft YaHei (PingFang on the board), bold for titles and figures. Figures the page argues from 40 to 64px, card titles 17 to 24px, sentences 14 to 17px, capsules, labels, legends, the running head, the folio and the source 12 to 13px.

## Pages and the parts they settled

| board page | part | folder |
| :-- | :-- | :-- |
| every page but the cover | motif `clinic-motif` (redrawn) | [motifs/clinic-motif](../../motifs/clinic-motif/) |
| every content page | face `dossier-sheet` (new), compositions in the `dossier` setting (new), a page's `tag` | [faces/dossier-sheet](../../faces/dossier-sheet/) |
| p01 cover | face `dossier-cover` (new), header lines from the page's `fields` | [faces/dossier-cover](../../faces/dossier-cover/) |
| p02 proposal | composition `rows`, dossier setting, proposals on cards, with `icon` on `numbered_cards` | [compositions/rows](../../compositions/rows/), [components/numbered_cards](../../components/numbered_cards/) |
| p03 background | composition `readings` (new), with `evidence` on a figure's `tag` and a share bar | [compositions/readings](../../compositions/readings/), [components/tag](../../components/tag/) |
| p04 outside risk | compositions `inset` (new) and `docket` (new) | [compositions/docket](../../compositions/docket/), [compositions/inset](../../compositions/inset/) |
| p05 Chinese trials | composition `controlled` (new) | [compositions/controlled](../../compositions/controlled/) |
| p06 head to head | composition `duel` (new), with `tag` on `chart` | [compositions/duel](../../compositions/duel/), [components/chart](../../components/chart/) |
| p07 SELECT | composition `forest` (new) | [compositions/forest](../../compositions/forest/) |
| p08 safety | composition `multiples` (new) | [compositions/multiples](../../compositions/multiples/) |
| p09 rebound | composition `fork` (new) | [compositions/fork](../../compositions/fork/) |
| p10 approvals | composition `lanes`, dossier setting | [compositions/lanes](../../compositions/lanes/) |
| p11 BMI thresholds | composition `ruler` (new) | [compositions/ruler](../../compositions/ruler/) |
| p12 cost | composition `dumbbells` (new), with `icon` on `insight_panel` | [compositions/dumbbells](../../compositions/dumbbells/) |
| p13 formulary | composition `table`, dossier setting, with `label_column`, row `icon` and `settled` tags on `comparison` | [compositions/table](../../compositions/table/), [components/comparison](../../components/comparison/) |
| p14 scope | compositions `inset` and `cards`, dossier setting | [compositions/cards](../../compositions/cards/) |
| p15 review steps | composition `gate` (new), with `icon` and `tone` on `steps` | [compositions/gate](../../compositions/gate/), [components/steps](../../components/steps/) |
| p16 pharmacist | compositions `inset` and `rows`, dossier setting, duties beside a photograph | [compositions/rows](../../compositions/rows/) |
| p17 monitoring | composition `watch` (new) | [compositions/watch](../../compositions/watch/) |
| p18 ballot | face `dossier-ending` (new), with the page's `ballot` | [faces/dossier-ending](../../faces/dossier-ending/) |

The compositions read the `dossier` setting from the face that offers them (`CompositionSetting` in [`src/layouts/compositions/shared.tsx`](../../../src/layouts/compositions/shared.tsx)). The inks, the capsules, the cards, the icons, the heartbeat, the fitting of text at its exact size and the solid fills that carry words are in [`dossier.tsx`](../../../src/layouts/compositions/dossier.tsx), the page frame in [`src/layouts/dossier-shared.tsx`](../../../src/layouts/dossier-shared.tsx). Every ink comes from the theme's tokens: the emphasis ink for the mark, the accent for lines, the chart palette for the second and third series and for the quieter kinds of source, the warning and danger inks for risks and breaches, the border for hairlines. The tests draw each composition on clinic and on ember and crayon.

## Decisions

Where the engine departs from the board, it does so on purpose, for these reasons.

1. The folio prints 「9 / 18」, not 「09 / 18」. N is PowerPoint's slide-number field, so it renumbers itself when pages move, and the field cannot pad with a zero.
2. The chapter page has no board in this round and keeps `subject-rule-chapter` under the new motif. The ballot carries the heartbeat and its section but no subject and no folio, as every theme keeps footer marks to content pages. The board drew both on the ballot.
3. The cover's photograph carries its caption 「示意图：注射笔（AI 生成）」 at the foot of the left column, because every AI picture in a showcase says so on its page. The board left the cover uncaptioned. The monitoring page's photograph is declared in its source line instead, as on the board.
4. The share bar's second marked part (「超重 34.3%」) takes the accent made dark enough for white 13px words. The board's light teal under white words measured 3.1:1. The same holds for a solid band on the BMI ruler and the regain note on the rebound page: a fill too light for its white words steps toward the ink until they read, and on a dark theme the words turn dark instead.
5. The share bar's total reads the marked parts in the order they stand (「肥胖和超重合计 50.7%」), where the board wrote 「超重和肥胖合计」. The caption's second line, the source of the 2018 figures, is the page's source line, so the bar does not repeat it.
6. On the BMI ruler the scale is ticked at the thresholds the rows name (24, 27, 28, 30). The board also ticked 32.5, which no row names. The ranges themselves are drawn as the bands' extent on that scale, as on the board, and are not printed as words.
7. The approvals timeline places the lower lane's labels by a search over four tiers that keeps every label clear of its neighbours and of the other lane's stems, preferring the tier nearest the axis and the marked milestone's own. Its labels stand where the search puts them, which is not always where the board put them by hand.
8. The cost page does not tint its first row. The board marked 「替尔泊肽 10 mg」, and a `dumbbell` chart has no field that says which row a page is about: point `emphasis` is accepted on bar and stacked charts only.
9. The safety page names each control by its row in the author's table (「安慰剂 16%」, "Placebo 16%"). The board wrote 「对照」 in the cells and 「安慰剂组」 in the legend. The ticks stand 4px over and under their bars, not 6px, so a tick never reaches the figure over its bar.
10. The cost page breaks the grid under each figure it sets on the plot, so no rule runs through 「2,463」. The board let the 3,000 rule cross it.
11. The rebound page's split note stands 6px over the plot's top rule. The board set 「随机分组」 on the rule, which the gallery's audit reads as struck through. Its regain note fits on one line, where the board broke it in two.
12. Photographs are cropped square at their corners. A rounded picture needs a clip path, which nothing in PowerPoint's shape subset keeps.
13. The small type is the board's: 12px capsules, labels, legends, the running head, the folio and the source, 13 to 15px notes. Everything under the engine's 16px floor carries the `dossier-spec` exemption by name, which the L1 audit and the corpus scan know.
14. clinic's emphasis ink is now deep teal `#0E6B5C`, the same as its primary, so `**…**` and every marked figure take it. Before this round marked text borrowed the light teal accent, which is 3.1:1 on the page.
15. Text the engine sets apart from the mark that joined it says so on the element (`data-gloss-break`): the colon between a ballot item's kind and the item, the comma before a hazard ratio's note, the full stop between two checks. The audit reads the mark back, so nothing the author wrote is counted lost.
16. The board's photographs were sample images. All five in the showcase were generated for it, with no readable text, no logos and no faces in close-up, and their pages say so.
