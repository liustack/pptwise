# corner-ornament-motif

journal's masthead words and folio.

Code: [`src/motifs/motif-corner-ornament-motif.tsx`](../../../src/motifs/motif-corner-ornament-motif.tsx). The motif paints the footer row itself (`"row"` in [`footer-roles.ts`](../../../src/motifs/footer-roles.ts)).

## journal, annual letter to readers sample, 2026-10

Every content page of the board carries it. Redrawn this round (v3): it used to draw a double rule along the top edge, a single rule along the foot and an issue mark 「№」. The round's decisions are in [2026-10-07-journal](../../rounds/2026-10-07-journal/README.md).

| board (p03) | engine |
| :-: | :-: |
| ![board](journal.board.png) | ![engine](journal.engine.png) |

**What it looks like.** On content pages of a deck with a footer: at the top left of the masthead the column's name (the deck's `organization`, 「致读者」) at 13px bold in the heading serif, Chinese 6px apart. At the top right the issue (the footer's `label`, 「二〇二六年秋 · 年度长信」) at 11px in the grey. At the foot the folio 「· 3 ·」 centred at x640 in the heading serif, the number 13px, the points either side of it in the grey and moved out as the number grows. The office and the footer's notice at the bottom left, the draft and confidentiality marks at the bottom right, 11px.

**Why.** A magazine's every page says which column and which issue it belongs to, and its page number sits in the middle of the foot.

**What it gave up.**

- The number is PowerPoint's slide-number field, a run of its own, so the points are separate words beside it.
- A column's name or an issue too wide for its third of the masthead is declared dropped.
- Nothing on the cover, the section pages and the close.
