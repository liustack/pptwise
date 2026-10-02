# numbered_cards

`items[].emphasis`: the author marks the one card the page lands on.

Code: [`src/components/numbered-cards.tsx`](../../../src/components/numbered-cards.tsx), schema in [`src/ir/components/numbered-cards.ts`](../../../src/ir/components/numbered-cards.ts).

## bulletin, NEV sample, 2026-10

Settled on the overview page. See the board and engine render in [compositions/rows](../../compositions/rows/), whose notice setting reverses the marked card out of a primary block. The round's decisions are in [rounds/2026-10-03-bulletin](../../rounds/2026-10-03-bulletin/README.md).

**What it looks like.** In the ordinary component, the marked card's pill fills with primary, its words turn to primary's readable ink, and its number badge inverts. Titles and texts paint `**…**` runs in the theme's emphasis.

**Why.** A list of findings usually ends in the one that matters. The card printed `**` as asterisks before, and neither validate nor the audit noticed: the audit now reports any text that prints a mark (`content-dropped`, kind `emphasis`).

**What it gave up.**

- One marked card per list. validate refuses a second.
