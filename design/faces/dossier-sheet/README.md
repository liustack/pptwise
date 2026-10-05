# dossier-sheet

clinic's ordinary content page: the section beside the heartbeat, the claim bold over a hairline with a bar of the mark, the page's tag as a capsule over the body, the body handed to the shared compositions in the `dossier` setting, and the source small at the foot.

Code: [`src/layouts/content-dossier-sheet.tsx`](../../../src/layouts/content-dossier-sheet.tsx), with the frame (`DossierSection`, `DossierHead`, `DossierTag`, `DossierStandfirst`, `DossierSource`) in [`src/layouts/dossier-shared.tsx`](../../../src/layouts/dossier-shared.tsx). Used by clinic for points, list, comparison, process, data, photo and hierarchy pages.

## clinic, GLP-1 formulary review sample, 2026-10

Settled on every content page. The round's decisions are in [rounds/2026-10-05-clinic](../../rounds/2026-10-05-clinic/README.md). The boards and engine renders are in the composition folders each page links from the round.

**What it looks like.** The page's `kicker` at 13px bold in the mark, its characters 2px apart, right of the motif's heartbeat at x106. The claim bold at 30/42 from x64 across 1152px, at most two lines: on one line whenever it fits, and when it does not, broken at a comma, its last line ending at y154 either way. A 1px hairline at y166 with a 56 by 3 bar of the mark over its left end. A subheading becomes a muted standfirst under the rule. The page's `tag`, the evidence the whole page rests on, stands as a capsule at the top left of the body, outlined in its kind's ink; the compositions that keep their left column clear of it (`duel`, `forest`, `fork`, `gate`) take the band from y186, any other body starts 40px under it. The body runs from y186 to y640 and is offered to the compositions in this order: `inset`, `watch`, `rows`, `readings`, `docket`, `controlled`, `duel`, `forest`, `multiples`, `fork`, `lanes`, `ruler`, `dumbbells`, `table`, `cards`, `gate`. A page none of them takes is drawn by the component renderer in the same band. The source sits at 12/16 in the muted ink from y648, up to two lines.

**Why.** A file reads as one document: every page under the same head, its section where the eye starts, its point stated before its evidence, and the kind of that evidence named before the figures.

**What it gave up.**

- A page the band cannot hold steps aside to the plain sheet, and is declined when that cannot hold it either.
- The chapter page keeps `subject-rule-chapter`: it had no board in this round. The old faces stay registered for theme files that name them.
