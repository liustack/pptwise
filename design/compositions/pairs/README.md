# pairs

A short list of "Label: value" facts set as ruled pairs for a narrow column, the label small and muted, the value beside it.

Code: [`src/layouts/compositions/pairs.tsx`](../../../src/layouts/compositions/pairs.tsx). The header comment there is the contract.

## brief, tea sample, 2026-10

Settled on the photo page. See the board and engine render in [faces/image-split](../../faces/image-split/), whose `report` column hands its list to this composition.

**What it looks like.** A hairline over every pair and one under the last, 64px apart when every pair takes one line. The label at 17px muted in a 120px column, the value at 22px in body ink from 128px in.

**Why.** Beside a photograph, four facts about a city read as a ledger, not as bullets. The rules give the column the same order the facts have.

**What it gave up.**

- Every item must be written "Label: value" (a full-width colon, or an ASCII colon followed by a space). One item without a label sends the whole list back to the ordinary bullets.
- Two to six pairs, labels and values within two lines each.
- It is offered only by a face that asks for it. brief's sheets leave it out, because across the whole page it would take a list `rows` turned down.
