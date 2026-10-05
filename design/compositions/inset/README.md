# inset

A photograph beside the page's body, its caption under it, the body handed to the other compositions in the column beside it.

Code: [`src/layouts/compositions/inset.tsx`](../../../src/layouts/compositions/inset.tsx). The header comment there is the contract. The dossier setting only.

## clinic, GLP-1 formulary review sample, 2026-10

Settled on the outside-risk page (p04, board in [compositions/docket](../docket/clinic.board.png)), the scope page (p14, board in [compositions/cards](../cards/clinic.board.png)) and the pharmacist page (p16, board in [compositions/rows](../rows/clinic-p16.board.png)). The round's decisions are in [rounds/2026-10-05-clinic](../../rounds/2026-10-05-clinic/README.md).

**What it looks like.** The picture stands 400px tall from 10px down the band, at the left when the author puts it first and at the right when last, cropped to fill. Beside a body of figures (the cases of p04) it is 520px wide and 40px away, beside any other body 560px wide and 32px away. Its caption, when it has one, runs under it in 12px muted type (「示意图：…（AI 生成）」). The body in the column beside it is drawn by the face's other compositions in the dossier setting (`docket`, `cards`, `rows`), or by the ordinary component renderer when none takes it.

**Why.** A file shows the place or the people it is about beside the evidence, never instead of it.

**What it gave up.**

- One picture, first or last, with something beside it. A caption past one line or a body the column cannot hold sends the page back.
- Square corners: a rounded picture needs a clip path PowerPoint's shape subset does not keep.
