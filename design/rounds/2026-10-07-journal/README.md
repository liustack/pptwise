# journal, annual letter to readers sample, 2026-10-07

The round that redrew journal to one approved board: an eighteen-page Chinese and English annual letter from a small magazine to its subscribers (「我们还在读书吗」, "Are we still reading?"), reading ten years of China's national reading survey. It runs the order a letter runs: the editor's note, ten years of readers and books, the ways people now read, minutes a day on print and on phones, periodicals falling hardest with the magazine among them, why people say they do not read, heavy readers, the gaps between town and country and between children and adults, a book trade selling less and for less, where books are sold, libraries busier while loans stall, how other countries ask the question, what research says about print against screens, a long read, the editors' four plans, and an afterword. It made journal the pages of a small periodical: a masthead with the column, the section and the issue over two rules, a bookish serif claim, figures numbered across the deck with the editor's comment under each, the source at the foot, a centred folio, and one brick red lead a page. It settled a content page that hands its body to the compositions in a new `periodical` setting, fifteen new compositions, a cover, a quotation page, a close, a redrawn motif, and three fields on `chart`.

## Source

- `design-gen.py` writes every board page as absolutely positioned HTML at 1280 by 720. It is the only source of the boards' geometry. Its photograph references are placeholders the design tool filled in, so the script records the boards rather than rebuilding them outside that tool.
- The `journal.board.png` files in the part folders are those pages rendered at 1280 by 720 in a browser. The `journal.engine.png` files are `pptwise preview` of the Chinese showcase deck ([showcase/journal/zh](../../../showcase/journal/zh/)), rasterized with `rsvg-convert`. The board and the engine show the same deck, so the words match as well as the drawing, except where the decisions below say otherwise.
- `rsvg-convert` has no SimSun and no Microsoft YaHei, the faces the deck names, and sets the preview in Songti and PingFang, the board's own faces. PowerPoint's PDF export of the sample sets it in Times New Roman, SimSun and Microsoft YaHei.

## The design system

Every journal page follows these, not only the pages the sample uses. [docs/design-journal.md](../../../docs/design-journal.md) states them for the next round.

1. The masthead: a line of small type at the top of every content page. At the left the column's name (the deck's `organization`, 「致读者」) at 13px bold in the heading serif, tracked. In the middle the page's section in brick red (its `kicker`, 「十年」, 11px bold, Chinese tracked wide). At the right the issue (the footer's `label`, 「二〇二六年秋 · 年度长信」) at 11px in the grey. Under all three a heavy rule on y50 and a hairline on y55 across the type area.
2. The claim: bold at 32/44 in the heading serif in the ink from x64 across 1152px, on one line whenever it fits, broken at a comma or a colon when it does not, its last line ending on y158. Beside a photograph that runs up to the masthead it takes the column beside the photograph.
3. Figures numbered across the deck: 「图 3」 in brick red bold before the title at 12px, and under it the editor's comment, one line in the italic serif at 13px in the grey. The engine counts them, and the author writes only the title and the comment. Two small multiples share one caption (「图 8、图 9」). A photograph only illustrates and takes no number: its caption is plain, 11px italic in the grey.
4. The source at the foot on y648, 11/15 in the grey, one line or two, never cut.
5. The folio: 「· 3 ·」 centred at the foot in the heading serif, the number 13px.
6. One lead a page, in brick red: the bar, figure, line or plan the page is about, as the author marked it. Nothing turns red for being the tallest.
7. Colours: magazine paper `#EFEBE1`, the inner page's white `#F8F5EC` for cards, lead black `#2C2C2A` for bars and rules, brick red `#8C4A3C` for the lead, the ink `#26261F`, the grey `#626159`, moss `#4E5E4A` and linen grey `#827C6B` for the other series, hairlines `#D9D3C2`.
8. Photographs illustrate rather than prove: a reading lamp on a desk at night, someone listening by a window, a metro car at rush hour, a stack of old magazines, a corner bookshop, a library reading room. On the cover the photograph runs down the right 660px. On a content page it runs the height of the page up to the masthead, or sits at the right beside the figures.

## Pages and the parts they settled

| board page | part | folder |
| :-- | :-- | :-- |
| every content page | motif `corner-ornament-motif` (redrawn) | [motifs/corner-ornament-motif](../../motifs/corner-ornament-motif/) |
| every content page | face `periodical-sheet` (new), compositions in the `periodical` setting (new), the page's `kicker` as its section | [faces/periodical-sheet](../../faces/periodical-sheet/) |
| p01 cover | face `periodical-cover` (new), with the page's `fields` as the cover lines | [faces/periodical-cover](../../faces/periodical-cover/) |
| p02 editor's note | composition `foreword` (new) | [compositions/foreword](../../compositions/foreword/) |
| p03 ten years | composition `chronicle` (new) | [compositions/chronicle](../../compositions/chronicle/) |
| p04 ways of reading | composition `measures` (new), with `icon` on a chart point | [compositions/measures](../../compositions/measures/), [components/chart](../../components/chart/) |
| p05 time | composition `elapsed` (new) | [compositions/elapsed](../../compositions/elapsed/) |
| p06 periodicals | composition `headline` (new), with `gaps` on a line chart | [compositions/headline](../../compositions/headline/), [components/chart](../../components/chart/) |
| p07 our magazine | composition `witness` (new) | [compositions/witness](../../compositions/witness/) |
| p08 non-readers | face `periodical-quote` (new) | [faces/periodical-quote](../../faces/periodical-quote/) |
| p09 heavy readers | composition `census` (new), with `gaps` on a bar chart | [compositions/census](../../compositions/census/), [components/chart](../../components/chart/) |
| p10 who reads less | composition `contrast` (new) | [compositions/contrast](../../compositions/contrast/) |
| p11 the book trade | composition `bracket` (new) | [compositions/bracket](../../compositions/bracket/) |
| p12 channels | composition `mix` (new) | [compositions/mix](../../compositions/mix/) |
| p13 libraries | composition `twins` (new) | [compositions/twins](../../compositions/twins/) |
| p14 elsewhere | composition `parallel` (new) | [compositions/parallel](../../compositions/parallel/) |
| p15 print and screen | composition `effects` (new), with `bands` on a bar chart on its side | [compositions/effects](../../compositions/effects/), [components/chart](../../components/chart/) |
| p16 long read | composition `longform` (new) | [compositions/longform](../../compositions/longform/) |
| p17 plans | composition `pledges` (new) | [compositions/pledges](../../compositions/pledges/) |
| p18 afterword | face `periodical-ending` (new), with the page's `kicker` as its section and its `subheading` as the sign-off | [faces/periodical-ending](../../faces/periodical-ending/) |

The compositions read the `periodical` setting from the face that offers them (`CompositionSetting` in [`src/layouts/compositions/shared.tsx`](../../../src/layouts/compositions/shared.tsx)). The inks, text at its exact size, figures, captions with their comment, photographs and the claim's placement are in [`periodical.tsx`](../../../src/layouts/compositions/periodical.tsx), the masthead, the claim, the standfirst, the source and the bands in [`periodical-shared.tsx`](../../../src/layouts/periodical-shared.tsx). Every ink comes from the theme's tokens: the page and the surface for the paper and the cards, the primary for lead black, the accent for brick red, the chart palette's third and fourth for moss and linen grey. The tests draw each composition on journal and on brief and rally, a light theme and a dark one that share nothing with it.

## Decisions

Where the engine departs from the board, it does so on purpose, for these reasons.

1. The heading serif is Times New Roman with SimSun. The board was set in Songti, which Windows does not carry. Times New Roman sets lining figures that stand on the baseline, and its bold figures read a little heavier than Songti's.
2. The folio's number is PowerPoint's slide-number field, which keeps counting when pages move. A field is one run, so the points either side of it are words of their own, set as far from the number on each side.
3. The cover and the close carry no folio. The engine prints the page number on content pages only, across every theme. The board printed 「· 18 ·」 on the close.
4. The afterword is signed 「编辑部」 ("The Editors"). The board's placeholder read 「主编」. The sample names neither the magazine's editor nor anyone else, and a sign-off without a name is the editorial office's.
5. On the periodicals page (p06) every year is named under the axis, the lines break at the year nobody could check (2016) with 「留空」 over the axis, and the hairlines are cut clear of the values on them. The board named three years and ran the lines across the gap.
6. On the time page (p05) a small key names the two years, so the series' names reach the page. The bars are a little shorter than the board's, so the figure and its unit stay inside the type area.
7. On the channels page (p12) every share prints its value, 11.9 included, as the author wrote it with one decimal. The board left a short share blank.
8. On the effects page (p15) the zero line is cut clear of 「+0.01」, which sits on it.
9. Small words that would read below 4.5:1 on what they sit on, the linen grey's and brick red's among them, are moved toward the ink until they do.
10. A quotation mark is set in the heading serif, Times New Roman, in a Chinese deck as in any other, and reads heavier than the board's Songti teardrop. SimSun's 「“」 is a full-width glyph drawn in the right half of its em, so a mark set in SimSun ran into the words in PowerPoint.
11. The quotation page prints the page's source at its foot when the page has one. The board's p08 had none.
12. In the English deck the share bar names literature 「Lit.」 inside its narrow part and spells it out in the note under the bar, and every claim is written to fit one line at 32px.
13. The section page (`fascicle-ghost-chapter`) and the statement page are unchanged. The board drew neither.
14. Every photograph is a sample image generated for the letter: a reading lamp on a desk at night, someone listening by a window, a metro car at rush hour, a stack of old magazines, a corner bookshop, a library reading room. None shows readable text or a real logo. A content page says so in the caption (「（AI 生成示意）」, "(AI-generated)"), the cover in its footnote (「封面图为 AI 生成的示意图」, "Cover image is AI-generated and illustrative").
