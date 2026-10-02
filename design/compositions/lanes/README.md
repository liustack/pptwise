# lanes

A timeline on one axis across the page, its milestones as equal columns, the first lane's cards above the axis and the second's below it.

Code: [`src/layouts/compositions/lanes.tsx`](../../../src/layouts/compositions/lanes.tsx). The header comment there is the contract.

## bulletin, NEV sample, 2026-10

Settled on the regulation page. The round's decisions are in [rounds/2026-10-03-bulletin](../../rounds/2026-10-03-bulletin/README.md).

| board (p11) | engine |
| :-: | :-: |
| ![board](bulletin.board.png) | ![engine](bulletin.engine.png) |

**What it looks like.** The lane names (`timeline.lanes`, or the lanes the milestones name) sit at the left in primary bold. The axis runs across the page, and each milestone, in time order, takes an equal column: a 7px node on the axis, a thin line up or down to its card, and the card's date, bold title (two lines at most) and description (three at most), all at 16px. A highlighted milestone has a filled node and its line, date and title in primary. A closing note sits on a light panel at the foot.

**Why.** Home rules and trade rules move on one calendar, and the reader needs both the order and which side each rule is on. One axis with two sides shows both without two charts.

**What it gave up.**

- Two to eight milestones on a horizontal timeline, at most two lanes. A timeline with no lanes stands every card above the axis.
- Cards never cross the axis: the axis rises when the lower lane and the note need room, and the composition declines when it cannot.
- 16px everywhere, where the board set some lines at 15px.
