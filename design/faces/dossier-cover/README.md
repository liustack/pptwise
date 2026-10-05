# dossier-cover

clinic's cover: the submitting office and what it asks for, the title, a heartbeat across to a full-height photograph, and the header lines.

Code: [`src/layouts/cover-dossier-cover.tsx`](../../../src/layouts/cover-dossier-cover.tsx). Used by clinic.

## clinic, GLP-1 formulary review sample, 2026-10

Settled on p01. The round's decisions are in [rounds/2026-10-05-clinic](../../rounds/2026-10-05-clinic/README.md).

| board (p01) | engine |
| :-: | :-: |
| ![board](clinic.board.png) | ![engine](clinic.engine.png) |

**What it looks like.** In a 576px column from x64: the organization (`meta.organization`) bold in the mark at 14px with its characters 2px apart, a centred dot and the subtitle in 14px muted type after it, up to two lines. The title bold at 44/60, on one line when it fits and broken at a comma when it does not, its last line ending at y350. A heartbeat in the accent at 2.5px on y410 from x64 to the photograph's edge, its beat at 42% of its length. From y470 the page's `fields` one a line every 48px between hairlines: the label in 13px muted type, the value at 16px from x214. The page's `image` fills the right of the page from x704, top to foot, cropped to fill, and its caption, when it has one, stands in 12px muted type at the foot of the left column. No motif: the cover sets its own heartbeat.

**Why.** A submission opens by saying who asks the committee for what, on what evidence and when.

**What it gave up.**

- With no photograph the heartbeat runs to the page's right edge, and the right of the page stays empty.
- A value or caption too long for its line is cut and reported.
