# kpi_cards

`items[].note`: the line under a figure that puts it in context.

Code: [`src/ir/components/kpi-cards.ts`](../../../src/ir/components/kpi-cards.ts), [`src/components/kpi.tsx`](../../../src/components/kpi.tsx).

## brief, tea sample, 2026-10

Settled on the chart pages and the three-figures page. See the boards and engine renders in [compositions/rail](../../compositions/rail/) and [compositions/figures](../../compositions/figures/).

**What it looks like.** In the tea board's open figures, a small label above the figure and the note under it in body ink: "门店数同比 / +20.7% / 6 月末共 63,987 家". In the ordinary card the note is a 16px line in body ink under the label, before any source line, and the card grows a line for it.

**Why.** A headline figure usually needs two words more than its label: the base it was measured from, the period, or the counts behind it. Putting them in the label made the label run long, and putting them in `source` named them as a citation.

**What it gave up.**

- Faces that set one figure as a hero (stat-hero and its theme skins, gauge-figure's lead figure) or a fixed row of columns (show-figures, gauge-stats) have no place for a note, and a page that writes one goes to the ordinary cards.

## ledger, AI capex sample, 2026-10

The ordinary card's delta arrow, settled while the supplier page's figures were drawn. See the figure panels in [compositions/rail](../../compositions/rail/ledger-p11.board.png). The round's decisions are in [rounds/2026-10-04-ledger](../../rounds/2026-10-04-ledger/README.md).

**What it looks like.** The up or down arrow follows the figure and its unit on the same line, and the figure is fitted to the room the arrow leaves. The panel forms set it the same way, 10px after the figure.

**Why.** The arrow used to stand alone in the card's top right corner, where a long figure such as 「600 至 640 亿」 ran under it, and the audit did not see the overlap.

**What it gave up.** Nothing a card drew before: a card with no `delta` is unchanged.

## vermilion, government work report sample, 2026-10

`items[].tag`: a few words saying what a figure is, such as 「约束性指标」 or "Binding". Settled on the carbon page. See the board and engine render in [faces/seal-figure](../../faces/seal-figure/vermilion.board.png). The round's decisions are in [rounds/2026-10-04-vermilion](../../rounds/2026-10-04-vermilion/README.md).

**What it looks like.** The ordinary cards print the tag as a small label on a row under the figure's label, filled in the emphasis colour on the figure the page marks with `**…**` and outlined on the others. vermilion's figure page sets the lead figure's tag filled under the figure.

**Why.** A target that binds and one that is only expected read the same as numbers. The tag says which kind it is where the eye already is.

**What it gave up.**

- A face that sets figures by hand with no place for a tag hands the page to the ordinary cards.
