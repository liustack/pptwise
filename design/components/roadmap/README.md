# roadmap

`items[].emphasis`: the author marks the one phase the page is about.

Code: [`src/components/roadmap.tsx`](../../../src/components/roadmap.tsx), schema in [`src/ir/components/roadmap.ts`](../../../src/ir/components/roadmap.ts).

## brief, 2026-10

Settled on the plan page. See the board and engine render in [compositions/waves](../../compositions/waves/).

**What it looks like.** In the ordinary roadmap component, the marked card keeps the accent bar and every other card's bar turns primary. With nothing marked every bar stays accent, as before. In `waves`, the marked phase's bar is the accent and the rest are primary.

**Why.** A plan page usually asks for one phase now. Spending the accent on that phase alone says so without another label.

**What it gave up.**

- At most one marked phase.

## terminal, cloud outage review sample, 2026-10

`items[].icon`. Settled on the roadmap page (p15): see the board in [compositions/waves](../../compositions/waves/terminal.board.png). The round's decisions are in [rounds/2026-10-05-terminal](../../rounds/2026-10-05-terminal/README.md).

**What it looks like.** The ordinary roadmap sets a phase's icon where its badge number stood. The console form sets it at the card's top right.

**Why.** A phase named "限流与退避" and one named "第二区域温备" read faster with a symbol each.

**What it gave up.** Nothing a roadmap drew before: a phase with no icon keeps its number.

## almanac, CBAM sample, 2026-10

`rows[].basis`. Settled on the roadmap page (p16): see the board in [compositions/phases](../../compositions/phases/almanac.board.png). The round's decisions are in [rounds/2026-10-05-almanac](../../rounds/2026-10-05-almanac/README.md).

**What it looks like.** A row whose value is not settled (a budget line still to be priced, 「核算与核查费用：待定」) is underlined dashed in the ordinary roadmap, and stands at its card's foot in a dashed pill in the yearbook setting.

**Why.** A plan that asks for money shows which of its lines are not priced yet.

**What it gave up.** A row's value is two lines at most. One cut there is now marked, as its label already was.

## homeroom, AI-at-work training sample, 2026-10

`items[].duration`, `duration_unit`, `items[].checkpoint` and `items[].points`. Settled on the agenda page (p03): see the board in [compositions/syllabus](../../compositions/syllabus/homeroom.board.png). The round's decisions are in [rounds/2026-10-06-homeroom](../../rounds/2026-10-06-homeroom/README.md).

**What it looks like.** The ordinary roadmap adds a phase's length to its period line (「环节一 · 15 分钟」), its points as a short list under the title and its checkpoint as a tag under them. `syllabus` lays the phases to scale on a bar and rings each checkpoint where its phase ends.

**Why.** A lesson plan is phases with lengths and checks; writing them as fields lets a face lay them to scale.

**What it gave up.**

- A length on every phase or none, in one unit.
- A page whose roadmap carries any of the four is offered to `syllabus` alone among the hand-set roadmaps.
