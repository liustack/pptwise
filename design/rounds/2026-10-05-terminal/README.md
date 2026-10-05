# terminal, cloud outage review sample, 2026-10-05

The round that redrew terminal to one approved board: a sixteen-page Chinese and English technical review of thirteen cloud outages from June 2025 to September 2026 ("云中断复盘：高可用先补什么"), read from the providers' own postmortems and status pages, ending in what the infrastructure team should build first. It turned terminal into an incident console: a mono line at the top of every page that says where the page sits, square panels, HUD brackets on the cards that stand for findings, every figure, time, tag and source set in mono, the one thing a page is about on a dark tint of celadon, and red, amber and green only ever saying what kind of news a line is. It settled a content page that hands its body to the compositions in a new `console` setting, seven new compositions, console forms of four settled ones, a cover and two chapter pages over their own photographs, and a checklist ending.

## Source

- `design-gen.py` writes every board page as absolutely positioned HTML. It is the only source of the boards' geometry. Its photograph and engine-render references point at the design tool's blob store, so the script records the boards rather than rebuilding them outside that tool.
- The `terminal*.board.png` files in the part folders are those pages rendered at 1280 by 720 in a browser. The `terminal*.engine.png` files are `pptwise preview` of the Chinese showcase deck ([showcase/terminal/zh](../../../showcase/terminal/zh/)), rasterized with `rsvg-convert`. The board and the engine show the same deck, so the words match as well as the drawing.

## The design system

Every terminal page follows these, not only the pages the sample uses. [docs/design-terminal.md](../../../docs/design-terminal.md) states them for the next round.

1. A crumb in the top left corner of every page at 13px mono, read off the deck: a dot in the mark, the section's number and name in the mark, a quiet dot, the page number in the muted ink. 「● 01 / 复盘 · P04」 on a content page, the organization and the date on the cover, 「01 / 章节 · DIR」 on a chapter page, 「EOF / 决定 · 2026-10」 on the ending.
2. Every content page has one header: the claim bold at 31/42 across the whole 1152px from x64, at most two lines, set on its last line so one line and two end on the same baseline, wrapping only when it does not fit. A hairline in the border ink at y156 with a 32 by 3 segment of the mark at its left end. The body runs from y180 to y650. The source sits at the foot in 12/18 mono after 「src: 」, up to two lines.
3. Evidence sits in square panels: the surface (`#121A30`) with a 1px edge (`#24304A`). A card that stands for a finding carries HUD brackets, four 10px corner strokes 8px inside its edge.
4. Figures, times, durations, dates, tags, labels, line numbers and the source are mono. Claims, titles and sentences are in the body face.
5. Celadon (`#53E0D2`) is the one mark, once a page: the thing the page is about stands on a dark tint of it (`#0E2A33` on the board) inside a 1px edge of it, its words in it. Unmarked data is the chart palette after its lead, blue (`#5B8CFF`) first.
6. Red (`#FF6B7D`), amber (`#FFC14D`) and green (`#4BD98A`) say what kind of news a line is: a dot on a log line, an icon, a label, an outline, ✕ and ✓ in a matrix. They never say which line matters.
7. Tags are mono outlines (`Azure 2026-02`), a filled tag only for the pick (`SELECT`).
8. Photographs: the cover and the two chapter pages lay one full bleed and darken it from the left (the page colour at 94%, 78% at 45% of the width, 15% at the right edge), the words on the dark half. The physical failures page sets three photographs in a row over their figures. The observability page sets a dashboard in a browser window.
9. Type: the cover title 60/76, the chapter number 110 mono, the chapter title 44/56, the ending 48/64, the claim 31/42, card titles 21 to 24, body 15 to 19, figures 44 to 72 mono, labels, tags and the crumb 12 to 13 mono, the source 12 mono. Microsoft YaHei for words, Consolas for mono.

## Pages and the parts they settled

| board page | part | folder |
| :-- | :-- | :-- |
| every content page | face `console-sheet` (new), compositions in the `console` setting (new) | [faces/console-sheet](../../faces/console-sheet/) |
| p01 cover | face `console-cover` (new) | [faces/console-cover](../../faces/console-cover/) |
| p02 verdict | composition `cards` (new), verdict cards | [compositions/cards](../../compositions/cards/) |
| p03, p10 chapters | face `console-chapter` (new), composition `contents` in the console setting | [faces/console-chapter](../../faces/console-chapter/), [compositions/contents](../../compositions/contents/) |
| p04 incident windows | composition `rail`, console setting, with `tone` on figures | [compositions/rail](../../compositions/rail/), [components/kpi_cards](../../components/kpi_cards/) |
| p05 quotes | composition `listing` (new), with `title` and `highlight_lines` on `code` | [compositions/listing](../../compositions/listing/), [components/code](../../components/code/) |
| p06 cascade | compositions `log` and `span` (new), with `icon` and `tone` on milestones | [compositions/log](../../compositions/log/), [compositions/span](../../compositions/span/), [components/timeline](../../components/timeline/) |
| p07 recovery | composition `cards` (new), HUD cards, with `tag` on `icon_cards` | [compositions/cards](../../compositions/cards/), [components/icon_cards](../../components/icon_cards/) |
| p08 physical failures | composition `plates` (new), with `icon` on `image_grid` captions | [compositions/plates](../../compositions/plates/), [components/image_grid](../../components/image_grid/) |
| p09 redundancy matrix | composition `records`, console setting, ✓ ✕ — cells | [compositions/records](../../compositions/records/), [components/data_table](../../components/data_table/) |
| p11 SLA | composition `records`, console setting, a table of figures beside figure panels | [compositions/records](../../compositions/records/) |
| p12 DR tiers | composition `table`, console setting, option cards | [compositions/table](../../compositions/table/) |
| p13 dependency paths | composition `paths` (new), with `icon` and `children_column` on `issue_tree` | [compositions/paths](../../compositions/paths/), [components/issue_tree](../../components/issue_tree/) |
| p14 observability | composition `screen` (new), with `tone` on `row_cards` | [compositions/screen](../../compositions/screen/), [components/row_cards](../../components/row_cards/) |
| p15 roadmap | composition `waves`, console setting, with `icon` on roadmap phases | [compositions/waves](../../compositions/waves/), [components/roadmap](../../components/roadmap/) |
| p16 ending | face `console-ending` (new), the checklist | [faces/console-ending](../../faces/console-ending/) |

The compositions read the `console` setting from the face that offers them (`CompositionSetting` in [`src/layouts/compositions/shared.tsx`](../../../src/layouts/compositions/shared.tsx), the inks, panels, brackets, mono measure, tags, meters, note panels and banners in [`console.tsx`](../../../src/layouts/compositions/console.tsx), the crumb in [`crumb.tsx`](../../../src/layouts/compositions/crumb.tsx), the checklist in [`checklist.tsx`](../../../src/layouts/compositions/checklist.tsx)). Every ink comes from the theme's tokens: the emphasis ink for the mark, the semantic inks for the kind of news, the border for edges and the chart palette after its lead for unmarked series. The tests draw each form on terminal and on vermilion and crayon.

## Decisions

Where the engine departs from the board, it does so on purpose, for these reasons.

1. Mono text is measured at Menlo's advance (0.602em for Latin, a full em for CJK), the widest of the mono faces a preview may fall back to. PowerPoint sets it in Consolas, 0.55em, so the exported text is a little shorter than the preview and never longer than its box.
2. The small type is the board's: the crumb at 13px, labels and tags at 12 and 13px, the source at 12px. All of it is under the engine's 16px floor and carries the `console-spec` exemption by name, which the L1 audit and the corpus scan know.
3. The board spaced the crumb's letters 1px apart. The engine sets it unspaced: the spacing would have to be written glyph by glyph to reach the export, and at 13px it does not change how the line reads.
4. The mark's tint is the mark laid over the page at 12%, about `#132834`, where the board picked `#0E2A33`. Deriving it from the tokens keeps it right for a fork that recolours the mark.
5. Line numbers, the window's address and the quiet indexes the board set in `#3A4A66` are raised to 3:1 against their ground, the floor for meta text, so they print a step lighter than the board.
6. The chapter pages list each page by its full heading, read off the deck. The board shortened some of them by hand (「灾备四档选温备，不上多活」). The author writes nothing for the list, and a heading that needs two lines takes two.
7. The redundancy matrix (p09) sizes its columns from their words, where the board placed them by hand: the columns land a few pixels off the board's.
8. The physical failures page (p08) fits its three photographs inside the type area. The board's row ran past x1216.
9. The paths page (p13) sets the right header at the right column's left edge after its ✓, where the board set it a little further right.
10. Verdict cards with no icon set their title level with their number, where the icon box would stand, so a numbered list keeps a line of text each over a closing banner. The board drew cards with icons only.
11. The statement and fact pages have no board in this round. They keep their earlier faces (`statement`, `stat-hero`) and the old top-edge rule motif, which now only appears on those two pages.
12. The theme's `shape.radius` is 0 and every page type's background is the flat page colour `#0A0F1E`, as the board drew them. Shared components drawn on terminal outside the compositions are square-cornered too.
13. The sample puts a symbol on the cascade page's milestones (p06), the photographs' captions (p08), the matrix rows (p09) and the roadmap's phases (p15), where the board drew none: samples use the built-in lucide icons wherever a field takes one. A milestone's icon replaces its dot, in a ring of the dot's ink, so its tone still reads.
