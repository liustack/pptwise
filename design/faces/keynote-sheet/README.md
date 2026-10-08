# keynote-sheet

stage's ordinary content page: the chapter at the top left, a bold claim across the whole measure, the body handed to the shared compositions in the `keynote` setting, and the source over the clicker.

Code: [`src/layouts/content-keynote-sheet.tsx`](../../../src/layouts/content-keynote-sheet.tsx), [`src/layouts/keynote-shared.tsx`](../../../src/layouts/keynote-shared.tsx). Used by stage.

## stage, game developers keynote sample, 2026-10

Settled on every content page. The boards and engine renders are in the composition folders each page links from the round. The round's decisions are in [2026-10-08-stage](../../rounds/2026-10-08-stage/README.md).

**What it looks like.** The chapter (`kicker`) at 12px in the sand tracked 4px from y40. The claim bold at 40/50 from y76 across x64 to x1216, on one line whenever it fits at a twelfth under its size or more, on two where the author broke it or at a comma. The body is offered to the compositions in this order: `hush`, `crowd`, `giant`, `contour`, `faceoff`, `tilt`, `podiums`, `gulf`, `tower`, `toll`, `arches`, `slate`. Each places the chapter, the claim and the source itself. A page none of them takes is drawn by the component renderer under the claim from y160 down to y610. The source at 11/16 in the dim from y626, one line or two, its last line ending by y664.

**Why.** Every page is one moment of the same talk: which act, what it says, the one thing in silver.

**What it gave up.**

- The claim hangs from y76 and a second line pushes the body down rather than rising: the chapter stands above it. The compositions take a one-line claim and a page whose claim needs two goes to the component renderer.
- A subheading is set under the claim in the sand, and such a page goes to the component renderer. None of the board's pages carried one.
- Every content kind stage offers but `quote` lands here. `quote` stays on `pull-quote`.
