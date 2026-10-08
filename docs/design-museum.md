---
summary: 'The settled museum design system handed to a design tool together with the general design brief: a darkened gallery, the hall sign and the door plate, the serif claim across the whole measure, exhibits in pools of warm light with round photographs, the exhibit label, copper once a page, the type sizes, and the parts a new museum page starts from'
read_when:
  - drawing a museum page, face or composition that the 2026-10 board did not draw
  - changing anything museum paints, before opening the code
  - judging whether a museum page in a showcase or the gallery follows the board
---

# Designing for museum

museum was drawn to one approved board in October 2026, as a museum's weekend science talk on the Moon soil Chang'e-5 and Chang'e-6 brought back: a catalogue cover, a floor plan of the visit, two samples side by side and the haul beside Apollo's, the halls one after another with an exhibit and its label, ranges on a log scale, beads under the microscope and the oldest fragment in a pool of light, the papers laid out in time, where the soil went, the open questions on blank labels, what to read on a label next time, and the lights going down. This page states the rules that board settled, so the next page drawn for museum follows them without a new argument. Paste it into the design tool after [Design brief](./design-brief.md), which still holds every general rule (vector primitives, contrast, the safe area, what to attach). Where the two disagree, this page wins for museum: its hall sign runs across the top from x64 to x1216, its claim runs the whole measure, and its labels, captions, the hall sign and the source are 10 to 15px. The board, its source and every place the engine departs from it on purpose are in [`design/rounds/2026-10-08-museum/`](../design/rounds/2026-10-08-museum/README.md).

## Palette

Take the colours from `pptwise themes --json`, not from this page. For reading the rules below:

| role | token | value |
| :-- | :-- | :-- |
| the hall: the page | `bg` | `#211A12`, brown-black |
| a label's board, a room on a plan | `surface` | `#2B241A` |
| a case: the dark of a large square, a share bar | `primary` | `#322A1E` |
| words | `text` | `#F4ECD8`, warm paper |
| what is quieter: lines of fact, notes | `muted` | `#C2B394`, old paper |
| captions, sources, the talk's label | the muted two thirds of the way from the hall | about `#8E826A` |
| seams between rows and round a room | `border` | `#403628`, never words |
| the one thing a page is about, a label's number, its edge | `accent` | `#BE7A28`, copper |
| a name or a date under copper | the copper fifteen points lighter | about `#DC9F57` |
| a pool of light | the paper with a quarter of the copper in it | about `#E7D0AC`, 14 to 20% at its centre |

Copper once a page: the one thing a page is about, and the label's number and edge. Everything else is paper, old paper and seams.

## The hall, the claim and the foot

- At the top left of every content page, from y34: the hall the page stands in, 11px in copper tracked 4px (the page's `kicker`, 「第一展厅 · 月球正面的土」). A seam across the page under it on y58.
- The claim: 32/44 in the heading serif at its regular weight, from x64 across the whole measure to x1216, its last line's box ending on y154. It stays on one line whenever it fits at a twelfth under its size or more, and breaks at a comma or a colon when it does not. A break the author wrote is kept.
- The source at the foot from y630, 10/15 in the dim, one line or two. A composition may set it higher or inside a label.
- At the bottom left the talk's own label, 10px in the dim tracked 2px (the deck's `organization` and the footer's `label`). At the bottom right the page number at 14px in the serif inside a 60 by 28 seam-coloured frame, PowerPoint's slide-number field.
- The cover and the close draw their own hall sign and carry no page number. A chapter page names its hall twice and keeps the door plate.

## Light, labels and photographs

- An exhibit stands in a pool of warm light: a circle of the warm light fading from its centre to nothing at its rim. It may spill past the page's edge.
- A photograph of an exhibit is cut round, a seam drawn round it, 420px across beside a label, 280px under a microscope with a dotted copper ring over the seam.
- The label: a board 556 by 470 with a 2px copper edge along its top, the exhibit's number at 11px in copper tracked 4px, its name at 26/36 in the serif, its age or date at 15px in the lit copper, up to three lines of fact at 13/22 in old paper, a seam, 「它让我们知道」 at 11px in copper tracked 2px, the line it reads aloud at 22/34 in the serif broken at its comma, the source at its foot.
- A blank label is a dashed old-paper frame with nothing filled in.
- Captions are 10px in the dim tracked half a pixel, and every AI picture says so (「AI 生成，非样品实拍」).
- Symbols are the built-in lucide icons in copper at a fine stroke.

## Type

The heading face is Times New Roman with SimSun (the board was set in Songti SC), for the claim, names, figures and the lines a label reads aloud. The body face is Microsoft YaHei (PingFang on the board) for labels, notes, captions, the hall sign and the source. Small Chinese labels are tracked 2 to 10px as the board tracks them. A line with lower-case Latin is tracked a quarter as wide.

| text | size |
| :-- | :-- |
| one figure in a pool of light | 170, its unit 52 |
| a figure beside squares | 110, the second 64 |
| a sample's quantity | 84 |
| a chapter's title | 68 |
| the cover's title, the closing words | 64 |
| an oxygen-style figure | 36 |
| a numeral beside a point | 36 |
| the claim | 32/44 |
| an exhibit's name on its label | 26 |
| a room's or a sample's name, a lens's name, the line a label reads aloud, a card's name | 22 |
| a question, a point's name | 20 |
| a range's name, a closing line | 16 to 17 |
| an exhibit's age, a timeline's name | 15 to 18 |
| facts, notes, a card's text | 12 to 14 |
| labels, captions, the hall sign, the source, the door plate | 10 to 14 |

## How the author's marks are drawn

| the author marks | how it is drawn |
| :-- | :-- |
| the talk (`organization`, `footer.label`) | at the bottom left of every content page |
| a page's hall (`kicker`) | at the top left over the seam. On a chapter page also over its title |
| the one thing a page is about (`**…**` in a line, a caption or a figure, `emphasis` on a bar or a share bar's part, `highlight` on a milestone) | copper, a name in the lit copper |
| an exhibit's number (`tag` on its `kpi_cards` item, 「展品 1」) | small and tracked in copper at the head of its label |
| the line an exhibit reads aloud (a `paragraph` opening 「它让我们知道：」) | the label small in copper, the line in the serif under it |
| a range's second line (the second line of a category, `"撞击玻璃珠\n太阳风来源…"`) | small and dim under its name |
| where a value comes from (`note` on a chart point) | small and dim under its value |
| a band of values (`bands` on a bar chart on its side) | a translucent copper band down the log scale |
| a verdict every open question shares (`sub` on `numbered_cards`) | small and dim at each blank label's foot |
| the part of a picture to keep (`crop`) | the picture cropped to it in its frame, round or not |
| the source (`footnote`) | at the foot, or at a label's foot |

## Where a new page starts

Before drawing, find the closest part in [Reusable parts](./reusable-parts.md#museum-moon-soil-science-talk-sample-2026-10). museum's content pages are `placard-sheet`, which hands its body to a composition in the placard setting: `floorplan` for a visit's rooms and exhibits, `jars` for two samples side by side, `squares` for quantities as areas to scale, `specimen` for one exhibit beside its label, `decades` for ranges on a log scale, `lenses` for exhibits under a microscope, `halo` for one figure in a pool of light, `dateline` for events at their true distance in time, `slice` for a whole with its part cut out and where it went, `blanks` for open questions and `cabinet` for a case beside what to look for. The cover is `placard-cover`, a hall's opening `placard-chapter`, the close `placard-ending`. A new page is usually a new composition in the placard setting, handed the whole page: the hall, warm paper, seams, a pool of light, copper once, a serif claim across the measure.

A content page none of the compositions takes is drawn by the component renderer under the same hall sign, claim and source.
