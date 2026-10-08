---
summary: 'The settled runway design system handed to a design tool together with the general design brief: the running order of a fashion show, the masthead with the show, the section and the exit number, the serif claim across the whole measure, one drop of crimson a page, pictures that argue and words that caption them, no cards, the type sizes, and the parts a new runway page starts from'
read_when:
  - drawing a runway page, face or composition that the 2026-10 board did not draw
  - changing anything runway paints, before opening the code
  - judging whether a runway page in a showcase or the gallery follows the board
---

# Designing for runway

runway was drawn to one approved board in October 2026, as a fashion design student's graduation review of a collection made from used jeans taken apart: a magazine cover, the parts of the review set as a running order, the figures the work rests on, three parts each opening on a photograph or on the looks in a row, each look on a page of its own, and what the collection can and cannot claim, closed with a bow. This page states the rules that board settled, so the next page drawn for runway follows them without a new argument. Paste it into the design tool after [Design brief](./design-brief.md), which still holds every general rule (vector primitives, contrast, the safe area, what to attach). Where the two disagree, this page wins for runway: its masthead runs across the top from x64 to x1216, its claim runs the whole measure, and its labels, captions, the masthead and the source are 10 to 15px. The board, its source and every place the engine departs from it on purpose are in [`design/rounds/2026-10-08-runway/`](../design/rounds/2026-10-08-runway/README.md).

## Palette

Take the colours from `pptwise themes --json`, not from this page. For reading the rules below:

| role | token | value |
| :-- | :-- | :-- |
| the paper | `bg` | `#F2F0EB`, show white |
| words, rules, numerals | `text` | `#191919`, the ink of the type |
| the stage: the bow, a dark photograph's veil | `primary` | `#141414`, show black |
| what is quieter: labels, notes, captions, the source | `muted` | `#646460`, stone grey |
| hairlines between rows | `border` | `#DCD9D0`, never words |
| the one thing a page is about | `accent` | `#B0483C`, crimson |
| words on the stage | `bg` | the paper |

One drop of crimson a page: the one figure or word the page is about, a marked look's number, a figure that moved. Everything else is the ink, the stone grey and hairlines. Nothing sits on a card.

## The masthead, the claim and the foot

- Across the top of every page, from y30: the show at the left, 10px in bold in the ink tracked 4px (the deck's `organization` and the footer's `label`, 「毕业设计 · 再穿一次」). The page's section at the right, 10px in the stone grey tracked 4px, ending on x1060 (the page's `kicker`). The page number at the far right at 13px in the serif (PowerPoint's slide-number field). A black hairline under them on y54. Over a dark photograph or the stage it is set in the paper.
- The claim: 34/44 in the heading serif at its regular weight, from x64 across the whole measure to x1216, its last line's box ending on y158. It stays on one line whenever it fits at a twelfth under its size or more, and breaks at a comma or a colon when it does not. A break the author wrote is kept. Its marked words are crimson.
- The source at the foot on y670, 10/14 in the stone grey, one line or two. A composition may set it lower under its pictures.
- The cover, the chapter pages and the bow draw their own masthead and carry no page number.

## Figures, rules and photographs

- A figure is set in the heading serif at its regular weight, its unit after it in the body sans, smaller, in the figure's ink. Two figures counted two ways stand apart at 150px with a hairline between them and are never drawn to one scale. Figures of one unit that are to be compared are drawn as lines to scale, the one that moved in crimson.
- Parts and steps are numbered as exits, 01 to 06, large in the serif: 96px over a black rule for the parts of a review, 40px under a dot on one hairline for steps.
- A list of particulars is a row each under a hairline: a small grey label tracked 3px and the words beside it.
- Photographs argue and words caption them: a caption is 10px in the stone grey tracked half a pixel, and every AI picture says so (「AI 生成示意」). A moodboard numbers its pictures in small white type over a soft dark fade. A group photograph shows each of its people in a window of their own through `crop`.
- Symbols are the built-in lucide icons in the ink at a fine stroke.

## Type

The heading face is Times New Roman with SimSun (the board was set in Didot and Bodoni 72 with Songti SC), for the claim, names, numerals and figures. The body face is Microsoft YaHei (PingFang on the board) for labels, notes, captions, the masthead and the source. Small Chinese labels are tracked 3 to 8px as the board tracks them. A line with lower-case Latin is tracked a quarter as wide. Capitals keep the tracking.

| text | size |
| :-- | :-- |
| a chapter's numeral | 240, or 150 over its looks |
| the cover's name | 150 |
| two figures set apart | 150 |
| a look's number | 130 |
| the closing words | 110 |
| a part's number | 96 |
| a figure to scale | 76 |
| the statement's claim | 52 |
| a figure under a standfirst | 50 |
| a chapter's title | 48, or 40 over its looks |
| a look's name | 40 |
| the claim | 34/44 |
| a moodboard's line, a grade's name | 26 to 28 |
| a part's or a way's name, a side's name | 24 to 26 |
| the verdict | 20 |
| a figure's label, a step's name, a particular | 16 to 17 |
| a line on a part, a step or a grade | 12 to 14 |
| labels, captions, the masthead, the source | 10 to 11 |

## How the author's marks are drawn

| the author marks | how it is drawn |
| :-- | :-- |
| the show (`organization`, `footer.label`) | at the left of the masthead on every page |
| a page's section (`kicker`) | at the right of the masthead. On a chapter page the part, 「第 N 部分」 when it names none |
| the one thing a page is about (`**…**` in a claim or a figure, `emphasis` on a part, `emphasis: "first"` on a row of looks) | crimson |
| a figure that moved (`delta` on one of two or three figures of one unit) | its line and figure crimson, the lines drawn to scale |
| a look's number (`insight_panel.title`, 「LOOK **01**」) | huge in the serif, the word small and tracked under it, crimson when marked |
| the part of a picture to keep (`crop`) | the picture cropped to it in its frame |
| the cover's tag (`tag`) | small in crimson under the line |
| the source (`footnote`) | at the foot, or under the pictures |

## Where a new page starts

Before drawing, find the closest part in [Reusable parts](./reusable-parts.md#runway-graduation-collection-review-sample-2026-10). runway's content pages are `lineup-sheet`, which hands its body to a composition in the lineup setting: `order` for the parts of a review, `standfirst` for a claim set large over its figures, `duet` for two figures never added, `lengths` for figures of one unit drawn to scale, `collage` for a moodboard, `thread` for steps over their photographs, `shades` for a picture bracketed into grades, `atelier` for a sample beside the ways it was made, `parade` for the looks in a row, `look` for one look on a page of its own and `bounds` for what the work did and did not do. The cover is `lineup-cover`, a part's opening `lineup-chapter`, the close `lineup-ending`. A new page is usually a new composition in the lineup setting, handed the whole page: paper, the ink, hairlines, one drop of crimson, a serif claim across the measure.

A content page none of the compositions takes is drawn by the component renderer under the same masthead, claim and source.
