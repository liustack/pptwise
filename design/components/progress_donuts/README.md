# progress_donuts

`items[].detail` and `items[].emphasis`: a rate says what it is made of, and the author marks the rate the page is about.

Code: [`src/components/progress-donuts.tsx`](../../../src/components/progress-donuts.tsx), schema in [`src/ir/components/progress-donuts.ts`](../../../src/ir/components/progress-donuts.ts).

## vermilion, government work report sample, 2026-10

Settled on the funds page. See the board and engine render in [compositions/rings](../../compositions/rings/vermilion.board.png). The round's decisions are in [rounds/2026-10-04-vermilion](../../rounds/2026-10-04-vermilion/README.md).

**What it looks like.** `detail` prints the amounts behind a rate, such as 「11770 / 13000 亿元」, on a line under its label and before its source. `emphasis` sets the one rate the page is about, its ring, figure and label, in the emphasis colour. vermilion's `rings` sets the detail at 16px under the name and the source at 15px under it.

**Why.** 90.5% of what? The amounts are what make a completion rate mean something to the room.

**What it gave up.**

- At most one marked rate: validate refuses two.
