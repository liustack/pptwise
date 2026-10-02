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

## bulletin, NEV sample, 2026-10

The notice setting, on bulletin's photo page. See the board and engine render in [faces/image-split](../../faces/image-split/), whose `notice` column hands its list to this composition. The round's decisions are in [rounds/2026-10-03-bulletin](../../rounds/2026-10-03-bulletin/README.md).

**What it looks like.** The label at 17px muted in a 210px column, the value at 26px bold from 226px in, rows 72px apart with a hairline between them. A value written `**figure**，note` is the marked row: the figure at 40px in primary and the note at 16px muted under it, in a 104px row.

**Why.** The photo page's list is the export figures, and one of them is the page's claim. Setting it at 40px in IKB makes it the one thing on the page that reads before the photograph.

**What it gave up.**

- Only a marked run at the start of the value is read as the figure. A mark anywhere else is painted as an ordinary marked run.
