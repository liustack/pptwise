# runway, graduation collection review sample, 2026-10

The round that redrew runway to one approved board: an eighteen-page Chinese and English graduation review in which a fashion design student presents a collection of seven looks made from used jeans taken apart (「再穿一次」, "Wear It Again"). It runs the order a show's running order runs: the magazine cover, the five parts of the review, why old denim (how much textile waste there is, the water a pair has already cost, counted two ways and never added), the inspiration in the marks of wear with its moodboard, how a pair becomes fabric in five steps, why it is unpicked rather than shredded, the three shades and the three joins, the seven looks in a row and one by one, what the collection can and cannot claim, and the bow. It made runway a show's running order: a masthead across the top with the show at the left, the page's section and its number at the right over a black hairline, a serif claim across the whole measure, rules, air and large serif numerals instead of cards, the pictures large and the words small, and one drop of crimson on the thing a page is about. It settled a content page that hands its body to the compositions in a new `lineup` setting, eleven new compositions, a cover, a chapter page in two forms, a close, a new motif, and a crop for pictures.

## Source

- `design-gen.py` writes every board page as absolutely positioned HTML at 1280 by 720. It is the only source of the boards' geometry. Its photograph references are placeholders the design tool filled in, so the script records the boards rather than rebuilding them outside that tool.
- The `runway.board.png` files in the part folders are those pages rendered at 1280 by 720 in a browser with the sample's photographs. The `runway.engine.png` files are `pptwise preview` of the Chinese showcase deck ([showcase/runway/zh](../../../showcase/runway/zh/)), rasterized with `rsvg-convert`. The board and the engine show the same deck, so the words match as well as the drawing, except where the decisions below say otherwise.
- The board was set in Didot and Bodoni 72 with Songti SC for the serif and PingFang for the sans. `rsvg-convert` has no SimSun and no Microsoft YaHei, the faces the deck names, and sets the preview in Times New Roman, Songti and PingFang. PowerPoint's PDF export of the sample sets it in Times New Roman, SimSun and Microsoft YaHei.

## The design system

Every runway page follows these, not only the pages the sample uses. [docs/design-runway.md](../../../docs/design-runway.md) states them for the next round.

1. The running order's masthead: across the top of every page, the show at the left in small bold type tracked 4px (the deck's `organization` and the footer's `label`, 「毕业设计 · 再穿一次」), the page's section at the right, small, grey and tracked (its `kicker`), the page number in the serif at the far right like an exit number, and a black hairline under them on y54. Over a dark photograph or the stage the masthead is set in the paper.
2. The serif claim: in the heading serif at its regular weight, 34/44, across the whole measure from x64 to x1216, on one line whenever it fits, a point or two smaller if that keeps it there, broken at a comma or a colon when it does not or where the author broke it, its last line ending on y158 whether it has one line or two. English titles take a Latin serif, so their quotation marks are Western.
3. One drop of crimson a page: the one figure or word the page is about (`**…**`, `emphasis`, a marked look number, a figure that moved). Everything else is the ink of the type, a stone grey and hairlines.
4. The pictures argue, the words caption them: captions small, grey and tracked, every AI picture saying so (「AI 生成示意」).
5. No cards: rules, air and large serif numerals order the page.
6. Colours: show-white paper `#F2F0EB`, the ink of the type `#191919`, show black `#141414` for the stage, stone grey `#646460`, hairlines `#DCD9D0`, crimson `#B0483C`.

## Pages and the parts they settled

| board page | part | folder |
| :-- | :-- | :-- |
| every content page | motif `runway-motif` (new) | [motifs/runway-motif](../../motifs/runway-motif/) |
| every content page | face `lineup-sheet` (new), compositions in the `lineup` setting (new), the page's `kicker` as its section | [faces/lineup-sheet](../../faces/lineup-sheet/) |
| p01 cover | face `lineup-cover` (new) | [faces/lineup-cover](../../faces/lineup-cover/) |
| p02 the running order | composition `order` (new) | [compositions/order](../../compositions/order/) |
| p03 the standfirst | composition `standfirst` (new) | [compositions/standfirst](../../compositions/standfirst/) |
| p04 the water | composition `duet` (new) | [compositions/duet](../../compositions/duet/) |
| p05, p07 parts one and two | face `lineup-chapter` (new) | [faces/lineup-chapter](../../faces/lineup-chapter/) |
| p06 the moodboard | composition `collage` (new) | [compositions/collage](../../compositions/collage/) |
| p08 five steps | composition `thread` (new) | [compositions/thread](../../compositions/thread/) |
| p09 the fibre | composition `lengths` (new) | [compositions/lengths](../../compositions/lengths/) |
| p10 three shades | composition `shades` (new) | [compositions/shades](../../compositions/shades/) |
| p11 three joins | composition `atelier` (new) | [compositions/atelier](../../compositions/atelier/) |
| p12 part three, the seven looks | face `lineup-chapter` (new) with composition `parade` (new), `crop` on `image` and `image_grid` items (new), `image_grid` of up to eight (new) | [faces/lineup-chapter](../../faces/lineup-chapter/), [compositions/parade](../../compositions/parade/) |
| p13 to p16 the looks | composition `look` (new) | [compositions/look](../../compositions/look/) |
| p17 the limits | composition `bounds` (new) | [compositions/bounds](../../compositions/bounds/) |
| p18 the bow | face `lineup-ending` (new) | [faces/lineup-ending](../../faces/lineup-ending/) |

The compositions read the `lineup` setting from the face that offers them (`CompositionSetting` in [`src/layouts/compositions/shared.tsx`](../../../src/layouts/compositions/shared.tsx)). The inks, text at its exact size and tracking, figures with their units, photographs with their crops, washes, rules and captions are in [`lineup.tsx`](../../../src/layouts/compositions/lineup.tsx), the masthead, the claim, the source and the bands in [`lineup-shared.tsx`](../../../src/layouts/lineup-shared.tsx). Every ink comes from the theme's tokens: the page and the text for the paper and the ink, the muted for the stone grey, the border for the hairlines, the accent for the crimson, the primary for the stage. The tests draw each composition on runway and on luxe and crayon, a dark theme and a bright one that share nothing with it, and each face on runway, luxe and crayon.

## Decisions

Where the engine departs from the board, it does so on purpose, for these reasons.

1. The heading face is Times New Roman with SimSun. The board was set in Didot and Bodoni 72 with Songti SC, which Windows does not carry: Times New Roman is the nearest high-contrast serif PowerPoint can draw everywhere. It replaces runway's SimSun-led heading, whose Latin widths set English titles wider than the preview and printed their quotation marks on the full em.
2. The masthead is the theme's motif, `runway-motif`, because the page number belongs to the footer row and only a motif paints it in a place of its own. runway carried no motif since the 2026-08 ruling that it takes no decoration. The masthead is not decoration: it is words and one hairline, a structural piece (`data-decor-role="structure"`) with no drawing, so the ruling's point, that runway's look comes from type, stands. The cover, the chapter pages and the bow set their own masthead.
3. The folio is PowerPoint's slide-number field, which keeps counting when pages move, so it reads 「2」 where the board printed 「02」. A field cannot be padded. The chapter pages carry no page number: the engine prints it on content pages only, across every theme. Their masthead names the part, the page's `kicker` or, when it names none, 「第 N 部分」 ("Part N") by the chapter's place in the deck.
4. The chapter photographs carry a darker band behind the masthead than the board's quarter-black, and the cover a fade of black along its foot behind the caption, so the masthead and the caption read on any photograph. The board's caption on the cover's floor was unreadable, and `audit --pixels` holds it to 3:1.
5. On the moodboard (p06) each caption sits on a soft dark fade at the bottom of its picture, where the board used a text shadow, which does not survive into PowerPoint.
6. Labels the board set at weight 500 (the figures' labels on p04 and p09, the points on p17) are bold: PowerPoint knows bold and regular only.
7. On the fibre page (p09) the figure that moved carries a `delta` and is drawn in crimson with its line, and the dashed reach runs from its end up to the longest line. Two figures without one go to `duet`, which never draws them to scale: the water page's two figures are counted two ways and must not be compared.
8. The statement's claim (p03) breaks where the author broke it (「旧衣不缺，」 over the rest), which the board drew as two lines. 「25%　30%」 is one figure with a full-width space, and 「易拆解」 stands where a figure would.
9. The seven looks in a row (p12) are a chapter page that carries an `image_grid`: the chapter's numeral and title over the row, the row drawn by `parade`. Each look is cut out of its group photograph with `crop` on its grid item, read off the board's windows. `image_grid` now takes up to eight pictures.
10. The looks of p14 and p16 keep their group photographs, as the board drew them (「02 03」, 「05–07」). No new photograph was generated for the round. The look's number is the `insight_panel`'s title cut at its first figure (「LOOK 01」 is 「LOOK」 and 「01」), crimson when the author marks it (「LOOK **01**」). A look's name of two lines moves its particulars down a line.
11. Two pages keep two drops of crimson, as the board drew them: the fibre page (the shorter fibre and 「25%」) and the limits page (the claim's marked words and the crosses).
12. Small Chinese labels keep the board's tracking (4 to 8px). A line with lower-case Latin is tracked a quarter as wide. Capitals (「LOOK」) keep it.
13. The colours are the theme's tokens: hairlines are `#DCD9D0` where the board drew `#D9D6CE`, and the quieter words on the stage are the paper mixed toward the stage (about `#CECDC9`, board `#E4E1D9`).
14. The cover title stays on one line from 150px down to 96px and otherwise breaks at a comma or a colon onto two, down to 64px. The board drew one short name.
15. runway's statement and data pages leave `show-statement` and `show-figures` for the lineup sheet, its photo page `show-spotlight`, and it now offers the `fact` kind. The seven show faces stay registered for any theme that names them and appear in the gallery's appendix of faces no menu offers.
16. Every photograph is a sample image generated for the review. None shows a face that can be recognised, readable text or a logo. Each page says so in its caption or its source (「AI 生成示意」, "AI-generated").
