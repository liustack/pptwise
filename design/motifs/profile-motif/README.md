# profile-motif

profile's footer row: the deck's label, the speaker's name and the page number.

Code: [`src/motifs/motif-profile-motif.tsx`](../../../src/motifs/motif-profile-motif.tsx). The motif paints the footer row itself (`"row"` in [`footer-roles.ts`](../../../src/motifs/footer-roles.ts)).

## profile, membership product manager candidacy sample, 2026-10

Every content page of the board carries it. The round's decisions are in [rounds/2026-10-12-profile](../../rounds/2026-10-12-profile/README.md).

| board (p02) | engine |
| :-: | :-: |
| ![board](profile.board.png) | ![engine](profile.engine.png) |

**What it looks like.** On content pages at y685: at the left the deck's label (the footer's `organization`, `label`, `notice`, draft and confidentiality marks) at 12px in the grey, at the right the speaker's name (the deck's first author) at 12px in the grey and the page number in the serif at 14px in the ink. No line and no box. A face that bleeds a photograph off one side writes `data-frame-left` or `data-frame-right`, and the row keeps to the column left. A face that puts its own key at the bottom left writes `data-footer-pack="end"`, and the label moves to the right before the name.

**Why.** A printed page should say whose talk it came from and that the person and figures are invented, wherever it ends up.

**What it gave up.**

- The number is 「2」, not 「02」: a slide-number field cannot be padded.
- Nothing on the cover, the section pages and the close, whose faces draw their own footer row.
