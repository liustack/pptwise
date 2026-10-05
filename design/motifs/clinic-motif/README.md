# clinic-motif

clinic's running head and folio: a short heartbeat at the top left of every page but the cover, and on content pages the deck's subject at the top right and the folio at the foot.

Code: [`src/motifs/motif-clinic-motif.tsx`](../../../src/motifs/motif-clinic-motif.tsx). The motif paints the footer row itself (`"row"` in [`footer-roles.ts`](../../../src/motifs/footer-roles.ts)).

## clinic, GLP-1 formulary review sample, 2026-10

Every board page but the cover carries it. The round's decisions are in [rounds/2026-10-05-clinic](../../rounds/2026-10-05-clinic/README.md).

| board (p02) | engine |
| :-: | :-: |
| ![board](clinic.board.png) | ![engine](clinic.engine.png) |

**What the board settled.** A heartbeat 34px long from x64 on y38 in the accent at 1.6px: flat, one sharp rise and fall, flat again. The page's section stands right of it, set by the face. On a content page of a deck that asks for a footer, the deck's footer `label` (the file's subject) at the top right in 12px muted type, and at the foot the organization and notice at the left and 「N / M」 at the right, the draft and confidentiality marks before it, all 12px muted. N is PowerPoint's slide-number field.

**Why.** A clinical file carries its subject and its page count on every sheet, and the heartbeat is clinic's one mark.

**What it gave up.**

- The cover's long heartbeat across the middle of the page is the cover face's now (`dossier-cover`).
- The chapter page and the ballot carry the heartbeat but no subject and no folio, as every theme keeps footer marks to content pages.
- 「9 / 18」 is not padded to 「09 / 18」: the slide-number field cannot pad.
