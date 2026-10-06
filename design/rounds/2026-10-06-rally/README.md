# rally, summer concert season proposal sample, 2026-10-06

The round that redrew rally to one approved board: an eighteen-page Chinese and English campaign proposal from a drinks brand's marketing team ("2027 夏季演唱会季", "Summer Concerts 2027"). It runs the order a campaign proposal runs: the plan in one sentence, how big large shows have grown, how concerts and festivals parted ways, when the season peaks, who the fans are and how many travel in, how they spend a concert weekend, the four places the brand can meet them, what peers have done and why none could count a sale, how a code at every touchpoint brings each sale back to its show, the cities already rewarding ticket stubs, a plan B for six risks that have each happened before, the schedule, a scoreboard whose targets wait for the first stop, the budget as six shares, the four requests, and the next steps. It turned rally into one campaign proposal staged as a show: every page a section of the proposal named on a ticket stub, a fistful of confetti at the top right, the claim at 34px, cards a step lighter than the house, charts in the confetti's colours, and the magenta spent on one thing a page. It settled a content page that hands its body to the compositions in a new `marquee` setting, fifteen new compositions, a cover, a section page, a one-line plan, a close, a redrawn motif, and fields on `heatmap` and `gantt`.

## Source

- `design-gen.py` writes every board page as absolutely positioned HTML at 1280 by 720. It is the only source of the boards' geometry. Its photograph references are placeholders the design tool filled in, so the script records the boards rather than rebuilding them outside that tool. Its confetti is drawn with Python's `random.Random(page number)`, and the engine draws the same pieces from the same seeds.
- The `rally*.board.png` files in the part folders are those pages rendered at 1280 by 720 in a browser. The `rally*.engine.png` files are `pptwise preview` of the Chinese showcase deck ([showcase/rally/zh](../../../showcase/rally/zh/)), rasterized with `rsvg-convert`. The board and the engine show the same deck, so the words match as well as the drawing, except where the decisions below say otherwise.
- `rsvg-convert` draws an ASCII hyphen in the English deck about as wide as an en dash ("Co–branded"). PowerPoint's own PDF export of the sample draws it at its usual width. It is the preview's font, not the engine.

## The design system

Every rally page follows these, not only the pages the sample uses. [docs/design-rally.md](../../../docs/design-rally.md) states them for the next round.

1. The ticket stub: at the top left of every page, on y30 (y64 on the cover and the close), a ticket 30px tall. A stamp of the magenta holds the section's number in the dark ink, 12px bold, its characters 1px apart (「01」, 「02」…; 「提案」 on the cover, 「下一步」 on the close). A stub of the card colour holds the section's name at 14px bold in the light (「大盘」, 「分岔」…). Between them a dashed perforation in the house colour, with a hole of the house colour punched at each end.
2. The confetti: at the top right of every content page, seven small strips in the magenta, gold, cyan and lime, each at its own angle, thrown in the box from (1100, 14), 160 by 44, the scatter seeded by the page number, so every page differs and every render is the same. The cover throws twelve at the lower right, a section page fourteen at the top right, and the one-line plan two bands, fourteen above and ten below.
3. The claim: bold at 34/46 from x64 across 1152px, on one line whenever it fits and broken at a comma or a colon when it does not, its last line ending at y172 either way.
4. The body runs from y188 to y640 over a source and to y648 without one. The source at 12/16 in the grey from y650, up to two lines. The folio at y686: 「N / M」 at the right, 12px in the grey, N PowerPoint's slide-number field, the office and the footer's label and notice at the left.
5. One magenta a page: the accent lights exactly one thing, the figure, curve, bar, card, row or request a content page is about, and the stamp on the ticket. Words on the magenta are in the dark ink (`#1A1030`), never white. Charts and decoration take the confetti's four colours, so a bar and a strip of confetti are the same colour.
6. Colours: the house `#2A1E3F`, a card `#35284E`, the stage's dark `#23173A` for a scoreboard's panels, the light `#F6F2F9`, the grey `#B3A6C7`, hairlines and dashed frames `#4A3A66`, a bar or cell that is not the page's `#5B4B7A`, the magenta `#E84F8A`, the gold `#F0B429`, the cyan `#4FC1E9`, the lime `#9BE36D`, the coral `#F07764`, and the dark ink on the magenta `#1A1030`.
7. Photographs are the show and the city around it: a crowd under the lights, a train to the show, a drink station outside a stadium, wristbands in the dark, fans walking out, a riverside at night, confetti on a stage. A cover's and a close's photograph fills the page under a darkening of the house colour from the foot, and the words stand in the dark.

## Pages and the parts they settled

| board page | part | folder |
| :-- | :-- | :-- |
| every content page | motif `rally-motif` (redrawn) | [motifs/rally-motif](../../motifs/rally-motif/) |
| every content page | face `marquee-sheet` (new), compositions in the `marquee` setting (new), the page's `kicker` as its section | [faces/marquee-sheet](../../faces/marquee-sheet/) |
| p01 cover | face `marquee-cover` (new) | [faces/marquee-cover](../../faces/marquee-cover/) |
| p02 one-line plan | face `marquee-statement` (new) | [faces/marquee-statement](../../faces/marquee-statement/) |
| p03 market | composition `crest` (new) | [compositions/crest](../../compositions/crest/) |
| p04 split | composition `branch` (new) | [compositions/branch](../../compositions/branch/) |
| p05 calendar | composition `season` (new), with `bands` and twelve columns on `heatmap` | [compositions/season](../../compositions/season/), [components/heatmap](../../components/heatmap/) |
| p06 audience | composition `makeup` (new) | [compositions/makeup](../../compositions/makeup/) |
| p07 travel | composition `origins` (new) | [compositions/origins](../../compositions/origins/) |
| p08 weekend | composition `route` (new) | [compositions/route](../../compositions/route/) |
| p09 touchpoints | composition `spots` (new) | [compositions/spots](../../compositions/spots/) |
| p10 peers | composition `wall` (new) | [compositions/wall](../../compositions/wall/) |
| p11 attribution | composition `loop` (new) | [compositions/loop](../../compositions/loop/) |
| p12 cities | composition `stubs` (new) | [compositions/stubs](../../compositions/stubs/) |
| p13 plan B | composition `fallbacks` (new) | [compositions/fallbacks](../../compositions/fallbacks/) |
| p14 schedule | composition `timetable` (new), with `bands` on `gantt` | [compositions/timetable](../../compositions/timetable/), [components/gantt](../../components/gantt/) |
| p15 scoreboard | composition `scoreboard` (new) | [compositions/scoreboard](../../compositions/scoreboard/) |
| p16 budget | composition `allotment` (new) | [compositions/allotment](../../compositions/allotment/) |
| p17 requests | composition `asks` (new) | [compositions/asks](../../compositions/asks/) |
| p18 close | face `marquee-ending` (new) | [faces/marquee-ending](../../faces/marquee-ending/) |
| none | face `marquee-chapter` (new), drawn to the cover's geometry | [faces/marquee-chapter](../../faces/marquee-chapter/) |

The compositions read the `marquee` setting from the face that offers them (`CompositionSetting` in [`src/layouts/compositions/shared.tsx`](../../../src/layouts/compositions/shared.tsx)). The inks, text at its exact size, cards, photographs, the ticket stub and the seeded confetti are in [`marquee.tsx`](../../../src/layouts/compositions/marquee.tsx), the ticket's numbering, the claim, the standfirst and the source in [`marquee-shared.tsx`](../../../src/layouts/marquee-shared.tsx). Every ink comes from the theme's tokens: the page and the surface for the house and the cards, the accent for the magenta, the chart palette for the confetti, the primary darkened for the ink on the magenta. The tests draw each composition on rally and on homeroom and brief, two light themes that share nothing with it.

## Decisions

Where the engine departs from the board, it does so on purpose, for these reasons.

1. The folio reads 「2 / 18」, not 「02 / 18」. The page number is PowerPoint's slide-number field, which keeps counting when pages move and cannot be padded with a zero.
2. The cover, the section pages and the close carry no folio. The engine prints footer marks on content pages only, across every theme (`ir/footer.ts`). The board printed 「18 / 18」 on the close.
3. The author writes a section's name (the page's `kicker`), never its number. The engine counts the deck's sections in the order their names first appear on a chapter or a content page, so two pages with one name share one number, and inserting a section renumbers the rest. The board's numbers are the ones this count gives.
4. A claim that needs two lines breaks after its last comma or colon that lets both lines fit. The board's browser broke it where the line ran out. English claims follow the same rule, and the English deck's claims were written to fit the IR's 48-character heading limit.
5. Weights 800 and 900 on the board are bold in the engine. Microsoft YaHei, the face PowerPoint opens the deck in, has a regular and a bold and nothing heavier.
6. The source sits at y650 on every content page. The board raised it to y640 on the weekend page and lowered it to y652 on the plan B page.
7. The split page names the year the two curves reach (「2025」) between their ends, from the chart's second category. The board named only the year they started from, and the reach year is the chart's own data.
8. The audience page prints every share: inside its part when it fits, under it in small grey type when it does not (「3.6」, 「5.4」, 「5.9」). The board printed only the shares of 10 and more and left the thin parts unnamed. A share the author wrote is drawn.
9. Shares on one bar keep the decimals they were written with: 「18.0」, 「37.0」, 「33.0」, where the board's `%g` printed 「18」, 「37」, 「33」.
10. The budget page names the bar under it at the left (「拟定比例」, "Proposed share"), the chart's category. The board left it out, and a category the author wrote is drawn.
11. On the weekend page the line over the set-aside stop (「我们不进场卖货」) stands centred over its disc. The board set it 62px to the left of the disc's centre.
12. The scoreboard's closing line sits on the band's floor: y624 on a page without a source, as on the board, and clear of the source line on a page that has one.
13. The close's dotted line starts after each step's date and stops before the next, so it never runs through a word. The board drew it behind the dates.
14. The one-line plan throws its own two bands of confetti and the motif's fistful steps aside on that page (`decorKeepOut`), as on the board. A strip that would land on a word is not thrown, on every page.
15. A dashed frame, a dashed note box and the dotted curve export dashed to PowerPoint. PowerPoint has no round line cap on a shape, so the split page's dotted curve opens in PowerPoint with square dots 20px apart where the board drew round ones 18px apart.
16. Every photograph is a sample image generated for the proposal: a crowd at a stadium concert, a train at night with a lightstick, a drink station outside a stadium, wristbands in the dark, fans walking out, a riverside at night, confetti on a stage. None shows readable text or a real logo. The captions say they are generated (「示意图（AI 生成）」, "Illustration (AI-generated)"), and the cover's and the close's notes say so.
