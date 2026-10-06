# proposal, rooftop solar and storage proposal sample, 2026-10-06

The round that drew proposal, the 25th built-in theme, to one approved board: a nineteen-page Chinese and English proposal from a supplier to a manufacturer's management for rooftop solar and battery storage (「让屋顶替贵司付一部分电费」, "Let your roof pay part of your power bill"). It runs the order a client proposal runs: what the client gets, how the new time-of-use bands change the sums in three provinces, what 1 MW of solar saves a year worked line by line, what the payback hangs on, the most a MWh of storage can earn in a day and why that figure is discounted, the four parts of the plan, three ways to pay, five public precedents, storage safety, five risks with their remedies, six steps to delivery, a quote laid out by cost line, the six papers the client hands over, and three decisions. It made proposal a client proposal in a ring binder: white paper, sand cards, petrol figures, the binder's tabs down the right edge, and one brick red a page (a tangerine on the board, see decision 15). It settled a content page that hands its body to the compositions in a new `binder` setting, fifteen new compositions, a cover, a section page, a close, a motif, and fields on `heatmap`, `from_to`, `image_grid`, `icon_cards` and the page's `ballot`.

## Source

- `design-gen.py` writes every board page as absolutely positioned HTML at 1280 by 720. It is the only source of the boards' geometry. Its photograph references are placeholders the design tool filled in, so the script records the boards rather than rebuilding them outside that tool.
- The `proposal.board.png` files in the part folders are those pages rendered at 1280 by 720 in a browser. The `proposal.engine.png` files are `pptwise preview` of the Chinese showcase deck ([showcase/proposal/zh](../../../showcase/proposal/zh/)), rasterized with `rsvg-convert`. The board and the engine show the same deck, so the words match as well as the drawing, except where the decisions below say otherwise.
- `rsvg-convert` has no Microsoft YaHei, the face the deck names first, and sets the preview in a fallback whose Latin bold runs wider. A bold lead-in followed by plain words on one line (the English roadmap's 「Storage adds three safety gates: safety study」) looks tight in the preview. PowerPoint's own PDF export of the sample, set in YaHei, spaces it as measured. It is the preview's font, not the engine.

## The design system

Every proposal page follows these, not only the pages the sample uses. [docs/design-proposal.md](../../../docs/design-proposal.md) states them for the next round.

1. The binder's tabs: down the right edge from y118, a tab every 98px, one a section of the deck's `course` (five at most). The page's own section (its `stage`) is 52px wide in petrol with its name at 15px bold in white, the others 36px wide on sand (white at 86% over a photograph) with their names at 13px in the grey. A Chinese name stands one character under another, 6px apart. A Latin name is turned a quarter, reading down.
2. The deck's label: at the top left of every content page on y34, the footer's label at 12/18 bold, its characters 1px apart, the part before the first 「 · 」 in petrol and the rest in the grey (「屋顶光伏与储能方案 · 呈 贵司管理层」).
3. The claim: bold at 32/44 in petrol from x64 across 1132px, on one line whenever it fits, its last line ending at y150.
4. The body runs from y172 to y640 over a source and to y648 without one. The source at 12/17 in the grey from y650, up to two lines. The page number at y678, 13px bold in the grey, right-aligned at x1196 so the tabs keep the edge.
5. One brick red a page: the accent lights exactly one thing, the figure, bar, step, row, card or button a page is about. Words on the brick red are white, never the ink. Small words in the brick red take the brick red itself (`#B8412C`). The board drew this in a tangerine with a darker tangerine for small words (decision 15).
6. Colours: white paper `#FFFFFF`, sand cards `#F3F0EA` with no outline, petrol `#0E3B53` for claims, figures and dark blocks, the second petrol `#2F6A8A` and the sky `#8DBBD3` for bars and steps, the pale petrol (the second petrol at 12% over the paper, about `#E4EDF2`) for bars of words, the brick red `#B8412C`, the brick red's tint (14%, about `#F5E4E1`), the ink `#14212B`, the grey `#55606A`, hairlines `#E2DDD4`, a deep red `#812920` for an incident, green `#2A7554` for an answer.
7. Photographs are the client's own kind of site: a factory roof under panels at dusk, a battery cabinet on a plant floor, a switch room, a worker checking a roof. On the cover the photograph runs down the right 560px beside the white page. On a section page it fills the page under petrol from the left.

## Pages and the parts they settled

| board page | part | folder |
| :-- | :-- | :-- |
| every content page | motif `proposal-motif` (new) | [motifs/proposal-motif](../../motifs/proposal-motif/) |
| every content page | face `binder-sheet` (new), compositions in the `binder` setting (new), the page's `stage` as its lit tab | [faces/binder-sheet](../../faces/binder-sheet/) |
| p01 cover | face `binder-cover` (new) | [faces/binder-cover](../../faces/binder-cover/) |
| p02 what you get | composition `gains` (new) | [compositions/gains](../../compositions/gains/) |
| p03, p10 sections | face `binder-chapter` (new) | [faces/binder-chapter](../../faces/binder-chapter/) |
| p04 tariff hours | composition `hours` (new), with `steps`, `label_every`, 24 columns and a band's `icon` on `heatmap` | [compositions/hours](../../compositions/hours/), [components/heatmap](../../components/heatmap/) |
| p05 provinces | composition `regions` (new) | [compositions/regions](../../compositions/regions/) |
| p06 solar sum | composition `workings` (new) | [compositions/workings](../../compositions/workings/) |
| p07 sensitivity | composition `levers` (new) | [compositions/levers](../../compositions/levers/) |
| p08 storage sum | composition `cycles` (new) | [compositions/cycles](../../compositions/cycles/) |
| p09 storage discount | composition `drift` (new), with `icon` and `note` on a `from_to` row | [compositions/drift](../../compositions/drift/), [components/from_to](../../components/from_to/) |
| p11 solution | composition `parts` (new), with `tag` on an `image_grid` picture | [compositions/parts](../../compositions/parts/), [components/image_grid](../../components/image_grid/) |
| p12 ways to pay | composition `plans` (new) | [compositions/plans](../../compositions/plans/) |
| p13 precedents | composition `precedents` (new) | [compositions/precedents](../../compositions/precedents/) |
| p14 safety | composition `safeguards` (new), with `title` and `tone` on `icon_cards` | [compositions/safeguards](../../compositions/safeguards/), [components/icon_cards](../../components/icon_cards/) |
| p15 risks | composition `remedies` (new) | [compositions/remedies](../../compositions/remedies/) |
| p16 roadmap | composition `checkpoints` (new) | [compositions/checkpoints](../../compositions/checkpoints/) |
| p17 quote | composition `quote` (new) | [compositions/quote](../../compositions/quote/) |
| p18 papers | composition `papers` (new) | [compositions/papers](../../compositions/papers/) |
| p19 close | face `binder-ending` (new), with `item_choices` on the page's `ballot` | [faces/binder-ending](../../faces/binder-ending/) |

The compositions read the `binder` setting from the face that offers them (`CompositionSetting` in [`src/layouts/compositions/shared.tsx`](../../../src/layouts/compositions/shared.tsx)). The inks, text at its exact size, cards, chips, icons, photographs, checkboxes and the tabs are in [`binder.tsx`](../../../src/layouts/compositions/binder.tsx), the bars and closing lines a page ends on in [`binder-bars.tsx`](../../../src/layouts/compositions/binder-bars.tsx), the claim, the standfirst, the label and the source in [`binder-shared.tsx`](../../../src/layouts/binder-shared.tsx). Every ink comes from the theme's tokens: the page and the surface for the paper and the cards, the primary for petrol, the chart palette's first and third for the second petrol and the sky, the accent for the brick red, the emphasis ink for small words in it. The tests draw each composition on proposal and on brief and rally, a light theme and a dark one that share nothing with it.

## Decisions

Where the engine departs from the board, it does so on purpose, for these reasons.

1. The page number reads 「2」, not 「02」. It is PowerPoint's slide-number field, which keeps counting when pages move and cannot be padded with a zero.
2. The cover, the section pages and the close carry no page number. The engine prints footer marks on content pages only, across every theme. The board printed one on the section pages and the close.
3. The author writes a section's name on its chapter page (`kicker`), never its number. The engine counts chapter pages in the order they appear, so inserting a section renumbers the rest.
4. The board's 500 and 600 are set regular or bold, whichever the page reads closer to, and its 800 and 900 are bold. Microsoft YaHei, the face PowerPoint opens the deck in, has a regular and a bold and nothing between or heavier.
5. The formula and the inputs' symbols are set in the theme's face in italic. The board set them in Georgia, which the deck does not carry.
6. The tariff grid labels its columns, 0, 6, 12 and 18 o'clock. The board also printed 「24 时」 at the end of the day, which is not a column.
7. A row's figure on the tariff page is its label and its value joined by a space (「峰谷差 约 0.76」). The board wrote them as one word (「峰谷差约 0.76」).
8. The quote's blanks (「— — —」) are a grey that reads at 4.5:1. The board's paler dashes read at 2:1.
9. The figure a page lands on stands in the brick red on a sand card as it is (「6.1 至 7.7 年」 on p02), reading at 4.82. The board's tangerine read at 2.66 on the sand and was moved toward the ink until it read at 3:1, until the accent changed (decision 15).
10. The grey is `#55606A`, the board's `#5D6A74` darkened 9% in the same hue. The shared matrix component sets grey words on cells tinted toward the accent, where the board's grey reads at 3.91:1 under the brick red, and every theme's grey has to read at 4.5 there. Under the tangerine 5% had been enough.
11. The answer's green is `#2A7554`, the board's `#2E7D5B` a step darker, so a shield and an arrow in it read at 4.5 on the sand.
12. The source sits at y650 on every content page. The board lowered it to y652 or y656 on a few pages.
13. The chart colours are the second petrol, the brick red, the sky and the sand. The board paired the petrol with its tangerine, the pairing `chart-palette-taboo.test.ts` bans. The theme first shipped with it recorded there as an adjudicated exception, and the entry was removed when the maintainer ruled the taboo stands (decision 15).
14. Every photograph is a sample image generated for the proposal: a factory roof under panels at dusk, a roof at dawn, an installer on a roof, panels on a roof, battery cabinets, a switch room, a worker checking a roof. None shows readable text or a real logo. The cover and the solution page say so on the page (「图为 AI 生成的示意图」, "Image is AI-generated and illustrative"), and the two section pages say so in their notes.
15. On 2026-10-06 the maintainer changed the accent from the board's tangerine to brick red, because petrol blue with orange is the taboo in `chart-palette-taboo.test.ts`, and no exception is kept for proposal. The brick red `#B8412C` sits at hue 9, under the 15 where the taboo's orange begins. It reads at 5.48 on the paper and 4.82 on the sand, so it also takes the place of the darker tangerine (`#C2491B`) for small words and marked runs, and words on it are white (5.48:1), since the ink reads at 2.99 there. A section's number in it reads at 2.17 on petrol and is lifted toward white until it reads at 3:1 (`#C66756`, 3.10:1). `design-gen.py` keeps the board's tangerine as approved.
16. The red for an incident is `#812920`, the board's `#B83A2E` taken to 70% in the same hue. The board's red and the brick red are nearly one colour (CIE76 ΔE 3.9), so an incident's icon on p14 would read as the page's lead. `#812920` stands 20.6 apart, close to the 23.9 the board's red stood from its tangerine.
