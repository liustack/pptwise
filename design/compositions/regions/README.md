# regions

Places set side by side in columns, each with the figure a page is about.

Code: [`src/layouts/compositions/regions.tsx`](../../../src/layouts/compositions/regions.tsx). The header comment there is the contract. The binder setting only.

## proposal, rooftop solar and storage proposal sample, 2026-10

Settled on the three provinces page (p05). The round's decisions are in [rounds/2026-10-06-proposal](../../rounds/2026-10-06-proposal/README.md).

| board (p05) | engine |
| :-: | :-: |
| ![board](proposal.board.png) | ![engine](proposal.engine.png) |

The board in the table is the first round's. The print round set this page by the redrawn board's rules, and the engine render shows the page as it is set now.

**What it looks like.** A column a place, the columns under a hairline and parted by hairlines: its name at 24px in petrol, the document under it in small grey, a hairline, then each labelled row as its label in small grey over its value at 16px bold, and the marked row as its label over a figure at 36px in petrol, an aside in brackets on that figure set after it in small grey (「约 0.76（示意）」). Last, the closing row as a verdict a column, bold in petrol, the one marked whole in the brick red. Under the columns, the note as a line after its grey icon, its title bold before its text.

**Why.** The same rule reads differently by place. One column each, with the figure in the same spot, lets the reader compare across without boxing every place.

**What it gave up.**

- Takes a `comparison` of two to four columns with no title, label column, tags, icons or recommendation, optionally a first row with no label, one to three labelled rows with exactly one marked, optionally a last row with no label, at most one of whose cells is marked whole, then optionally a `callout` with a title and no tag.
- A name past one line, a line, label or value past its column, a verdict past one line or a note past two lines sends the page back.
