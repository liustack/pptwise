# marquee-statement

rally's one-line plan: no title bar, the heading is the page.

Code: [`src/layouts/content-marquee-statement.tsx`](../../../src/layouts/content-marquee-statement.tsx).

## rally, summer concert season proposal sample, 2026-10

Settled on p02. The round's decisions are in [rounds/2026-10-06-rally](../../rounds/2026-10-06-rally/README.md).

| board (p02) | engine |
| :-: | :-: |
| ![board](rally.board.png) | ![engine](rally.engine.png) |

**What it looks like.** The ticket stub at the top left as on every content page. The heading is cut at its last comma into a lead-in, 28/40 bold in the grey with its comma printed (「2027 年夏天，我们不进场馆抢冠名，」), and the claim at 72px bold in the light, 112px from line to line, broken where the author broke it (`\n`) and its marked words in the magenta (「去**开场前**和**散场后**」). At most two lines of claim. A 1px rule at y500, and under it the touchpoints, the page's `icon_cards` (a magenta icon, a name at 20px bold, a line at 15px in the grey, 392px apart), or a paragraph at 20px. Two bands of confetti, fourteen strips from (60, 40) and ten from (60, 560), each 1160 by 120, seeded by the page number and twenty past it, none on a word. The motif's fistful at the top right steps aside for them (`decorKeepOut`). The folio is the motif's.

**Why.** The room should be able to repeat the plan after the meeting. One sentence set huge, its two key words lit, is the page they will remember, and the touchpoints under the rule say how it is done.

**What it gave up.**

- A lead-in past one line, a claim past two lines, more than four touchpoints, a line past two lines, or anything on the page besides one `icon_cards` or one `paragraph` hands the page to the plain sheet, and the page is declined when that cannot hold it either.
- No `ballot` and no subheading on this page.
