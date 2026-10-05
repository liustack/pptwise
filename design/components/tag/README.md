# tag

`evidence`, `settled` and `tone`: a tag that names the kind of source a figure rests on, says whether a verdict is settled, or says what kind of news it is.

Code: [`src/components/tag.tsx`](../../../src/components/tag.tsx), schema in [`src/ir/components/shared.ts`](../../../src/ir/components/shared.ts).

## clinic, GLP-1 formulary review sample, 2026-10

Settled on the background page (p03), the head-to-head page (p06), the safety page (p08) and the formulary page (p13): see the boards in [compositions/readings](../../compositions/readings/clinic.board.png) and [compositions/table](../../compositions/table/clinic.board.png). The round's decisions are in [rounds/2026-10-05-clinic](../../rounds/2026-10-05-clinic/README.md).

**What it looks like.** A tag with `evidence` is outlined in the ink its kind of source takes, read from the theme: a trial and an official document in the primary, a label and a trial registry in the palette's first quieter colour, a draft out for comment in the next, a company's own figures in the warning ink, a press report in the muted ink. A tag with `settled: true` is filled. A tag with `tone` takes that tone's ink.

**Why.** Evidence is weighed by where it comes from, so the kind of source has a colour that holds across the whole deck.

**What it gave up.** One kind of source a tag.
