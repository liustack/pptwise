---
summary: 'The settled homeroom design system handed to a design tool together with the general design brief: one lesson, the step label and the course strip, the claim over the wavy line of the correcting pen, handout cards with a pill for the kind of every study, questions on ruled paper, stamped answers, the blackboard, the sticky note, the pen spent on what a page is about, the type sizes, and the parts a new homeroom page starts from'
read_when:
  - drawing a homeroom page, face or composition that the 2026-10 board did not draw
  - changing anything homeroom paints, before opening the code
  - judging whether a homeroom page in a showcase or the gallery follows the board
---

# Designing for homeroom

homeroom was redrawn to one approved board in October 2026, as one lesson: a class a training team runs for the whole company, taught from a handout and a blackboard, with quizzes the room answers by hand and homework to do before the next session. This page states the rules that board settled, so the next page drawn for homeroom follows them without a new argument. Paste it into the design tool after [Design brief](./design-brief.md), which still holds every general rule (vector primitives, contrast, the safe area, what to attach). Where the two disagree, this page wins for homeroom: its type area runs from x64 to x1216, and its step label, course strip, pills, captions, labels, folio and source are 12 to 15px. The board, its source and every place the engine departs from it on purpose are in [`design/rounds/2026-10-06-homeroom/`](../design/rounds/2026-10-06-homeroom/README.md).

## Palette

Take the colours from `pptwise themes --json`, not from this page. For reading the rules below:

| role | token | value |
| :-- | :-- | :-- |
| page | `bg` | `#ECF0F2`, misty handout paper, on every page type |
| a card, ruled paper | `surface` | `#F9FBFC` |
| hairlines, card edges | `border` | `#D3DBE0`, never words |
| words | `text` | `#23282E` |
| labels, notes, the source, the folio | `muted` | `#5A6470` |
| the mark: the course, icons, labels over a section, the plain pill | `primary` | `#4A6B8A`, misty blue |
| the correcting pen: the wavy line, question numbers, what a page is about | `accent` | `#B96A5E`, made darker under 24px until it reads |
| a journal's study, a yes | `success` | `#55704A` |
| a working paper's or a vendor's study, a not yet | `warning` | `#9A7318` |
| a no | `danger` | `#A04A38` |
| the blackboard | the primary darkened | about `#3E5A74` |
| a tip's box, an icon's disc, a range's track | the mark over the paper at 15% | about `#DCE5EC` |
| what a page reads against | the mark and muted, half and half, over the page at 33% | about `#B9C4CC` |
| a sticky note | the warning ink's hue at 92% lightness | about `#FBF3D9` |

The pen is spent on what a page is about: one study, one bar, one part of the class, one case's consequence. The blue is the furniture. Green and amber only say how firm a finding is or which way a verdict goes.

## The head, the claim and the foot

- Every page but the cover: the page's `kicker` at 13px bold in the blue at the top left, x64, its characters a pixel apart (「环节一 · 它在哪儿帮忙」, "Part 1 · Where it helps"). Write it as the part and the topic.
- At the top right, ending at x1216, the deck's `course` as a row of pills 22px tall, 12px words. The page's `stage` filled in the blue with its name bold in white, the others outlined in the ghost with their names muted, a quiz stage (`quiz: true`) dashed. Seven stages fit: 目标, 环节一, 小测一, 环节二, 环节三, 小测二, 小结.
- The claim bold at 30/42 from x64 across 1152px, at most two lines, its last line ending at y152. It stays on one line whenever it fits. When it does not, it breaks at a comma, and a line is never broken early to even the two. Under it the pen's wavy line, 108px from x64 at y162, quarter waves 12px long and 4px high.
- The body runs from y196 to y640. The source at 12/16 in the muted ink from y648, up to two lines, written as the author writes it (「来源：…」, 「依据：…」).
- On content pages of a deck with a footer, the folio at y686: the office and the course (the deck's footer `label`) at the left, 「N / M」 at the right, 12px muted. The part pages and the homework carry none.

## Cards, paper and the board

- A card is the surface over a 1px hairline, rounded 10px, its icon in the blue. A card a page is about takes a 4px top edge in the pen. A tip sits in a box of the blue's tint with its icon at the left; a caution in a dashed outline of the pen.
- Every study, survey and law carries a pill, 12px bold in a rounded outline: a journal's (`evidence: "trial"`) in green, a working paper's (`preprint`) or a vendor's (`company`) in amber, a provision of law (`basis: "law"`) in the pen after the word 「依据」 ("Basis"), anything else in the blue.
- Questions and homework are set on ruled paper with a red margin 56px in, the number in the pen in the margin on the first line's baseline. The rules fall every 32px on a question (half a task's height on the homework), each just under a line of writing, clear of its descenders by 4px: no rule runs through a word, and a rule a line of writing cannot clear is left out. A stamp is pressed over the paper and the rules stop 4px short of it. Boxes to tick are empty 18 to 26px squares outlined in the blue.
- An answer is a stamp turned a few degrees, 2.5px outline: a tick for yes in green, a cross for no in red, a pause for not yet in amber, with the verdict's word.
- The blackboard is the primary darkened, framed or ledged in 8px of wood, words on it in white or pale chalk, the pen as a pale red wavy line.
- A sticky note is pale yellow, turned a degree or two, over a small flat shadow.
- Photographs are the class: a training room, hands, a desk, a whiteboard, no readable text, no logos, cropped square at the corners, captioned 「示意图：…（AI 生成）」 when they are generated.
- Symbols are the built-in lucide icons, in the blue (the pen on the one thing a page is about), set wherever a field takes one.

## Type

Microsoft YaHei for everything (PingFang on the board). Weight does the work: bold for claims, titles, figures and names, regular for sentences.

| text | size |
| :-- | :-- |
| cover title | 50/68 bold, white on the board |
| part title | 46/64 bold, white on the band |
| homework title | 40/56 bold |
| claim | 30/42 bold |
| words on the blackboard | 34 bold, white |
| figures on cards | 30 to 60 bold, the marked one in the pen |
| card titles, goal and rule names | 19 to 23 bold |
| a question, a case | 15 to 17 |
| sentences, notes | 13 to 15 |
| step label, course strip, pills, captions, labels, folio, source | 12 to 15 |

## How the author's marks are drawn

| the author marks | how it is drawn |
| :-- | :-- |
| where the class is (`stage` on a page) | that stage filled in the blue on the course strip |
| a study the page leads with (`**…**` around a `kpi_cards` value) | its top edge and figure in the pen |
| the bar a page is about (`emphasis` on a chart point) | in the pen, its name and figure too, the rest in the ghost |
| a value known only as a range (`upper` on a chart point) | solid to its low end, dashed on over the pen's tint to its high end, both ends named |
| the measurement against the expectations (`emphasis` on the last point) | a red dot on a heavy stem, a dashed bracket in the pen to the expectation before it |
| the part of the class a page is about (`emphasis` on a roadmap item) | its stretch of the bar and its card's edge in the pen |
| a check at the end of a part (`checkpoint` on a roadmap item) | a ringed question mark where the part ends on the bar, a pill with a question mark on the card |
| a verdict (`tone` on an answer's `row_cards` item) | the stamp's ink and icon: green tick, red cross, amber pause |
| the word to remember (`highlight` on a recap item) | the pen's wavy line under it on the board |
| how guarded a level is (`tone` on pyramid levels) | the band and its card's edge in red, amber or green |
| how firm a finding is (`evidence` on a tag) | the pill's ink: green, or amber |
| a run of text (`**…**`) | the pen |

## Where a new page starts

Before drawing, find the closest part in [Reusable parts](./reusable-parts.md#homeroom-ai-at-work-training-sample-2026-10). homeroom's content pages are `lesson-sheet`, which hands its body to a composition in the lesson setting: `objectives` for what the class will be able to do, `syllabus` for the class laid out by the minute, `studies` for what each study found with its kind, `cohorts` for who gains most, the weaker against the stronger, `diptych` for two studies side by side, `estimates` for what people expected against what was measured, `quiz` for questions the room answers by ticking, `answers` for the same questions stamped, `cases` for what happened and who paid, `ranking` for how many do each thing with one broken down, `rules` for house rules with what they rest on, `tiers` for levels with what to do at each, `methods` for methods under their photographs with the line to remember, and `blackboard` for the recap. The cover is `lesson-cover`, the part page `lesson-chapter`, the homework `lesson-ending` with its `stamp`. A new page is usually a new composition in the lesson setting, drawn inside the band from y196 to y640: handout cards over hairlines, a pill on every study, the pen once.

A content page none of the compositions takes is drawn by the component renderer in the same band, under the same head. homeroom's menu offers no statement, quote, big-number or single-evidence page: a class does not shout slogans. Each needs its board before homeroom takes it.
