# poster-motif

ledger's status bar: a 32px bar across the top of every page, like a market terminal's title row.

Code: [`src/motifs/motif-poster-motif.tsx`](../../../src/motifs/motif-poster-motif.tsx). Used by ledger.

## ledger, AI capex sample, 2026-10

On every page of the board, for example [faces/stat-cover](../../faces/stat-cover/ledger.board.png) and [compositions/tiles](../../compositions/tiles/ledger.board.png). The round's decisions are in [rounds/2026-10-04-ledger](../../rounds/2026-10-04-ledger/README.md).

**What it looks like.** The bar is the page ground one step darker (`#0B0F15` on ledger) with a 1px border line at y31. On the left a 6px amber dot at x67 and the organization at 12px muted from x78. On the right the date at 12px muted, right-aligned to x1216. No page number. The bar, line and text are one `structure` piece, page chrome drawn at full colour. The photo page's photograph starts under it.

**Why.** The bar says whose screen this is and when, on every page, the way a terminal does, and frees the content area from a footer.

**What it gave up.**

- The old motif drew a dark wavy line along the foot of every page and the cover. It went: the board draws none.
- The text is page information, not decoration. The organization prints on the cover and the ending from `meta.organization`, and elsewhere only when the deck asks its footer for it, which the shared footer row then leaves out. The date follows the same switch as the cover's date. With neither, the bar is empty and the dot is not drawn.
- No letter spacing, where the board tracked the text by 0.5px.
