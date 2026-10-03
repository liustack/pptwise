# panel-sheet

ledger's ordinary content page: the claim in a serif across the whole measure, the body handed to the compositions in the panel setting, and the source in 13px at the foot.

Code: [`src/layouts/content-panel-sheet.tsx`](../../../src/layouts/content-panel-sheet.tsx), with the frame in [`src/layouts/panel-shared.tsx`](../../../src/layouts/panel-shared.tsx) (`PanelHead`, `PanelSource`, `panelBodyRect`). Used by ledger.

## ledger, AI capex sample, 2026-10

Every content page of the board but the fact page and the photo page carries this frame. See the boards of the compositions it hands its body to, for example [compositions/tiles](../../compositions/tiles/ledger.board.png) and [compositions/records](../../compositions/records/ledger-p07.board.png). The round's decisions are in [rounds/2026-10-04-ledger](../../rounds/2026-10-04-ledger/README.md).

**What it looks like.** Under the status bar, the claim in the heading face at regular weight, 31/42, across the full 1152px from x64, at most two lines, set on its last line at y130. A claim too long for two lines shrinks toward 26px before it is cut. The body runs from y152 to y648, and the source is 13/18 muted from y664 in up to two lines. A subheading becomes a 17px muted standfirst under the claim and the body moves down for it.

**Why.** ledger's old content pages each had their own header, so the deck read as several templates. One header across the full measure leaves the panels to carry the evidence, and the claim never breaks early because its box is narrower than the page.

**What it gave up.**

- The body is one composition in the panel setting (`tiles`, `records`, `table`, `rail`, `figures`, `lanes`, `shifts`, `columns`, `bars`) or, when none takes it, the ordinary component renderer in the same band. A page the band cannot hold steps aside, or declares the drop when the step-aside sheet cannot hold it either.
- The ordinary component renderer does not draw panels. A chart shape the panel setting does not take (a grouped bar chart with an axis title, a pie, a line chart) is drawn the way every theme draws it, in ledger's palette.
- The 13px source is below the engine's 16px floor and carries the `panel-spec` exemption by name.
