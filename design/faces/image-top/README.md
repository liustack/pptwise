# image-top

The top takeover: a photograph across the top of the page, the heading and the page's other blocks under it.

Code: [`src/render/image-pages.tsx`](../../../src/render/image-pages.tsx) (`ImageTopPage`, `GridTopPage`). Shared by almanac, crayon, homeroom, rally, stage and swiss.

## swiss, power sample, 2026-10

The round's decisions are in [rounds/2026-10-03-swiss](../../rounds/2026-10-03-swiss/README.md).

| board (p10) | engine |
| :-: | :-: |
| ![board](swiss.board.png) | ![engine](swiss.engine.png) |

**What it looks like.** swiss's menu asks for the `grid` band (`params: { band: "grid" }`). The photograph runs edge to edge down to y330, the motif's red bar over its top edge. The claim is 34/46 bold across 1120px on its last line at y392, a 2px black rule at y418, and from y444 the figures as [`figures`](../../compositions/figures/) sets them in the grid setting: here three at 46px, since 「70 美元/千瓦时」 fits its column at no larger size. The source sits at the foot in 14px.

**Why.** The grid frame with the photograph in place of the chapter line, so the photo page reads as part of the same report.

**What it gave up.**

- The `standard` band, which every other theme keeps, is unchanged.
- A two-line claim takes its second line out of the photograph, not out of the figures.
- A page that is not one photograph, or whose other blocks the band cannot hold, is drawn as a grid sheet.
