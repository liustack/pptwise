# yearbook-cover

almanac's cover: the page's photograph squared on the right, and on the left, over contour lines, the office and the occasion, the title, a short rule in the accent, a scale of years and the date.

Code: [`src/layouts/cover-yearbook-cover.tsx`](../../../src/layouts/cover-yearbook-cover.tsx). Used by almanac.

## almanac, CBAM sample, 2026-10

Settled on p01. The round's decisions are in [rounds/2026-10-05-almanac](../../rounds/2026-10-05-almanac/README.md).

| board (p01) | engine |
| :-: | :-: |
| ![board](almanac.board.png) | ![engine](almanac.engine.png) |

**What it looks like.** The page's own `background` photograph cropped square from x560 to the page's right edge, top to bottom. The face draws it itself (`drawsPhoto`), so the cover keeps its own page over a photograph instead of handing it to the shared photo cover. Left of it the page colour, six contour lines in the ghost across the column's lower half. From the top: the office (`meta.organization`) and the occasion (`subheading`) on one line, 14px bold in the mark, its characters 2px apart, falling back to two untracked lines when one tracked line is too long. The title bold at 50/66, on one line if it fits and broken at a comma when it does not, its last line ending at y380. A 60 by 4 rule in the accent at y396. A scale of years at y520, drawn from the page's `timeline` when every milestone is dated by a year: a dot for each year from the first to the last, filled for the years the timeline names, those years named over the scale and the milestones' titles under it, the highlighted one in the accent. The timeline's title in 13px muted type under the scale, and the deck's `date` at the foot. Without a photograph the whole page takes the page colour.

**Why.** The cover says at once that this is a long account (the run of years) and which way it runs (the free share falling to zero), over the place the goods leave from.

**What it gave up.**

- A timeline whose dates are not all years is not drawn and is declared. So is any other component.
- No motif on the cover: the contours and the scale are its own.
