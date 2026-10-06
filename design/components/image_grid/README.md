# image_grid

`items[].icon`.

Code: [`src/ir/components/image-grid.ts`](../../../src/ir/components/image-grid.ts), [`src/components/image-grid.tsx`](../../../src/components/image-grid.tsx).

## terminal, cloud outage review sample, 2026-10

Settled on the physical failures page (p08): see the board in [compositions/plates](../../compositions/plates/terminal.board.png). The round's decisions are in [rounds/2026-10-05-terminal](../../rounds/2026-10-05-terminal/README.md).

**What it looks like.** An icon in place of the accent rule before a caption in the ordinary grid, and before the mono caption in the console `plates`. A caption is required when an icon is set.

**Why.** A caption names where and when, and a symbol says what kind of failure it was.

**What it gave up.** Faces that set a gallery by hand decline a caption icon.

## proposal, rooftop solar and storage proposal sample, 2026-10

Settled on the solution page (p11): see the board and engine render in [compositions/parts](../../compositions/parts/). The round's decisions are in [rounds/2026-10-06-proposal](../../rounds/2026-10-06-proposal/README.md).

**What it looks like.** A picture can carry a `tag`, drawn as a white chip at its top right corner (「选配」). A tag with a `basis` of estimate, pending or proposal marks the part as not settled.

**Why.** One part of an offer can be optional. A tag on its picture says so where the eye already is.

**What it gave up.**

- The compositions that set pictures as rows or a gallery decline a tagged grid rather than drop the tag.
