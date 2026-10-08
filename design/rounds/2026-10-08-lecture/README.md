# lecture, annual tax reconciliation evening class sample, 2026-10

The round that redrew lecture to one approved board: an eighteen-page Chinese and English evening class, 「一节课学会个税年度汇算」 ("Annual tax reconciliation in one class"), given by a teacher to people a few years into work. It runs the way a class runs: what tonight covers, why tax withheld every month is worked out again (understand), the formula, the four incomes, the deductions, the rate table, one worked example, where its refund comes from (work it out), three variations to try on the spot and their answers, who has to file, the traps, the national figures and the next window (file it), and the homework. It made lecture a night class at a green board: an ink-green board in a wooden frame with chalk on its ledge, words in chalk white, what is quieter in a wiped chalk grey, titles and working in a serif, and one stroke of yellow chalk a page drawn by hand under the thing to remember. It settled a content page that hands its body to the compositions in a new `chalkboard` setting, sixteen new compositions, a cover, a close, a chapter page drawn to the same board, and a new motif.

## Source

- `design-gen.py` writes every board page as absolutely positioned HTML at 1280 by 720. It is the only source of the boards' geometry. Its photograph references are placeholders the design tool filled in, so the script records the boards rather than rebuilding them outside that tool.
- The `lecture.board.png` files in the part folders are those pages rendered at 1280 by 720 in a browser with the sample's photographs. The `lecture.engine.png` files are `pptwise preview` of the Chinese showcase deck ([showcase/lecture/zh](../../../showcase/lecture/zh/)), rasterized with `rsvg-convert`. The board and the engine show the same deck, so the words match as well as the drawing, except where the decisions below say otherwise.
- The board was set in Songti and PingFang. `rsvg-convert` sets the preview's Latin in Times New Roman and its Chinese in Songti. PowerPoint's PDF export of the sample sets the Chinese in SimSun.
- The board was drawn in Chinese only. The English deck follows the same geometry with its own words.

## The design system

Every lecture page follows these, not only the pages the sample uses. [docs/design-lecture.md](../../../docs/design-lecture.md) states them for the next round.

1. A blackboard: every page, photograph pages too, stands in a 2px wooden frame from (10, 10) with a chalk ledge 26px deep along its foot, a piece of white chalk, a piece of yellow chalk and an eraser on it. It is the motif's structural piece.
2. The lesson's step: small at the top left of a content page, 12px in the chalk grey tracked 3px (the page's `kicker`, 「二　算对」). The period's count at the top right, 「3 / 18」, the course on the ledge.
3. A serif for what is written on the board: titles, terms, figures and the working in the heading serif at its regular weight (Times New Roman for the Latin over SimSun for the Chinese), notes and labels in the body sans.
4. Yellow chalk once a page: one stroke under the thing to remember, laid twice (the second pass thinner, lower and broken), a ring round a word, or a box of yellow chalk. Braces under terms and crosses through mistakes are drawn by hand too.
5. An example's stamp: 「例题 · 数字为虚构」 bold at 12px in yellow in a dashed yellow box, the page's `stamp`, where each page drew it.
6. Colours: the board `#1C2823`, a box of the board (the surface six tenths of the way back to the board, about `#22302A`), chalk white `#EFF3EC`, the chalk grey `#A9BCAF`, sources and captions the grey seven tenths of the way into the board (about `#7F9488`), ruled and dashed lines the grey a fifth of the way (about `#3A4A42`), the yellow chalk `#E9C46A`, and the wood the yellow chalk dulled to a stain, `#5A4632`.

## Pages and the parts they settled

| board page | part | folder |
| :-- | :-- | :-- |
| every page | motif `lecture-motif` (redrawn) | [motifs/lecture-motif](../../motifs/lecture-motif/) |
| every content page | face `chalkboard-sheet` (new), compositions in the `chalkboard` setting (new), the page's `kicker` as its step | [faces/chalkboard-sheet](../../faces/chalkboard-sheet/) |
| p01 cover | face `chalkboard-cover` (new) | [faces/chalkboard-cover](../../faces/chalkboard-cover/) |
| p02 three things | composition `agenda` (new) | [compositions/agenda](../../compositions/agenda/) |
| p03 two withholding paths | composition `confluence` (new) | [compositions/confluence](../../compositions/confluence/) |
| p04 the formula | composition `braces` (new) | [compositions/braces](../../compositions/braces/) |
| p05 who has to file | composition `boughs` (new) | [compositions/boughs](../../compositions/boughs/) |
| p06 four incomes | composition `factors` (new) | [compositions/factors](../../compositions/factors/) |
| p07 what is taken off | composition `subtractions` (new) | [compositions/subtractions](../../compositions/subtractions/) |
| p08 seven deductions | composition `flashcards` (new) | [compositions/flashcards](../../compositions/flashcards/) |
| p09 the rate table | composition `risers` (new) | [compositions/risers](../../compositions/risers/) |
| p10 the example | composition `givens` (new) | [compositions/givens](../../compositions/givens/) |
| p11 the working | composition `derivation` (new) | [compositions/derivation](../../compositions/derivation/) |
| p12 where 800 comes from | composition `cascade` (new) | [compositions/cascade](../../compositions/cascade/) |
| p13 try it now | composition `exercises` (new) | [compositions/exercises](../../compositions/exercises/) |
| p14 the answers | composition `solutions` (new) | [compositions/solutions](../../compositions/solutions/) |
| p15 four traps | composition `pitfalls` (new) | [compositions/pitfalls](../../compositions/pitfalls/) |
| p16 the national figures | composition `strikeout` (new) | [compositions/strikeout](../../compositions/strikeout/) |
| p17 the next window | composition `chronology` (new) | [compositions/chronology](../../compositions/chronology/) |
| p18 homework | face `chalkboard-ending` (new) | [faces/chalkboard-ending](../../faces/chalkboard-ending/) |
| no board page | face `chalkboard-chapter` (new) | [faces/chalkboard-chapter](../../faces/chalkboard-chapter/) |

The compositions read the `chalkboard` setting from the face that offers them (`CompositionSetting` in [`src/layouts/compositions/shared.tsx`](../../../src/layouts/compositions/shared.tsx)). The inks, the chalk strokes, the stamp, the photographs and the title and source columns are in [`chalkboard.tsx`](../../../src/layouts/compositions/chalkboard.tsx), the step, the title, the source and the bands in [`chalkboard-shared.tsx`](../../../src/layouts/chalkboard-shared.tsx). Text is fitted and painted by the lineup setting's helpers with this setting's exemption and its marked runs in yellow. Every ink comes from the theme's tokens: the page for the board, the surface for a box of it, the text and the muted for the words, the accent for the yellow chalk, and the lines, the dim grey and the wood worked out from them. The tests draw each composition on lecture and on stage and crayon, two themes that share nothing with it, and each face on stage and crayon.

## Decisions

Where the engine departs from the board, it does so on purpose, for these reasons.

1. The chalk's skipping strokes (a box's edge, the second pass of a stroke, a ring) are drawn as separate runs of one path rather than a dash pattern, so PowerPoint draws exactly the runs the board drew. Ruled and dashed hairlines keep a dash style.
2. Headings lead with Times New Roman over SimSun, as thesis and journal do: SimSun has no Latin of its own, and an English title's curly quotes were set full width in it. A Chinese page's digits and signs are Times New Roman's, which the board set in Songti (the × on p06 is narrower in the preview, PowerPoint sets it in SimSun).
3. The count reads 「3 / 18」, its first number PowerPoint's slide-number field. The course on the ledge is the deck's `organization` and `label` (the board's 「青年夜校 · 一节课学会个税年度汇算」).
4. p01's date stands at the right of the promise line, small, so the deck's date is on the page. The board drew none.
5. p04's title is the lead-in (「今晚只要记住一个式子」) and the formula is a `paragraph`. Each note under a brace is a bullet written `term：note`, matched to the term in the formula. The note under 应纳税所得额 reads 「收入额 − 6 万 − 各项扣除」 where the board wrote 「全年收入额 − 6 万元 − 各项扣除」, to keep the bullet inside its pacing budget.
6. p05 draws each branch's `title` (「应退税」, 「应补税」) small under its condition, which the board left off: every word an author writes is drawn.
7. p08's seven cards are two `icon_cards`, three tagged 「提高」 and four, since `icon_cards` keeps its six-item limit. The rent card's amount reads 「每月 800 至 1500 元」 with its three tiers under it, which fits the narrower card.
8. p09's table names its columns small at the top left (「全年应纳税所得额（元）　·　税率　·　速算扣除数（元）」), which the board left off.
9. p12's sentence under the bars is a `paragraph` beside the `waterfall`: the chalkboard sheet declares `paragraph` as a full-body companion.
10. p13's note under the stamp is the page's footnote, set at 13/22 in the grey as the board set it.
11. p14 sets each result row's label (「结果」) small over the result, which the board left off. The working row labels are shared by the columns (「已预缴」, 「全年」) where the board wrote each column's own.
12. p16's misquoted 1.26 亿 is a warning `callout` titled by it, its text what the figure counts.
13. p17's past window is drawn a step lighter than the board drew it so it reads on the green, and each window's name (「2025 年度汇算」, 「2026 年度汇算」) stands small over it, which the board left off. The next window holds both highlighted dates and draws them in yellow.
14. p18's homework is a `steps` of two, each a task and how to do it. The photograph's caption is the last sentence of the reminder rather than small at the bottom right.
15. The board drew no chapter page. `chalkboard-chapter` is drawn from the cover's parts: the step small, the name large with one stroke of yellow chalk.
16. A title's marked run is chalk white with one stroke of yellow chalk under it, the theme's `underline` emphasis. In the body, a marked run is yellow.
17. The photographs are AI-generated, and the pages that carry them say so in a caption or in the close's reminder.
