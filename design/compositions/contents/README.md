# contents

What a chapter holds, listed on its chapter page: each content page between this chapter page and the next, its page number and its heading.

Code: [`src/layouts/compositions/contents.tsx`](../../../src/layouts/compositions/contents.tsx) (`chapterContents`, `drawContents`). It reads the deck, not a page's components, so `compose` never offers it: a chapter face calls it. Used by swiss's [`decimal-index-chapter`](../../faces/decimal-index-chapter/).

## swiss, power sample, 2026-10

Settled on the chapter pages (p03, p07, p11): see the board on [faces/decimal-index-chapter](../../faces/decimal-index-chapter/swiss.board.png). The round's decisions are in [rounds/2026-10-03-swiss](../../rounds/2026-10-03-swiss/README.md).

**What it looks like.** One row per content page, from 18px under the band's top: the page's number, two digits, 17px bold in the mark colour of the face's setting (the accent in the grid setting, primary otherwise), and its heading from 64px in at 19/28 in ink, in at most two lines, with a hairline under each row. Rows stand 72px apart.

**Why.** The author already wrote every page's heading. Reading them off the deck keeps the chapter page honest when pages move.

**What it gave up.**

- The list is the deck's own words, so it is drawn whole or not at all: rows tighten to 52px when every heading is one line and 72px does not hold them, and a chapter with more pages than that, or a heading past two lines, leaves the chapter page without its list.
- A heading's `**…**` marks are stripped: the list quotes the headings, it does not restate their emphasis.

## terminal, cloud outage review sample, 2026-10

The console setting's form, in [`contents-console.tsx`](../../../src/layouts/compositions/contents-console.tsx), on terminal's [`console-chapter`](../../faces/console-chapter/). Settled on the chapter pages (p03, p10): see the boards there. The round's decisions are in [rounds/2026-10-05-terminal](../../rounds/2026-10-05-terminal/README.md).

**What it looks like.** One row per content page, 38px apart: 「├─ 04」 in 15px mono in the mark, the heading at 17px in the bright ink, whole, two lines when it needs two.

**Why.** A console lists a directory as a tree. The page numbers say where to turn.

**What it gave up.** The same as the other settings: the list is drawn whole or not at all.
