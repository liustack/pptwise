# pitch-chapter

ember's act: the act's number outlined huge in the fire over a photograph darkening toward the left.

Code: [`src/layouts/chapter-pitch-chapter.tsx`](../../../src/layouts/chapter-pitch-chapter.tsx).

## ember, low-altitude delivery pitch sample, 2026-10

Settled on the two acts (p02, p07). The round's decisions are in [rounds/2026-10-06-ember](../../rounds/2026-10-06-ember/README.md).

| board (p02) | engine |
| :-: | :-: |
| ![board](ember-p02.board.png) | ![engine](ember-p02.engine.png) |

| board (p07) | engine |
| :-: | :-: |
| ![board](ember-p07.board.png) | ![engine](ember-p07.engine.png) |

**What it looks like.** The page's own `background` photograph fills the page under a darkening of the stage's colour from the left (96% at the edge, 85% at 46% of the width, 15% at the right). At the top left the act's number (「01」, 「02」) at 200px with no fill and a 2px outline of the fire, from y120. Under it the act's title bold at 46/60 in the ivory, its last line ending at y460, up to two lines. Then the act's points (the page's `row_cards`, up to four) from y494, 44px apart, each a 20px icon in the warm grey and a line at 17px in the ivory. Without a photograph the words stand on the stage.

**Why.** An act page tells the room what the next few minutes cover. The number is the only light, so the eye goes from the count to the title to what comes.

**What it gave up.**

- No motif, no running order and no page number: footer marks are printed on content pages only (`ir/footer.ts`).
- More than four points is refused by validate.
- The outlined number exports as outlined text and is declared foreground (`data-depth="fg"`), so the depth rules do not recede it as a background numeral.
