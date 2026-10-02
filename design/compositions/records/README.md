# records

A data table set open, the way a report prints one: small headers over a black rule, one 50px row per record, a highlighted row on a pale tint of the primary colour, and an optional note on a light panel under it.

Code: [`src/layouts/compositions/records.tsx`](../../../src/layouts/compositions/records.tsx). The closing panel is `paintNoticeClosing` in [`closing.tsx`](../../../src/layouts/compositions/closing.tsx).

## bulletin, NEV sample, 2026-10

Settled on the company table. The round's decisions are in [rounds/2026-10-03-bulletin](../../rounds/2026-10-03-bulletin/README.md).

| board (p07) | engine |
| :-: | :-: |
| ![board](bulletin.board.png) | ![engine](bulletin.engine.png) |

**What it looks like.** Headers at 16px muted, a black 1px rule under them, then rows 50px tall with cells at 19px on one line and a hairline under each row. The first column is inset 16px. Columns take their widest text and share the rest. The highlighted row (`emphasis: "highlight"`) sits on a pale primary tint with every cell bold in primary. A `warn` callout after the table becomes a light grey panel with a stroked circle and an exclamation mark before its words at 20px.

**Why.** Six companies and three facts each are a table, and a table reads best with nothing between the reader and the numbers. One tinted row says which company the page is about. The warning is a different kind of fact from the rows, so it gets its own panel instead of a seventh row.

**What it gave up.**

- Two to six columns, at most eight rows, every cell on one line.
- No `source` on the table itself: the page's source line is where a source goes.
- A highlighted row is IKB bold across every cell, where the board set the name and the change only.
