# ember, low-altitude delivery pitch sample, 2026-10-06

The round that redrew ember to one approved board: a sixteen-page Chinese and English seed-round pitch from a drone delivery startup that has not flown yet ("低空即时配送：先飞医疗和社区", "Drone delivery in cities: medical first"). It runs the order a pitch runs: how big the order pool is and how empty the sky still is, why three years of rules make now the time, which of Shenzhen's planned landing points are set aside for medical use, what six pioneers have proven and what none of them has published, where the startup enters, the three hypotheses it must prove in 18 months, the five gates before it may fly, six risks that have each happened before, the milestones with the gate that can stop them, and the ask. It turned ember into one pitch on a dark stage: every page a beat of the pitch, the running order at the top right with the page's beat lit, the claim at 34px, figures set large on charcoal cards, and the fire orange spent on one thing a page. It settled a content page that hands its body to the compositions in a new `pitch` setting, twelve new compositions, a cover, an act page, a photograph page and a close, a redrawn motif, and fields on `concept_equation`, `chevron_process`, `data_table`, `gantt` and `chart`.

## Source

- `design-gen.py` writes every board page as absolutely positioned HTML at 1280 by 720. It is the only source of the boards' geometry. Its photograph references are placeholders the design tool filled in, so the script records the boards rather than rebuilding them outside that tool.
- The `ember*.board.png` files in the part folders are those pages rendered at 1280 by 720 in a browser. The `ember*.engine.png` files are `pptwise preview` of the Chinese showcase deck ([showcase/ember/zh](../../../showcase/ember/zh/)), rasterized with `rsvg-convert`. The board and the engine show the same deck, so the words match as well as the drawing, except where the decisions below say otherwise.
- `rsvg-convert` sets Microsoft YaHei bold a few percent wider than PowerPoint does, so in the engine PNGs a bold figure can run into the small unit after it (「40-50% /年」). PowerPoint's own PDF export of the sample keeps the gap.

## The design system

Every ember page follows these, not only the pages the sample uses. [docs/design-ember.md](../../../docs/design-ember.md) states them for the next round.

1. The running order: at the top right of every content page, ending at x1216 on y28, the deck's `course` as a row of words, 12px in boxes 20px tall, 14px apart (机会, 时机, 竞争, 切入, 证明, 风险, 计划, 请求). The page's `stage` is in the ivory, bold, with a 2px underline 2px under its box, the others in a dimmed grey.
2. The deck's label: on content pages, the footer's `label` at the top left, x64 on the rail's line, 12px bold in the warm grey, its characters 3px apart (「种子轮路演」, "Seed round").
3. The claim: bold at 34/46 from x64 across 1152px, on one line whenever it fits and broken at a comma when it does not, its last line ending at y160. On the photograph page it stands in the column from x624 and ends at y220, over a hairline at y256.
4. The body runs from y196 to y640. The source at 12/16 in the warm grey from y650, up to two lines. The folio at y686: the page number at the right, 12px in the warm grey, the office and the footer's notice at the left.
5. One fire a page: the accent lights exactly one thing, the wedge on the cover and the close, the outlined number on an act, the figure, column, bar, card or row a content page is about. Words on the fire are in the dark ink that reads on it (`#0A0E14`), never white.
6. Colours: the stage `#241B14`, a card `#2C221A`, the ivory `#F2E9DF`, the warm grey `#C4AE97`, hairlines `#6B5648`, the fire `#E56A2C`, two dark bands stepped from the hairline toward the stage (`#4A3B30` for a grid, a track or a rule, `#5A4638` for a band in the middle of a funnel), and the palette's quietest ink `#A89888` for a bar or band that is not the page's.
7. Photographs are the pitch's world at dusk: a drone over a city, a street from above, a pad on a roof, a sample box in the air. A cover's and an act's photograph fills the page under a darkening of the stage's own colour, the photograph page's fills the left 560px from edge to edge with its caption on a dark strip.

## Pages and the parts they settled

| board page | part | folder |
| :-- | :-- | :-- |
| every content page | motif `ember-motif` (redrawn) | [motifs/ember-motif](../../motifs/ember-motif/) |
| every content page | face `pitch-sheet` (new), compositions in the `pitch` setting (new), the deck's `course` and a page's `stage` | [faces/pitch-sheet](../../faces/pitch-sheet/) |
| p01 cover | face `pitch-cover` (new) | [faces/pitch-cover](../../faces/pitch-cover/) |
| p02, p07 acts | face `pitch-chapter` (new) | [faces/pitch-chapter](../../faces/pitch-chapter/) |
| p03 scale | composition `expanse` (new) | [compositions/expanse](../../compositions/expanse/) |
| p04 why now | composition `stairs` (new) | [compositions/stairs](../../compositions/stairs/) |
| p05 landing points | composition `funnel` (new), with `axes.y_unit` printed on a funnel | [compositions/funnel](../../compositions/funnel/), [components/chart](../../components/chart/) |
| p06 pioneers | composition `rivals` (new), with `emphasis` and `icon` on a table column | [compositions/rivals](../../compositions/rivals/), [components/data_table](../../components/data_table/) |
| p08 wedge | composition `equation` (new), with `icon` on terms and `excluded` | [compositions/equation](../../compositions/equation/), [components/concept_equation](../../components/concept_equation/) |
| p09 medical | face `pitch-photo` (new), composition `spotlight` (new) | [faces/pitch-photo](../../faces/pitch-photo/), [compositions/spotlight](../../compositions/spotlight/) |
| p10 hypotheses | composition `bets` (new), with `range`, `icon` and `period` on a gantt | [compositions/bets](../../compositions/bets/), [components/gantt](../../components/gantt/) |
| p11 unit cost | composition `divide` (new) | [compositions/divide](../../compositions/divide/) |
| p12 compliance | composition `locks` (new), with `icon` on chevron stages | [compositions/locks](../../compositions/locks/), [components/chevron_process](../../components/chevron_process/) |
| p13 risks | composition `register` (new) | [compositions/register](../../compositions/register/) |
| p14 milestones | composition `runway` (new) | [compositions/runway](../../compositions/runway/) |
| p15 ask | composition `uses` (new), with `axes.y_unit` printed on a share bar | [compositions/uses](../../compositions/uses/) |
| p16 close | face `pitch-ending` (new) | [faces/pitch-ending](../../faces/pitch-ending/) |

The compositions read the `pitch` setting from the face that offers them (`CompositionSetting` in [`src/layouts/compositions/shared.tsx`](../../../src/layouts/compositions/shared.tsx)). The inks, text at its exact size, cards, the wedge, the fire's marker, the running order, photographs and their darkening are in [`pitch.tsx`](../../../src/layouts/compositions/pitch.tsx), the claim and the source in [`pitch-shared.tsx`](../../../src/layouts/pitch-shared.tsx). Every ink comes from the theme's tokens: the page and the surface for the stage and the cards, the accent for the fire, the border stepped toward the page for the dark bands. The tests draw each composition on ember and on homeroom and brief, two light themes that share nothing with it.

## Decisions

Where the engine departs from the board, it does so on purpose, for these reasons.

1. The page number is 「3」, not 「03」. It is PowerPoint's slide-number field, which keeps counting when pages move and cannot be padded with a zero.
2. The acts and the close carry no page number. The engine prints footer marks on content pages only, across every theme (`ir/footer.ts`). The board printed 「02」, 「07」 and 「16」 on them.
3. On the photograph page the deck's label moves into the folio at the foot of the column, after the office (「种子轮路演」, "Seed round"). The running order fills the column's top line, and the board printed no label there. A label the deck asks for is printed on every content page or on none.
4. A claim that needs two lines breaks at its comma: the medical page reads 「医疗单够轻、够急，」 over 「先行者已经送过 460 万管标本」. The board's browser broke it where the line ran out. English claims follow the same rule.
5. The unit cost page prints no 「不可比」 between its two groups. The dashed line and the two groups' names say it, and the engine does not add words the author did not write. A label there would need a field of its own.
6. The milestones' ticks are named from the roadmap's own unit, 「第 3 个月」 ("3 months"), where the board wrote 「第 3 月」. The last tick ends at x1216 rather than standing centred over it, past the band.
7. A milestone card's points stack by their own height: a one-line point takes the board's 44px, a point that wraps a line more. The board set them in fixed 44px slots, so a point that wraps (the English deck's "Point to point, in a park or suburb") would run up to the next one.
8. On the scale page each word over the grid stands on a plate of the stage's own colour, 4px wider than its ink all round, so no line of the grid runs through a word. The board drew the grid under the words.
9. The body starts at y196 on every content page. The board started the pioneers table's fire frame at y186 and its column names at y192, above the band. The engine starts the frame at y196 and the names at y197, its rows where the board's are.
10. The source sits at y650 on every content page. The board raised it to y630 on the risks page and y640 on the ask, where it fit lower too.
11. The equation's struck thing is struck by a line the engine draws (`data-strike`), over the thing's own width, in the warm grey. PowerPoint keeps a drawn line, where a font's strike-through would depend on the viewer.
12. The running order's other beats are `#948370`, a step lighter than the board's `#8C7A68`, so 12px words read at 4.5:1 on the stage.
13. The act's number is outlined in the fire at full strength and exports as outlined text. The depth rules would recede a numeral that large into the background, so the face declares it foreground (`data-depth="fg"`).
14. The ask button's words are the author's: the close's `paragraph` (「约个时间聊」, "Let's set a time"). With no paragraph and no bullet there is no button. The old ask ending printed "Let's talk" in English on every deck.
15. The English deck takes more room where its words are longer: the unit cost page steps every figure down together when one is wider than its card at 46px, a milestone's point wraps to a second line, and the claims break at their commas. Where that was not enough, the English copy was shortened, never cut by the engine.
16. Every photograph is a sample image generated for the pitch: a drone over a city at dusk, a street from above at night, a pad on a roof, a sample box under a drone. None shows readable text or a real logo. The medical page's caption says it is generated (「示意图，AI 生成」), and the cover's and the acts' notes say so.
