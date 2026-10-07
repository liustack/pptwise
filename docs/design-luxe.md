---
summary: 'The settled luxe design system handed to a design tool together with the general design brief: the gilt invitation a house sends its guests, the card stock frame, the chapter between two gold rules, the centred gold claim with its diamond, the occasion and the hallmark folio, gold only for lines, letters and one figure, the serif figures, the type sizes, and the parts a new luxe page starts from'
read_when:
  - drawing a luxe page, face or composition that the 2026-10 board did not draw
  - changing anything luxe paints, before opening the code
  - judging whether a luxe page in a showcase or the gallery follows the board
---

# Designing for luxe

luxe was drawn to one approved board in October 2026, as a jewellery brand's head office addressing its dealers at their annual conference after gold's record high: an invitation card on the cover, a programme of four parts, the figures each part rests on, three chapters each opening under a photograph, and a reply card of five things to settle together, signed by the house at the close. This page states the rules that board settled, so the next page drawn for luxe follows them without a new argument. Paste it into the design tool after [Design brief](./design-brief.md), which still holds every general rule (vector primitives, contrast, the safe area, what to attach). Where the two disagree, this page wins for luxe: its card stock frames the page 24px in from the edge, its claim is centred, and its labels, sources, captions and folio are 10 to 15px. The board, its source and every place the engine departs from it on purpose are in [`design/rounds/2026-10-08-luxe/`](../design/rounds/2026-10-08-luxe/README.md).

## Palette

Take the colours from `pptwise themes --json`, not from this page. For reading the rules below:

| role | token | value |
| :-- | :-- | :-- |
| the card stock | `bg` | `#0B0908`, warm true black |
| a ground a step above the stock | `surface` | `#14110E`, velvet |
| words | `text` | `#F5EFE3`, ivory |
| rules, letters, figures, the one thing a page is about | `accent` | `#C6A15B`, champagne gold |
| the figure a page lands on | gold half way to the ivory | about `#DEC89F` |
| labels, notes, what is quieter | `muted` | `#A89A82`, old gold |
| sources, captions, the occasion at the foot | old gold toward the stock | about `#6F6656` |
| what goes the other way (stores closed against opened) | `chartPalette` third | `#8C6F45`, bronze |
| hairlines, the card stock's frame | `border` | `#2E2822`, never words |

Gold only for lines, letters and one figure: nothing is a solid gold card and nothing is filled ivory. A figure the page leans on is set large in gold. A bar is gold. What came earlier or is quieter is an outline (a hollow dot, a bar drawn in old gold, a card outlined in the dim gold beside a gilt one). A run of bars steps deeper the further it runs. A run the author carries on in a second series is hatched in gold inside a gold outline.

## The card stock, the chapter, the claim and the foot

- Every content page has a hairline frame 24px in from the page's edges, in the border ink. Nothing else frames it. A page whose photograph runs from the left edge to the middle moves the frame to start beside it (x584).
- At the top, centred, the chapter the page belongs to: 12px in old gold, tracked 3px, with a 28px gold rule each side 28px from the words (the page's `kicker`, 「第一章　顾客变了」). The pages before the first chapter carry none.
- The claim: 30/38 in the heading serif, bold, in gold, centred across x120 to x1160, its last line's box ending on y142. It stays on one line whenever it fits at 95% of its size or more, and breaks at a comma or a colon when it does not. A break the author wrote is kept.
- A gold diamond 8px across stands 14px under the claim's last line, a 24px rule each side of it, wherever that line ends.
- A subheading, when a page has one, stands centred under the diamond at 15px in old gold. The board drew none.
- The source on y628, 11/15 in the dim gold, one line or two, never cut. A composition may set it higher under its own body.
- The foot: the deck's `organization` and the footer's `label` at the bottom left, 11px in the dim gold, tracked 2px (「年度经销商大会 · 二〇二六年十月」). The page number struck as a hallmark at the bottom right, 12px in the serif in gold inside a double capsule 48 by 22 (PowerPoint's slide-number field). The draft and confidentiality marks stand before the hallmark. The cover, the chapter pages and the close carry none of these and draw their own.

## Figures, cards and photographs

- A figure is set in the heading serif. Its symbol (× or %) hangs on it at half its size in the same ink. A worded unit (吨, 亿元) follows after a space, small, in old gold. One figure set huge is 104 to 150px in gold. Two figures weighed against each other are 56 and 40px in ivory.
- A change is printed in a capsule under its figure: outlined and lettered in gold when it went up, outlined dim and lettered in old gold when it went down.
- A card is a gilt frame: a gold rule and a fainter one 8px inside it. Beside it, what came before is outlined in the dim gold.
- A programme numbers its items 壹 贰 叁 肆 in a Chinese deck and I II III IV in any other, large in the serif in gold, with a dotted leader to the page each item opens on.
- A chapter is numbered I, II, III in the serif in gold, 140px, by its place among the chapter pages.
- Photographs illustrate rather than prove: a heritage bangle on velvet, a jewellery counter at night, a street of shuttered stores, a craftsman's hands at the bench, a filigree pendant, small charms, a tray of old gold. No face that can be recognised, no readable text and no logos. On the cover the photograph runs down the right half and fades into the stock at its left. On a chapter page it runs the whole page under a veil of black from the left. On a content page three pieces stand in a row in a fine gold rule, or one photograph runs down the left half to x560 and fades into the stock.
- Symbols are the built-in lucide icons in gold, inside a fine gold ring where an item stands beside them.

## Type

The heading face is Times New Roman with SimSun (the board was set in Songti SC and Georgia), for the claim, names, numerals, figures and the cover's and the close's words. The body face is Microsoft YaHei (PingFang on the board) for labels, notes, sources and the foot. Chinese small labels are tracked 2 to 8px as the board tracks them. Latin is tracked a quarter as wide.

| text | size |
| :-- | :-- |
| one figure set huge | 104 to 150 |
| the chapter's numeral | 140 |
| the chapter's title | 52 |
| the cover's title, the closing words | 46, 44 |
| a figure on a balance, a large figure on a card | 40 to 56 |
| the programme's numerals | 40 |
| the claim | 30/38 |
| a programme item's or a piece's name | 22 to 24 |
| a row's name, a house, a card's measure | 17 to 20 |
| the subtitle, a figure past a bar | 14 to 18 |
| a line under a name, a row's answer | 13 to 15 |
| labels, keys, captions, the source, the occasion, the folio | 10 to 12 |

## How the author's marks are drawn

| the author marks | how it is drawn |
| :-- | :-- |
| the occasion and the date (`organization`, `footer.label`) | at the bottom left of every content page, and on the cover, the chapter pages and the close |
| a page's chapter (`kicker`) | centred over the claim between two gold rules. On a chapter page, small under its numeral |
| the source (`footnote`) | at the foot, or under the column beside a photograph |
| the one thing a page is about (`emphasis` on a programme item, `status: "pending"` or `highlight` on a milestone, `**…**` on a word) | gold |
| a run carried on by a second series (two bar series whose categories follow one another) | hatched gold inside a gold outline, named in the legend |
| a record the bars are read against (`reference`) | a dashed gold line across them with its label over it |
| a level a line is read against (a second line series that holds one value) | a dashed dim line with its name and value at its right end |
| what a figure is (`tag` on `kpi_cards`) | the name of its side of the balance |
| a category's parenthesis (「周大福（内地零售点 · 2024-03 至 2026-06）」) | small under the name |
| a piece's caption written "name：line" | the name in gold over the line |
| a reply card's stamp (`stamp`) | down the card's torn stub |
| the cover's and the chapter's picture (`background`) | a photograph fading into the stock, under a veil of black |
| the close's signature (`subheading`) | under a short gold rule, over the date |

## Where a new page starts

Before drawing, find the closest part in [Reusable parts](./reusable-parts.md#luxe-gold-dealer-conference-sample-2026-10). luxe's content pages are `invitation-sheet`, which hands its body to a composition in the invitation setting: `programme` for a gala's order of the day, `climb` for a run of yearly bars beside the figure it comes to, `solo` for one figure set huge beside a drawing of how it came about (`descent` for a fall from a high, `doubles` for two quantities in pairs of bars), `balance` for two quantities weighed against each other, `swing` for a few houses moving in two stretches, `ebb` for closures and openings either side of one line, `facing` for a rule before and after as two cards, `lapse` for a rule's dates with the quiet years cut short, `triptych` for three pieces of a range, `mirror` for two ways of doing one thing either side of a gold line, `vitrine` for a half page photograph beside its items, and `reply` for the reply card. The cover is `invitation-cover`, a chapter's opening `invitation-chapter`, the close `invitation-ending`. A statement keeps `statement` and a quotation `pull-quote`, inside the same card stock. A new page is usually a new composition in the invitation setting, handed the whole card: black stock, gold for lines, letters and one figure, ivory words and a centred claim.

A content page none of the compositions takes is drawn by the component renderer under the same chapter, claim and source.
