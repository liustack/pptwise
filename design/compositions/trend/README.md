# trend

One series as a line over its value axis, a marked value range tinted behind it, every point printing its value.

Code: [`src/layouts/compositions/trend.tsx`](../../../src/layouts/compositions/trend.tsx), drawn by `trendSeal` in [`plot-seal.tsx`](../../../src/layouts/compositions/plot-seal.tsx). The seal setting only.

## vermilion, government work report sample, 2026-10

Settled on the growth page, where `rail` sets it beside two figures. See the board and engine render in [compositions/rail](../rail/vermilion-p09.board.png). The round's decisions are in [rounds/2026-10-04-vermilion](../../rounds/2026-10-04-vermilion/README.md).

**What it looks like.** One `line` chart of one series and up to one `bands` entry. Ticks on a 40px gutter at round steps, dashed grid lines, the band tinted in the accent with its label at 15px bold. The line 3px in the mark, every point a ring with its value above it at 16px, the last point filled and its value at 18px in the mark. Values print with the decimals their neighbours carry.

**Why.** A growth path is read against its target range. The range behind the line says at a glance which quarters fell inside it.
