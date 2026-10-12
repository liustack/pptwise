---
summary: 'The settled recap design system handed to a design tool together with the general design brief: one person accounting for their year as a ledger, the numbered section line, the heavy 32px claim, columns under a 2px rule, figures in DIN, the accent on what the speaker led, red beside a cross for the miss, the legend of who did what, boxes to tick, the type sizes, and the parts a new recap page starts from'
read_when:
  - drawing a recap page, face or composition that the 2026-10 board did not draw
  - changing anything recap paints, before opening the code
  - judging whether a recap page in a showcase or the gallery follows the board
---

# Designing for recap

recap was drawn to one approved board in October 2026, as the ledger one person keeps on their own year: a year-end review, a probation review or a promotion defence, in front of a manager, a review panel or an HR partner. Reviewers ask three things, did the target hold, how much of it was you, and what you want next, and every page answers one of them. This page states the rules that board settled, so the next page drawn for recap follows them without a new argument. Paste it into the design tool after [Design brief](./design-brief.md), which still holds every general rule (vector primitives, contrast, the safe area, what to attach). Where the two disagree, this page wins for recap: its measure runs from x80 to x1200, and its labels, legends, section line, source and footer are 11 to 15px. The board, its source and every place the engine departs from it on purpose are in [`design/rounds/2026-10-13-recap/`](../design/rounds/2026-10-13-recap/README.md).

## Palette

Take the colours from `pptwise themes --json`, not from this page. For reading the rules below:

| role | token | value |
| :-- | :-- | :-- |
| the paper | `bg` | `#FFFFFF` |
| claims, figures, the 2px rule that opens a column | `text` | `#15191E`, ink |
| labels, units, notes, the footer | `muted` | `#5B6470`, grey |
| hairlines between rows | `border` | `#D9DDE2`, never words |
| what the speaker led, the one figure a page is about | `accent` | `#0B6E69`, deep teal |
| the section number and legend words | the accent at three quarters | about `#08534F` |
| the row a page is about | the accent at 10% over the paper | about `#E7F1F0` |
| what went wrong | `danger` | `#B42318`, always beside a cross or a red bar |
| actual bars | `chartPalette[1]` | `#2E353D`, graphite |
| the team's and last year's bars | `chartPalette[2]` | `#9AA3AE`, never words |

The accent goes to two things only: what the speaker led, and the one figure the page is about. Red goes only to what went wrong, and always has a shape beside it, so the page still reads when a brand colour turns the accent red. There are no cards and no serif anywhere.

A brand colour replaces the accent (`theme fork recap --brand`, `brand extract`). The close's block takes white or the ink, whichever reads, and a colour too middling for either is moved until one does. A brand colour too light for words on white is darkened for words and figures by size, and the legend squares keep 3:1.

## The section line, the claim and the footer

- Every content page: on y72 at the left, the part's number as two figures (「02」) at 16px in the deep accent, 10px of air, and the part's name at 14px in the grey tracked 0.14em. The author writes the deck's parts once as `course.stages` and each page's part as its `stage`.
- The claim heavy at 32/45 in the ink from y84, across the whole measure, on one line whenever it fits and at most two.
- The body runs under the claim to y620. A source at 13/20 in the grey from y640.
- The footer row on content pages at y688: the deck's label at 12px in the grey at the left (「示例人物，姓名和数据均为虚构」 on the sample), a photograph's credit after it, and at the right the speaker and the occasion (「周启航 · 2026 年度述职」) at 12px in the grey and the page number at 14px in the figure face in the ink, PowerPoint's slide-number field. When a photograph bleeds off one side, the row keeps to the column it leaves.
- The cover, the chapters and the close draw their own footer row.

## Columns, figures and the legend

- A column opens under a 2px rule of the ink, its rows under pale hairlines. A table's header is small grey words over that rule.
- Every figure is in DIN (Bahnschrift in the export), its unit after it in the body face at about a third of its size, a currency before it (`RMB 31m`).
- Who did what is a legend of small marks before a few words: a filled square of the accent for the speaker's own (「我牵头」), an empty grey square for the team, a red cross for a mistake (「我的失误」), a tick for done, an empty dark box for awaiting approval (「待批」).
- What the reviewers must decide is printed as an empty box to tick, never as a button.
- One block a page at most is filled whole with the accent, its words white or the ink.
- Photographs bleed off one side the full height of the page, or across the top of the cover. They are the work, not the speaker: a skyline, a warehouse, a store floor, a whiteboard, a team at a table. No readable text and no logos.

## Type

Headings and body are Microsoft YaHei (PingFang SC in the macOS preview). Figures are Bahnschrift, previewed as DIN Alternate. Weight does the work: heavy for claims and titles, bold for figures and row titles, regular for sentences.

| text | size |
| :-- | :-- |
| a chapter's number | 120 bold figure |
| the one figure a page lands on | 132 to 168 bold figure |
| figures in a row of facts | 40 to 60 bold figure |
| the close's commitment | 50 heavy, down to 44 |
| the cover's conclusion, a chapter's title | 44 heavy |
| the year in one line | 48 heavy |
| claim | 32/45 heavy |
| a row's title | 16 to 19 bold |
| words in a row | 14 to 17 |
| section line | 14, its number 16 |
| labels, legends, units, footer, source | 11 to 13 |

## How the author's marks are drawn

| the author marks | how it is drawn |
| :-- | :-- |
| a page's part (`stage`, with `course` on the deck) | the section line, numbered |
| the speaker's own (`highlight` on a row, a `tag` on a fact or a step) | the accent and a filled square, 「我牵头」 |
| the team's (`tag` with `quiet`) | an empty grey square |
| a mistake (`tone: "danger"`) | red beside a cross |
| done or awaiting approval (`tone: "success"`, `"warning"`) | a tick, or an empty dark box |
| the figure a page lands on (`**…**` around a value) | in the accent |
| a miss in a scorecard (`status: "off_track"`) | its figure in red, its bar in graphite |
| next year's targets (`status: "target"` on a series) | dashed boxes on the accent's tint with their increase |
| the phase that comes first (`emphasis` on a roadmap phase) | its bar filled with the accent |
| what the reviewers decide (`ballot.choices`, a checklist on the close) | empty boxes to tick |

## Where a new page starts

Before drawing, find the closest part in [Reusable parts](./reusable-parts.md#recap-channel-sales-year-end-review-sample-2026-10). recap's content pages are `account-sheet`, which hands its body to a composition in the account setting: `gist` for the year in one line, `reckoning` for target against actual, `credit` for where the growth came from, `casefile` for a piece of work beside a photograph, `relay` for a year of the speaker's and the team's milestones, `drawdown` for one figure moved, `headcount` for the team, `postmortem` for the miss, `deltas` for before and after, `stretch` for next year's target, `sequence` for the plan by quarter and `requests` for the asks. The cover is `account-cover`, a part `account-chapter`, the close `account-ending`. A new page is usually a new composition in the account setting, drawn under the section line and the claim: a 2px rule, DIN figures, the accent on what the speaker led.

A content page none of the compositions takes is drawn by the component renderer under the same section line and claim.
