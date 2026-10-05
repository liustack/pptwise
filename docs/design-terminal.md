---
summary: 'The settled terminal design system handed to a design tool together with the general design brief: the incident console, the crumb on every page, the one content header, square panels and HUD brackets, mono for every figure, time, tag and source, the mark once a page, red, amber and green for the kind of news, photographs on the cover and chapters, the type sizes, and the parts a new terminal page starts from'
read_when:
  - drawing a terminal page, face or composition that the 2026-10 board did not draw
  - changing anything terminal paints, before opening the code
  - judging whether a terminal page in a showcase or the gallery follows the board
---

# Designing for terminal

terminal was redrawn to one approved board in October 2026, as an incident console: the screen an on-call engineer reads during an outage, and the review the team holds after it. This page states the rules that board settled, so the next page drawn for terminal follows them without a new argument. Paste it into the design tool after [Design brief](./design-brief.md), which still holds every general rule (vector primitives, contrast, the safe area, what to attach). Where the two disagree, this page wins for terminal: its type area runs from x64 to x1216, and its crumb, labels, tags and source line are 12 and 13px mono. The board, its source and every place the engine departs from it on purpose are in [`design/rounds/2026-10-05-terminal/`](../design/rounds/2026-10-05-terminal/README.md).

## Palette

Take the colours from `pptwise themes --json`, not from this page. For reading the rules below:

| role | token | value |
| :-- | :-- | :-- |
| page | `bg` | `#0A0F1E`, blue-black, flat on every page type |
| panel | `surface` | `#121A30` |
| a panel's edge, hairlines | `border` | `#24304A` |
| headline ink | `text` | `#EAF1FA` |
| labels, notes, the source | `muted` | `#93A5C0` |
| the one mark | `accent` (the emphasis ink) | `#53E0D2`, celadon |
| the mark's ground | the mark over the page at 12% | about `#132834` |
| bad news: a failure, a single point | `danger` | `#FF6B7D` |
| in progress, a warning, a quoted cause | `warning` | `#FFC14D` |
| recovered, works | `success` | `#4BD98A` |
| unmarked series, in order | `chartPalette` after the mark | `#5B8CFF`, `#9A7CFF`, `#4BD98A` |
| banner fill only, never text | `primary` | `#14294A` |

The mark is spent once a page. Red, amber and green say what kind of news a line is (a dot, an icon, a label, an outline, ✕ and ✓), never which line the page is about.

## The crumb, the header and the source

- Every page prints where it sits in its top left corner at 13px mono on y45: a 10px dot in the mark, the section's number and name in the mark, a quiet dot, the page number in the muted ink. 「● 01 / 复盘 · P04」. The name is the chapter heading's words before its colon, the number counts chapter pages from the first (00 before it). The cover prints 00 with the organization and the date, a chapter page 「01 / 章节 · DIR」, the ending 「EOF / 决定 · 2026-10」. The author writes nothing for it.
- The claim bold at 31/42 from x64 across 1152px, at most two lines. It wraps only when it does not fit the full measure, and its last line sits on the same baseline whether it takes one line or two.
- A hairline in the border ink at y156, with a 32 by 3 segment of the mark at its left end.
- The body runs from y180 to y650.
- The source at the foot in 12/18 mono after 「src: 」, from y668, up to two lines. Write the source without a 「来源：」 prefix.

## Panels, cards and tags

- Evidence sits in square panels: the surface with a 1px edge. No rounded corners except the browser window.
- The thing a page is about sits on the mark's ground inside a 1px edge of the mark, its words in the mark.
- A card that stands for a finding carries HUD brackets: four 10px corner strokes, 1.5px, 8px inside its edge.
- Tags are mono outlines, 12px, naming an incident or a source (「Azure 2026-02」). A filled tag only marks the pick (「SELECT」).
- A closing note is a banner across the foot of the body, 64px for one line: a tip on the mark's ground, a warning inside an edge of the warning ink.
- Symbols are the built-in lucide icons, set wherever a field takes one: a card's icon in its box, a milestone's icon in a ring of its tone, a caption's, a table row's, a tree branch's and a roadmap phase's icon before or beside its words. An icon is in the muted ink, the mark when its item is marked, or its tone's ink.

## Mono and figures

Figures, times, durations, dates, line numbers, labels, tags, the crumb and the source are mono (Consolas in PowerPoint). Claims, titles and sentences are Microsoft YaHei. Durations are written as a console prints them: 「2h52m」, 「14h32m」, 「22h 06m」. A multiplication sign is glued to its figure: 「199×」.

| the author marks | how it is drawn |
| :-- | :-- |
| a figure (`**…**` around a `kpi_cards` value) | on the mark's ground in a panel, the figure in the mark and larger than its neighbours |
| a figure's kind (`tone` on a `kpi_cards` item) | its icon and label in the tone's ink |
| a card (`highlight` on `row_cards`, `emphasis` on `numbered_cards`) | the card on the mark's ground, its icon box, number and title in the mark |
| a milestone (`highlight`) | its row on the mark's ground, its time bold, its title in the mark |
| a milestone's kind (`tone`) | its dot in the tone's ink |
| a code line (`highlight_lines`) | bold in the warning ink |
| a table row (`emphasis: "highlight"` on a `data_table` row) | on the mark's ground with a 3px bar of the mark down its left edge |
| a comparison option (`recommended`) | its card on the mark's ground with a filled SELECT tag |
| a roadmap phase (`emphasis`) | a filled node, its period bold in the mark, its card on the mark's ground |
| a run of text (`**…**`) | the mark |

## Photographs

The cover and every chapter page lay their own photograph full bleed (the slide's `background` asset) and darken it from the left with one gradient of the page colour: 94% at the left edge, 78% at 45% of the width, 15% at the right edge. Every word stands on the dark half. A row of photographs over their figures is a content page (`image_grid` then `kpi_cards`), and a dashboard sits in a browser window beside its log lines (`device_mockup` then `row_cards`). Pictures carry no readable text and no real logos.

## Type

| text | size |
| :-- | :-- |
| cover title | 60/76, bold |
| chapter number | 110, bold mono |
| chapter title | 44/56, bold |
| ending decision | 48/64, bold |
| claim | 31/42, bold |
| marked figure | 72, bold mono, others 52 stepping down |
| figures in a row or a table | 32 to 44, bold mono |
| card titles | 21 to 24, bold |
| body, notes | 15 to 19 |
| code lines | 15 to 16 mono |
| crumb, labels, tags | 12 to 13 mono |
| source | 12/18 mono |

## Where a new page starts

Before drawing, find the closest part in [Reusable parts](./reusable-parts.md#terminal-cloud-outage-review-sample-2026-10). terminal's content pages, photo pages included, are `console-sheet`, which hands its body to a composition in the console setting: `cards` for findings with symbols, `listing` for quoted text, `log` for a timeline with `span` beside it for durations, `plates` for photographs over figures, `paths` for failure points beside their fixes, `screen` for a browser beside its log, `records` for a matrix or a table of figures, `table` for options to pick from, `rail` for a ranked bar chart beside figures and `waves` for a roadmap. The cover is `console-cover`, the chapter `console-chapter`, the ending `console-ending` with its checklist. A new page is usually a new composition in the console setting, drawn inside the band from y180 to y650: square panels, mono figures, the mark once.

The statement and fact pages keep their earlier faces (`statement`, `stat-hero`) and the top-edge rule motif, and have no board in this round. Each needs its board before it changes.
