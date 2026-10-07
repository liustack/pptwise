---
summary: 'The settled crayon design system handed to a design tool together with the general design brief: a box of crayons on drawing paper, sections coloured in order by five crayons, the section capsule, the heavy rounded claim with its stroke of crayon, cards drawn twice, the sun and the stars, the folio in a pale disc, how a crayon carries words, the type sizes, and the parts a new crayon page starts from'
read_when:
  - drawing a crayon page, face or composition that the 2026-10 board did not draw
  - changing anything crayon paints, before opening the code
  - judging whether a crayon page in a showcase or the gallery follows the board
---

# Designing for crayon

crayon was drawn to one approved board in October 2026, as a kindergarten's parents' meeting at the start of a term: the teachers walking families through the new rules, how children grow, what helps at home, safety and a few favours, a part at a time, each in its own crayon. This page states the rules that board settled, so the next page drawn for crayon follows them without a new argument. Paste it into the design tool after [Design brief](./design-brief.md), which still holds every general rule (vector primitives, contrast, the safe area, what to attach). Where the two disagree, this page wins for crayon: its measure runs from x64 to x1216, and its notes, labels, captions, sources and folio are 11 to 15px. The board, its source and every place the engine departs from it on purpose are in [`design/rounds/2026-10-08-crayon/`](../design/rounds/2026-10-08-crayon/README.md).

## Palette

Take the colours from `pptwise themes --json`, not from this page. For reading the rules below:

| role | token | value |
| :-- | :-- | :-- |
| the drawing paper | `bg` | `#FFF9F0` |
| a card, a label, the inside of a box to tick | `surface` | `#FFFFFF` |
| words | `text` | `#1E2340`, navy ink |
| notes, labels, sources | `muted` | `#6E655A`, grey |
| dotted rules, a chart's base line | `border` | `#F0E6D6`, never words |
| the five section crayons, in order | `accentPool` | sky `#14B4FF`, grass green `#15D157`, tangerine `#FF6A12`, red `#F25C54`, purple `#7452E0` |
| sunny yellow: drawn, never words | `chartPalette` fourth | `#FFD100` |
| words the tangerine has to carry, a marked run | `emphasisInk` | `#C24E00`, burnt orange |
| words the green has to carry, what is free, a rule, a tick | `success` | `#0E8437`, leaf green |
| a date set large | `primary` | `#0B87C7` |
| a card's pale ground | a crayon at 16% over white | |

A filled crayon carries the navy ink, or white where the navy will not read (the purple). Yellow never carries a word. A symbol, a chevron or a tick that carries meaning reads at 3:1 on what it sits on, lifted toward the ink when the crayon alone does not.

## Sections, the capsule, the claim and the foot

- A deck's sections take the five crayons in the order they first appear. A content page names its section with `kicker`, a chapter by its heading, and a page that names none sits in the last section named before it. The close wears the last section's crayon.
- At the top left of every content page, at (64, 34), a 34px rounded capsule in the section's crayon: the section's symbol at 18px (the icon the deck's contents gives that section, when it does) and its name at 15px weight 800.
- The claim at 34/46 weight 900 across 1080px from x64, on one line whenever it fits at 95% of its size or more, broken at a comma or a colon when it does not, its last line ending on y146. A break the author wrote is kept.
- Under the claim a stroke of crayon in the section's colour from x64 to x200 on y156: three passes 2px apart, at full strength, then 45% and 35%, bowed up 3px in the middle.
- A composition is handed the band from y186 down to y640 and places the claim and the source itself. A page set by the component renderer starts its body at y186.
- The page's `footnote` is its source, on y648 at 11/16 in the grey, one line or two. Beside a photograph it stands under the cards.
- The folio: the deck's organization, label and notice at the bottom left on y684, 12px in the grey, and the page number in a 36px disc at (1180, 676) of the section's crayon at 16% (PowerPoint's slide-number field). The cover, the chapter pages and the close carry none of these.
- A sun of radius 14 at (1210, 64) with eight short rays and two star stickers, tangerine at (1172, 112) and purple at (1222, 118), at the top right of every content page not laid over a photograph.

## Cards, photographs and doodles

- A card drawn by hand: rounded 22, outlined 2.6px in its crayon, a second outline 2px off and 0.7 as wide at a third of its strength, on the crayon's pale ground or white.
- A sticky note or a card on a fridge is turned a degree or two, with a solid shadow 2 to 3px off at 8 to 10%, and a strip of half-clear tape or a round magnet at its top. Only the paper turns: the words stay upright.
- A photograph sits in a 5px crayon frame rounded 22 to 30. A page that runs over a photograph lays the paper over it from the left: 97% at the edge, 92% at the middle, 50% at the right.
- A box to tick is drawn twice in its crayon, a tick in the leaf green.
- Photographs illustrate rather than prove: a playground, building blocks, a nap room, a lunch table, the gate on the first day, a reading corner, a box of crayons. No face that can be recognised, no readable text and no logos, and each says it is AI-generated.

## Type

One heavy rounded sans for everything (the board's Yuanti SC, PingFang in the preview, Microsoft YaHei in PowerPoint), at the weight the board names: 900 for the claim, names and figures, 800 for labels and the capsule, 600 to 700 for words.

| text | size |
| :-- | :-- |
| a chapter's number | 110 |
| the cover's title | 64/86 |
| the claim under a crossed-out ruler, the close's title | 56 to 58 |
| the chapter's name | 46/64 |
| a figure on a card | 40 to 44 |
| the claim | 34/46 |
| a name on a fridge card | 34 |
| a figure in a sum | 34 |
| a badge's name, a card's name | 22 to 28 |
| the words read on a page | 14 to 20 |
| labels, values, notes | 12 to 15 |
| the source, a photograph's note, the folio | 11 to 12 |

## How the author's marks are drawn

| the author marks | how it is drawn |
| :-- | :-- |
| a page's section (`kicker`) | the capsule and the stroke under the claim in the section's crayon |
| the part of a day a page is about (`highlight` on a milestone) | the large disc at the top of the sun's arc |
| the binding row (`emphasis: "highlight"` and `tag` on a table row) | a pale green row stamped with the tag in the leaf green |
| the bar a page is about (`emphasis` on a chart point) | tangerine, its value larger |
| a year worked out from others (`status: "estimate"`) | pale in a dashed blue outline, 「（推算）」 after its year |
| the reminder that warns of danger (`tone: "danger"` on a card) | a larger badge, its name in red |
| a marked run (`**…**`) | the burnt orange, bold |
| a line the author breaks in a card's text | a point of its own |
| the cover's and the close's occasion (`kicker`) | a centred capsule, sky on the cover, the last section's crayon on the close |
| the close's line to remember (`subheading`) | a tangerine pill |

## Where a new page starts

Before drawing, find the closest part in [Reusable parts](./reusable-parts.md#crayon-new-term-parents-meeting-sample-2026-10). crayon's content pages are `crayonbox-sheet`, which hands its body to a composition in the crayonbox setting: `crayons` for what a meeting covers, `stickies` for rules as notes on a wall, `waiver` for what a rule covers and what it does not with a worked sum, `storeys` for a count and a rate on two storeys beside two figures, `swatches` for things that change from one stage to the next, `yardstick` for one thing refused under a large claim, `arc` for a day on the sun's path, `magnets` for things to remember at home, `crosscheck` for what several bodies advise, `tray` for figures beside a framed photograph, `checkup` for a rate beside its advice, `backing` for studies beside things to do, `badges` for safety reminders and `ticks` for boxes to tick beside a photograph. The cover is `crayonbox-cover`, a part's opening `crayonbox-chapter`, the close `crayonbox-ending`. A new page is usually a new composition in the crayonbox setting, drawn inside the band from y186: drawing paper, the navy ink, the section's crayon, cards drawn twice, and yellow only where nothing is read.

A content page none of the compositions takes is drawn by the component renderer under the same capsule, claim and source.
