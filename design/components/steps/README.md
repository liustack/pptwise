# steps

`items[].icon` and `items[].tone`: a step with a symbol in place of its number, and a step that can stop the process.

Code: [`src/components/steps.tsx`](../../../src/components/steps.tsx), schema in [`src/ir/components/steps.ts`](../../../src/ir/components/steps.ts).

## clinic, GLP-1 formulary review sample, 2026-10

Settled on the prescription review page (p15): see the board in [compositions/gate](../../compositions/gate/clinic.board.png). The round's decisions are in [rounds/2026-10-05-clinic](../../rounds/2026-10-05-clinic/README.md).

**What it looks like.** In the ordinary steps an `icon` replaces the step's number in its badge, and a `tone` rings the badge in that tone's ink: `"danger"` for a check that can stop the process, `"warning"` for one to watch, `"success"` for one that confirms it can go on. clinic's `gate` keeps the number, sets the icon at the card's top right, and sends a dashed line from each stopping step into the stop box.

**Why.** A review step is recognised by what it checks, and the steps that can refuse have to be told apart.

**What it gave up.** clinic's `gate` takes `"danger"` only, and declines steps with another tone.
