# brief, tea sample, 2026-10-02

The round that redrew brief's real-data sample, a twelve-page Chinese and English review of China's listed tea chains ("开店潮之后，增长靠什么"), to one approved board. It reused most of the first round's parts and settled the pages the first round never drew: a chart with the author's figures beside it, three headline figures over a quote, a timeline on one rule, a four-option table, supporting figures beside a big one, and a photo page with its facts as ruled pairs.

## Source

- `design-gen.py` writes every board page as absolutely positioned HTML. It is the only source of the boards' geometry. Its image and engine-render references point at the design tool's blob store, so the script records the boards rather than rebuilding them outside that tool.
- The `brief-tea*.board.png` files in the part folders are those pages rendered at 1280 by 720 in a browser. The `brief-tea*.engine.png` files are `pptwise preview` of the Chinese deck, rasterized with `rsvg-convert`. Here the board and the engine show the same deck, so the words match as well as the drawing.

## Pages and the parts they settled

| board page | part | folder |
| :-- | :-- | :-- |
| p01 cover | face `gauge-verdict`, unchanged | [faces/gauge-verdict](../../faces/gauge-verdict/) |
| p02 statement | face `gauge-point`, unchanged | [faces/gauge-point](../../faces/gauge-point/) |
| p03, p06, p07 chart pages | composition `rail` with the author's figures, component field `kpi_cards.items[].note` | [compositions/rail](../../compositions/rail/), [components/kpi_cards](../../components/kpi_cards/) |
| p04 photo | face `image-split`, `column: "report"`, composition `pairs` | [faces/image-split](../../faces/image-split/), [compositions/pairs](../../compositions/pairs/) |
| p05 three figures | composition `figures` | [compositions/figures](../../compositions/figures/) |
| p08 timeline | composition `track` | [compositions/track](../../compositions/track/) |
| p09, p11 tables | composition `table` at its compact and dense sizes, with a closing block | [compositions/table](../../compositions/table/) |
| p10 big figure | face `gauge-figure` with supporting figures | [faces/gauge-figure](../../faces/gauge-figure/) |
| p12 ending | face `gauge-next`, unchanged | [faces/gauge-next](../../faces/gauge-next/) |

The full-width primary block that closes the rows page of the first round now closes a table, a timeline and a row of figures too, each at the size its board gives it. It lives in [`src/layouts/compositions/closing.tsx`](../../../src/layouts/compositions/closing.tsx). A chart page is the exception: its closing remark goes into the column beside the chart.

## Decisions

Where the engine departs from the board, it does so on purpose, for these reasons.

1. The charts draw the way the chart component draws on every theme: the legend top right, the unit on each tick, bars as wide as their slot allows, the value labels at the component's size. The board draws its own bars. The first round accepted the same differences, and the maintainer called the chart pages close enough. The sample's charts drop their axis titles, which the board does not print.
2. Quotes are the speakers' own words. The board set paraphrases between quotation marks. p05 prints a verbatim clause of the CEO's remark, and p07 prints the verbatim phrase from Guming's interim report under the report's name, where the board printed "公司怎么说".
3. The first figure in a chart's column sits over the emphasis stroke as a fixed mark of the composition, like the bar under the big figure. A `kpi_cards` value carries no `**…**` marks, so the author cannot mark it.
4. p06 moved from `evidence` to `data`. Its face, `gauge-exhibit`, promises one block, and the page now carries two.
5. p10's source moved from the lead figure to the page's own source line, as the board draws it.
6. The statement page keeps the first round's paragraph, 27/44 on an 880px measure. This board sets it at 26/44 on 900px. The two boards disagree by a character a line, and the first one is the settled one.
7. The bar under the big figure stays exactly as wide as the figure, as the first round settled. The board draws it 420px wide.
8. brief's emphasis stroke is its own slanted pad, settled in the first round. The board draws a flat band.
9. Line breaks keep words and figures together (约谈, 状况, 80 杯) where the browser broke them anywhere.
10. The English copy of p09 and p11 was tightened so every cell keeps to the board's line budget at the board's sizes. The Chinese copy fits as written.
11. Where a two-line closing line would push the timeline's block past the source line, the block rises toward the milestones, keeping 20px clear of them. The board only ever had one line.
12. Under the row of figures the speaker sits where the board puts it, under room for a two-line quote, whether the quote takes one line or two.
