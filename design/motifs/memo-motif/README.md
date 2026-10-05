# memo-motif

memo's running head and folio: MEMORANDUM over a red double rule on every page but the cover, and on content pages the memo's subject at the top right and the folio at the foot.

Code: [`src/motifs/motif-memo-motif.tsx`](../../../src/motifs/motif-memo-motif.tsx). The motif paints the footer row itself (`"row"` in [`footer-roles.ts`](../../../src/motifs/footer-roles.ts)).

## memo, four-day week decision sample, 2026-10

Every board page but the cover carries it. The round's decisions are in [rounds/2026-10-05-memo](../../rounds/2026-10-05-memo/README.md).

| board (p02) | engine |
| :-: | :-: |
| ![board](memo.board.png) | ![engine](memo.engine.png) |

**What the board settled.** MEMORANDUM at 12px bold mono in the mark, 6px apart, at x64 over a 2px rule at y48 and a 1px rule at y53 from x64 to x1216, both in the mark. On a content page of a deck that asks for a footer, the deck's footer `label` (the memo's subject) at the top right in 12px muted mono, and at the foot the organization and notice at the left and 「第 N 页 共 M 页」 or "Page N of M" at the right, the draft and confidentiality marks before it, all 12px muted mono. N is PowerPoint's slide-number field.

**Why.** A typed memorandum carries its form on every sheet, and its page count in the same type as its text.

**What it gave up.**

- The old 3px rule at y26 and the 16px eyebrow are gone from every memo page.
- The chapter page and the sign-off carry no subject and no folio, as every theme keeps footer marks to content pages.
