# manuscript-sheet

thesis's ordinary content page: the running head with the page's section, the claim in the heading serif, the body handed to the shared compositions in the `manuscript` setting, and the page's sources as numbered notes.

Code: [`src/layouts/content-manuscript-sheet.tsx`](../../../src/layouts/content-manuscript-sheet.tsx), with the frame (`ManuscriptHead`, `ManuscriptSection`, `ManuscriptTitle`, `ManuscriptStandfirst`, `ManuscriptNotes`, `exhibitLabels`) in [`src/layouts/manuscript-shared.tsx`](../../../src/layouts/manuscript-shared.tsx). Used by thesis for every content kind but statement and quote.

## thesis, retirement age thesis proposal sample, 2026-10

Settled on every content page. The boards and engine renders are in the composition folders each page links from the round. The round's decisions are in [rounds/2026-10-06-thesis](../../rounds/2026-10-06-thesis/README.md).

**What it looks like.** At the top right the page's section in emerald (its `stage`, numbered by its place in the deck's `course`, 「§2　文献与缺口」, 12px bold, its number and name a full em apart), and a gold hairline across the type area on y52. The deck's label at the top left and the folio are the motif's. The claim at 30/42 bold in the heading serif in the ink from x64 across 1152px, on one line whenever it fits and broken at a comma or a colon when it does not, its last line ending on y150. A subheading becomes a standfirst at the body's top. The body runs from y168 down to 16px over the notes' rule, or to y648 without notes, and is offered to the compositions in this order: `inquiry`, `ladder`, `reach`, `backdrop`, `thresholds`, `tabulation`, `partition`, `findings`, `coverage`, `propositions`, `cadence`, `designs`, `hazards`, `itinerary`, `queries`. A page none of them takes is drawn by the component renderer in the same band. Figures and tables are numbered across the deck (a titled chart or timeline is a figure, a titled table, comparison or matrix a table, a captioned photograph on a photo page a figure) and the numbers handed to whatever draws the body. The page's `footnote`, one note a line, stands over the folio under a 180px pebble rule: each note's number in emerald bold, a full-width space, its words at 11/17 in the grey, the last line on y676.

**Why.** A thesis page is read as a page of the thesis: where it sits, what it claims, which figure it is, and where each number comes from.

**What it gave up.**

- Three notes at most, two lines each. A fourth note is declared dropped.
- A page with no `stage` carries no section, and a section too wide for the right half of the head is declared dropped.
- A page the band cannot hold steps aside to the plain sheet, and is declined when that cannot hold it either.
- The body takes up to four components.
