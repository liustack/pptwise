# binder-chapter

proposal's section page: petrol on the left half beside the page's photograph, the section's number huge in brick red, and the questions the section answers on ruled rows.

Code: [`src/layouts/chapter-binder-chapter.tsx`](../../../src/layouts/chapter-binder-chapter.tsx).

## proposal, rooftop solar and storage proposal sample, 2026-10

Settled on p03 and p10. The round's decisions are in [rounds/2026-10-06-proposal](../../rounds/2026-10-06-proposal/README.md).

| board (p03) | engine |
| :-: | :-: |
| ![board](proposal.board.png) | ![engine](proposal.engine.png) |

The board in the table is the first round's. The print round redrew this page in a design tool outside this folder, and the engine render shows the page as it is set now.

**What it looks like.** Petrol on the left half, and the page's own photograph bled off the right half from x680, full height, its caption (the page's `footnote`, 「图为 AI 生成的示意图」) small in white at its bottom right over a fade of petrol. Over the petrol a running head at 14px in white at 78%: the deck's name at the left, the part (the page's `kicker` before 「 · 」, 「第一部分」, or the whole kicker when it has none and the page names a `stage`) at the right, a white hairline at 35% under them. Under it the section's number at 120px bold in the brick red, lifted toward white until it reads at 3:1 on petrol (「01」, counted by the engine in the order the chapter pages appear), the part's name at 18px with its characters spaced out (the kicker after 「 · 」, else the page's `stage`), the title at 36/50 bold in white, the subheading at 14px (「这一部分回答」), and the page's `row_cards` as the questions on ruled rows, each a white line icon and a line at 16px.

**Why.** A client reads a proposal for answers to their own questions. Opening each section on the questions it answers tells them which pages to read.

**What it gave up.**

- The author writes the section's name, never its number.
- The board printed a page number on the section pages. The engine prints footer marks on content pages only.
- A title on two lines moves what is under it down a line.
