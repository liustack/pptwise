# spots

Where the plan meets its crowd: a photograph and a card a place.

Code: [`src/layouts/compositions/spots.tsx`](../../../src/layouts/compositions/spots.tsx). The header comment there is the contract. The marquee setting only.

## rally, summer concert season proposal sample, 2026-10

Settled on the touchpoint map (p09). The round's decisions are in [rounds/2026-10-06-rally](../../rounds/2026-10-06-rally/README.md).

| board (p09) | engine |
| :-: | :-: |
| ![board](rally.board.png) | ![engine](rally.engine.png) |

**What it looks like.** Two to four places in two columns, each a photograph 260 by 196 with a card beside it: the place's icon and name at 24px, what the plan does there, and a small grey note on the picture at the card's foot. The first card is outlined in the magenta when the grid marks it (`emphasis: "first"`), its icon in the magenta; the others' icons are grey. Under them a closing line in bold, in the gold for a `warn` callout.

**Why.** Four places, one job in each. The photograph makes each place real and the card says the one thing the brand does there.

**What it gave up.**

- A caption is written "name：what is done there", and may add a sentence about the picture (「…，杯上带码。示意图（AI 生成）」). The colon and the full stop are declared on their lines (`data-gloss-break`), not printed.
- An `image_grid` of two to four items, each with an icon and a caption written that way; then optionally a `callout` with no title, icon or tag.
- The closing line stands at y622, as on the board, and rises to clear a source line on a page that has one.
- A name past one line, what is done past two lines, a note past one line or the closing line past one line sends the page back.
