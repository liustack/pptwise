# sketch

A new component: the shape of the argument a study rests on, drawn without figures.

Code: [`src/components/sketch.tsx`](../../../src/components/sketch.tsx), schema in [`src/ir/components/sketch.ts`](../../../src/ir/components/sketch.ts).

## thesis, retirement age thesis proposal sample, 2026-10

Settled on the identification page (p14): see the board and engine render in [compositions/designs](../../compositions/designs/). The round's decisions are in [rounds/2026-10-06-thesis](../../rounds/2026-10-06-thesis/README.md).

**What it looks like.** `kind: "discontinuity"` draws an outcome jumping at a cutoff: scattered points, two fitted lines that do not meet, a dashed line at the cutoff (`at`), and the jump's arrow with its name (`effect`). `kind: "difference_in_differences"` draws a treated group's trend leaving its control's after an event: two lines, the path the treated group would have kept dashed, a dashed line at the event, both groups named at their ends (`groups`). Both name their axes (`x_title`, `y_title`), and `direction` mirrors either. The ordinary renderer draws it with 16px labels, and `designs` draws it small inside a design's card with the cutoff in gold.

**Why.** A committee judges a design by how it tells an effect apart. A sketch says that before the terms are read, and it claims no result the study does not have.

**What it gave up.** Two kinds. A sketch has no data, so it cannot be read as a finding.
