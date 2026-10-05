# concept_equation

`terms[].icon`, `result.icon` and `excluded`: a symbol on each term, and what the result leaves out on purpose.

Code: [`src/components/concept-equation.tsx`](../../../src/components/concept-equation.tsx), schema in [`src/ir/components/concept-equation.ts`](../../../src/ir/components/concept-equation.ts).

## ember, low-altitude delivery pitch sample, 2026-10

Settled on the wedge page (p08): see the board in [compositions/equation](../../compositions/equation/ember.board.png). The round's decisions are in [rounds/2026-10-06-ember](../../rounds/2026-10-06-ember/README.md).

**What it looks like.** In the ordinary equation a term's `icon` sits at the top of its panel, above the figure, and every panel grows to hold it. `excluded` is a term with a label, a value, a note and an optional icon (「先不做」, 「核心城区的餐饮高峰单」, 「它排在放行顺序最后」), drawn under the panels in a dashed outline with its value struck through by a drawn line. `equation` sets the icon beside the term's name and the exclusion in a dashed box under the sum.

**Why.** A wedge is a choice, and a choice is clearer when it names what it leaves for later. A symbol on each term lets the room tell the reasons apart before reading them.

**What it gave up.**

- An exclusion needs a value to strike: validate refuses one without.
- The strike is a line the engine draws over the value's width (`data-strike`), which the gallery's audit knows is on purpose.
