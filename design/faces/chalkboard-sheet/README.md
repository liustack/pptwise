# chalkboard-sheet

lecture's ordinary content page: the lesson's step at the top left, the title in the serif across the whole measure, the body handed to the shared compositions in the `chalkboard` setting, and the source over the ledge.

Code: [`src/layouts/content-chalkboard-sheet.tsx`](../../../src/layouts/content-chalkboard-sheet.tsx), [`src/layouts/chalkboard-shared.tsx`](../../../src/layouts/chalkboard-shared.tsx). Used by lecture.

## lecture, annual tax reconciliation evening class sample, 2026-10

Settled on every content page. The boards and engine renders are in the composition folders each page links from the round. The round's decisions are in [2026-10-08-lecture](../../rounds/2026-10-08-lecture/README.md).

**What it looks like.** The lesson's step (`kicker`) at 12px in the chalk grey tracked 3px from y34. The title at 34/46 in the heading serif at its regular weight across x64 to x1216, its last line resting on y142: on one line whenever it fits at a twelfth under its size or more, on two where the author broke it or at a comma or a colon, the second line growing upward. A run the author marks in the title is chalk white with one stroke of yellow chalk under it, the theme's underline. The body is offered to the compositions in this order: `agenda`, `confluence`, `braces`, `boughs`, `factors`, `subtractions`, `flashcards`, `risers`, `givens`, `derivation`, `cascade`, `exercises`, `solutions`, `pitfalls`, `strikeout`, `chronology`. Each places the title, the source and the stamp itself. A page none of them takes is drawn by the component renderer under the title from y172 down to y636, its stamp at the top right. The source at 11/15 in the dim from y646, one line or two, its last line ending by y676.

**Why.** Every page is the same board at the same class: which step, what it says, one stroke of yellow.

**What it gave up.**

- A subheading is set under the title in the grey, and such a page goes to the component renderer. None of the board's pages carried one.
- Every content kind lands here. lecture offers no `quote`.
