# ink, intangible heritage public lecture sample, 2026-10-07

The round that redrew ink to one approved board: an eighteen-page Chinese and English public lecture from a cultural lecture hall (「非遗怎样活在今天」, "How Intangible Heritage Lives On Today"), following China's intangible cultural heritage from the lists to the people and back to everyday life. It runs the order a lecture runs: the figures it opens on, what the law counts as heritage, the four tiers of lists and what stands beside them, the first volume on the lists (the 45 elements on UNESCO's lists year by year, Yimakan's fourteen years, how China's count stands on UNESCO's country pages, the ten categories), the second volume on the people (six batches of national bearers beside the counts that must not be added, the ages of the batch named in 2018, the bearers who died before their record was done, workshops, training and schools, the first Spring Festival holidays after inscription, the problems on record, five things a listener can do), and the close. It made ink a lecture hung as a scroll: two thin edges down every content page, the hall and the date standing upright down the right margin, the volume standing upright in cinnabar down the left, the claim in kaishu across the page, the source at the foot, and cinnabar spent once a page. It settled a content page that hands its body to the compositions in a new `scroll` setting, fourteen new compositions, a cover, a chapter page, a quotation page, a close and a redrawn motif.

## Source

- `design-gen.py` writes every board page as absolutely positioned HTML at 1280 by 720. It is the only source of the boards' geometry. Its photograph references are placeholders the design tool filled in, so the script records the boards rather than rebuilding them outside that tool.
- The `ink.board.png` files in the part folders are those pages rendered at 1280 by 720 in a browser with the sample's photographs. The `ink.engine.png` files are `pptwise preview` of the Chinese showcase deck ([showcase/ink/zh](../../../showcase/ink/zh/)), rasterized with `rsvg-convert`. The board and the engine show the same deck, so the words match as well as the drawing, except where the decisions below say otherwise.
- The board was set in Kaiti SC, Songti and PingFang. `rsvg-convert` has no KaiTi and no Microsoft YaHei, the faces the deck names, and sets the preview in Times New Roman, Kaiti SC and PingFang. PowerPoint's PDF export of the sample sets it in Times New Roman, KaiTi and Microsoft YaHei.

## The design system

Every ink page follows these, not only the pages the sample uses. [docs/design-ink.md](../../../docs/design-ink.md) states them for the next round.

1. The scroll: two hairlines down every content page at x70 and x1210, from y40 to y680, in the hairline ink. Nothing else frames the page.
2. The margins. Down the right margin from y48 the hall and the date stand upright, 13px in the taupe, tracked 6px (the deck's `organization` and the footer's `label`, 「文化讲堂　二〇二六年十月」, as the author writes them). Down the left margin from y48 the volume the page belongs to stands upright in cinnabar, 15px in the heading face, tracked 8px (the page's `kicker`, 「卷之一　先看名录」). In a Latin deck both are turned a quarter to read from the top, never stood letter by letter.
3. The claim: 34/46 in the heading face in the ink, from x110 across 1060px, its last line ending on y152. It stays on one line whenever it fits, giving up at most a twentieth of its size to do so, and breaks at a comma or a colon when it does not. A break the author wrote is kept. Beside a photograph that runs the height of the page it takes the column beside the photograph at 38 to 40px.
4. The foot: the page's `footnote` is its source, on y648 at 11/15 in the grey, one line or two, never cut. Beside a photograph it stands under the column. The folio is the page number at 12px in the heading face in the taupe, right-aligned on the right edge at y680. The cover, the chapter pages and the close carry none of the frame and draw their own.
5. Cinnabar once a page: on large type (a volume number), a seal, or the one thing the author marks (`**…**` on a figure, `emphasis` on a point or a series, `highlight` on a milestone, a row or a card). Nothing turns cinnabar for being the largest, and cinnabar never carries small type.
6. Depth instead of colour: whatever is told apart by depth (the tiers of a pyramid, the age groups of a share bar, the spans of a timeline) takes a ramp from the ink toward the paper, the darkest first. Words on a pale step are in the ink, never white.
7. Upright Chinese: a character a cell, read from the right, its punctuation the way vertical type sets it: a comma or a full stop in the upper right of its cell, brackets and title marks in their vertical forms, an ellipsis turned, and no column starting on a comma or ending on an opening bracket.
8. Nothing is slanted. A Chinese face has no italic, so what has to be told apart takes a colour or the other face instead.
9. Colours: rice paper `#F7F2E7`, a step whiter `#FCF9F2` for cards and the title slip, the ink `#262421` for words, burnt ink `#1F1C18` for the darkest marks, the second ink `#393631`, taupe `#8A8071`, faint `#C9BFAC`, wash `#EAE2D2`, hairlines `#DCD2BD`, the grey `#686056`, cinnabar `#C3272B`, and gold `#B5A36F`.
10. Photographs illustrate rather than prove: a shadow puppet horse, a fishing boat on a misty lake, old hands at embroidery, weavers at their looms, a woodblock carver's hands, children cutting paper, a lane hung with lanterns, a brush beside an inkstone. None shows a face that can be recognised, readable text or a logo. On the cover the photograph runs down the left 640px and fades into the paper. On a chapter page a tall painting hangs in its mount. On a content page it runs the height of the page at the left, its note in white at its foot.

## Pages and the parts they settled

| board page | part | folder |
| :-- | :-- | :-- |
| every content page | motif `ink-motif` (redrawn) | [motifs/ink-motif](../../motifs/ink-motif/) |
| every content page | face `scroll-sheet` (new), compositions in the `scroll` setting (new), the page's `kicker` as its volume | [faces/scroll-sheet](../../faces/scroll-sheet/) |
| p01 cover | face `scroll-cover` (new), with the page's `stamp` as its seal | [faces/scroll-cover](../../faces/scroll-cover/) |
| p02 the lists and the people | composition `opening` (new) | [compositions/opening](../../compositions/opening/) |
| p03 the law | face `scroll-quote` (new), composition `statute` (new) | [faces/scroll-quote](../../faces/scroll-quote/), [compositions/statute](../../compositions/statute/) |
| p04 the system | composition `strata` (new) | [compositions/strata](../../compositions/strata/) |
| p05, p10 volumes one and two | face `scroll-chapter` (new) | [faces/scroll-chapter](../../faces/scroll-chapter/) |
| p06 the scroll of years | composition `handscroll` (new) | [compositions/handscroll](../../compositions/handscroll/) |
| p07 Yimakan | composition `revival` (new) | [compositions/revival](../../compositions/revival/) |
| p08 the world | composition `nations` (new) | [compositions/nations](../../compositions/nations/) |
| p09 the categories | composition `genres` (new) | [compositions/genres](../../compositions/genres/) |
| p11 the bearers | composition `bases` (new) | [compositions/bases](../../compositions/bases/) |
| p12 their ages | composition `ages` (new) | [compositions/ages](../../compositions/ages/) |
| p13 the rescue records | composition `archive` (new) | [compositions/archive](../../compositions/archive/) |
| p14 back to daily life | composition `scenes` (new) | [compositions/scenes](../../compositions/scenes/) |
| p15 the Spring Festival | composition `daily` (new) | [compositions/daily](../../compositions/daily/) |
| p16 the problems on record | composition `excerpts` (new) | [compositions/excerpts](../../compositions/excerpts/) |
| p17 five things to do | composition `glyphs` (new) | [compositions/glyphs](../../compositions/glyphs/) |
| p18 the close | face `scroll-ending` (new), with the page's `stamp` as its seal | [faces/scroll-ending](../../faces/scroll-ending/) |

The compositions read the `scroll` setting from the face that offers them (`CompositionSetting` in [`src/layouts/compositions/shared.tsx`](../../../src/layouts/compositions/shared.tsx)). The inks and their ramp, text at its exact size, upright Chinese with its punctuation, labels down a column, figures, symbols, photographs with their notes, and the claim's and the source's placement are in [`scroll.tsx`](../../../src/layouts/compositions/scroll.tsx), the margins, the claim and the source in [`scroll-shared.tsx`](../../../src/layouts/scroll-shared.tsx). Every ink comes from the theme's tokens: the page and the surface for the paper and the cards, the text for the ink, the primary for burnt ink, the accent for cinnabar, the chart palette's third and fourth for taupe and gold, and the second ink, faint and wash mixed from them. The tests draw each composition on ink and on brief and rally, a light theme and a dark one that share nothing with it.

## Decisions

Where the engine departs from the board, it does so on purpose, for these reasons.

1. The heading face is Times New Roman with KaiTi. The board was set in Kaiti SC, which Windows does not carry. Times New Roman sets the figures and Latin, so a figure set huge reads a few pixels narrower than the board's, and stands on the baseline in PowerPoint.
2. The colours are the theme's tokens, not the board's own values: the cards `#FCF9F2` (board `#FBF7EE`), the grey `#686056` (board `#6B645A`), hairlines `#DCD2BD` (board `#DDD5C4`). The second ink, faint and wash are mixed from the tokens and land within one step of the board's `#3A3530`, `#C8BFAE` and `#E9E2D3`.
3. The hall and the date are the deck's `organization` and the footer's `label` as the author writes them, and print only when the deck asks for footer marks. The seal's character is the page's `stamp`, or the hall's first character when the page names none.
4. The folio is PowerPoint's slide-number field in the heading face, not Songti. The cover, the chapter pages and the close carry no folio. The engine prints the page number on content pages only, across every theme.
5. On the system page (p04) each tier's name and figure stand in its band in the ink or white, whichever reads at 4.5:1. The board hid them under the polygons. The pyramid is scaled to stay inside the scroll's left edge, which the board's base crossed.
6. On the scroll of years (p06) every milestone's name is set in one of three rows clear of every other name and every stem, and each stem is cut around the names it passes. The board ran stems through some names. The running count's end, 「累计 45」, stands inside the measure, where the board let it run past the measure's end toward the edge. The steepest step and the end are named with the series' name and the count there, since a scatter point carries no note.
7. On Yimakan's page (p07) the caution under the story is upright in the grey. The board slanted it, and a Chinese face has no italic to slant.
8. On the age bar (p12) each part wide enough for its words is named inside it with its count, in the ink on the pale parts and in white on the dark ones. The board named only the narrow part under the bar.
9. A claim that fits on one line at 95% of its size stays on one line, and the two claims the board broke by hand (p11, p15) carry the author's own break.
10. In the English deck the margins and the chapter page's volume number are turned a quarter to read from the top, the cover's title slip widens into a strip with the title set across it, the close sets its words across the page a clause a line, and the glyphs page sets one word in each column instead of one character.
11. The quotation page's attribution is in the heading face in the taupe. The board set it in Songti.
12. The statement page (`statement`) keeps its layout. Its upright verse now sets its punctuation the way vertical type does, and it no longer prints the organization in a column of its own, since the motif prints it down the right margin.
13. Every photograph is a sample image generated for the lecture. None shows a face that can be recognised, readable text or a real logo. A content page says so in its caption or its footnote (「示意图（AI 生成）」, "Illustration (AI-generated)"), the cover, the chapter pages and the close in their footnote.
