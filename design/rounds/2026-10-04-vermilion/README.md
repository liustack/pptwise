# vermilion, government work report sample, 2026-10-04

The round that redrew vermilion to one approved board: a fifteen-page Chinese and English briefing on China's 2026 Government Work Report and the 15th Five-Year Plan ("2026 年政府工作报告和「十五五」规划纲要要点"), what has landed so far this year, and what it means for a manufacturer. It turned vermilion into the page of an official document: a red letterhead on the cover, a gold double rule along every page's head, the claim centred in red, items numbered 一、二、三 in small red squares, open tables under a red rule, red spent once a page, and gold only ever drawing. It settled an ordinary content page that hands its body to the compositions in a new `seal` setting, a single-figure page, a photo page, and the cover and the ending.

## Source

- `design-gen.py` writes every board page as absolutely positioned HTML. It is the only source of the boards' geometry. Its photograph and engine-render references point at the design tool's blob store, so the script records the boards rather than rebuilding them outside that tool.
- The `vermilion*.board.png` files in the part folders are those pages rendered at 1280 by 720 in a browser. The `vermilion*.engine.png` files are `pptwise preview` of the Chinese showcase deck ([showcase/vermilion/zh](../../../showcase/vermilion/zh/)), rasterized with `rsvg-convert`. The board and the engine show the same deck, so the words match as well as the drawing.

## The design system

Every vermilion page follows these, not only the pages the sample uses. [docs/design-vermilion.md](../../../docs/design-vermilion.md) states them for the next round.

1. A gold double rule, 2px and 1px six pixels apart, from x64 to x1216: along the head of every content page (y26 and y32), along the foot of the cover (y668 and y674), and both on the ending. The chapter page draws its own, and the photo page's column draws it from the photograph's edge.
2. The cover is a letterhead: the issuing body in red, bold, 52px, its Chinese characters 12px apart, over a 4px and a 1px red rule from x80 to x1200. Under them the title centred in the ink at 56/72, evened over two lines when it needs two, the subtitle at 22px and the date at 18px in the archive grey.
3. Every content page has one header: the claim centred and bold in red at 34/44 across the full 1120px from x80, at most two lines, set on its last line at y140, never broken early and evened when it breaks (a Chinese claim breaks at its comma). Under it a 64 by 2 gold bar stands centred at y154. The body runs from y186 to y648, and the source sits at the foot at 14/20 from y660.
4. Items are numbered in the deck's own numerals: 一、二、三 in a Chinese deck, 1, 2, 3 in an English one, white on small red squares. The item the page lands on is reversed out of red, its square turned white.
5. Red (`#B02318`) is the one mark, once a page: a reversed row or cell, a row on red's pale tint, or a figure in red. Gold (`#C79A3B`) only draws: rules, bars, arrows, a ring's progress, a value range's tint, the outline of a tag that says something changed. It is never a word. Data nobody marked steps back in warm greys, `#A89480` nearest the mark and `#CDBBA5` after it.
6. Tables are open: 15px headers over a 2px red rule, hairlines (`#E0D2B8`) between rows, no fills but the marked row's. Panels are the surface (`#FCF8EF`) with a 1px hairline edge.
7. Type: the claim 34px, body 18 to 19px, labels 15 to 16px, tags 14px, the source 14px. Microsoft YaHei for every word, Chinese and English.
8. No political symbols: no star, no emblem, no flag. The red and the gold say "official document" on their own.

## Pages and the parts they settled

| board page | part | folder |
| :-- | :-- | :-- |
| every page | motif `vermilion-motif`, redrawn as the gold double rule | [motifs/vermilion-motif](../../motifs/vermilion-motif/) |
| every content page | face `seal-sheet` (new), compositions in the `seal` setting (new) | [faces/seal-sheet](../../faces/seal-sheet/) |
| p01 cover | face `red-head-cover`, redrawn | [faces/red-head-cover](../../faces/red-head-cover/) |
| p02 summary | composition `rows`, seal setting | [compositions/rows](../../compositions/rows/) |
| p03 the year's targets | composition `scores` (new) | [compositions/scores](../../compositions/scores/) |
| p04 this year's targets | composition `table`, seal setting, with tags on the rows | [compositions/table](../../compositions/table/), [components/comparison](../../components/comparison/) |
| p05 fiscal tools | composition `rail`, seal setting, grouped columns beside figures | [compositions/rail](../../compositions/rail/) |
| p06 ten tasks | composition `roster` (new) | [compositions/roster](../../compositions/roster/) |
| p07 the plan's targets | composition `targets` (new) | [compositions/targets](../../compositions/targets/), [components/from_to](../../components/from_to/) |
| p08 carbon | face `seal-figure` (new) | [faces/seal-figure](../../faces/seal-figure/) |
| p09 growth | composition `trend` (new) beside `rail`'s figures, with a value range | [compositions/trend](../../compositions/trend/), [components/chart](../../components/chart/) |
| p10 indicators | composition `columns`, seal setting, values below zero | [compositions/columns](../../compositions/columns/) |
| p11 policies | composition `lanes`, seal setting, two lanes | [compositions/lanes](../../compositions/lanes/) |
| p12 funds | composition `rings` (new) | [compositions/rings](../../compositions/rings/), [components/progress_donuts](../../components/progress_donuts/) |
| p13 equipment | face `image-split`, `column: "seal"` (new) | [faces/image-split](../../faces/image-split/) |
| p14 implications | composition `tiles`, seal setting | [compositions/tiles](../../compositions/tiles/) |
| p15 ending | face `deliberation-ending`, redrawn | [faces/deliberation-ending](../../faces/deliberation-ending/) |

The compositions read the `seal` setting from the face that offers them (`CompositionSetting` in [`src/layouts/compositions/shared.tsx`](../../../src/layouts/compositions/shared.tsx), the numbered square, the inks and the tag in [`seal.tsx`](../../../src/layouts/compositions/seal.tsx), the deck's numerals in [`numerals.ts`](../../../src/layouts/compositions/numerals.ts)). Every ink comes from the theme's tokens: the emphasis ink for the mark, the accent for drawing, the border for hairlines and the chart palette after its lead for unmarked series. The tests draw each form on vermilion and on bulletin, ember and crayon.

## Decisions

Where the engine departs from the board, it does so on purpose, for these reasons.

1. Letter spacing is drawn only where the export carries it. The cover's issuing body is spaced 12px between Chinese characters and the fact page's figure is set 8px tight, each by a `<tspan dx>` that the PPTX export writes as character spacing, so the preview and the file agree. A Latin issuing body is not spaced ("Strategy Department", not "S t r a t e g y").
2. The small type is the board's: 15px headers, legends and labels, 14px tags and the source. All of it is below the engine's 16px floor and carries the `seal-spec` exemption by name, which the L1 audit and the corpus scan know.
3. The English deck keeps Microsoft YaHei. Measured in the font PowerPoint ships (`msyh.ttc`), YaHei's hyphen is 0.288em of ink at 0.074em thick and Arial's is 0.270em at 0.088em: an ordinary hyphen, not a dash. Only its advance is wider (0.433em against 0.333em), and the width table counts it. A Mac without YaHei installed rasterizes the preview in a fallback face, where the hyphen looks longer than it prints. The theme gives its faces by role, not by language, and only YaHei and Georgia carry exact width tables: a Latin face such as Arial would send the Chinese deck's figures and Latin words to Arial too and its headings to the conservative width envelope. YaHei sets curly quotes (“ ” and ’) a full em wide, as Chinese punctuation, so the English sample quotes with straight quotes and writes its apostrophes straight.
4. The ten tasks page (p06) sets every title but the marked one in regular weight. The board also set the second and third titles bold, for the "new drivers and technology" the claim names. An item has one way to stand out, `emphasis`, and it is spent once a page, on the first task.
5. The targets table (p04) sets 「4.5%—5%，在实际工作中努力争取更好结果」 on one line, where the board wrapped it: the board measured in the browser's PingFang, the engine in YaHei, which is narrower.
6. The plan page's statement (p07) is split by a rule, not by hand: a statement wider than half the block's measure is set on two even lines, so 「不设五年数值目标」 reads 「不设五年」 over 「数值目标」 as the board drew it, and a short one stays on one line. The header over the measures' names 「指标」 is aligned with the names at x476, where the board put it at x460, as the scorecard page aligns its header with its names.
7. The growth page (p09) prints each point's value with the decimals its neighbours carry (「5.0」), where the board's script printed 「5」.
8. The indicators page (p10) computes its scale from the band, where the board fixed 22px a point: the zero line lands at y419 against the board's y420.
9. Milestone titles on the policy page (p11) are evened (「中小微企业贷款」 over 「贴息」), where the board left 「息」 alone. Descriptions are evened too, which breaks 「企业贷上」 from 「限 7500 万元」 where the board broke 「5000」 from 「元」. A lane name may take two lines, which the English 「Industry and jobs」 needs.
10. The photo page (p13) turns the theme's motif off (`decor: "silent"`), and the column draws the gold double rule from x600, 40px off the photograph, where the board draws it. A photograph the page asks for on the right is mirrored: the photograph from x720, the column from x80.
11. Every text on the board sits about 2px higher than the engine's, the difference between the browser's line box and the engine's YaHei baseline. The engine keeps one baseline rule for every page.
12. The ending (p15) splits an item written 「标签：说明」 at the colon, does not print the colon, and declares it (`data-gloss-break`) so the content audit reads it back. An item with no label that does not fit the label's line becomes the card's sentence under its number.
13. The old points page's large 「04」 in a circle is gone: the numbered square carries the number, and the evidence page's hard-coded 「案卷 · 13」 went with the old evidence face.
