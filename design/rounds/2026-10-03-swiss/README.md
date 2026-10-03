# swiss, power sample, 2026-10-03

The round that redrew swiss to one approved board: a fourteen-page Chinese and English annual report on the world's and China's power systems in 2025 ("清洁电力接住了全部增量，但还没有定局"). It replaced swiss's black title band and section badge with one quiet header for every content page, made data black and kept the red for the one thing each page marks, and settled the pages swiss had drawn with shared faces: a statement over its figures, a chapter page that lists its pages, a full-width bridge, columns beside their figures, a single figure with two beside it, a share bar, a table, a photo page with figures, a two-lane timeline and a numbered close.

## Source

- `design-gen.py` writes every board page as absolutely positioned HTML. It is the only source of the boards' geometry. Its photo and engine-render references point at the design tool's blob store, so the script records the boards rather than rebuilding them outside that tool.
- The `swiss*.board.png` files in the part folders are those pages rendered at 1280 by 720 in a browser with Microsoft YaHei. The `swiss*.engine.png` files are `pptwise preview` of the Chinese showcase deck ([showcase/swiss/zh](../../../showcase/swiss/zh/)), rasterized with `rsvg-convert` against the same YaHei. The board and the engine show the same deck, so the words match as well as the drawing.

## The design system

Every swiss page follows these, not only the pages the sample uses. [docs/design-swiss.md](../../../docs/design-swiss.md) states them for the next round.

1. An 8px red bar (`#D7282F`, the accent) along the top of every page, and no other decoration.
2. Every content page has one header: the chapter's number in red and its name in grey at 15px, then the claim black and bold at 34px across the whole 1120px measure, at most two lines, set on its last line, over a 2px black rule at y180. No title band, no badge.
3. Data is black, what steps back is grey, and red is the only mark, once a page: a marked bar or series, a marked table row on a pale red tint, a marked figure, a highlighted milestone, a forecast's hatching, the bracket that states the page's change. Red never carries text as a block.
4. Type: the claim 34px, body 19 to 20px, labels 16 to 17px, the source 14px.
5. A title never breaks early: every title box takes the full measure and a title wraps only when it does not fit. A title block is set on its last line, so a one-line title leaves no hole under it.

## Pages and the parts they settled

| board page | part | folder |
| :-- | :-- | :-- |
| p01 cover | face `institutional-block`, redrawn | [faces/institutional-block](../../faces/institutional-block/) |
| every page | motif `swiss-motif`, redrawn | [motifs/swiss-motif](../../motifs/swiss-motif/) |
| every content page | face `grid-sheet` (new) | [faces/grid-sheet](../../faces/grid-sheet/) |
| p02 statement | face `grid-statement` (new), composition `figures`, grid setting | [faces/grid-statement](../../faces/grid-statement/), [compositions/figures](../../compositions/figures/) |
| p03, p07, p11 chapters | face `decimal-index-chapter`, redrawn, composition `contents` (new) | [faces/decimal-index-chapter](../../faces/decimal-index-chapter/), [compositions/contents](../../compositions/contents/) |
| p04 bridge | composition `bridge`, grid setting, with `emphasis_label` | [compositions/bridge](../../compositions/bridge/) |
| p05 solar | composition `columns`, grid setting, beside `rail`'s column, component field `chart.series[].data[].emphasis` | [compositions/columns](../../compositions/columns/), [compositions/rail](../../compositions/rail/), [components/chart](../../components/chart/) |
| p06 emissions | face `grid-figure` (new) | [faces/grid-figure](../../faces/grid-figure/) |
| p08 capacity | composition `share` (new), the share bar (a horizontal one-category `stacked` chart), `rail`'s compact column | [compositions/share](../../compositions/share/), [components/chart](../../components/chart/) |
| p09 generation | composition `records`, grid setting | [compositions/records](../../compositions/records/) |
| p10 storage | face `image-top`, `band: "grid"`, composition `figures`, grid setting | [faces/image-top](../../faces/image-top/) |
| p12 2026 so far | composition `lanes`, grid setting | [compositions/lanes](../../compositions/lanes/) |
| p13 slowdown | composition `columns` with a forecast, grid setting | [compositions/columns](../../compositions/columns/) |
| p14 ending | face `resolution-ending`, redrawn | [faces/resolution-ending](../../faces/resolution-ending/) |

The compositions read the `grid` setting from the face that offers them (`CompositionSetting` in [`src/layouts/compositions/shared.tsx`](../../../src/layouts/compositions/shared.tsx), the inks in [`grid.ts`](../../../src/layouts/compositions/grid.ts)). It is the notice setting's shapes on the notice band, recoloured for a page whose data is black: the text ink for data, two greys for what steps back, and the theme's emphasis ink (its red) for the mark.

## Decisions

Where the engine departs from the board, it does so on purpose, for these reasons.

1. No letter spacing anywhere. The board tracks the cover title by −1px, the statement's figures by −3px, the lead figure by −6px and the chapter number by −8px. The PPTX export does not carry tracking, so drawing it in the preview would make the preview lie about the file. The tracked figures come out up to 30px wider than the board's.
2. The chapter line over the claim stays at the board's 15px and the source at 14px, both exempted by name (`grid-spec`). Every other text the board set at 15px (legends, units, lane dates and descriptions) is 16px, the engine's floor.
3. A share bar's labels sit in whichever ink reads on their part at 4.5:1. The board set white on the light red and the mid grey, which do not reach it, so those two labels are black.
4. The share bar's narrow part (nuclear, 0.62) gets its name and value over the bar's end with a short tick down to it. The board left that value out, and a value the author wrote may not vanish.
5. The share bar's totals are computed: the marked run's names in the order they stand (「太阳能和风电」 where the board wrote 「风电和太阳能」), and the largest unmarked part as the second total.
6. The run's second part is the accent 40% lighter, `#E77E82` on swiss, where the board drew `#E77C80`. The greys, the row tint (`#FBEAEA` for `#FBE7E8`) and the closing panel are blends of the theme's own tokens, so a fork recolours them.
7. A highlighted row's text is the least step of the red toward black that reads at 4.5:1 on its tint. The board's red on its tint misses by a little.
8. A column chart with no value axis scales its tallest column to nine tenths of the bars' height. The board rounded the scale by hand (3.0, 7.5, 4.5), which this lands within 4px of.
9. Under the share bar the column chart keeps its own sizes (bars 96px wide, values 20px, categories 17px), where the board drew 88px, 19px and 16px for the smaller plot. The compact figure column takes the board's geometry for that page: the rule at x780, the plot to x700, the column from x820.
10. The closing note is 20px in a 64px panel on every page, where the board drew 19px in a 64px panel on p09 and in a 52px panel on p12. One size keeps the panel the same object wherever it closes a page, as bulletin settled.
11. A milestone title longer than its card wraps inside the card. The board's 「IEA：煤电回升 1.4%」 is the deck's 「IEA：煤电将回升 1.4%」 with a character less, and the board let text overflow its card.
12. The ending splits an item written 「标签：说明」 at the colon and does not print the colon: the line break between label and gloss carries it, and the label declares it (`data-gloss-break`) so the content audit reads it back.
13. The chapter list is read off the deck and drawn whole or not at all: up to four rows at 72px, six at 52px when every heading is one line.
14. The lead figure on the fact page steps down from 176px when it does not fit its column, rather than running under the rule.
15. The cover prints the date when the deck asks for its document meta (`branding: "full"`), the rule every cover keeps. The sample sets `branding: "full"` and an empty `footer`, so no footer marks print, as bulletin's sample does.
16. Chart and bridge figures are grouped the way the chart's language prints them: 「8490」 and 「10,575」 in Chinese, "2,778" in English.
17. A Chinese line keeps a power figure's unit whole: 「1.58 亿千瓦」 does not break before 「千瓦」, which the board held with a no-wrap span.
18. An English paragraph does not end on one word alone: the ending's columns read "IEA sees coal power up 1.4%" over "in 2026", and the fact page's note ends "of CO2". The last word of the line before moves down, the way CSS `text-wrap: pretty` sets body text.
