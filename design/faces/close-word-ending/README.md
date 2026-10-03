# close-word-ending

ledger's ending: what the page asks for, the decision in a serif, and under a hairline the signals to watch in panels, with a disclaimer at the foot.

Code: [`src/layouts/ending-close-word-ending.tsx`](../../../src/layouts/ending-close-word-ending.tsx). Used by ledger.

## ledger, AI capex sample, 2026-10

The round's decisions are in [rounds/2026-10-04-ledger](../../rounds/2026-10-04-ledger/README.md).

| board (p15) | engine |
| :-: | :-: |
| ![board](ledger.board.png) | ![engine](ledger.engine.png) |

**What it looks like.** The page's `kicker` at 15px in amber from y120 ("请投委会定"). The decision in the heading face at regular weight, 52/70, at most two lines, set on its last line at y302, the run written `**…**` in amber. A 1px border hairline at y340, the subheading at 14px muted under it ("接下来盯三个信号"), and from y396 the first `bullets` as panels 176px tall on a 384px pitch: a 14px amber number, the label at 30px in the heading face and the gloss at 17/26. An item written 「标签：说明」 is split at the colon. The page's `footnote` sits at the foot in the source's 13px.

**Why.** A committee leaves the room with one decision and a short list of what would change it. The panels are the deck's own grammar, so the last page reads as part of the screen.

**What it gave up.**

- The old close-word-ending set two lines over a wavy line and nothing else. The disclaimer had to go into the subtitle, since a boundary page refused a footnote. A boundary face now declares the page fields it draws (`pageFields`), and validate accepts this face's `kicker` and `footnote`.
- Two to four panels. Fewer than three keep the 384px pitch and end short of the measure, as the board's row does. A label past one line or a gloss past two declares the drop.
- No thank-you and no contact sheet.
