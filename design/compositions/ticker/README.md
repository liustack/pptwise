# ticker

A row of headline figures set the way a market screen sets its quotes: label, figure, unit and a line that says which way it moved.

Code: [`src/layouts/compositions/ticker.tsx`](../../../src/layouts/compositions/ticker.tsx) (`drawTicker`). The header comment there is the contract. A face calls it: `compose` never offers it, since on a content page a row of figures stands in panels.

## ledger, AI capex sample, 2026-10

Settled on the cover. See the board and the engine render in [faces/stat-cover](../../faces/stat-cover/). The round's decisions are in [rounds/2026-10-04-ledger](../../rounds/2026-10-04-ledger/README.md).

**What it looks like.** Two to four cells on a 288px pitch, 150px tall, hairlines between them. Each cell: the label at 14px muted, the figure at 52px in the heading face, the unit at 15px, and a last line. A `delta` makes the last line the move, bold in the direction's colour after an arrow ("▲ 79%"). Otherwise it is the note in muted ink, or bold in the mark when the author marked it whole. A figure written `**…**` takes the mark.

**What it gave up.**

- One `kpi_cards` of two to four items with no icon and no source line.
- One line each for the label, unit and last line. A cell that does not fit declines the whole row, and the face declares the drop.
