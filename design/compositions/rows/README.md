# rows

A short list set as ruled, numbered rows, each a bold label and its gloss, with an optional closing line reversed out of a primary block.

Code: [`src/layouts/compositions/rows.tsx`](../../../src/layouts/compositions/rows.tsx). The header comment there is the contract: what it takes, when it declines, the band it needs, the tokens it reads.

## brief, 2026-10

| board (p05) | engine |
| :-: | :-: |
| ![board](brief.board.png) | ![engine](brief.engine.png) |

**What it looks like.** A muted "01" at 18px, the label in bold primary at 26px in a 360px column, the gloss in body ink at 26px from x520, and a hairline under each row, 88px apart when every row is one line. The closing line sits in a full-width primary block in white at 28/40, the only solid shape on the page.

**Why.** The page says "each cause is this", and a label beside its gloss reads as a table without drawing one. Numbers give the order without bullets. The closing block says the "so what" once, and its weight is what makes the rows above it read as evidence.

**What it gave up.**

- Only "Label: gloss" items split into two columns (a full-width colon, or an ASCII colon followed by a space, so "10:30" stays whole). Any other item runs across both columns.
- Text is set at the board's sizes or not at all. Two to five items, every label and gloss within two lines, the closing line within three. Anything else goes back to the face, which draws an ordinary bullet list.
- A warning callout or one with an icon is declined: the block has no place for an icon, and a warning is not a conclusion.
- A marked run in the closing block turns bold instead of taking the theme's highlight, which would sit on primary with no contrast.
- The label column was sized for English labels. Short Chinese labels leave it airy, as the engine render shows.

## Since the tea sample, 2026-10

The closing block moved to [`src/layouts/compositions/closing.tsx`](../../../src/layouts/compositions/closing.tsx), shared with `table`, `track` and `figures`, each at the size its board gives it. Rows draws it byte for byte as before.

## bulletin, NEV sample, 2026-10

The notice setting (`setting: "notice"`), which bulletin's `notice-sheet` passes. The round's decisions are in [rounds/2026-10-03-bulletin](../../rounds/2026-10-03-bulletin/README.md).

| board (p02) | engine |
| :-: | :-: |
| ![board](bulletin.board.png) | ![engine](bulletin.engine.png) |

**What it looks like.** Each row is a 104px band with a hairline between rows: the number bold in primary at 26px, the label black and bold at 22px in a 280px column from 104px in, and the gloss at 19/30 from 400px in. It takes `numbered_cards` as well as bullets. The card the author marks (`items[].emphasis`) is reversed out of a primary block 8px clear of the row above, and is the page's answer. A closing callout becomes the light grey panel, not a primary block.

**Why.** IKB is spent once a page, so the answer row takes it and nothing else does. The number in primary carries the brand on the other rows without competing with the answer.

**What it gave up.**

- A card with a `sub` line is declined.
- Three to five cards, or two to five bullets. Rows shrink to 84px before the composition declines.
