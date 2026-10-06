# rally-motif

rally's confetti and folio.

Code: [`src/motifs/motif-rally-motif.tsx`](../../../src/motifs/motif-rally-motif.tsx). The motif paints the footer row itself (`"row"` in [`footer-roles.ts`](../../../src/motifs/footer-roles.ts)).

## rally, summer concert season proposal sample, 2026-10

Every content page of the board carries it. The round's decisions are in [rounds/2026-10-06-rally](../../rounds/2026-10-06-rally/README.md).

| board (p03) | engine |
| :-: | :-: |
| ![board](rally.board.png) | ![engine](rally.engine.png) |

**What it looks like.** On content pages: a fistful of seven strips of confetti at the top right, thrown in the box from (1100, 14), 160 by 44, in the magenta, the gold, the cyan and the lime in turn (the theme's chart palette), each a small rounded strip at its own angle at 90%. The scatter is seeded by the page number with the board's own generator (Python's `random.Random`, reproduced in `SeededRandom`), so every page differs and the same deck renders the same every time. A strip that would land on a face's furniture (`decorKeepOut`) or on the logo is not thrown. When the deck asks for a footer, at the foot from y686: 「N / M」 at the right, 12px in the grey, N PowerPoint's slide-number field and M the deck's length, after any draft or confidentiality mark, and the office, the footer's label and its notice at the left.

**Why.** The confetti is the theme: the same four colours as the charts, a little different on every page. The folio says where the room is in the proposal.

**What it gave up.**

- The three slanted chips of the old motif are retired.
- The number is 「2 / 18」, not the board's 「02 / 18」: a slide-number field cannot be padded.
- Nothing on the cover, the section pages and the close, whose faces throw their own confetti.
