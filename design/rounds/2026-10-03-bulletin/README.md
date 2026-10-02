# bulletin, NEV sample, 2026-10-03

The round that redrew bulletin to one approved board: a thirteen-page Chinese and English review of China's passenger NEV market in the third quarter of 2026 ("内需缩了两成，四季度怎么打"). It replaced bulletin's IKB title band and ruler with one quiet header for every content page, kept IKB for the one thing each page marks, and settled the pages bulletin had never drawn: a chart with its figures beside it, a truncated bridge, a horizontal grouped bar chart, a records table with a warning, figures beside a titled list, a calendar window, a two-lane timeline and an options table.

## Source

- `design-gen.py` writes every board page as absolutely positioned HTML. It is the only source of the boards' geometry. Its photo and engine-render references point at the design tool's blob store, so the script records the boards rather than rebuilding them outside that tool.
- The `bulletin*.board.png` files in the part folders are those pages rendered at 1280 by 720 in a browser with Microsoft YaHei. The `bulletin*.engine.png` files are `pptwise preview` of the Chinese showcase deck ([showcase/bulletin/zh](../../../showcase/bulletin/zh/)), rasterized with `rsvg-convert` against the same YaHei. The board and the engine show the same deck, so the words match as well as the drawing.

## The design system

Every bulletin page follows these, not only the pages the sample uses. [docs/design-bulletin.md](../../../docs/design-bulletin.md) states them for the next round.

1. Cover and ending are a full IKB field (`#0032A0`) with white bold titles (cover 80px, ending 56px) and the motif's three white steps top right, enlarged.
2. Every content page has one header: a black bold claim at 34px, bottom-aligned in its box, at most two lines, over a grey hairline (`#DEE0DB`) with a 96 by 3 IKB bar at its left end, and the small IKB steps top right. No title band, no ruler.
3. IKB is spent once a page, on what the author marked: a chart series, a table row on a pale IKB ground (`#E6ECF7`), a figure, a timeline node, the recommended column's header. Unmarked data is grey. A `**…**` run is IKB bold. No warm colour marks anything.
4. Type: the claim 34px, body 19 to 20px, labels 16 to 17px, the source 14px.

## Pages and the parts they settled

| board page | part | folder |
| :-- | :-- | :-- |
| p01 cover | face `ikb-field-cover`, redrawn | [faces/ikb-field-cover](../../faces/ikb-field-cover/) |
| every content page | face `notice-sheet` (new), motif `bulletin-motif` | [faces/notice-sheet](../../faces/notice-sheet/), [motifs/bulletin-motif](../../motifs/bulletin-motif/) |
| p02 overview | composition `rows`, notice setting, component field `numbered_cards.items[].emphasis` | [compositions/rows](../../compositions/rows/), [components/numbered_cards](../../components/numbered_cards/) |
| p03 retail | composition `columns` (new) beside `rail`'s figure column, component field `chart` point `status` | [compositions/columns](../../compositions/columns/), [compositions/rail](../../compositions/rail/), [components/chart](../../components/chart/) |
| p04 bridge | composition `bridge` (new) beside `rail`'s figure column | [compositions/bridge](../../compositions/bridge/) |
| p05 photo | face `image-split`, `column: "notice"`, composition `pairs`, notice setting | [faces/image-split](../../faces/image-split/), [compositions/pairs](../../compositions/pairs/) |
| p06 share | composition `bars` (new) beside `rail`'s figure column, component field `chart.changes` with `at` | [compositions/bars](../../compositions/bars/), [components/chart](../../components/chart/) |
| p07 companies | composition `records` (new) with the notice closing | [compositions/records](../../compositions/records/) |
| p08 pricing | composition `stack` (new) | [compositions/stack](../../compositions/stack/) |
| p09 target | composition `columns` with change brackets and a target bar, component field `chart.changes` | [compositions/columns](../../compositions/columns/), [components/chart](../../components/chart/) |
| p10 subsidy | composition `window` (new), component fields `gantt.items[].text` and `emphasis` | [compositions/window](../../compositions/window/), [components/gantt](../../components/gantt/) |
| p11 rules | composition `lanes` (new) with the notice closing, component fields `timeline.lanes` and `milestones[].lane` | [compositions/lanes](../../compositions/lanes/), [components/timeline](../../components/timeline/) |
| p12 options | composition `table`, notice setting | [compositions/table](../../compositions/table/) |
| p13 ending | face `signoff-ending`, redrawn | [faces/signoff-ending](../../faces/signoff-ending/) |

The compositions read a `setting` the face passes them (`CompositionSetting` in [`src/layouts/compositions/shared.tsx`](../../../src/layouts/compositions/shared.tsx)). `board` is brief's first board and stays the default. `notice` is this round's: the same shapes set the way this board sets them, and a closing note on a light grey panel instead of an IKB block, since IKB is kept for the marked thing.

## Decisions

Where the engine departs from the board, it does so on purpose, for these reasons.

1. p04's axis starts at 200, where the board starts it at 250. The floor comes from the waterfall's own rule (`truncatedFloor`): 0.8 of the levels' span below the lowest level, rounded down to a leading digit. Every theme's bridge uses it, and the board's 250 is a hand pick for this one chart.
2. A rate's change reads 「−4.5 个百分点」 and "−4.5 pts", as `rail` already wrote it, where the board wrote 「个点」.
3. Legend entries stand on their measured widths, 30px apart. The board spaced them by character count, so its gaps vary with the script.
4. A highlighted table row (p07) sets every cell in IKB bold. The board set the name and the change only. The row is the mark, and half a row in IKB reads as two marks.
5. The closing panel is 20px type in a 64px panel on every page. The board drew p11's at 18px in 48px. One size keeps the panel the same object wherever it closes a page.
6. Dates, titles and descriptions on the two-lane timeline are 16px, where the board set some at 15px. Nothing goes below 16px except the 14px source line, which this board asked for and the audit exempts by name (`notice-spec`).
7. No letter spacing anywhere. The board tracks the cover title and the big figures by −0.5 to −1px, and the PPTX export does not carry tracking, so drawing it in the preview would make the preview lie about the file.
8. The cover's small top line reads `meta.organization`, and the sample deck puts the occasion there (「2026 年三季度经营复盘」). A deck that names its company there gets its company.
9. A marked run in the cover or ending title cannot turn IKB on an IKB field. It keeps the title's white and gets a straight white underline, the field's own short-bar language.
10. The ending draws no colophon. The organization is on the cover, and the ending keeps only the decision and the next steps.
11. A forecast's label puts 「（预测）」 or "(forecast)" after the value on one line when it fits over its bar, and on a second line above the value when it does not, rather than overlapping the next bar's label.
12. Unmarked data is the theme's muted ink blended toward the page, `#C4C5C5` on bulletin, where the board used `#C2C6CC`. Every grey on the page comes from the theme's tokens, so a theme with a warmer muted ink gets a warmer grey.
13. Line breaks keep words and figures together (「去年同期」, 「2.5 倍」) where the browser broke them anywhere, and a Chinese line breaks after a comma rather than one character past it.
14. A plot prints every reported value with the decimals the chart's values were written with, 「11.0」 and 「5.0」 beside 「12.1」 and 「5.1」, the way a bridge already does. The board printed 「11」 and 「5」. A forecast or a target keeps its own decimals, since it is an estimate: 「169（预测）」 and 「772」 stay as the board has them.
