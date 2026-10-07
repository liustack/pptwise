# luxe-motif

luxe's card stock: the hairline frame round every content page, the occasion and the date at the bottom left, and the page number struck as a hallmark at the bottom right.

Code: [`src/motifs/motif-luxe-motif.tsx`](../../../src/motifs/motif-luxe-motif.tsx). Used by luxe.

## luxe, gold dealer conference sample, 2026-10

Settled on every content page. The pair below is p02. The round's decisions are in [2026-10-08-luxe](../../rounds/2026-10-08-luxe/README.md).

| board (p02) | engine |
| :-: | :-: |
| ![board](luxe.board.png) | ![engine](luxe.engine.png) |

**What it looks like.** A hairline frame 24px in from the page's edges in the border ink, always. On a deck that asks for footer marks, the deck's `organization` and the footer's `label` at the bottom left from x64, 11px in the dim gold tracked 2px, the footer's notice after them, and the page number at the bottom right in a double capsule 48 by 22 in gold, 12px in the serif, PowerPoint's slide-number field, the draft and confidentiality marks before it. A page whose face runs a photograph from the left edge (`data-frame-left` on its drawing, handed to the motif as `frameLeft`) has its frame and its occasion start beside the photograph. It paints the footer row itself (`footer-roles.ts`).

**Why.** Every content page is a card of the same invitation. The frame is the card's edge and the folio is struck like the hallmark on a piece of gold.

**What it gave up.**

- The folio reads 「2」, not the board's 「02」: a slide-number field cannot be padded.
- The v1 double gilt frame stays for a cover or an ending face that leaves it room. luxe's own cover, chapter and ending draw their own frames and keep the motif off.
