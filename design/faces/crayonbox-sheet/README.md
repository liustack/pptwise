# crayonbox-sheet

crayon's ordinary content page: the section capsule, the claim with its stroke of crayon, the body handed to the shared compositions in the `crayonbox` setting, and the page's source at the foot.

Code: [`src/layouts/content-crayonbox-sheet.tsx`](../../../src/layouts/content-crayonbox-sheet.tsx) with the frame (`SectionCapsule`, `CrayonSection`, `sectionSymbol`, `fitCrayonClaim`, `CrayonClaim`, `crayonClaimIn`, `CrayonSource`, `crayonSourceIn`, `FolioDisc`, `FolioLine`, `crayonBandRect`) in [`src/layouts/crayonbox-frame.tsx`](../../../src/layouts/crayonbox-frame.tsx). Used by crayon for every content kind.

## crayon, new term parents' meeting sample, 2026-10

Settled on p03 and every content page. The round's decisions are in [2026-10-08-crayon](../../rounds/2026-10-08-crayon/README.md).

| board (p03) | engine |
| :-: | :-: |
| ![board](crayon.board.png) | ![engine](crayon.engine.png) |

**What it looks like.** At the top left a 34px capsule in the crayon of the section the page sits in, with the section's symbol (the icon the deck's contents gives that section) and its name (the page's `kicker`, 15px, the navy ink, white on the purple). The claim at 34/46 in the heavy sans across 1080px from x64, on one line whenever it fits at 95% of its size, broken at a comma or a colon when it does not or where the author broke it, its last line ending on y146. A stroke of crayon in the section's colour under it, x64 to x200 on y156, three passes. The body is offered to the compositions in this order: `crayons`, `stickies`, `waiver`, `storeys`, `swatches`, `yardstick`, `arc`, `magnets`, `crosscheck`, `tray`, `checkup`, `backing`, `badges`, `ticks`. Each places the claim and the source itself. A page none of them takes is drawn by the component renderer from y186. The page's `footnote` stands at the foot on y648, 11/16 in the grey. A page over a photograph lays the paper over it from the left (97% to 92% at the middle, 50% at the right edge).

**Why.** Every page says which part of the meeting it belongs to by its colour before a word is read, and the claim is one sentence a parent can repeat.

**What it gave up.**

- A subheading becomes a grey line under the claim, and such a page goes to the component renderer. None of the board's pages carried one.
- A page the band cannot hold is declined, not stepped aside.
- The body takes up to five components, and a waterfall may stand beside `icon_cards` and `kpi_cards`.
