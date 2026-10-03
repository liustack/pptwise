# grid-sheet

swiss's ordinary content page: the chapter line, a black bold claim across the full measure over a 2px black rule, the body handed to the compositions in the grid setting, and the source in 14px at the foot.

Code: [`src/layouts/content-grid-sheet.tsx`](../../../src/layouts/content-grid-sheet.tsx), with the frame in [`src/layouts/grid-shared.tsx`](../../../src/layouts/grid-shared.tsx) (`GridHead`, `GridSource`).

## swiss, power sample, 2026-10

Every content page of the board carries this frame. See the boards of the compositions it hands its body to, for example [compositions/records](../../compositions/records/swiss.board.png) and [compositions/bridge](../../compositions/bridge/swiss.board.png). The round's decisions are in [rounds/2026-10-03-swiss](../../rounds/2026-10-03-swiss/README.md).

**What it looks like.** Over the claim, at y44, the chapter's number in 15px bold in the theme's emphasis ink and the chapter's name in 15px muted, read off the deck. A page before the first chapter prints no line. The claim is 34/46 bold black across the full 1120px from x80, at most two lines, set on its last line at y156. A 2px black rule from x80 to x1200 at y180. The body runs from y196, and the source is 14/20 muted at the foot, last baseline y666. A subheading becomes an 18px muted standfirst under the rule.

**Why.** The old swiss gave every data page a black title band with a section badge, so black meant chrome rather than data. One quiet header leaves black for the data and red for the one thing each page marks.

**What it gave up.**

- A body no composition takes is drawn by the ordinary component renderer in the same band, and a page the band cannot hold steps aside.
- The 15px chapter line and the 14px source are below the engine's 16px floor. The audit exempts both by name (`data-font-floor-exempt="grid-spec"`).
- The grid setting offers records, share, rail, columns, bridge, lanes and figures (the last on the statement and photo pages). Rows, tables, stacks, windows and horizontal bars have no swiss board yet and are drawn by the ordinary components.
