# homeroom, AI-at-work training sample, 2026-10-06

The round that redrew homeroom to one approved board: a twenty-one-page Chinese and English all-staff class from a training department ("在工作中用好生成式 AI", "Using generative AI well at work"), forty-five minutes in three parts with two quizzes: what the published studies say generative AI helps with and where it backfires, three real cases and a staff survey on who pays when it goes wrong, the company's six rules and three working methods, then a recap on the board and the homework. It turned homeroom into one lesson: every page a step of the class, the step's label at the top left and the course strip at the top right, the claim underlined with the teacher's red pen, questions on ruled paper, answers stamped, the recap on a blackboard and the homework on a sticky note. It settled a content page that hands its body to the compositions in a new `lesson` setting, fourteen new compositions, a cover, a part page, a homework page, a redrawn motif, the deck's `course` with a page's `stage`, and fields on `chart`, `roadmap`, `pyramid` and the tag.

## Source

- `design-gen.py` writes every board page as absolutely positioned HTML at 1280 by 720. It is the only source of the boards' geometry. Its photograph references are placeholders the design tool filled in, so the script records the boards rather than rebuilding them outside that tool.
- The `homeroom*.board.png` files in the part folders are those pages rendered at 1280 by 720 in a browser. The `homeroom*.engine.png` files are `pptwise preview` of the Chinese showcase deck ([showcase/homeroom/zh](../../../showcase/homeroom/zh/)), rasterized with `rsvg-convert`. The board and the engine show the same deck, so the words match as well as the drawing, except where the decisions below say otherwise.

## The design system

Every homeroom page follows these, not only the pages the sample uses. [docs/design-homeroom.md](../../../docs/design-homeroom.md) states them for the next round.

1. The course strip: at the top right of every page but the cover, ending at x1216, the deck's `course` as a row of pills 22px tall (目标, 环节一, 小测一, 环节二, 环节三, 小测二, 小结). The page's `stage` is filled in the misty blue with its name bold in white, the others outlined in grey with their names muted, and a quiz stage is dashed.
2. The step's label and the claim: the page's `kicker` at 13px bold in the misty blue at the top left (「环节一 · 它在哪儿帮忙」, "Part 1 · Where it helps"), and the claim bold at 30/42 across the full measure from x64, on one line whenever it fits and broken at a comma when it does not, its last line ending at y152 either way. Under it the correcting pen's wavy line, 108px from x64 at y162.
3. The folio: on content pages, the office and the course (the deck's footer `label`) at the left of the foot and 「N / M」 at the right, 12px muted.
4. Colours: the page `#ECF0F2`, a card `#F9FBFC`, the misty blue `#4A6B8A`, the correcting red `#B96A5E`, ink `#23282E`, muted `#5A6470`, hairlines `#D3DBE0`, green `#55704A` and amber `#9A7318` for what kind of study a figure comes from, the board `#3E5A74`, the blue's pale tint `#DCE5EC` under a tip.
5. Every study says what kind of study it is in a small outlined pill: a journal's (`evidence: "trial"`) in green, a working paper's (`preprint`) or a vendor's (`company`) in amber, a law's (`basis: "law"`) in the red.

## Pages and the parts they settled

| board page | part | folder |
| :-- | :-- | :-- |
| every content page | motif `homeroom-motif` (redrawn) | [motifs/homeroom-motif](../../motifs/homeroom-motif/) |
| every content page | face `lesson-sheet` (new), compositions in the `lesson` setting (new), the deck's `course` and a page's `stage` | [faces/lesson-sheet](../../faces/lesson-sheet/) |
| p01 cover | face `lesson-cover` (new) | [faces/lesson-cover](../../faces/lesson-cover/) |
| p02 goals | composition `objectives` (new) | [compositions/objectives](../../compositions/objectives/) |
| p03 agenda | composition `syllabus` (new), with `duration`, `duration_unit`, `checkpoint` and `points` on `roadmap` | [compositions/syllabus](../../compositions/syllabus/), [components/roadmap](../../components/roadmap/) |
| p04, p11, p14 parts | face `lesson-chapter` (new) | [faces/lesson-chapter](../../faces/lesson-chapter/) |
| p05 four studies | composition `studies` (new), with `evidence: "preprint"` on a tag | [compositions/studies](../../compositions/studies/), [components/tag](../../components/tag/) |
| p06 beginners | composition `cohorts` (new) | [compositions/cohorts](../../compositions/cohorts/) |
| p07 two ways it backfires | composition `diptych` (new), with `upper` on chart points | [compositions/diptych](../../compositions/diptych/), [components/chart](../../components/chart/) |
| p08 felt against measured | composition `estimates` (new) | [compositions/estimates](../../compositions/estimates/) |
| p09, p18 quizzes | composition `quiz` (new), with a page's `ballot` | [compositions/quiz](../../compositions/quiz/) |
| p10, p19 answers | composition `answers` (new) | [compositions/answers](../../compositions/answers/) |
| p12 three cases | composition `cases` (new) | [compositions/cases](../../compositions/cases/) |
| p13 risky habits | composition `ranking` (new) | [compositions/ranking](../../compositions/ranking/) |
| p15 six rules | composition `rules` (new) | [compositions/rules](../../compositions/rules/) |
| p16 information grades | composition `tiers` (new), with `tone` on pyramid levels | [compositions/tiers](../../compositions/tiers/), [components/pyramid](../../components/pyramid/) |
| p17 three methods | composition `methods` (new) | [compositions/methods](../../compositions/methods/) |
| p20 recap | composition `blackboard` (new) | [compositions/blackboard](../../compositions/blackboard/) |
| p21 homework | face `lesson-ending` (new), with the page's `stamp` | [faces/lesson-ending](../../faces/lesson-ending/) |

The compositions read the `lesson` setting from the face that offers them (`CompositionSetting` in [`src/layouts/compositions/shared.tsx`](../../../src/layouts/compositions/shared.tsx)). The inks, text at its exact size, cards, pills, boxes to tick, the wavy line, the course strip, the board, ruled paper, the sticky note and the stamp are in [`lesson.tsx`](../../../src/layouts/compositions/lesson.tsx), the closing lines under a body in [`lesson-tips.tsx`](../../../src/layouts/compositions/lesson-tips.tsx). Every ink comes from the theme's tokens: the primary for the mark, the accent for the pen, the semantic inks for the kinds of study and the verdicts. The tests draw each composition on homeroom and on ember, a dark theme whose primary and accent are one orange.

## Decisions

Where the engine departs from the board, it does so on purpose, for these reasons.

1. The part pages and the homework carry no folio. The engine prints footer marks on content pages only, across every theme (`ir/footer.ts`). The board printed 「N / 21」 on them too.
2. The part's box holds the author's own `kicker` (「环节一」, "Part 1"). The old part page printed a fixed "LESSON n" that an English deck could not change.
3. The cover's title breaks at its comma, 「在工作中安全、」 over 「有效地用生成式 AI」. The board's browser broke it where the line ran out. Every claim on the board follows the same rule: one line when it fits, the break at a comma when it does not, the last line on the same baseline.
4. A range on a bar is labelled with both ends, 「60% 至 70%」 ("60%–70%"). The board wrote 「约 60% 至 70%」: the engine does not add words the author did not write.
5. The felt-against-measured page has no 「← 更快」 and 「更慢 →」 under its axis. The chart's own axis title takes their place under the ticks (「完成任务的用时变化，负数为更快」, "Change in time to finish a task (negative is faster)"): a chart has no field for two direction words.
6. The beginners page names its two columns in a key over the pairs. The board printed no key, and a comparison's columns are the author's words.
7. Photographs are cropped square at their corners. A rounded picture needs a clip path that PowerPoint's shape subset does not keep.
8. The answer stamps' ✓, ✕ and ‖ are lucide icons (check, x, pause). A glyph in a font PowerPoint may lack would not survive the export.
9. The ruled paper's rules sit just under each line of writing, 4px clear of its descenders, every 32px on a question (41, 73 and 105px down the card where the board ruled 32, 64 and 96) and every half a task on the homework (three pixels lower than the board's). The board set the words on the rules and ran a rule through each question's number; the design brief keeps every rule 4px clear of text, which the gallery's audit holds as rework. So each question's number stands on its case name's baseline, nine pixels above the board's, a rule the reason under an answer cannot clear is left out, and the rules stop 4px short of an answer's stamp.
10. The board's blue `#3E5A74`, the wood, the grey of what steps back, the sticky note's yellow and the ruled paper's lines are derived from the tokens (the board is the primary darkened, the note the warning ink's hue at 92% lightness), within a step of the board's hexes, so a fork that recolours the mark keeps them right.
11. The source sits from y648 on every content page. The board raised it to y632 on the three cases page, where it takes two lines. At y648 two lines still end above the folio.
12. A part page's photograph is laid inside the band of board only, under the board's ink at 82%. A photograph across the whole page would hide the cards under the band.
13. The information grades pyramid sits nine pixels right of the board's, so its base stays inside the band.
14. The answers' closing line stands at y618, two pixels above the board's, inside the band.
15. The English deck takes more room where its words are longer: the quiz's choice boxes widen for "Not yet", the ranking's names column widens up to a fifth of the band, the felt-against-measured plot narrows from either end until every name clears it, and the four studies' labels fit their cards. Where that was not enough, the English copy was shortened, never cut by the engine.
16. The sample's deck asks for dense pacing. The two-study page sets two panels, their two charts and a closing tip, five components, past the four a balanced deck allows.
17. Every board photograph was a sample image, generated for the class: a training room, a raised hand, a pair at a desk, a laptop among sticky notes, a whiteboard, a red pen on marked pages. None shows readable text or a real logo, and the captions on the goals and quiz pages and the methods page's source say they are generated. The cover uses the goals page's classroom.
