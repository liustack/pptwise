# icon_cards

`items[].tag`.

Code: [`src/ir/components/icon-cards.ts`](../../../src/ir/components/icon-cards.ts), [`src/components/icon-cards.tsx`](../../../src/components/icon-cards.tsx).

## terminal, cloud outage review sample, 2026-10

Settled on the recovery page (p07): see the board in [compositions/cards](../../compositions/cards/terminal-p07.board.png). The round's decisions are in [rounds/2026-10-05-terminal](../../rounds/2026-10-05-terminal/README.md).

**What it looks like.** A tag under the card's icon in the ordinary cards, and at the card's top right in mono in the console HUD cards: 「Azure 2026-02」.

**Why.** Each cause is backed by one incident, and the tag names it without a footnote.

**What it gave up.** The bento grid keeps a tagged `icon_cards` whole rather than splitting its items into cells.

## proposal, rooftop solar and storage proposal sample, 2026-10

Settled on the storage safety page (p14): see the board and engine render in [compositions/safeguards](../../compositions/safeguards/). The round's decisions are in [rounds/2026-10-06-proposal](../../rounds/2026-10-06-proposal/README.md).

**What it looks like.** A set of cards can carry a `title`, set over the cards as a small line, and a card a `tone` (`danger` for a lesson from an incident): its icon takes the tone's ink.

**Why.** Two sets of cards on one page need names, and a lesson from a fire reads differently from a rule.

**What it gave up.**

- The bento grid keeps a titled set whole. A composition that draws a set of cards with no title declines a titled one.
