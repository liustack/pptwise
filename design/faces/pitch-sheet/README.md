# pitch-sheet

ember's ordinary content page: the deck's label at the top left, the pitch's running order at the top right with the page's beat lit, the claim bold at 34px, the body handed to the shared compositions in the `pitch` setting, and the source small at the foot.

Code: [`src/layouts/content-pitch-sheet.tsx`](../../../src/layouts/content-pitch-sheet.tsx), with the frame (`PitchHead`, `PitchTitle`, `PitchStandfirst`, `PitchSource`) in [`src/layouts/pitch-shared.tsx`](../../../src/layouts/pitch-shared.tsx) and the running order (`PitchRail`) in [`src/layouts/compositions/pitch.tsx`](../../../src/layouts/compositions/pitch.tsx). Used by ember for points, list, comparison, process, data and hierarchy pages.

## ember, low-altitude delivery pitch sample, 2026-10

Settled on every content page but the photograph page. The boards and engine renders are in the composition folders each page links from the round. The round's decisions are in [rounds/2026-10-06-ember](../../rounds/2026-10-06-ember/README.md).

**What it looks like.** At the top right, ending at x1216 on y28, the deck's `course` as a row of words, 12px in boxes 20px tall and 14px apart: the page's `stage` in the ivory, bold, with a 2px underline 2px under its box, the others in a dimmed grey that still reads at 4.5:1. The deck's label at the top left is the motif's. The claim bold at 34/46 from x64 across 1152px, on one line whenever it fits and broken at a comma when it does not, its last line ending at y160 either way. A subheading becomes a standfirst at 16/24 in the warm grey at the body's top. The body runs from y196 to y640 and is offered to the compositions in this order: `expanse`, `stairs`, `funnel`, `rivals`, `equation`, `bets`, `divide`, `locks`, `register`, `runway`, `uses`. A page none of them takes is drawn by the component renderer in the same band. The source at 12/16 in the warm grey from y650, up to two lines.

**Why.** A pitch is one run of beats. Every page under the same head says which beat it is where the eye starts, and states what it proves before it shows the evidence.

**What it gave up.**

- A page the band cannot hold steps aside to the plain sheet, and is declined when that cannot hold it either.
- No `kicker` on a content page: the running order names the page's beat, and validate refuses one.
- `stage` is refused by validate on a face that does not draw it, on a deck with no `course`, and when it names a stage the course does not have.
- The body takes up to four components.
