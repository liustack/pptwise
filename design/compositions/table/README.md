# table

A comparison set as an open ruled table, with the recommended option lifted onto its own column.

Code: [`src/layouts/compositions/table.tsx`](../../../src/layouts/compositions/table.tsx). The header comment there is the contract.

## brief, 2026-10

| board (p07) | engine |
| :-: | :-: |
| ![board](brief.board.png) | ![engine](brief.engine.png) |

**What it looks like.** Row labels small (18px) and muted in a 280px column on the left. Options across the rest. The recommended option sits on a `surface` column that runs the table's full height, under a header reversed out of primary, with its values bold in primary. The other options have a muted header and values in body ink. Hairlines between rows, none under the last.

**Why.** The page exists to say "pick this one". A column on its own ground lets the eye read down the pick while the alternatives stay legible beside it, and the filled header marks the choice without colouring any words.

**What it gave up.**

- The lift needs the author to name the pick (`comparison.recommended`). Without it the table is plain, with no column favoured.
- Two or three options, at most five rows, headers in one line and cells in two at 24px. A bigger comparison goes back to the ordinary comparison component.
- The pick's column is only visible where `surface` differs from the page. On a theme whose card and page are the same colour, the pick is carried by its header and its bold type alone.
- A marked cell (`**…**`) takes the theme's highlight, measured against the column it sits on.
