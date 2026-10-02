# brief, 2026-10-02

The round that redrew brief's showcase sample to one approved board: a consulting proposal, "Cut last-mile cost 18% in twelve months", eleven pages in navy, one yellow and a Georgia-like serif.

## Source

- `design-gen.py` writes every board page as absolutely positioned HTML. It is the only source of the boards' geometry: every box, size and colour the engine was built against is in it. Running it writes the pages to `./project/`.
- The `*.board.png` files in the part folders are the eleven approved pages, cut at 1280 by 720 from the two contact sheets the maintainer approved. Six pages (p02, p04, p07, p09, p10, p11) were redrawn once, and only the redrawn version is kept.
- The `*.engine.png` files are `pptwise preview showcase/brief`, rasterized with `rsvg-convert`. The showcase deck is a Chinese board report on store network changes, not the board's English proposal, so compare the drawing, not the words.

## Pages and the parts they settled

| board page | part | folder |
| :-- | :-- | :-- |
| p01 cover | face `gauge-verdict` | [faces/gauge-verdict](../../faces/gauge-verdict/) |
| p02 statement | face `gauge-point` | [faces/gauge-point](../../faces/gauge-point/) |
| p03 trend | composition `rail`, chart `series[].emphasis` | [compositions/rail](../../compositions/rail/), [components/chart](../../components/chart/) |
| p04 bridge | waterfall emphasis and truncated axis, face `gauge-exhibit` | [components/waterfall](../../components/waterfall/) |
| p05 drivers | composition `rows` | [compositions/rows](../../compositions/rows/) |
| p06 chapter | face `gauge-section` | [faces/gauge-section](../../faces/gauge-section/) |
| p07 options | composition `table`, comparison `recommended` | [compositions/table](../../compositions/table/), [components/comparison](../../components/comparison/) |
| p08 plan | composition `waves`, roadmap `items[].emphasis` | [compositions/waves](../../compositions/waves/), [components/roadmap](../../components/roadmap/) |
| p09 prize | face `gauge-figure` | [faces/gauge-figure](../../faces/gauge-figure/) |
| p10 team | composition `tree` | [compositions/tree](../../compositions/tree/) |
| p11 ending | face `gauge-next` | [faces/gauge-next](../../faces/gauge-next/) |
| every page | motif `folio-motif` (the footer) | [motifs/folio-motif](../../motifs/folio-motif/) |

Every content page shares one frame, drawn by `GaugeHead` and `GaugeSource` in `src/layouts/gauge-shared.tsx`: the claim at 36px regular weight in primary, at most two lines, sitting on a 1px primary rule at y172 that runs x96 to x1184, and the source in 16px muted on the footnote baseline. The body between them is the band the compositions draw in (x96, y200, 1088 wide, down to y648, or y612 above a source line).

## Decisions

Where the engine departs from the board, it does so on purpose, for these reasons.

1. No page numbers. The board's footer prints one beside "Confidential". When this round shipped, the engine printed no page numbers on any theme (a decision from 2026-07-09), so the footer carried only the organization and the confidentiality label.
2. Chapter numbers come from the engine's own chapter count, so the sample shows "01" where the board shows "02".
3. Unmarked combo series use a grey that clears 3:1 against the page (the chart palette's #797D86, or a blend of muted that clears 3:1), not the board's #C9CCD2, which is too faint to read as data.
4. The trend page's figure column is computed, not written: label is the series name, the figure is the whole-number change from the first value to the last, the note is "first → last" in the axis unit. When the series do not allow it, the column is left out and the chart takes the full width.
5. The waterfall's broken axis applies to every theme, not only brief. See [components/waterfall](../../components/waterfall/).
6. The `list` kind also goes to `gauge-sheet`, so every content page keeps the same frame.
7. The faces paint yellow only where the board drew it as a fixed mark: the bar on the cover, the bar on the chapter page and the bar under the big figure. Every other yellow comes from what the author marked. The heading rule, the footer, and the bars over the statement and the ending are primary.
8. `gauge-motif` stays registered for anyone who borrows it. brief switches to the new `folio-motif`.
9. In a combo chart, only the marked line prints its point values, and none of them if any one would collide. Bars carry no value labels.
