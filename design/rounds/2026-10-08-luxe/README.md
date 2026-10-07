# luxe, gold dealer conference sample, 2026-10-08

The round that redrew luxe to one approved board: an eighteen-page Chinese and English deck in which a jewellery brand's head office addresses its dealers at their annual conference after gold's record high (「金价新高之后，我们卖什么」, "After Gold's Record High, What Do We Sell?"). It runs the order an invitation to a gathering runs: the card, the programme of four parts, where the price went (seven years of yearly averages carried on past what the association published, and the fall from the record), the customers (bars and coins overtaking jewellery, less gold and more money, fixed prices swinging back), the trade (stores closed and opened, the tax change as two cards, the purity standard's years), what the house and its dealers do together (three directions for new lines, two ways of pricing, trade-ins and gold risk beside a tray of old gold), a reply card of five things to settle, and the house's signature. It made luxe a gilt invitation: a hairline frame on black stock round every content page, the chapter small between two gold rules, a centred gold serif claim with a diamond under its last line, the occasion at the foot and the page number struck as a hallmark, and gold spent on lines, letters and the one figure a page is about. It settled a content page that hands its body to the compositions in a new `invitation` setting, fourteen new compositions, a cover, a chapter page, a close and a redrawn motif.

## Source

- `design-gen.py` writes every board page as absolutely positioned HTML at 1280 by 720. It is the only source of the boards' geometry. Its photograph references are placeholders the design tool filled in, so the script records the boards rather than rebuilding them outside that tool.
- The `luxe.board.png` files in the part folders are those pages rendered at 1280 by 720 in a browser with the sample's photographs. The `luxe.engine.png` files are `pptwise preview` of the Chinese showcase deck ([showcase/luxe/zh](../../../showcase/luxe/zh/)), rasterized with `rsvg-convert`. The board and the engine show the same deck, so the words match as well as the drawing, except where the decisions below say otherwise.
- The board was set in Songti SC, Georgia and PingFang. `rsvg-convert` has no SimSun and no Microsoft YaHei, the faces the deck names, and sets the preview in Times New Roman, Songti and PingFang. PowerPoint's PDF export of the sample sets it in Times New Roman, SimSun and Microsoft YaHei.

## The design system

Every luxe page follows these, not only the pages the sample uses. [docs/design-luxe.md](../../../docs/design-luxe.md) states them for the next round.

1. The card stock: a hairline frame 24px in from the page's edges on every content page, in the border ink. A page whose photograph runs from the left edge moves it to start beside the photograph.
2. The chapter: centred at the top, 12px in old gold tracked 3px, a 28px gold rule each side (the page's `kicker`, 「第一章　顾客变了」).
3. The claim: bold at 30/38 in the heading serif in gold, centred across x120 to x1160, on one line whenever it fits, broken at a comma or a colon when it does not, its last line ending on y142. A gold diamond with a short rule each side 14px under its last line, wherever that ends.
4. The foot: the source on y628 at 11/15 in the dim gold. The deck's `organization` and the footer's `label` at the bottom left, 11px tracked 2px (「年度经销商大会 · 二〇二六年十月」). The page number struck as a hallmark at the bottom right, 12px in the serif in gold inside a double capsule.
5. Gold only for lines, letters and one figure: no solid gold card and nothing filled ivory. A run of bars steps deeper. What came before or is quieter is an outline in old gold or the dim gold. A card is a gilt frame.
6. Serif figures: every figure is set in the heading serif, its symbol (× or %) hung on it at half its size, a worded unit after it small in old gold.
7. Colours: warm true black `#0B0908`, velvet `#14110E`, champagne gold `#C6A15B`, ivory `#F5EFE3`, old gold `#A89A82`, the dim gold about `#6F6656`, the gold lifted toward the ivory about `#DEC89F`, bronze `#8C6F45`, hairlines `#2E2822`.
8. Photographs illustrate rather than prove: a heritage bangle on velvet, a jewellery counter at night, a street of stores at dusk, a craftsman's hands at the bench, a filigree pendant, small charms on a chain, a tray of old gold. None shows a face that can be recognised, readable text or a logo. Each page says so in its caption or its source.

## Pages and the parts they settled

| board page | part | folder |
| :-- | :-- | :-- |
| every content page | motif `luxe-motif` (redrawn) | [motifs/luxe-motif](../../motifs/luxe-motif/) |
| every content page | face `invitation-sheet` (new), compositions in the `invitation` setting (new), the page's `kicker` as its chapter | [faces/invitation-sheet](../../faces/invitation-sheet/) |
| p01 cover | face `invitation-cover` (new) | [faces/invitation-cover](../../faces/invitation-cover/) |
| p02 the programme | composition `programme` (new) | [compositions/programme](../../compositions/programme/) |
| p03 seven years of the price | composition `climb` (new) | [compositions/climb](../../compositions/climb/) |
| p04 the fall from the record | compositions `solo` and `descent` (new) | [compositions/solo](../../compositions/solo/), [compositions/descent](../../compositions/descent/) |
| p05, p09, p13 chapters one to three | face `invitation-chapter` (new) | [faces/invitation-chapter](../../faces/invitation-chapter/) |
| p06 bars and coins overtake jewellery | compositions `solo` and `doubles` (new) | [compositions/doubles](../../compositions/doubles/) |
| p07 less gold, more money | composition `balance` (new) | [compositions/balance](../../compositions/balance/) |
| p08 fixed prices swing back | composition `swing` (new) | [compositions/swing](../../compositions/swing/) |
| p10 stores closed and opened | composition `ebb` (new) | [compositions/ebb](../../compositions/ebb/) |
| p11 the tax change | composition `facing` (new) | [compositions/facing](../../compositions/facing/) |
| p12 the purity standard | composition `lapse` (new) | [compositions/lapse](../../compositions/lapse/) |
| p14 three directions for new lines | composition `triptych` (new) | [compositions/triptych](../../compositions/triptych/) |
| p15 two ways of pricing | composition `mirror` (new) | [compositions/mirror](../../compositions/mirror/) |
| p16 trade-ins and gold risk | composition `vitrine` (new) | [compositions/vitrine](../../compositions/vitrine/) |
| p17 the reply card | composition `reply` (new), with the page's `stamp` down its stub | [compositions/reply](../../compositions/reply/) |
| p18 the close | face `invitation-ending` (new), with the page's `subheading` as the house's signature | [faces/invitation-ending](../../faces/invitation-ending/) |

The compositions read the `invitation` setting from the face that offers them (`CompositionSetting` in [`src/layouts/compositions/shared.tsx`](../../../src/layouts/compositions/shared.tsx)). The inks, text at its exact size, figures with their units, the gilt frame, the diamond, rules and leaders, hatching, photographs and washes, and the claim's and the source's placement are in [`invitation.tsx`](../../../src/layouts/compositions/invitation.tsx), the chapter, the claim with its diamond, the source and the bands in [`invitation-shared.tsx`](../../../src/layouts/invitation-shared.tsx). Every ink comes from the theme's tokens: the page and the surface for the stock and the velvet, the text for the ivory, the accent for the gold, the muted for old gold, the chart palette's third for bronze, and the dim gold and the lifted gold mixed from them. The tests draw each composition on luxe and on brief and crayon, two light themes that share nothing with it, and each face on luxe, brief and crayon.

## Decisions

Where the engine departs from the board, it does so on purpose, for these reasons.

1. The heading face is Times New Roman with SimSun. The board was set in Songti SC with Georgia's figures, which Windows does not carry. Times New Roman sets lining figures that stand on the baseline and its bold figures read a little heavier than the board's. English titles are set in it too, so their quotation marks are Western in PowerPoint.
2. The claim is not tracked. The board tracked it 1px. Small Chinese labels keep the board's tracking (2 to 8px). Latin is tracked a quarter as wide, since 8px between letters reads as spaced-out capitals.
3. The folio is PowerPoint's slide-number field, which keeps counting when pages move, so it reads 「2」 where the board struck 「02」. A field cannot be padded.
4. The colours are the theme's tokens, not the board's own values: the dim gold is old gold at 64% over the stock (`#6F6656`, board `#6F6555`), the lifted gold is the ivory half over the gold (`#DEC89F`, board `#E2C891`), bronze is the chart palette's third (`#8C6F45`, board `#8A6B3F`), and a gilt frame's inner rule is mixed toward the stock rather than set translucent.
5. Symbols are the built-in lucide icons at the engine's stroke, a little heavier than the board's 1.3px. The chapter numerals are the Latin capitals I, II and III in Times New Roman closed up until their serifs meet, rather than the board's single Roman numeral glyphs, and the engine counts the chapters itself.
6. On the price page (p03) the run of bars is two series, what the association published and what the author worked out from the exchange's daily quotes, and the second is hatched. The last category keeps its own words, 「2026 年」 over 「1 至 9 月」. The board printed 「2026」. The gridlines are cut clear of the values over the bars, which the board ran a rule through.
7. On the fall (p04) the line's own name stands small at the lower left of the plot, and the level's name reads 「2025 年全年均价 798.12」 so it does not repeat the figure's note word for word. The last point's caption reads 「收盘 · 2026-09-30」, as the first reads 「最高收盘 · 2026-01-29」. The board turned the second round.
8. Beside one figure set huge (p04, p06) the hairline stands where the drawing needs it: x600 beside a line, x530 beside pairs of bars (board x520).
9. On the tax page (p11) the source names the ministries rather than repeating the two documents' numbers the cards already carry.
10. On the standard's page (p12) the milestones stand evenly along the hairline. The board placed them by eye. The stretch far longer than the others (more than three times the middle one and three years at least) is the one cut short. The source names the industry standards platform rather than repeating the standard's number the milestone already carries.
11. On the reply card (p17) the stamp stands upright a character a cell, centred on the stub, and turns a quarter to read from the top in English.
12. The cover without a photograph stands its card in the middle of the page. A content page with a subheading sets it centred under the diamond and the body under it. Neither was drawn.
13. The statement and quotation pages (`statement`, `pull-quote`) keep their layout inside the new card stock. The board drew neither.
14. Every photograph is a sample image generated for the conference. None shows a face that can be recognised, readable text or a real logo. The cover and the chapter pages say so in their caption (「示意图（AI 生成）」, "Illustration (AI-generated)"), the content pages in their source.
