# profile, membership product manager candidacy sample, 2026-10-12

The round that drew profile, the 23rd built-in theme, to one approved board: a twelve-page Chinese and English candidacy in which a membership operations lead at a restaurant chain asks an internal panel for the membership product manager's post (「把留住会员的办法，做进产品里」, "Making member loyalty part of the product"). It runs the order such a talk runs: who the speaker is, four posts with one result each, what the role asks against what they have done, three pieces of work told as cases (birthday coupons, top-up tiers, winning back lapsed members), a self-assessment, the two gaps and how they close, the first 90 days, why this person, and the close. The person and every figure are invented, and every page says so in its footer. It made profile a magazine profile of one person: white paper, open columns under hairlines, claims, names and figures in the serif, the speaker's photograph bled off one side, and one accent a page. It settled a content page that hands its body to the compositions in a new `portrait` setting, ten new compositions, a cover, a section page, a close and a motif. No field was added to the IR.

## Source

- `board/` holds the board's twelve pages as the design tool saved them: one HTML file a page, every element absolutely positioned at 1280 by 720 with its colour, size and weight inline. `Main.dc.html` is the cover, `canvas.json` the order. They are the only source of the board's geometry. Their `support.js` and photograph references point into the design tool and are placeholders here, so the files record the board rather than rebuild it outside that tool.
- The `profile.board.png` files in the part folders are those pages rendered at 1280 by 720 in a browser. The `profile.engine.png` files are `pptwise preview` of the Chinese showcase deck ([showcase/profile/zh](../../../showcase/profile/zh/)), rasterized with `rsvg-convert`. The board and the engine show the same deck, so the words match as well as the drawing, except where the decisions below say otherwise.
- `rsvg-convert` sets the serif headings in Songti SC, whose bold it does not have, so the preview's claims and names look regular. PowerPoint sets them in SimSun and Times New Roman bold. It is the preview's font, not the engine.

## The design system

Every profile page follows these, not only the pages the sample uses. [docs/design-profile.md](../../../docs/design-profile.md) states them for the next round.

1. The page: white paper, a measure from x80 to x1200, no cards. Columns are open, each under a hairline: the first hairline of a table or a column in the ink, the ones between rows pale.
2. The section line: at the top left of every content page from y64, a 28px rule of the accent and, 12px after it, the part of the talk the page belongs to, written from the deck's `course` and the page's `stage` as its number and its name (「一　我是谁」, "1 Who") at 16px in the accent, tracked wide.
3. The claim: bold in the heading serif at 34/48 in the ink, under the section line, across the whole measure, on one line whenever it fits and at most two.
4. Figures are bold in the heading serif, their unit after them at about 40% of their size. A label and a note are small, the note in the grey.
5. One accent a page: the section's rule, and the one result, row or block the page is about. A block filled whole in the accent takes white or the ink, whichever reads, and an accent too middling for either is moved toward the side that reads better until one does (`readableBlock`).
6. The footer row on content pages at y685: the deck's label at the left at 12px in the grey (「示例人物，姓名和数据均为虚构」), the credit for a photograph after it, the speaker's name and the page number at the right. When a photograph bleeds off one side, the row keeps to the column the photograph leaves.
7. Colours: white `#FFFFFF`, a warm band `#F5F2EE`, the ink `#1D1B1A`, a body ink most of the way from the ink to the grey (`#4A4540` on the board), the grey `#6B655E`, hairlines `#DCD6CE`, a warm grey `#B9B0A6` for bars that are not the page's, and the accent, an aubergine `#6E2C57`.
8. Type: the heading serif is Times New Roman with SimSun for Chinese, the body Microsoft YaHei.
9. Photographs are the speaker and their work: a portrait, the front of house, the counter, a member's phone, the team at a table. The portrait runs down the right half of the cover and beside the closing sentence, and shrinks to a round avatar on the close. No readable text and no logos, captioned 「图为 AI 生成的示意图」 when they are generated.

## Pages and the parts they settled

| board page | part | folder |
| :-- | :-- | :-- |
| every content page | motif `profile-motif` (new) | [motifs/profile-motif](../../motifs/profile-motif/) |
| every content page | face `portrait-sheet` (new), compositions in the `portrait` setting (new), the page's `stage` as its section line | [faces/portrait-sheet](../../faces/portrait-sheet/) |
| p01 cover | face `portrait-cover` (new) | [faces/portrait-cover](../../faces/portrait-cover/) |
| p02 who I am | composition `aside` (new) | [compositions/aside](../../compositions/aside/) |
| p03 four posts | composition `stations` (new) | [compositions/stations](../../compositions/stations/) |
| p04 the role against the record | composition `verdicts` (new) | [compositions/verdicts](../../compositions/verdicts/) |
| p05 birthday coupons | composition `casework` (new) | [compositions/casework](../../compositions/casework/) |
| p06 top-up tiers | composition `results` (new) | [compositions/results](../../compositions/results/) |
| p07 win-back | composition `uplift` (new) | [compositions/uplift](../../compositions/uplift/) |
| p08 self-assessment | composition `appraisal` (new) | [compositions/appraisal](../../compositions/appraisal/) |
| p09 gaps | composition `shortfalls` (new) | [compositions/shortfalls](../../compositions/shortfalls/) |
| p10 first 90 days | composition `tenure` (new) | [compositions/tenure](../../compositions/tenure/) |
| p11 why me | composition `credo` (new) | [compositions/credo](../../compositions/credo/) |
| p12 close | face `portrait-ending` (new) | [faces/portrait-ending](../../faces/portrait-ending/) |
| none | face `portrait-chapter` (new), worked out from the section line and the cover | [faces/portrait-chapter](../../faces/portrait-chapter/) |

The compositions read the `portrait` setting from the face that offers them (`CompositionSetting` in [`src/layouts/compositions/shared.tsx`](../../../src/layouts/compositions/shared.tsx)). The inks, text at its exact size, figures, the section line, photographs and icons are in [`portrait.tsx`](../../../src/layouts/compositions/portrait.tsx), the claim, the section line's words, the source and the footer row in [`portrait-shared.tsx`](../../../src/layouts/portrait-shared.tsx). Every ink comes from the theme's tokens: the page for the paper, the text for the ink, the muted for the grey, the border for hairlines, the chart palette's third for the bars that are not the page's, the surface for the warm band, the accent for the one thing a page lights. The tests draw each board page on profile and on stage and crayon, a dark theme and a light one that share nothing with it.

## Decisions

Where the engine departs from the board, it does so on purpose, for these reasons.

1. The page number reads 「2」, not 「02」. It is PowerPoint's slide-number field, which keeps counting when pages move and cannot be padded with a zero.
2. The board's 500 is set regular and its 900 bold. SimSun, Times New Roman and Microsoft YaHei have a regular and a bold and nothing between or heavier.
3. The accent is `#6E2C57`, not the board's `#6B2D55`: a touch more colour, so words the author marks with `**` read apart from the ink at body size (`definitions.test.ts`). The eye does not see the change.
4. The board drew no section page. `portrait-chapter` is worked out from the section line and the cover: the section line and the title large in the serif on white paper, the photograph down the right half when the page has one.
5. A few words on the board are worked out rather than written: the verdicts on the self-assessment (「高一档」, 「达标」, 「差一档」) from the scores against the role's, the unit over the bars (「单位：%」) from the chart's axis, the ruler's days (「第 31 天」) from the phases' durations, and the numbers over the case's columns (「01」, 「02」, 「03」) from their order. The author writes the scores, the unit and the durations once and the page cannot contradict them.
6. A post's figure on the career page is the last number in its milestone's words with a unit of one or two characters or one word after it, so the words cannot say one figure and the page show another. The board's 「380 件 / 月」 reads 「380 件」, with 「每月」 in the words under it.
7. The case page's result line is worked out from the marked row and the `from` state's title (「核销率，改版前 12%」), then the row's change.
8. A claim the board broke by hand runs the full measure and breaks only when it has to, at a comma or a colon when one is near, so a few claims break a few characters away from the board.
9. The closing sentence's quotation mark is SimSun's 「“」, which sits lower and narrower in its square than the board's.
10. An English name too long for the cover's 112px steps down to fit, to 72px at the least, and a role row too long for one line puts the arrow and the post wanted on a second line.
11. A photograph's credit goes in the footer row after the deck's label, as the board drew it. When the row has no room, it goes on its own line over the row, and the page's body ends above it.
12. The cover carries the deck's label but not its confidentiality mark, which the content pages print. The cover, the section pages and the close draw their own footer row.
