# proposal-motif

proposal's deck label and folio.

Code: [`src/motifs/motif-proposal-motif.tsx`](../../../src/motifs/motif-proposal-motif.tsx). The motif paints the footer row itself (`"row"` in [`footer-roles.ts`](../../../src/motifs/footer-roles.ts)).

## proposal, rooftop solar and storage proposal sample, 2026-10

Every content page of the board carries it. The round's decisions are in [rounds/2026-10-06-proposal](../../rounds/2026-10-06-proposal/README.md).

| board (p02) | engine |
| :-: | :-: |
| ![board](proposal.board.png) | ![engine](proposal.engine.png) |

**What it looks like.** On content pages of a deck with a footer: the left of the running head on y36, the footer's label at 13px regular in the grey (「屋顶光伏与储能方案 · 呈 贵司管理层」), kept 24px short of the section the face sets at its right. At the bottom right on y686 the page number at 13px bold in the ink, right-aligned at x1216, after any draft or confidentiality mark. The office and the footer's notice at 11px in the grey at the bottom left.

**Why.** The label says whose proposal a page is from wherever it is photocopied. The number keeps a page findable in a meeting.

**What it gave up.**

- The number is 「2」, not the board's 「02」: a slide-number field cannot be padded.
- Nothing on the cover, the section pages and the close, whose faces draw their own frame.
