---
summary: 'The settled ink design system handed to a design tool together with the general design brief: a public lecture hung as a scroll, the two scroll edges, the hall and the date upright down the right margin, the volume upright in cinnabar down the left, the kaishu claim across the measure, upright Chinese with its punctuation in vertical form, depth as a ramp of greys, cinnabar once a page, the type sizes, and the parts a new ink page starts from'
read_when:
  - drawing an ink page, face or composition that the 2026-10 board did not draw
  - changing anything ink paints, before opening the code
  - judging whether an ink page in a showcase or the gallery follows the board
---

# Designing for ink

ink was drawn to one approved board in October 2026, as a cultural lecture hall's public lecture on intangible heritage, hung as a scroll: the speaker opens on a few figures, reads the law, then unrolls two volumes, one on the lists and one on the people, and signs off with a seal. This page states the rules that board settled, so the next page drawn for ink follows them without a new argument. Paste it into the design tool after [Design brief](./design-brief.md), which still holds every general rule (vector primitives, contrast, the safe area, what to attach). Where the two disagree, this page wins for ink: its measure runs from x110 to x1170 between the scroll's edges, and its margins, labels, sources and folio are 11 to 15px. The board, its source and every place the engine departs from it on purpose are in [`design/rounds/2026-10-07-ink/`](../design/rounds/2026-10-07-ink/README.md).

## Palette

Take the colours from `pptwise themes --json`, not from this page. For reading the rules below:

| role | token | value |
| :-- | :-- | :-- |
| the paper | `bg` | `#F7F2E7`, rice paper |
| a card, the title slip, a painting's mount | `surface` | `#FCF9F2`, a step whiter |
| words | `text` | `#262421`, ink |
| the darkest bar, tier or part | `primary` | `#1F1C18`, burnt ink |
| the second ink: a figure not marked, a quote | `primary` a step toward the paper | about `#393631` |
| bars, a pale tier, the hall and the date | `chartPalette` third | `#8A8071`, taupe |
| a fainter bar or part | the taupe a little over the hairline | about `#C9BFAC` |
| an aside's wash, a span along the years | the hairline half over the paper | about `#EAE2D2` |
| labels, notes, the source | `muted` | `#686056`, grey |
| hairlines and the scroll's edges | `border` | `#DCD2BD`, never words |
| large type, the seal, the one thing a page is about | `accent` | `#C3272B`, cinnabar |

Cinnabar once a page: a volume number, a seal, or the one figure, bar, row, milestone or card the author marks. Nothing turns cinnabar for being the largest, and cinnabar never carries small type. Whatever is told apart by depth (the tiers of a pyramid, the age groups of a share bar) takes a ramp from burnt ink toward the paper, darkest first, and the words on each step are in white or the ink, whichever reads at 4.5:1.

## The scroll, the margins, the claim and the foot

- Every content page hangs between two hairlines at x70 and x1210, from y40 to y680. Nothing else frames the page.
- Down the right margin from y48 the hall and the date stand upright, 13px in the taupe, tracked 6px (the deck's `organization` and the footer's `label`, 「文化讲堂　二〇二六年十月」, as the author writes them). They print only when the deck asks for footer marks.
- Down the left margin from y48 the volume the page belongs to stands upright in cinnabar, 15px in the heading face, tracked 8px (the page's `kicker`, 「卷之一　先看名录」).
- In a Latin deck both margins are turned a quarter to read from the top. Latin never stands upright letter by letter.
- The claim at 34/46 in the heading face in the ink, from x110 across 1060px, its last line ending on y152. It stays on one line whenever it fits at 95% of its size or more, and breaks at a comma or a colon when it does not. A break the author wrote is kept. Beside a photograph that runs the height of the page it takes the column beside it at 38 to 40px.
- A composition is handed the band from y56, the top of the claim's box, down to the source, and places the claim and the source itself. A page set by the component renderer starts its body at y190.
- The page's `footnote` is its source, on y648 at 11/15 in the grey, one line or two, never cut. Beside a photograph it stands under the column.
- The folio: the page number at 12px in the heading face in the taupe, right-aligned on the right edge at y680 (PowerPoint's slide-number field). The footer's notice at the bottom left, the draft and confidentiality marks before the number, 11px. The cover, the chapter pages and the close carry none of these and draw their own.

## Upright type, figures and photographs

- Chinese may stand upright down a column, a character a cell, read from the right. Its punctuation is set the way vertical type sets it: a comma or a full stop in the upper right of its cell, brackets and title marks in their vertical forms (「︽」 for 「《」), an ellipsis turned. No column starts on a comma or ends on an opening bracket. A line break the author wrote starts a new column.
- A passage of law stands upright in columns of fourteen characters at 34px, a short cinnabar bar beside its first column's head, where it comes from in a column of its own in the taupe.
- A figure is set large in the heading face with its unit small after it: 110px beside a photograph or on the opening page, 46 to 58px in a row under a chart or photographs, 32 to 36px in a table. The one the author marks (`**…**`) is in cinnabar, an earlier or unmarked one in the second ink.
- A table is open: a heavy rule under its headings, hairlines between rows, its first column in the heading face, its figures large in the heading face, its source column small and grey.
- A timeline of years is drawn to scale, its spans as bands along the axis, each milestone's name in one of three rows clear of every other name and stem, and the running count as a staircase under it.
- Nothing is slanted. A Chinese face has no italic, so a caution, a comment or a caption is told apart by the grey or the body face instead.
- Photographs illustrate rather than prove: a shadow puppet horse, a fishing boat on a misty lake, old hands at embroidery, weavers at their looms, a woodblock carver's hands, children cutting paper, a lane of lanterns, a brush beside an inkstone. No face that can be recognised, no readable text and no logos. On the cover the photograph runs down the left 640px and fades into the paper. On a chapter page a tall painting hangs in a 10px mount. On a content page it runs the height of the page at the left, its note in white at its foot.
- Symbols are the built-in lucide icons in the ink, cinnabar beside the marked figure or finding.

## Type

The heading face is Times New Roman with KaiTi (the board was set in Kaiti SC), for the claim, figures, names, the lines a page reads aloud, upright passages, the volume and the folio. The body face is Microsoft YaHei (PingFang on the board) for labels, notes, table headings, the hall and the date and the source. Kaishu has no bold worth the name, so in the heading face size and colour do the work, and only the small milestone names on a scroll of years are bold. In the body face the small values on bars, table headings and the words inside a share bar's parts are bold.

| text | size |
| :-- | :-- |
| a word in a column of things to do | 110 (one character), 56 in Latin |
| a figure beside a photograph, the opening figures | 110 |
| the chapter's volume number | 72, cinnabar |
| the cover's title, the closing words | 54 |
| the chapter's name | 52 |
| figures in a row | 46 to 58 |
| the claim beside a photograph | 38 to 40 |
| the claim | 34/46 |
| an upright passage of law | 34 |
| a figure in a table | 32 to 36 |
| a tier's name, a finding's name, a part of a system | 22 to 24 |
| the line read aloud | 17 to 22 |
| a row's name, a quote, a card's words | 14 to 18 |
| labels, values, notes | 12 to 13 |
| the volume, the hall and the date, the source, the folio | 11 to 15 |

## How the author's marks are drawn

| the author marks | how it is drawn |
| :-- | :-- |
| the hall and the date (`organization`, `footer.label`) | upright down the right margin in the taupe |
| a page's volume (`kicker`) | upright in cinnabar down the left margin |
| the source (`footnote`) | at the foot, or under the column beside a photograph |
| the one thing a page is about (`**…**` on a figure, `emphasis` on a point or a series, `highlight` on a milestone, a row or a card) | cinnabar |
| the figure a pyramid's tier holds (`note` on a layer) | after the tier's name in its band |
| a timeline's spans (`periods`) and its running count (a `scatter` series with `steps`) | bands along the axis of years, a staircase under it named at its steepest step and its end |
| a marked run of a share bar and its words (`emphasis` on series, `emphasis_label`) | a cinnabar bracket under the run with the author's words at its end |
| the source of a quoted finding (`tag` on `icon_cards`) | small and grey under the quote |
| the cover's and the close's seal (`stamp`) | a cinnabar seal with that character, or the hall's first character |
| the cover's and the chapter's picture (`background`) | a photograph fading into the paper, a painting in its mount |
| the close's day to remember (`subheading`) | at the bottom left as the author breaks it |

## Where a new page starts

Before drawing, find the closest part in [Reusable parts](./reusable-parts.md#ink-intangible-heritage-public-lecture-sample-2026-10). ink's content pages are `scroll-sheet`, which hands its body to a composition in the scroll setting: `opening` for the figures a talk opens on over the line read aloud, `strata` for a pyramid of tiers beside the system's other parts, `handscroll` for years to scale with the running count under them, `revival` for a figure then and now beside a photograph, `nations` for a count by country beside how it was counted, `genres` for two counts of the same categories each on its own scale, `bases` for counts beside a table of totals that must not be joined, `ages` for a share bar of age groups with its run bracketed, `archive` for two figures and a progress bar beside a photograph, `scenes` for photographs over figures with their sources, `daily` for a small table that compares by the day beside a photograph, `excerpts` for findings quoted from the record, and `glyphs` for a few things to do, one word each. The quotation page is `scroll-quote` with the `statute` composition, the cover `scroll-cover`, a volume's opening `scroll-chapter`, the close `scroll-ending`. A statement keeps `statement`. A new page is usually a new composition in the scroll setting, drawn inside the band from y56: rice paper, the ink for words, depth as a ramp of greys, the one thing in cinnabar, and Chinese upright where a scroll would stand it.

A content page none of the compositions takes is drawn by the component renderer under the same margins, claim and source.
