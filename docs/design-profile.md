---
summary: 'The settled profile design system handed to a design tool together with the general design brief: a magazine profile of one person before a panel, the section line, the 34px serif claim, open columns under hairlines, serif figures, one accent a page, the bled photograph, the footer row with the speaker''s name, the type sizes, and the parts a new profile page starts from'
read_when:
  - drawing a profile page, face or composition that the 2026-10 board did not draw
  - changing anything profile paints, before opening the code
  - judging whether a profile page in a showcase or the gallery follows the board
---

# Designing for profile

profile was drawn to one approved board in October 2026, as a magazine profile of one person: a candidate with a few minutes in front of a hiring panel, a promotion board or a review committee, from who they are and what they have done to the gaps they name and what they will do first. This page states the rules that board settled, so the next page drawn for profile follows them without a new argument. Paste it into the design tool after [Design brief](./design-brief.md), which still holds every general rule (vector primitives, contrast, the safe area, what to attach). Where the two disagree, this page wins for profile: its measure runs from x80 to x1200, and its dates, notes, section line, source and footer are 11 to 16px. The board, its source and every place the engine departs from it on purpose are in [`design/rounds/2026-10-12-profile/`](../design/rounds/2026-10-12-profile/README.md).

## Palette

Take the colours from `pptwise themes --json`, not from this page. For reading the rules below:

| role | token | value |
| :-- | :-- | :-- |
| the paper | `bg` | `#FFFFFF` |
| a warm band under a closing check | `surface` | `#F5F2EE` |
| claims, names, figures, the first hairline of a column | `text` | `#1D1B1A`, ink |
| running words a step quieter | the grey 57% over the ink | about `#4A4540` |
| dates, labels, notes, the footer | `muted` | `#6B655E`, grey |
| hairlines between rows | `border` | `#DCD6CE`, never words |
| the one thing a page is about | `accent` | `#6E2C57`, aubergine |
| bars that are not the page's | `chartPalette[2]` | `#B9B0A6`, warm grey, never words |
| the row a page is about | the accent at 8% over the paper | about `#F3EEF2` |

The accent lights the section line's rule and exactly one thing a page: the result, row, bar or block the page is about. Everything else is the ink, the grey and hairlines. There are no cards.

A brand colour replaces the accent (`theme fork profile --brand`, `brand extract`). A block filled whole in it takes white or the ink, whichever reads, and a colour too middling for either is moved toward the side that reads better until one does.

## The section line, the claim and the footer

- Every content page: from y64 at the left, a 28px rule of the accent 2px thick and, 12px after it, the part of the talk at 16px in the accent, tracked wide. The author writes the deck's parts once as `course.stages` and each page's part as its `stage`. The engine numbers it: 「一　我是谁」, "1 Who". A page with no `stage` may write its own words as `kicker`.
- The claim bold in the heading serif at 34/48 in the ink, 14px under the section line, across the whole measure, on one line whenever it fits and at most two.
- The body runs under the claim to y620, or to y624 over a source on its own line. A source at 13/20 in the grey from y640.
- The footer row on content pages at y685: the deck's label at 12px in the grey at the left (「示例人物，姓名和数据均为虚构」 on the sample), a photograph's credit after it, and at the right the speaker's name at 12px in the grey and the page number in the serif at 14px in the ink (PowerPoint's slide-number field, so 「2」 and not 「02」). When a photograph bleeds off one side, the row keeps to the column it leaves.
- The cover, the section pages and the close draw their own footer row.

## Columns, figures and the accent

- Columns are open: the first under a hairline of the ink, the rows between under pale hairlines, a last pale hairline under them. A table's header is small grey words tracked wide over a 2px rule of the ink.
- A figure is bold in the heading serif, its unit after it at about 40% of its size, its label beside or under it and its note smaller in the grey. The figure the page is about (`**…**` around the whole value, or the marked row) is in the accent.
- One block a page at most is filled whole with the accent, its words white or the ink.
- A verdict is a word after a symbol: a ringed tick in the ink for what is met, a dashed ring in the grey for what is still to do, a ringed cross for a risk.
- Photographs bleed off one side the full height of the page, or across the top 210px. They are the speaker and their work: a portrait, the front of house, the counter, a member's phone, the team at a table. No readable text and no logos, captioned 「图为 AI 生成的示意图」 when they are generated. On the close the portrait shrinks to a round avatar, a native ellipse with the picture cropped into it.
- Symbols are the built-in lucide icons, in the accent beside a row and in the ink in a table.

## Type

The heading serif is Times New Roman with SimSun for Chinese, so an English title and its quotation marks are set in Times New Roman. The body is Microsoft YaHei. Weight does the work: bold for claims, names, titles and figures, regular for sentences. The board's 500 is regular and its 900 bold.

| text | size |
| :-- | :-- |
| the speaker's name on the cover | 112 bold serif, down to 72 for a long name |
| a case's result | 120 bold serif |
| a phase's title on the ruler | 72 bold serif |
| the result beside bars | 104 bold serif |
| section title | 56/72 bold serif |
| figures in a column | 40 to 48 bold serif |
| the closing promise | 42 bold serif |
| the sentence in the speaker's own words | 38/59 serif |
| claim | 34/48 bold serif |
| a row's title, a post | 19 to 22 bold serif |
| words in a row | 15 to 17 |
| section line | 16 |
| dates, labels, notes, footer, source | 12 to 14 |

## How the author's marks are drawn

| the author marks | how it is drawn |
| :-- | :-- |
| a page's part (`stage`, with `course` on the deck) | the section line, numbered |
| the post held now (`highlight` and a `tag` on a milestone) | a 3px rule of the accent over its column, its figure and tag in the accent |
| the figure a page lands on (`**…**` around a `kpi_cards` value) | in the accent |
| the row a page is about (`emphasis` on a comparison or from_to row) | on the accent's tint, its icon, verdict and marked words in the accent, or its figure in the accent |
| a verdict (`tag` with a `tone` on a comparison row) | a word after a symbol for its kind of news |
| the bar the page argues from (`emphasis` on a point) | in the ink, the rest in the warm grey |
| a control group (`reference` on a bar chart) | a dashed line of the ink down the rows, named under them |
| the speaker's level and the role's (`harvey_balls` scores and `highlight`) | a radar and four dots a row, the verdict worked out in levels |
| a gap and when it closes (a label and a last cell written `what：detail`) | the part before the colon large, the rest under it |
| the phase the plan dwells on (`emphasis` on a roadmap phase) | the block filled with the accent |
| words in the speaker's voice (`**…**` in the credo's paragraph) | bold in the accent |

## Where a new page starts

Before drawing, find the closest part in [Reusable parts](./reusable-parts.md#profile-membership-product-manager-candidacy-sample-2026-10). profile's content pages are `portrait-sheet`, which hands its body to a composition in the portrait setting: `aside` for who the speaker is beside a photograph, `stations` for posts with one result each, `verdicts` for what a role asks against what was done, `casework` for a case from problem to result, `results` for figures beside a photograph, `uplift` for bars against a control group, `appraisal` for a self-assessment, `shortfalls` for gaps and how they close, `tenure` for the first days in phases, and `credo` for one sentence in the speaker's words beside their portrait. The cover is `portrait-cover`, a section page `portrait-chapter`, the close `portrait-ending`. A new page is usually a new composition in the portrait setting, drawn under the section line and the claim: open columns, serif figures, the accent once.

A content page none of the compositions takes is drawn by the component renderer under the same section line and claim.
