# console-cover

terminal's cover: a full-bleed photograph darkened from the left, the crumb, the title, a short bar, the subtitle and a mono status line.

Code: [`src/layouts/cover-console-cover.tsx`](../../../src/layouts/cover-console-cover.tsx), the darkening in [`src/layouts/console-photo.tsx`](../../../src/layouts/console-photo.tsx).

## terminal, cloud outage review sample, 2026-10

| board (p01) | engine |
| :-: | :-: |
| ![board](terminal.board.png) | ![engine](terminal.engine.png) |

The round's decisions are in [rounds/2026-10-05-terminal](../../rounds/2026-10-05-terminal/README.md).

**What it looks like.** The page's own `background` photograph full bleed, under one linear gradient of the page colour from the left: 94% at the left edge, 78% at 45% of the width, 15% at the right edge. The crumb 「● 00 / 基础架构组 · 技术评审 · 2026-10」, the organization where a section's name stands and the date where the page number stands. The title bold at 60/76 from x64, one line when it fits, two when it must, its last line on y445. A 64 by 3 bar of the mark under it, the subtitle at 21px in the muted ink, and the `kicker` in 14px mono at the foot after a dot in the mark: 「13 起事故 · 2025-06 → 2026-09 · 只用官方复盘和状态页」.

**Why.** The cover says what the room is about to look at and how far the evidence reaches, the way a console's status line does.

**What it gave up.**

- A cover with a photograph used to go to the shared image cover, which drew no kicker and no components. The face now declares that it draws its own photograph (`drawsPhoto` on its layout definition), so the route keeps it and the engine adds no darkening of its own.
- With no photograph the words stand where they are on the page colour.
