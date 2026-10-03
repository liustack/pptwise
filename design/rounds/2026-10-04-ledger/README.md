# ledger, AI capex sample, 2026-10-04

The round that redrew ledger to one approved board: a fifteen-page Chinese and English investment committee review of the AI capital spending of the four largest US cloud companies in 2026 ("AI 资本开支还能涨多久"). It turned ledger into a market screen: a status bar on every page, the claim in a serif across the page, every piece of evidence in a dark panel with a title bar, amber spent once a page, and green and red kept for direction. It settled a cover with a ticker of headline figures, an ordinary content page that sets its body in panels, a single-figure page, a photo page, and an ending that asks for one decision and lists what to watch.

## Source

- `design-gen.py` writes every board page as absolutely positioned HTML. It is the only source of the boards' geometry. Its photo and engine-render references point at the design tool's blob store, so the script records the boards rather than rebuilding them outside that tool.
- The `ledger*.board.png` files in the part folders are those pages rendered at 1280 by 720 in a browser. The `ledger*.engine.png` files are `pptwise preview` of the Chinese showcase deck ([showcase/ledger/zh](../../../showcase/ledger/zh/)), rasterized with `rsvg-convert`. The board and the engine show the same deck, so the words match as well as the drawing.

## The design system

Every ledger page follows these, not only the pages the sample uses. [docs/design-ledger.md](../../../docs/design-ledger.md) states them for the next round.

1. A 32px status bar across the top of every page, one step darker than the page with a 1px border line under it: an amber dot and the organization on the left, the date on the right, both 12px muted. No page number. A deck with no meta gets the empty bar.
2. Every content page has one header: the claim in the heading face (a serif), regular weight, 31/42, across the full 1152px measure from x64, at most two lines, set on its last line at y130. A title never breaks early: it wraps only when it does not fit.
3. Evidence sits in dark panels: the surface colour (`#171C22`), a 1px border (`#2A3440`), square corners, and a 36px title bar with the panel's name on the left and its unit on the right at 13px muted. A panel the author marked takes amber for its edge and its name.
4. Amber (`#F0A63C`) is the one mark, once a page. Green (`#2FA97C`) and red (`#DA6354`) say only which way a value moved, never whether that is good, and are never a series colour. Unmarked series step back in slate: `#56677A`, `#3D4B5A`, `#2E3A47`, and `#7E93A8` for a quiet line or outline.
5. Figures are in the heading face: 200px for a fact page's figure, 52px in the cover's ticker, 34 to 56px in a figure panel, 28 to 36px in a table.
6. Type: body 17 to 19px, labels 14 to 15px, panel titles and the source 13px. Margins x64 to x1216, content y152 to y648, the source line from y664.

## Pages and the parts they settled

| board page | part | folder |
| :-- | :-- | :-- |
| every page | motif `poster-motif`, redrawn as the status bar | [motifs/poster-motif](../../motifs/poster-motif/) |
| every content page | face `panel-sheet` (new), compositions in the `panel` setting (new) | [faces/panel-sheet](../../faces/panel-sheet/) |
| p01 cover | face `stat-cover`, redrawn, with the ticker (new) | [faces/stat-cover](../../faces/stat-cover/), [compositions/ticker](../../compositions/ticker/) |
| p02 conclusion | composition `tiles` (new) | [compositions/tiles](../../compositions/tiles/) |
| p03 the year's figure | face `panel-figure` (new), the comparison form of the panel bars | [faces/panel-figure](../../faces/panel-figure/) |
| p04 quarterly capex | composition `columns`, panel setting, a stack with a bracket | [compositions/columns](../../compositions/columns/) |
| p05 guidance | composition `shifts` (new) beside `rail`'s figure panels | [compositions/shifts](../../compositions/shifts/), [compositions/rail](../../compositions/rail/) |
| p06 cash | composition `columns`, panel setting, a bar-and-line combo | [compositions/columns](../../compositions/columns/) |
| p07 free cash flow | composition `records`, panel setting, with a note | [compositions/records](../../compositions/records/) |
| p08 funding | composition `lanes`, panel setting, with a named note | [compositions/lanes](../../compositions/lanes/) |
| p09 leases | composition `rail`, panel setting, bars beside figure panels | [compositions/rail](../../compositions/rail/) |
| p10 exposure | composition `records`, panel setting, a highlighted total | [compositions/records](../../compositions/records/) |
| p11 suppliers | composition `rail`, panel setting, columns beside figure panels | [compositions/rail](../../compositions/rail/) |
| p12 power | face `image-split`, `column: "panel"` (new) | [faces/image-split](../../faces/image-split/) |
| p13 markets | composition `figures`, panel setting, with a lead panel | [compositions/figures](../../compositions/figures/) |
| p14 recommendation | composition `table`, panel setting | [compositions/table](../../compositions/table/) |
| p15 ending | face `close-word-ending`, redrawn | [faces/close-word-ending](../../faces/close-word-ending/) |

The compositions read the `panel` setting from the face that offers them (`CompositionSetting` in [`src/layouts/compositions/shared.tsx`](../../../src/layouts/compositions/shared.tsx), the panel and its inks in [`panel.tsx`](../../../src/layouts/compositions/panel.tsx)). Every ink comes from the theme's tokens: the surface and border for the panel, the emphasis ink for the mark, the success and danger inks for direction, and the chart palette after its lead for unmarked series. The tests draw each form on ledger and on bulletin, ember and crayon.

## Decisions

Where the engine departs from the board, it does so on purpose, for these reasons.

1. No letter spacing anywhere. The board tracks the status bar by 0.5px, the kickers by 1px, the panel titles by 0.4px, the fact page's figure by −4px and the −56% by −2px. The PPTX export does not carry tracking, so drawing it in the preview would make the preview lie about the file.
2. The small type is the board's: 12px in the status bar, 13px in the title bars and the source, 14 and 15px for labels. All of it is below the engine's 16px floor and carries the `panel-spec` exemption by name, which the L1 audit and the corpus scan know.
3. A title bar's right side prints the unit the chart, table or timeline declares and nothing else. The board also wrote how the figures were counted there ("亿美元 · 现金口径 · 日历季度"). A chart has no field for that, and the deck already says it in its source line, so the sample's sources carry it ("现金口径，亚马逊为毛额，按日历季度"). A table or a timeline has no unit field, so its title carries the unit ("自由现金流（亿美元）").
4. The status bar is the page ground pressed toward the darkest ink, `#0B0F15` on ledger, where the board drew `#0B0E12`. It is computed from the theme's tokens so a fork recolours it.
5. The organization prints on the cover and the ending from `meta.organization`, and on the other pages only when the deck asks its footer for it (`footer.organization`), the rule every footer keeps. The sample asks for it, so every page carries it as the board does. The shared footer row then leaves the organization out.
6. The 96% cell on the cover reads "2026 年二季度资本开支占经营现金流" over "两年前 45%". The board put the period on the note's first line. A ticker cell keeps one line for its label and one for its note, so the period moved into the label.
7. The fact page's comparison bar prints "4,100", where the board wrote "约 4,100". A chart value is a number, and the approximation is stated in the note under the figure ("约 4,100 亿美元到约 7,325 亿美元") and on the cover.
8. The guidance dot plot's panel is named "2026 年指引：年内首次 → 7 月最新", built from the chart's `x_title` and its two series. The board wrote 「到」. An arrow reads the same in both languages and needs no grammar.
9. The supplier chart prints every category whole ("FY25Q2"). The board shortened the repeats to "Q2". The engine does not rewrite an author's labels.
10. The photo page's claim breaks after the colon ("瓶颈从芯片转向电力：" over "电网容量价格顶格，德州暂停并网"), where the board filled the first line to the comma. A balanced heading prefers the strongest break that keeps the lines even, as on every other theme.
11. A milestone title keeps a figure with its unit: 「Alphabet 发股」 over 「847.5 亿」, where the board broke 「847.5」 from 「亿」.
12. The fact page's figure steps down from 200px to 160, 128 and 96px when it does not fit its column, rather than running under the panel.
13. The ending splits an item written 「标签：说明」 at the colon and does not print the colon. The label declares it (`data-gloss-break`) so the content audit reads it back, as swiss settled.
14. Chart figures group four digits in this deck (「1,650」, 「3,291」), as the board does. A Chinese deck groups a four-digit figure when its author writes one grouped anywhere in the deck, and the sample's author writes 「7,325 亿美元」. GB/T 15835-2011 §5.1.1 allows a four-digit integer either way, and one deck now prints all its charts one way (`deckFigureStyle`), where it used to judge each chart by its own labels.
15. The conclusion page drops the large 「04」 the old points page drew in a circle. The board's numbered panels carry their numbers in the title bar.
16. A captioned photograph on the photo page keeps the photograph clean: the caption sits right above the source in the same 13px. The board drew no caption.
