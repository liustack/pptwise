# recap, channel sales year-end review sample, 2026-10-13

The round that drew recap, the 24th built-in theme, to one approved board: a sixteen-page Chinese and English year-end review in which a channel sales manager at a consumer electronics brand accounts for 2026 to the regional director and HR (「完成 105%，增量来自我开的两条新渠道」, "105% of target, on two new channels"). It runs the order a review runs: the year's numbers (the year in one line, the target by quarter, where the growth came from), what the speaker got done (three pieces of work, the team, the miss, the market), and next year (the target, the plan by quarter, the asks), then the close. The person and every figure are invented, and every page says so in its footer. It made recap a ledger one person keeps on their own year: white paper, heavy claims, figures in DIN, columns opened by a black rule, the accent on what the speaker led, red beside a cross for what went wrong. It settled a content page that hands its body to the compositions in a new `account` setting, twelve new compositions, a cover, a chapter, a close and a motif. No field was added to the IR.

## Source

- `board/` holds the board's sixteen pages as the design tool saved them: one HTML file a page, every element absolutely positioned at 1280 by 720 with its colour, size and weight inline. `Main.dc.html` is the cover, `canvas.json` the order. They are the only source of the board's geometry. Their script and photograph references point into the design tool and are placeholders here, so the files record the board rather than rebuild it outside that tool.
- The `recap.board.png` files in the part folders are those pages rendered at 1280 by 720 in a browser. The `recap.engine.png` files are `pptwise preview` of the Chinese showcase deck ([showcase/recap/zh](../../../showcase/recap/zh/)), rasterized with `rsvg-convert`. The board and the engine show the same deck, so the words match as well as the drawing, except where the decisions below say otherwise.
- `rsvg-convert` sets the figures in DIN Alternate, which is narrower than the Bahnschrift the engine measures them in, so a unit after a figure sits a little further off in the preview than in PowerPoint.

## The design system

Every recap page follows these, not only the pages the sample uses. [docs/design-recap.md](../../../docs/design-recap.md) states them for the next round.

1. The page: white paper, a measure from x80 to x1200, no cards. A column opens under a 2px rule of the ink, its rows under pale hairlines.
2. The section line: on y72 at the left of every content page, the part's number as two figures at 16px in the deep accent and the part's name at 14px in the grey tracked wide, from the deck's `course` and the page's `stage`.
3. The claim: heavy at 32/45 in the ink from y84, across the whole measure, at most two lines.
4. Figures are in DIN, their unit after them in the body face. A currency goes before them (`RMB 31m`).
5. The accent goes to what the speaker led and the one figure a page is about. Red goes only to what went wrong, always beside a cross or as a red bar, so a red brand still reads.
6. Who did what is a small legend: a filled square of the accent for the speaker, an empty grey square for the team, a red cross for a mistake, a tick for done, an empty dark box for awaiting approval.
7. What the reviewers decide is an empty box to tick.
8. The footer row on content pages at y688: the deck's label at the left (「示例人物，姓名和数据均为虚构」), a photograph's credit after it, and at the right the speaker and the occasion and the page number.
9. Colours: white `#FFFFFF`, the ink `#15191E`, the grey `#5B6470`, hairlines `#D9DDE2`, graphite `#2E353D` for actual bars, a grey `#9AA3AE` for the team's and last year's bars, red `#B42318`, and the accent, a deep teal `#0B6E69`, three quarters of it for small words.
10. Type: Microsoft YaHei for headings and body, Bahnschrift for figures (DIN Alternate in the macOS preview).

## Pages and the parts they settled

| board page | part | folder |
| :-- | :-- | :-- |
| every content page | motif `recap-motif` (new) | [motifs/recap-motif](../../motifs/recap-motif/) |
| every content page | face `account-sheet` (new), compositions in the `account` setting (new) | [faces/account-sheet](../../faces/account-sheet/) |
| p01 cover | face `account-cover` (new) | [faces/account-cover](../../faces/account-cover/) |
| p02 the year in one line | composition `gist` (new) | [compositions/gist](../../compositions/gist/) |
| p03 target by quarter | composition `reckoning` (new) | [compositions/reckoning](../../compositions/reckoning/) |
| p04 where the growth came from | composition `credit` (new) | [compositions/credit](../../compositions/credit/) |
| p05 and p12 chapters | face `account-chapter` (new) | [faces/account-chapter](../../faces/account-chapter/) |
| p06 the new chain | composition `casefile` (new) | [compositions/casefile](../../compositions/casefile/) |
| p07 carrier stores | composition `relay` (new) | [compositions/relay](../../compositions/relay/) |
| p08 channel stock | composition `drawdown` (new) | [compositions/drawdown](../../compositions/drawdown/) |
| p09 the team | composition `headcount` (new) | [compositions/headcount](../../compositions/headcount/) |
| p10 the miss | composition `postmortem` (new) | [compositions/postmortem](../../compositions/postmortem/) |
| p11 the market | composition `deltas` (new) | [compositions/deltas](../../compositions/deltas/) |
| p13 next year's target | composition `stretch` (new) | [compositions/stretch](../../compositions/stretch/) |
| p14 the plan | composition `sequence` (new) | [compositions/sequence](../../compositions/sequence/) |
| p15 the asks | composition `requests` (new) | [compositions/requests](../../compositions/requests/) |
| p16 close | face `account-ending` (new) | [faces/account-ending](../../faces/account-ending/) |

The compositions read the `account` setting from the face that offers them (`CompositionSetting` in [`src/layouts/compositions/shared.tsx`](../../../src/layouts/compositions/shared.tsx)). The inks, text, figures, the legend and icons are in [`account.tsx`](../../../src/layouts/compositions/account.tsx), the section line, the claim, the source and the footer row in [`account-shared.tsx`](../../../src/layouts/account-shared.tsx). Every ink comes from the theme's tokens. The tests draw each board page on recap and on stage, crayon and profile.

## Decisions

Where the engine departs from the board, it does so on purpose, for these reasons.

1. The page number reads 「5」, not 「05」. It is PowerPoint's slide-number field, which cannot be padded with a zero.
2. A few words on the board are worked out rather than written: the verdicts on the target page (「未达」, 「达成」, 「超额」) from each quarter's status, the quarter the gap closed in from the running sum, the speaker's share of the net change (「占净增量 68%」) from the marked steps, the bridge's floor from its lowest level, the 「评审意见」 column from the page's ballot, and the year's sum under the plan from its quarters. The author writes the figures once and the page cannot contradict them.
3. The chapter sets the part's name beside its number. The board drew the number alone, but the page's `stage` must reach the page as words.
4. The target page leaves out the board's 「单位：万元」 over the bars: the source line names the unit. The plan leaves out the 「先做」 chip under the first phase's name: its filled bar says it.
5. The bridge's ledger lists each step by its label, without the board's sublines.
6. The tint under the row a page is about is the accent at 10% over the paper everywhere. The board used 12% on p07 and p13.
7. A claim the board broke by hand runs the full measure and breaks only when it has to, so the close's commitment breaks over two lines where the board used three.
8. A missed quarter's bar is graphite like the others, and only its figure is red: the red goes on the word and the figure that say it, not on the area.
9. Mac PowerPoint fetches Bahnschrift from Office's cloud fonts the first time a deck uses it. Until it has, it sets the figures in a fallback.
