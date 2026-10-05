---
summary: 'The settled memo design system handed to a design tool together with the general design brief: the typed memorandum, the running head and folio, the margin label, the claim in a serif over a rule of ink, Courier New for figures, dates, labels and sources, photographs pasted in as numbered exhibits, the stamp, the mark once a page, the type sizes, and the parts a new memo page starts from'
read_when:
  - drawing a memo page, face or composition that the 2026-10 board did not draw
  - changing anything memo paints, before opening the code
  - judging whether a memo page in a showcase or the gallery follows the board
---

# Designing for memo

memo was redrawn to one approved board in October 2026, as a typed memorandum: a decision written down by the people who made it, sent to the people it binds, and read later, alone. This page states the rules that board settled, so the next page drawn for memo follows them without a new argument. Paste it into the design tool after [Design brief](./design-brief.md), which still holds every general rule (vector primitives, contrast, the safe area, what to attach). Where the two disagree, this page wins for memo: its type area runs from x64 to x1216 with the body from x240, and its running head, folio, captions, labels, tags and source are 12 to 15px. The board, its source and every place the engine departs from it on purpose are in [`design/rounds/2026-10-05-memo/`](../design/rounds/2026-10-05-memo/README.md).

## Palette

Take the colours from `pptwise themes --json`, not from this page. For reading the rules below:

| role | token | value |
| :-- | :-- | :-- |
| page | `bg` | `#F6F1E7`, memo paper, on every page type |
| a panel, a print's pad | `surface` | `#FBF8F1` |
| hairlines | `border` | `#E4DFD2` |
| words, the rule under the claim, the verdict banner | `text` | `#221E18` |
| labels, notes, the source, the folio | `muted` | `#675E51` |
| the one mark | `accent` (the emphasis ink) | `#A63A2B`, the seal red |
| under the row a page lands on | the mark over the paper at 8% | about `#F1E1DA` |
| what steps back | the muted ink over the paper at 45% | about `#B9AE9C` |
| good news only | `success` | `#3F5E48` |
| unmarked series, in order | `chartPalette` | `#221E18`, `#4A5864`, `#7A6248`, then the red |

The red is the furniture (the running head, the margin label, item numbers) and, once a page, what the page is about. Green says a share got better. Nothing else is coloured.

## The running head, the margin and the claim

- Every page but the cover: MEMORANDUM at 12px bold Courier New, 6px apart, in the red at x64, over a red double rule, 2px at y48 and 1px at y53, from x64 to x1216.
- On content pages of a deck with a footer: the memo's subject (the deck's footer `label`) typed at the top right in 12px muted mono, and the folio at the foot, the issuing office at the left and 「第 N 页 共 M 页」 ("Page N of M") at the right, 12px muted mono. The chapter page and the sign-off carry the head without them.
- The margin column, x64 to x214, holds the section's label: the page's `kicker`, 22/30 bold Song in the red, over a 24 by 2 red bar. Write it in two to four characters (「理由」「代价」「停止」).
- The claim bold in Song at 31/42 from x240 across 976px, at most two lines, its last line ending at y158. It stays on one line whenever it fits. When it does not, it breaks at the last comma that keeps the first line full, and a line is never broken early to even the two. A 1px rule of ink under it at y170.
- The body runs from y186 to y640. The source at 12/16 in the muted ink from y650, up to two lines, written as the author writes it (「来源：…」).

## Paper, prints and the stamp

- Photographs are pasted in as exhibits: a white print with an 8px border and 30px under the picture, where 「附图 N · 说明（示意）」 ("Exhibit N · …") is typed in 12px mono, turned a degree or two, a small flat shadow down and right. Exhibits are numbered across the deck in the order they appear. Pictures carry no readable text and no real logos.
- A panel is the lifted paper with a 1px hairline edge, square. A pad for working a sum is ruled every 48px.
- The stamp: 「已决定」 ("Decided") in bold Song with its characters spaced, the date in mono under it, inside a 3px red outline 150 by 74, turned six to eight degrees and pressed a little faint. Only the cover and the sign-off are stamped.
- Tags are square outlines typed in 12px bold, one quiet ink per kind of source, the marked row's tag in the red. A filled red tag marks the pick (「客服用这个」).
- Symbols are the built-in lucide icons, in the red, set wherever a field takes one.

## Type

Song bold for claims, titles, figures the page argues from and decisions (Times New Roman with SimSun in PowerPoint). Courier New for figures typed as a typewriter types them, dates, labels, tags, captions and sources. PingFang or Microsoft YaHei for sentences.

| text | size |
| :-- | :-- |
| cover title | 60/80, bold Song |
| sign-off decision | 40/56, bold Song, its clauses 26/40 after 34px red numerals |
| claim | 31/42, bold Song |
| margin label | 22/30, bold Song, red |
| clause numerals | 30 to 36, bold Song, red |
| figures the page argues from | 40 to 52 bold Song, an answer up to 110, in the red when marked |
| titles in rows and tables | 17 to 22 |
| body, notes | 14 to 18 |
| a quoted original | 24/36 mono |
| running head, folio, captions, labels, tags, source | 12 to 15, mono or muted |

## How the author's marks are drawn

| the author marks | how it is drawn |
| :-- | :-- |
| a clause (`emphasis` on `numbered_cards`) | the row on the red's tint, its title in the red |
| a table row (`emphasis: "highlight"` on a `data_table` row) | on the red's tint, its figure and tag in the red |
| a figure (`**…**` around a `kpi_cards` value) | in the red, its neighbours in the quiet grey |
| a series (`emphasis` on a chart series) | a solid red line with its values in bold mono, the others dashed and quiet |
| who got better and who got worse (`tone` on chart series) | green to the left of the middle, red to the right |
| the column a page is about (`emphasis` on a point of a stacked chart) | its name in the red and its share larger |
| who the pick is for (`recommended_label` on `comparison`) | a filled red tag after the option's name |
| a source's kind (`tag` on a `data_table` row) | an outlined tag in its own quiet ink |
| a milestone (`highlight`) | its row on the red's tint, its date and title in the red |
| a stretch of a calendar (`emphasis` on a gantt item) | its bar in the red, those before it brown, those after it in ink |
| a run of text (`**…**`) | the red |

## Where a new page starts

Before drawing, find the closest part in [Reusable parts](./reusable-parts.md#memo-four-day-week-decision-sample-2026-10). memo's content pages, photo and evidence pages included, are `memo-sheet`, which hands its body to a composition in the memo setting: `rows` for numbered clauses, `annex` for a body beside a pasted-in photograph with a remark, evidence rows or a figures panel under it, `tallies` for reasons with their figures, `slopes` for before and after of two groups, `diverging` for who got better and who got worse, `citation` for a quoted original and what it means, `records` for a table of figures with source tags or a table of duties, `scales` for a weighing with its verdict, `catalog` for options under their photographs, `rota` for who is in on which day, `sum` for a sum worked on ruled paper, `schedule` for a calendar over its dates and `checks` for stop conditions. The cover is `memo-cover` with its header lines (`fields`) and `stamp`, the sign-off `memo-ending` with its sign-off lines and stamp. A new page is usually a new composition in the memo setting, drawn inside the band from y186 to y640: open tables on hairlines, typed figures, a print pasted in, the red once.

The statement page keeps `statement` and the chapter page `issue-line-chapter`, under the new running head. Neither had a board in this round, and each needs its board before it changes.
