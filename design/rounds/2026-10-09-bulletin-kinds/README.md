# bulletin, statement, fact and evidence pages, 2026-10

The round that gave bulletin the three content kinds its menu refused. Until now an author who wrote a statement, a fact or an evidence page on bulletin had to fall back to another kind: the one sentence was squeezed into the 34px claim header, the one figure sat in the column beside a chart. The maintainer approved a nine-page board drawn from the NEV sample's own data (`showcase/bulletin`): two statements and a fact and two evidence pages in Chinese, then one of each in English. The board's script rewrites two lines of the showcase that did not hold, and the deck follows the board's words, not the showcase's.

## Source

- `design-gen.py` writes every board page as absolutely positioned HTML at 1280 by 720. It is the only source of the boards' geometry, colours and type. It reads the source lines from the showcase pages, whose path is written here relative to the repository.
- The `bulletin-kinds-pNN.board.png` files in the part folders are those pages rendered at 1280 by 720 in a browser. The `bulletin-kinds-pNN.engine.png` files are `pptwise preview` of a deck that writes the board's nine pages as IR, rasterized with `rsvg-convert`. Board and engine show the same words.
- The board was set in PingFang. `rsvg-convert` has no Microsoft YaHei, the face the deck names, and sets the preview in PingFang too. PowerPoint's PDF export sets it in Microsoft YaHei.

## The design system

The three pages follow bulletin's settled rules ([docs/design-bulletin.md](../../../docs/design-bulletin.md)): IKB spent once a page, the type area from x80 to x1200, the 14px source line ending on y666, the motif's small steps top right.

1. Statement: no claim header. The sentence takes the header's place at 60px bold over a 96 by 6 IKB bar, its marked words in IKB, a hairline and the backing line at 22px muted under it, the block centred between the motif and the source.
2. Fact: the header as usual, the line that says what the figure counts at 22px, the figure at 210px bold IKB with its unit at 60px, three figures under a hairline at 34px over 16px muted labels.
3. Evidence: the header as usual, a white card with the exhibit's number and title, one IKB ring round the place that proves the claim, a leader to a numbered disc, the reading at 21px bold IKB and two notes between hairlines.
4. Words are kept whole in the sentence, its backing line, the reading and the notes: lines break at a space or after a clause mark.

## Pages and the parts they settled

| board page | part | folder |
| :-- | :-- | :-- |
| p01, p02, p07 statement | face `notice-statement` (new), composition `sentence` (new) | [faces/notice-statement](../../faces/notice-statement/), [compositions/sentence](../../compositions/sentence/) |
| p03, p04, p08 fact | face `notice-figure` (new), composition `billboard` (new) | [faces/notice-figure](../../faces/notice-figure/), [compositions/billboard](../../compositions/billboard/) |
| p05, p06, p09 evidence | face `notice-exhibit` (new), composition `proof` (new) | [faces/notice-exhibit](../../faces/notice-exhibit/), [compositions/proof](../../compositions/proof/) |

The compositions take the `notice` setting from the face (`CompositionSetting` in [`src/layouts/compositions/shared.tsx`](../../../src/layouts/compositions/shared.tsx)) and read only the theme's tokens and the notice inks in [`notice.ts`](../../../src/layouts/compositions/notice.ts). The keep-all wrap is `fitKeepAll` in [`type.tsx`](../../../src/layouts/compositions/type.tsx). The tests ([`notice-kinds.test.tsx`](../../../src/layouts/compositions/notice-kinds.test.tsx)) draw every board page on bulletin and on stage and crayon, a dark theme and a rounded light one that share nothing with it, and render the three faces in a bulletin deck.

## Decisions

Where the engine departs from the board, it does so on purpose, for these reasons.

1. Where the ring goes is the author's: the chart's one marked bar (`data[].emphasis`), whose whole category the ring takes, or the table's highlighted row. The chart schema refuses a marked bar beside a marked series, so the marked bar's series is the one in IKB and the other recedes, as the board drew this year against last. A chart with nothing marked goes to the notice sheet.
2. The ring is centred on the marked group, 46px clear of its bars: (561, 284) where the board set it by hand at (564, 284). Its top is 18px over the plot, or 8px over the tallest value when that stands higher, its foot 36px under the baseline.
3. The reading starts level with the ring, 10px under its top, and the disc and leader 26px under it, as the board drew them. When the notes would run past the source line the reading rises, and when the disc can no longer stand level with the ring the page goes to the notice sheet.
4. The notes are paragraphs, one each, or one `bullets`. validate holds every bullet to 29 width units, and the English notes on p09 are longer.
5. The exhibit is numbered across the deck. In Chinese figures and tables count apart, 「图 1」 and 「表 1」 as on the board. In English both are "Exhibit n" on one count.
6. The caption adds the unit its values do not carry, 「，万辆」 after the title. A unit glued to every value ("1.83m", "12%") stays on the values. The full-width space after the number is kept as written.
7. The legend's entries stand 28px apart by their measured width. The board's script estimated a Chinese name at 15px a character, so its Chinese entries stand wider apart than the engine's (「2026 年」 at x244 on the board, x209 in the engine).
8. The receded series is bulletin's receded grey, the muted ink a third of the way into the page (about `#C4C5C5`), where the board wrote `#C2C6CC`.
9. The 210px figure is closed up 6px a character with `<tspan dx>`, which the export carries as character spacing. Its baseline is y431, read off the board, where the type helper's rule would put it 5px lower. The 60px sentence's half pixel of tracking is not carried: the export carries no letter spacing, so an English sentence runs about 14px longer than on the board.
10. The 60px sentence's baseline sits 0.35 of its size under the middle of its 80px line, read off the board.
11. The enumeration comma 「、」 holds a list together, so 「吉利、长安、特斯拉中国」 starts p02's second line as on the board. With Microsoft YaHei's widths the whole line would otherwise fit 「吉利、」 on the first.
12. A percent sign after the big figure is a unit at 60px, as the board drew 「−23.6 %」 and "+154 %". In the row of figures under it a percent sign stays on its figure.
13. p09's heading, "No September peak: the fall got deeper, not shallower", is 52 characters, over the 48 validate warns at. The deck keeps the board's words, and validate prints the warning.
14. A statement may take its backing line from the page's subheading when it has no paragraph. A page with both, or with any other component, goes to the notice sheet.
15. `quote` is still not on bulletin's menu: the board drew no quote page.
