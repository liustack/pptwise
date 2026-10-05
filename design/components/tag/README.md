# tag

`evidence`, `settled` and `tone`: a tag that names the kind of source a figure rests on, says whether a verdict is settled, or says what kind of news it is.

Code: [`src/components/tag.tsx`](../../../src/components/tag.tsx), schema in [`src/ir/components/shared.ts`](../../../src/ir/components/shared.ts).

## clinic, GLP-1 formulary review sample, 2026-10

Settled on the background page (p03), the head-to-head page (p06), the safety page (p08) and the formulary page (p13): see the boards in [compositions/readings](../../compositions/readings/clinic.board.png) and [compositions/table](../../compositions/table/clinic.board.png). The round's decisions are in [rounds/2026-10-05-clinic](../../rounds/2026-10-05-clinic/README.md).

**What it looks like.** A tag with `evidence` is outlined in the ink its kind of source takes, read from the theme: a trial and an official document in the primary, a label and a trial registry in the palette's first quieter colour, a draft out for comment in the next, a company's own figures in the warning ink, a press report in the muted ink. A tag with `settled: true` is filled. A tag with `tone` takes that tone's ink.

**Why.** Evidence is weighed by where it comes from, so the kind of source has a colour that holds across the whole deck.

**What it gave up.** One kind of source a tag.

## almanac, CBAM sample, 2026-10

`basis`. Settled on the timeline page (p03), the long curve page (p04), the bridge page (p05), the products page (p08), the actual-values page (p10), the carbon price page (p12), the rules page (p15) and the roadmap page (p16): see the boards in [compositions/calendar](../../compositions/calendar/almanac.board.png), [compositions/horizon](../../compositions/horizon/almanac.board.png) and [compositions/outlook](../../compositions/outlook/almanac.board.png). The round's decisions are in [rounds/2026-10-05-almanac](../../rounds/2026-10-05-almanac/README.md).

**What it looks like.** A tag's `basis` says what its figure or rule rests on. `"law"`: a provision in force, which the tag cites, printed with a § before it. `"estimate"`: a figure worked out under a stated assumption, not published and not a forecast (「演示 · 碳价冻结在 €75.36，不是预测」). `"pending"`: a figure still to be confirmed or filled in (「待核查后填入」). `"proposal"`: a rule proposed or still negotiated, not yet law. In the yearbook setting a law is outlined in the quiet ink, the other three are dashed in the accent, and a card, span or stem that carries one of them is dashed too. The ordinary tag dashes its outline for the three that are not settled.

**Why.** A board budgets on law and verified figures. What is only estimated, pending or proposed has to look different wherever it appears, and the same everywhere.

**What it gave up.** `basis` is a different question from `evidence` (what kind of source reported a figure), and a tag takes at most one of the two.
