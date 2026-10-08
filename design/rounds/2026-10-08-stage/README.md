# stage, game developers keynote sample, 2026-10

The round that redrew stage to one approved board: an eighteen-page Chinese and English keynote at a game developers' conference, 「中国游戏，下一个十年靠什么出海」 ("What will carry Chinese games abroad next?"), given by one developer to others. It runs the way a keynote runs, one moment at a time: the hall from the back row, one sentence (revenue at home still climbing, players peaked), one figure (57 million more players in seven years), the first act abroad (ten years as one line with its two down years, this half's growth face to face with home's, Japan and Europe on a slope chart, two leaderboards), the second act on premium games (10 million copies, Steam peaks hundreds of times apart, a quarter of Steam users as dots, small teams beside a photograph), the third act on bets (the bill as two bars, three gates as doors, five bets) and the last sentence. It made stage a talk on a dark stage: a cold black field, words large and bold in a warm paper white, the chapter small at the top left, one thing a page in matte silver, a faint follow spot on a page a sentence or a figure carries alone, and the presenter's clicker along the foot of every page. It settled a content page that hands its body to the compositions in a new `keynote` setting, twelve new compositions, a cover, a chapter page, a close and stage's first motif.

## Source

- `design-gen.py` writes every board page as absolutely positioned HTML at 1280 by 720. It is the only source of the boards' geometry. Its photograph references are placeholders the design tool filled in, so the script records the boards rather than rebuilding them outside that tool.
- The `stage.board.png` files in the part folders are those pages rendered at 1280 by 720 in a browser with the sample's photographs. The `stage.engine.png` files are `pptwise preview` of the Chinese showcase deck ([showcase/stage/zh](../../../showcase/stage/zh/)), rasterized with `rsvg-convert`. The board and the engine show the same deck, so the words match as well as the drawing, except where the decisions below say otherwise.
- The board was set in PingFang. `rsvg-convert` has no Microsoft YaHei, the face the deck names, and sets the preview in PingFang. PowerPoint's PDF export of the sample sets it in Microsoft YaHei.

## The design system

Every stage page follows these, not only the pages the sample uses. [docs/design-stage.md](../../../docs/design-stage.md) states them for the next round.

1. One page, one thing: most pages carry one sentence at 64 to 76px bold, or one figure at 150 to 220px.
2. The presenter's clicker: along the foot of every page a 2px track on y676 from x64 to x1096, the part of the talk given (this page over the deck's length) in silver, and the count at its end, 「5 / 18」. It is the motif's structural piece, on photograph pages too.
3. The chapter: small at the top left of an ordinary content page, 12px in the sand tracked 4px (the page's `kicker`, 「第一章　出海」, written by the author). A page that carries one sentence or one figure alone names no chapter.
4. Silver once a page: the one thing a page is about.
5. A follow spot: a page one sentence or one figure carries alone, and the close, stand in a faint round spill of the paper white, 7 to 8% at its centre.
6. Colours: the cold black `#0F0F12`, the surface `#1A1A1F` for a door, words in the warm paper white `#F3EFE7`, what is quieter in the warm sand `#B0A694`, sources and ticks in the sand two thirds of the way into the black (about `#7E786C`), hairlines and axes in the black lifted a few steps (about `#2A2A30` and `#3A3A42`), matte silver `#C4BFB6`.

## Pages and the parts they settled

| board page | part | folder |
| :-- | :-- | :-- |
| every content page | motif `stage-motif` (new) | [motifs/stage-motif](../../motifs/stage-motif/) |
| every content page | face `keynote-sheet` (new), compositions in the `keynote` setting (new), the page's `kicker` as its chapter | [faces/keynote-sheet](../../faces/keynote-sheet/) |
| p01 cover | face `keynote-cover` (new) | [faces/keynote-cover](../../faces/keynote-cover/) |
| p02 one sentence | composition `hush` (new) | [compositions/hush](../../compositions/hush/) |
| p03, p10 one figure | composition `giant` (new) | [compositions/giant](../../compositions/giant/) |
| p04, p09, p14 the acts | face `keynote-chapter` (new) | [faces/keynote-chapter](../../faces/keynote-chapter/) |
| p05 ten years | composition `contour` (new) | [compositions/contour](../../compositions/contour/) |
| p06 two rates | composition `faceoff` (new) | [compositions/faceoff](../../compositions/faceoff/) |
| p07 where the money comes from | composition `tilt` (new) | [compositions/tilt](../../compositions/tilt/) |
| p08 two lists | composition `podiums` (new) | [compositions/podiums](../../compositions/podiums/) |
| p11 the peaks | composition `gulf` (new) | [compositions/gulf](../../compositions/gulf/) |
| p12 a quarter | composition `crowd` (new) | [compositions/crowd](../../compositions/crowd/) |
| p13 small teams | composition `tower` (new) | [compositions/tower](../../compositions/tower/) |
| p15 the bill | composition `toll` (new) | [compositions/toll](../../compositions/toll/) |
| p16 three gates | composition `arches` (new) | [compositions/arches](../../compositions/arches/) |
| p17 five bets | composition `slate` (new) | [compositions/slate](../../compositions/slate/) |
| p18 the last sentence | face `keynote-ending` (new) | [faces/keynote-ending](../../faces/keynote-ending/) |

The compositions read the `keynote` setting from the face that offers them (`CompositionSetting` in [`src/layouts/compositions/shared.tsx`](../../../src/layouts/compositions/shared.tsx)). The inks, the follow spot, figures and the claim, chapter and source columns are in [`keynote.tsx`](../../../src/layouts/compositions/keynote.tsx), the clicker, the chapter, the claim and the source in [`keynote-shared.tsx`](../../../src/layouts/keynote-shared.tsx). Text is fitted and painted by the lineup setting's helpers with this setting's exemption and its marked runs in silver. Every ink comes from the theme's tokens: the page for the black, the surface for a door, the text and the muted for the words, the accent for the silver, and the hairlines, axes and unlit dots the page's own colour lifted a few steps in lightness (on a pale page, darkened). The tests draw each composition on stage and on runway and crayon, two pale themes that share nothing with it, and each face on runway and crayon.

## Decisions

Where the engine departs from the board, it does so on purpose, for these reasons.

1. The count reads 「5 / 18」 where the board printed 「05 / 18」. The page number is PowerPoint's slide-number field, which keeps counting when pages move and cannot be padded. The total and the silver part of the track are the deck's length at export.
2. The clicker is the motif's on content pages. The cover, the chapter pages and the close keep the motif off, as museum's do, and draw the same clicker themselves. The count is drawn only when the deck asks for page numbers, on every page as the board drew it.
3. The marked words (「人数」, 「留得住」, 「787 倍」) and the one thing a page is about are the accent, the silver, as the board drew them. The shared faces keep stage's warm sand `emphasisInk` for `**…**` in small type, where the silver reads faded on the paper white (the 2026-08 ruling stands for them).
4. Every page a figure carries alone has a follow spot. The board drew one on p10 and none on p03, and the design system gives one to both.
5. p03's two ends are the figure's label written as 「2018 年　6.26 亿 → 2025 年　6.83 亿」. The arrow is drawn as the hairline, and the start end carries `data-gloss-break="→"` so the fidelity scans read the label back whole.
6. p05's bottom left is composed from the chart: 「单位：」, its `y_unit` and its series in Chinese, the series and the unit in English. The bottom right is the `kpi_cards` figure, unit and label joined by a full-width space.
7. p08's column heads are each chart's title and its series (「出海」 and 「海外收入前 100 的自研手游」), because a series name is required and every word an author writes is drawn. Values keep the column's decimals, so 15.1 prints 「15.10%」 as the board printed it.
8. p11 names what the bars count (the series, 「Steam 历史同时在线峰值」) small over them, which the board left off, and the line under the bars says 「这是同时在线人数，不是销量」 so it does not repeat it. The board's 「同期」 before the console revenue is 「今年上半年」: the peaks are all-time, not a period.
9. p12 lights 24 dots: the figure is written as a fraction (「约 ¼」) and the one percentage its label states, 24.2%, gives the exact share. A figure written as a percentage alone is left to `giant`, since it may be a rate of growth rather than a share of a whole.
10. p13's figures are one `kpi_cards` of three. Its claim keeps the author's break, 「小团队，」 over 「也有自己的路」.
11. p15 says 「一家出海做得多的上市游戏公司，销售费用是研发费用的 11 倍多」 where the board said the money spent on buying users was 11 times R&D: the annual report's selling expenses are group-wide and not all user acquisition. What the bars count is the chart's series.
12. p16's gates are a `kpi_cards` of three with an `icon` each. 「德英法合计已占出海手游收入一成」 names the base the 10.14% is measured on. The head of a door is two quadratic curves, which PowerPoint draws as a free shape.
13. p17's reasons say 「2021 年以来都在 6.64 亿到 6.84 亿之间」, the span the figures cover. Every number is silver, as the board drew them. When an author marks one bet, only its number is.
14. p07's labels that would touch are spread 28px apart by one rule where the board offset two of them by hand.
15. Weights: the export knows bold and regular. The board's 600 and 700 are bold. Its 500 is regular, except the leaderboards' place names, which read bold on the board.
16. A two-line claim on an ordinary content page hangs from y76 and moves the body down, because the chapter stands above it. The compositions take a one-line claim.
17. The cover's title breaks at its comma on its own (the board broke it by hand), at 76px, a twelfth smaller at most to stay on one line.
18. The photographs are AI-generated. The small teams page says so in its source, the cover and the act pages in their speaker notes, as the board left them without a caption.
19. `quote` stays on `pull-quote`, the face stage settled in 2026-08. The board had no quote page.
