# crayon, new term parents' meeting sample, 2026-10-08

The round that redrew crayon to one approved board: an eighteen-page Chinese and English parents' meeting at a kindergarten at the start of the autumn term (「新学期好！我们一起陪孩子长大」, "Welcome back! Let's grow together"). It runs the order a meeting runs: what the evening covers, the new preschool law and the six parts that concern families, what the free final year waives and what it does not, fewer children but more of them enrolled, then the first part on how children grow (five areas from 3 to 6, why no single ruler measures every child, a day at kindergarten), the second on what helps at home (three things for the fridge, what each body advises, eating well, eyesight, settling in), safety, five small favours, and how to stay in touch. It made crayon a box of crayons on drawing paper: a capsule in the crayon of the section at the top left of every content page, the claim in a heavy rounded hand with a stroke of crayon under it, cards outlined twice as if traced, a sun and two stars in the corner, and the page number in a pale disc of the section's crayon. It settled a content page that hands its body to the compositions in a new `crayonbox` setting, fourteen new compositions, a cover, a chapter page, a close and a redrawn motif.

## Source

- `design-gen.py` writes every board page as absolutely positioned HTML at 1280 by 720. It is the only source of the boards' geometry. Its photograph references are placeholders the design tool filled in, so the script records the boards rather than rebuilding them outside that tool.
- The `crayon.board.png` files in the part folders are those pages rendered at 1280 by 720 in a browser with the sample's photographs. The `crayon.engine.png` files are `pptwise preview` of the Chinese showcase deck ([showcase/crayon/zh](../../../showcase/crayon/zh/)), rasterized with `rsvg-convert`. The board and the engine show the same deck, so the words match as well as the drawing, except where the decisions below say otherwise.
- The board was set in Yuanti SC falling back to PingFang. Neither is on this machine's preview or in PowerPoint on Windows, so the preview sets the deck in PingFang and PowerPoint's PDF export of the sample sets it in Microsoft YaHei.

## The design system

Every crayon page follows these, not only the pages the sample uses. [docs/design-crayon.md](../../../docs/design-crayon.md) states them for the next round.

1. Sections in colour: a deck's sections take the five crayons in the order they first appear, sky, grass green, tangerine, red and purple (the theme's `accentPool`). A content page names its section with `kicker`, a chapter by its heading, and a page that names none sits in the last section named before it.
2. The capsule: at the top left of every content page a 34px rounded capsule in the section's crayon, with the symbol the deck's contents gives that section and its name at 15px. The words are in the navy ink, white on the purple.
3. The claim: 34/46 in the heavy sans across 1080px from x64, on one line whenever it fits at 95% of its size, broken at a comma or a colon when it does not, its last line ending on y146. A break the author wrote is kept.
4. The stroke of crayon: three passes a little apart and less opaque each time, bowed up in the middle. Under the claim it runs from x64 to x200 on y156 in the section's crayon.
5. Doodles: a crayon sun and two star stickers at the top right of every content page, left out over a photograph. Decoration only, never over words.
6. The folio: the deck's name and term at the bottom left on y684, 12px in the grey, and the page number in a 36px disc of the section's crayon laid pale, on content pages only.
7. Cards drawn by hand: rounded 22, outlined twice, the second pass 2px off and a third as strong. Sticky notes and fridge cards are turned a degree or two with a solid shadow, their words upright.
8. Ink on crayon: a filled crayon carries the navy ink, or white where the navy will not read (the purple). Yellow never carries a word. A crayon that must carry words on the paper is lifted toward the ink until it reads: the tangerine's words are the burnt orange `#C24E00` (the theme's `emphasisInk`), the green's the leaf green `#0E8437` (`success`). A symbol or a chevron that carries meaning is lifted until it reads at 3:1.
9. Colours: drawing paper `#FFF9F0`, card white `#FFFFFF`, navy ink `#1E2340`, grey `#6E655A`, fold `#F0E6D6`, sky `#14B4FF`, grass green `#15D157`, tangerine `#FF6A12`, red `#F25C54`, purple `#7452E0`, sunny yellow `#FFD100`, the theme's blue `#0B87C7` for a date set large.
10. Photographs illustrate rather than prove: an outdoor playground, building blocks, a nap room, a lunch table, the gate on the first day, a reading corner, a box of crayons. No face that can be recognised, no readable text and no logos. In a 5px crayon frame rounded 22 to 30 on the cover, the chapter pages and the content pages, under a veil of paper from the left when a page runs over it. Every one says it is AI-generated, in its note or the page's footnote.

## Pages and the parts they settled

| board page | part | folder |
| :-- | :-- | :-- |
| every content page | motif `crayonbox-motif` (redrawn) | [motifs/crayonbox-motif](../../motifs/crayonbox-motif/) |
| every content page | face `crayonbox-sheet` (new), compositions in the `crayonbox` setting (new), the page's `kicker` as its section | [faces/crayonbox-sheet](../../faces/crayonbox-sheet/) |
| p01 cover | face `crayonbox-cover` (new) | [faces/crayonbox-cover](../../faces/crayonbox-cover/) |
| p02 five things | composition `crayons` (new) | [compositions/crayons](../../compositions/crayons/) |
| p03 the law | composition `stickies` (new) | [compositions/stickies](../../compositions/stickies/) |
| p04 the free year | composition `waiver` (new), a `waterfall`'s `title` (new) | [compositions/waiver](../../compositions/waiver/) |
| p05 the bigger picture | composition `storeys` (new) | [compositions/storeys](../../compositions/storeys/) |
| p06, p10 parts one and two | face `crayonbox-chapter` (new) | [faces/crayonbox-chapter](../../faces/crayonbox-chapter/) |
| p07 five areas | composition `swatches` (new) | [compositions/swatches](../../compositions/swatches/) |
| p08 no single ruler | composition `yardstick` (new) | [compositions/yardstick](../../compositions/yardstick/) |
| p09 a day at kindergarten | composition `arc` (new) | [compositions/arc](../../compositions/arc/) |
| p11 the fridge | composition `magnets` (new) | [compositions/magnets](../../compositions/magnets/) |
| p12 who advises what | composition `crosscheck` (new) | [compositions/crosscheck](../../compositions/crosscheck/) |
| p13 eating well | composition `tray` (new) | [compositions/tray](../../compositions/tray/) |
| p14 eyesight | composition `checkup` (new), a chart point's `status: "estimate"` (new) | [compositions/checkup](../../compositions/checkup/) |
| p15 settling in | composition `backing` (new) | [compositions/backing](../../compositions/backing/) |
| p16 safety | composition `badges` (new) | [compositions/badges](../../compositions/badges/) |
| p17 five favours | composition `ticks` (new) | [compositions/ticks](../../compositions/ticks/) |
| p18 the close | face `crayonbox-ending` (new) | [faces/crayonbox-ending](../../faces/crayonbox-ending/) |

The compositions read the `crayonbox` setting from the face that offers them (`CompositionSetting` in [`src/layouts/compositions/shared.tsx`](../../../src/layouts/compositions/shared.tsx)), and the section's crayon from `inks.section`. The inks, the sections, text at its exact size, the stroke of crayon, cards drawn twice, the sun, the stars and framed photographs are in [`crayonbox.tsx`](../../../src/layouts/compositions/crayonbox.tsx), the capsule, the claim, the source and the folio in [`crayonbox-frame.tsx`](../../../src/layouts/crayonbox-frame.tsx). Every ink comes from the theme's tokens: the five crayons from `accentPool` (or, on a theme with no pool of five, its chart palette, accent, danger ink and primary), yellow from the chart palette's fourth, the burnt orange from `emphasisInk`, the leaf green from `success`. The tests draw each composition on crayon and on brief and ledger, a light theme and a dark one that share nothing with it.

## Decisions

Where the engine departs from the board, it does so on purpose, for these reasons.

1. The heading face is Microsoft YaHei at the board's weights (900, 800 and 700 set bold, 600 set bold in the export, which reads every weight from 600 up as bold). The board was set in Yuanti SC, which Windows does not carry. The preview falls back to PingFang as the board did.
2. The colours are the theme's tokens. The pale card grounds are each crayon at 16% over white, one formula for all six: the board's yellow `#FFF4C2` comes out a little paler. Marks that carry meaning are held to 3:1 on what they sit on, so the yellow chevron on p07 and the sun on p14's green card are a deeper olive than the board's `#E0B500`, and the sky moon on p11's white card is a deeper blue.
3. The section capsule is as wide as its name and symbol need. The board set p08's capsule 220 wide where its formula gave 172, and the cover's and the close's at a fixed 230 and 160: those two are centred and stand at least 160 wide.
4. The section's symbol is the icon the deck's contents gives it (p02's crayon for 「新规定」 carries the scales). A section the contents does not name goes without one.
5. On p04 the two cards are an `icon_cards` of two whose text the author breaks into lines, a line a point. The worked example is a `waterfall` with a new `title`, and a figure's slot widens past 150px when an English figure needs it.
6. On p08 the source 「背景为 AI 生成的示意图」 stands at the foot on y648, over the folio, where the board set it in place of the deck's name on y684. The sun and the stars stay off a page laid over a photograph, as the board drew it.
7. On p09 the first photograph's note is the row's note, set under the row as the board set it. A note on each photograph is set under each.
8. On p12 the columns share the room by the square root of their widest cell, close to the board's widths, and 「未涉及」 steps back to the grey by a rule rather than by name: a cell that gives no figure in a column of figures.
9. On p14 the 2018 bar is a chart point with `status: "estimate"`, a new status: its bar is pale inside a dashed blue outline and the engine adds 「（推算）」 after its year. The caption under the bars is the chart's `title`. The card is an `insight_panel`: a row whose text the author broke into lines sets its label as a bold lead over them (「体检时看看视力：」), any other runs its label into one paragraph (「卫健委建议 4～6 岁孩子…」). The rows close up when they need the room.
10. On p15 the page's source no longer repeats the two studies, which stand under their cards: the gallery holds a page to naming a source once. 「家长可以这样做」 is a `paragraph` before the checklist.
11. On p17 the page has no source, as on the board: each favour names its own.
12. The chapter pages and the close carry no page number. The board drew the disc on them, and the engine prints the page number on content pages only, across every theme. The chapter pages gain their photograph's note under it, and the close its footnote at the bottom left, so every AI photograph says so.
13. The close also takes a `bullets` whose items read 「名字：说明」, numbered in the discs, and sets four to six cards in two columns.
14. In the English deck a stage's kicker and title are joined by a middle dot (「Youngest · ages 3 to 4」), the ruler page's quote and attribution are shortened to fit their two lines, every heading keeps to 48 characters, and ranges are written "350 to 500" rather than with a tilde. The preview's hyphens look long because PingFang draws them wide. PowerPoint sets them in Microsoft YaHei UI.
15. crayon offers the `data` kind for the two chart pages, and the deck runs at `dense` pacing: the settling-in page holds five blocks.
16. Every photograph is a sample image generated for the meeting. None shows a face that can be recognised, readable text or a real logo. A content page says so in its caption or its footnote (「示意图（AI 生成）」, "Illustration (AI-generated)"), the cover and the chapter pages under their photograph, the close in its footnote.
