---
summary: 'The settled stage design system handed to a design tool together with the general design brief: a talk on a dark stage, the clicker along the foot, the chapter and the bold claim, one sentence or one figure in a follow spot, silver once a page, the type sizes, and the parts a new stage page starts from'
read_when:
  - drawing a stage page, face or composition that the 2026-10 board did not draw
  - changing anything stage paints, before opening the code
  - judging whether a stage page in a showcase or the gallery follows the board
---

# Designing for stage

stage was drawn to one approved board in October 2026, as a keynote at a game developers' conference on what will carry Chinese games abroad next: the hall from the back row, one sentence, one figure, three acts each opening over a photograph, a decade as one line, two rates face to face, a slope chart, two leaderboards, peaks hundreds of times apart, a quarter as a hundred dots, small teams beside a photograph, the bill as two bars, three gates as doors, five bets and the last sentence. This page states the rules that board settled, so the next page drawn for stage follows them without a new argument. Paste it into the design tool after [Design brief](./design-brief.md), which still holds every general rule (vector primitives, contrast, the safe area, what to attach). Where the two disagree, this page wins for stage: its claim runs the whole measure from x64 to x1216, its clicker runs along the foot below the footer line, and its chapter, captions, ticks, the source and the count are 11 to 15px. The board, its source and every place the engine departs from it on purpose are in [`design/rounds/2026-10-08-stage/`](../design/rounds/2026-10-08-stage/README.md).

## Palette

Take the colours from `pptwise themes --json`, not from this page. For reading the rules below:

| role | token | value |
| :-- | :-- | :-- |
| the page | `bg` | `#0F0F12`, a cold black |
| a door, the one shape a page fills | `surface` | `#1A1A1F` |
| words | `text` | `#F3EFE7`, a warm paper white |
| what is quieter: lead-ins, notes, reasons | `muted` | `#B0A694`, a warm sand |
| sources, ticks, the count's neighbours | the sand two thirds of the way into the black | about `#7E786C` |
| hairlines between rows | the black lifted 11 points of lightness | about `#2A2A30` |
| axes, the clicker's track, a door's edge | the black lifted 18 points | about `#3A3A42` |
| a bar that steps back, an unlit dot | the black lifted 24 or 10 points | about `#4A4A52`, `#26262C` |
| the one thing a page is about | `accent` | `#C4BFB6`, a matte silver |
| a follow spot | the paper white | 7 to 8% at its centre, nothing at its rim |

Silver once a page: the one thing a page is about, the clicker's given part, and a chapter page's number. Everything else is the paper white, the sand and the greys of the black.

## The clicker, the chapter, the claim and the source

- Along the foot of every page: a 2px track on y676 from x64 to x1096, the part from x64 to this page's place over the deck's length in silver, and at x1216 the count at 12px in the sand tracked 1px, 「5 / 18」, the page number PowerPoint's slide-number field. Over a photograph the track is the paper white a quarter strong. The deck's other footer marks stand at the top right at 12px in the dim tracked 2px.
- At the top left of an ordinary content page from y40: the chapter (the page's `kicker`, 「第一章　出海」) at 12px in the sand tracked 4px. A page one sentence or one figure carries alone names no chapter.
- The claim: bold at 40/50 from y76 across the whole measure, on one line whenever it fits at a twelfth under its size or more, broken where the author broke it or at a comma when it does not.
- The source at the foot from y626, 11/16 in the dim, one line or two, its last line ending by y664. A composition may set it higher, centre it, or set it in a column of its own.
- The cover, the chapter pages and the close draw their own clicker.

## One sentence, one figure, a photograph

- One sentence alone: bold at 72/96 centred on the author's two lines from y230, its marked words in silver, a short silver rule under it, one line under that at 16px in the sand, in a follow spot 420px in radius.
- One figure alone: its lead-in at 22px in the sand centred over it, the figure bold at 220px closed up 6px with its unit at 80px after it, and under it what it rests on, in a follow spot 460px in radius.
- The close: bold at 64/90 centred on the author's two lines, its marked words in silver, the occasion at 13px tracked 6px at the foot, in a follow spot.
- A photograph runs to the page's edges: the whole page under a wash of the black from the left on the cover and the act pages, the left half fading into the black over its last 200px beside a column of figures.
- Symbols are the built-in lucide icons in silver at a fine stroke.

## Type

The heading and body face is Microsoft YaHei (PingFang on the board), set bold for claims, figures, names and judgements, regular for lead-ins, notes, reasons, the chapter, captions and the source. Small Chinese labels are tracked 2 to 8px as the board tracks them. A line with lower-case Latin is tracked a quarter as wide.

| text | size |
| :-- | :-- |
| one figure alone | 220, its unit 80 |
| a fraction beside its dots | 200 |
| an act's name | 150 |
| two figures face to face | 150 |
| the cover's title | 76 |
| one sentence alone | 72 |
| the closing sentence | 64 |
| a stacked figure | 52 |
| a rank, a bet's number, a figure in a door | 44 to 80 |
| the claim, a bar's marked value | 40 |
| a line's end value | 34 |
| a bet, a bar's value | 28 to 30 |
| the sentence beside two bars | 26 |
| a fraction's claim, a place's name | 22 to 26 |
| a lead-in, a side's name, a gate's name, an act's line | 20 to 22 |
| notes, reasons, a closing line | 14 to 18 |
| the chapter, captions, ticks, the source, the count | 11 to 15 |

## How the author's marks are drawn

| the author marks | how it is drawn |
| :-- | :-- |
| a page's chapter (`kicker`) | at the top left, or at the top of the column beside a photograph |
| an act's number (`kicker` on a chapter page) | in silver tracked 8px over the act's name |
| the one thing a page is about (`**…**` in a line, a whole figure `**30.22%**`, `emphasis` on a bar, a row of a `from_to` or a bet) | silver |
| a figure's two ends (its label written `A → B`) | a hairline with a sand dot and a silver dot, each end's words under its dot |
| a fall in a line (`note` on the point it ends at) | a faint silver band over the run of falls, the note over it, the point a ring |
| a share written as a fraction (`约 ¼`) with its exact percentage in the label | that many of a hundred dots lit |
| what a chart counts (its series, after its title) | small and tracked over the chart |
| a gate's symbol (`icon` on a `kpi_cards` item) | in silver at the top of its door |
| the source (`footnote`) | at the foot, over the clicker |

## Where a new page starts

Before drawing, find the closest part in [Reusable parts](./reusable-parts.md#stage-game-developers-keynote-sample-2026-10). stage's content pages are `keynote-sheet`, which hands its body to a composition in the keynote setting: `hush` for one sentence, `giant` for one figure under its lead-in, `crowd` for a fraction as dots, `contour` for a decade as one line, `faceoff` for two figures face to face, `tilt` for a slope chart, `podiums` for two leaderboards, `gulf` for quantities to scale however far apart, `tower` for a photograph beside stacked figures, `toll` for two bars beside their sentence, `arches` for gates as doors and `slate` for a short list of bets. The cover is `keynote-cover`, an act's opening `keynote-chapter`, the close `keynote-ending`, and a quote `pull-quote`. A new page is usually a new composition in the keynote setting, handed the whole page: the black, one thing large, silver once, the clicker along the foot.

A content page none of the compositions takes is drawn by the component renderer under the same chapter, claim and source.
