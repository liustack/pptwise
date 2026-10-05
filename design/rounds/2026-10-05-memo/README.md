# memo, four-day week decision sample, 2026-10-05

The round that redrew memo to one approved board: a sixteen-page Chinese and English decision memo from management and human resources to all staff ("四天工作制试点 · 决定"), announcing a six-month trial of a 32-hour week at full pay from January 2027, the evidence behind it from the UK, German, Portuguese and Brazilian pilots, the arithmetic it needs, the rota, the calendar, the stop conditions and who does what. It turned memo into a typed memorandum: MEMORANDUM over a red double rule on every page, the section's label in red in the left margin, the point in a serif over a rule of ink, figures, dates, labels and sources typed in Courier New, photographs pasted onto the page as numbered exhibits, and a stamp on the cover and the sign-off. It settled a content page that hands its body to the compositions in a new `memo` setting, eleven new compositions, memo forms of `rows` and `records`, a cover, a sign-off and a new motif.

## Source

- `design-gen.py` writes every board page as absolutely positioned HTML at 1280 by 720. It is the only source of the boards' geometry. Its photograph references are placeholders the design tool filled in, so the script records the boards rather than rebuilding them outside that tool.
- The `memo*.board.png` files in the part folders are those pages rendered at 1280 by 720 in a browser. The `memo*.engine.png` files are `pptwise preview` of the Chinese showcase deck ([showcase/memo/zh](../../../showcase/memo/zh/)), rasterized with `rsvg-convert`. The board and the engine show the same deck, so the words match as well as the drawing, except where the decisions below say otherwise.

## The design system

Every memo page follows these, not only the pages the sample uses. [docs/design-memo.md](../../../docs/design-memo.md) states them for the next round.

1. A running head on every page but the cover: MEMORANDUM at 12px bold Courier New, 6px apart, in the seal red at the top left, and under it a red double rule, 2px at y48 and 1px at y53, from x64 to x1216. On content pages, when the deck asks for a footer, the memo's subject (the deck's footer `label`) is typed at the top right in 12px muted mono, and the folio at the foot: the issuing office at the left, 「第 N 页 共 M 页」 ("Page N of M") at the right, both 12px muted mono.
2. A margin column from x64 to x214 holds the section's label: the page's `kicker`, 22/30 bold Song in the red, over a 24 by 2 red bar.
3. The claim stands from x240 across the 976px measure, bold Song at 31/42, set on its last line so one line and two end on the same baseline, over a 1px rule of ink at y170. It stays on one line whenever it fits, and when it does not, it breaks at the last comma that keeps the first line full. The body runs from y186 to y640, the source at 12/16 in the muted ink from y650.
4. Colours: the paper `#F6F1E7`, a lifted panel `#FBF8F1`, ink `#221E18`, the seal red `#A63A2B`, muted `#675E51`, hairlines `#E4DFD2`, the red's pale tint `#F1E1DA` under the row a page lands on, a quiet grey `#B9AE9C` for what steps back, and the archive green `#3F5E48` only for good news. The red is spent once a page on what the page is about, beside the furniture (the head, the margin label, item numbers).
5. Type: Song bold for claims, titles, figures and decisions (Times New Roman with SimSun in PowerPoint), Courier New for figures typed as a typewriter types them, dates, labels, tags and sources, PingFang or Microsoft YaHei for sentences.
6. Photographs are pasted in as exhibits: a white print with an 8px border and 30px under the picture, where 「附图 N · 说明（示意）」 is typed in 12px mono, turned a degree or two and casting a small shadow. Exhibits are numbered across the deck.
7. The stamp: 「已决定」 in bold Song with its characters spaced, the date in mono under it, inside a 3px red outline, turned six to eight degrees and pressed a little faint.
8. Figures the page argues from are large Song in the red. Figures that step back are in the quiet grey. Tags are square outlines typed in 12px bold, one ink per kind of source.

## Pages and the parts they settled

| board page | part | folder |
| :-- | :-- | :-- |
| every page but the cover | motif `memo-motif` (redrawn) | [motifs/memo-motif](../../motifs/memo-motif/) |
| every content page | face `memo-sheet` (new), compositions in the `memo` setting (new) | [faces/memo-sheet](../../faces/memo-sheet/) |
| p01 cover | face `memo-cover` (new), header lines and a stamp from the page's `fields` and `stamp` | [faces/memo-cover](../../faces/memo-cover/) |
| p02 decision | composition `rows`, memo setting, across the body | [compositions/rows](../../compositions/rows/) |
| p03 reasons | compositions `annex` (new) with a remark, and `tallies` (new) | [compositions/annex](../../compositions/annex/), [compositions/tallies](../../compositions/tallies/) |
| p04 wellbeing | composition `slopes` (new) | [compositions/slopes](../../compositions/slopes/) |
| p05 cost | composition `diverging` (new), with `tone` on chart series and a marked point on a `percent_stacked` chart | [compositions/diverging](../../compositions/diverging/), [components/chart](../../components/chart/) |
| p06 revenue | composition `citation` (new) | [compositions/citation](../../compositions/citation/) |
| p07 staying power | composition `records`, memo setting, a table of figures, with `tag` on `data_table` rows | [compositions/records](../../compositions/records/), [components/data_table](../../components/data_table/) |
| p08 weighing | composition `scales` (new) | [compositions/scales](../../compositions/scales/) |
| p09 three models | composition `catalog` (new), with `recommended_label` on `comparison` | [compositions/catalog](../../compositions/catalog/), [components/comparison](../../components/comparison/) |
| p10 coverage | compositions `annex` with evidence rows, and `rota` (new) | [compositions/rota](../../compositions/rota/), [compositions/annex](../../compositions/annex/) |
| p11 arithmetic | composition `sum` (new) | [compositions/sum](../../compositions/sum/) |
| p12 process | compositions `annex` with a figures panel, and `rows` beside it | [compositions/annex](../../compositions/annex/), [compositions/rows](../../compositions/rows/) |
| p13 calendar | composition `schedule` (new) | [compositions/schedule](../../compositions/schedule/) |
| p14 stop conditions | composition `checks` (new) | [compositions/checks](../../compositions/checks/) |
| p15 duties | composition `records`, memo setting, a table of duties | [compositions/records](../../compositions/records/) |
| p16 sign-off | face `memo-ending` (new) | [faces/memo-ending](../../faces/memo-ending/) |

The compositions read the `memo` setting from the face that offers them (`CompositionSetting` in [`src/layouts/compositions/shared.tsx`](../../../src/layouts/compositions/shared.tsx)). The inks, the baselines of the three faces, the fitting of text at its exact size, the tags, the tracked type and the title fit are in [`memo.tsx`](../../../src/layouts/compositions/memo.tsx), the exhibit in [`exhibit.tsx`](../../../src/layouts/compositions/exhibit.tsx), the stamp in [`stamp.tsx`](../../../src/layouts/compositions/stamp.tsx), the margin label in [`margin.tsx`](../../../src/layouts/compositions/margin.tsx). Every ink comes from the theme's tokens: the emphasis ink for the mark, the success ink for good news, the border for hairlines, the chart palette for the quiet kinds of a tag. The tests draw each composition on memo and on terminal and crayon.

## Decisions

Where the engine departs from the board, it does so on purpose, for these reasons.

1. Exhibits are numbered in the order they appear in the deck, counted by the face: the coverage page's headset is 附图 6 and the process page's stand-up is 附图 7. The board numbered them the other way round.
2. The chapter page and the sign-off carry the running head's MEMORANDUM and double rule, but no subject and no folio. The engine prints footer marks on content pages only, across every theme, and the subject moved up from the footer row. The board drew a folio on the sign-off too.
3. The exhibit's shadow is one flat shape, 1px right and 3px down, the ink over the paper at 14%. The board's was a soft blur, which nothing in PowerPoint's shape subset keeps.
4. The exhibits and the stamp are turned in PowerPoint as they are in the preview: each shape and picture carries its own rotation round the print's centre, so the photograph stays a picture, cropped and editable.
5. Titles in Song set their Latin and figures in Times New Roman in PowerPoint (SimSun's Latin is too thin and too narrow), so 「32 小时」 reads a little heavier than the board's Songti.
6. Mono is measured at 0.602em, Courier New's 0.6em with a hair to spare, so typed lines never run past their box in PowerPoint.
7. The small type is the board's: the running head and folio at 12px, captions, labels, tags and sources at 12 to 15px. Everything under the engine's 16px floor carries the `memo-spec` exemption by name, which the L1 audit and the corpus scan know.
8. The mark's tint and the quiet grey are derived from the tokens (the red over the paper at 8%, the muted ink over the paper at 45%), close to the board's `#F1E1DA` and `#B9AE9C`, so a fork that recolours the mark keeps them right.
9. The cost page prints every share, the unchanged ones inside their grey bars, and the wellbeing page prints both ends of the control group's lines. The board left a few of those out where they crowded. Nothing the author wrote is left off the page.
10. The calendar keeps the year as the author wrote it under its column, 「2026 年」 and 「2027 年」.
11. The revenue page sets the meaning in the column left of the figures panel, so the Chinese meaning takes two lines where the board's took one.
12. The cost page's names column is the board's 100px, wider when a name needs it (up to a fifth of the band), and the stop conditions page's kind column is the board's 86px, wider for a longer kind (up to 160px). Both are for the English deck, whose words are longer.
13. The cover's exhibit caption is cut when it is too long for its print, and says so to the audit. A cover cannot step aside.
14. The statement page and the chapter page have no board in this round. They keep `statement` and `issue-line-chapter` under the new motif. The old faces `memo-head` and `decision-close-ending` stay registered for theme files that name them.
15. Memo's chart palette now runs ink, slate, brown and then red. With red second, any chart of two series painted its second series red whether or not it was the one the page was about.
16. Every board photograph was a sample image. The cover's was generated again for the showcase: empty desks on a Friday morning, no people, no writing, no logos.
