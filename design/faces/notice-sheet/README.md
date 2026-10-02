# notice-sheet

bulletin's ordinary content page: a black bold claim over a grey hairline with a short IKB bar, the body handed to the compositions in the notice setting, and the source in 14px at the foot.

Code: [`src/layouts/content-notice-sheet.tsx`](../../../src/layouts/content-notice-sheet.tsx), with the frame in [`src/layouts/notice-shared.tsx`](../../../src/layouts/notice-shared.tsx) (`NoticeHead`, `NoticeSource`).

## bulletin, NEV sample, 2026-10

Every content page of the board carries this frame. See the boards of the compositions it hands its body to, for example [compositions/rows](../../compositions/rows/bulletin.board.png). The round's decisions are in [rounds/2026-10-03-bulletin](../../rounds/2026-10-03-bulletin/README.md).

**What it looks like.** The claim is black, bold, 34/46, at most two lines in a 1040px box from y44 to y144, bottom-aligned so a one-line claim and a two-line one end on the same baseline. Under it, a 1px hairline in the border colour from x80 to x1200 at y163, and a 96 by 3 IKB bar on its left end. The motif's small IKB steps sit top right. The body runs from y196, and the source is 14/20 muted at the foot, last baseline y666. A subheading becomes an 18px muted standfirst under the rule.

**Why.** The old bulletin painted every content page's title on an IKB band with a ruler over it, so IKB was everywhere and marked nothing. One quiet header leaves IKB for the thing each page is about.

**What it gave up.**

- A body no composition takes is drawn by the ordinary component renderer in the same band, and a page the band cannot hold steps aside.
- The 14px source is below the engine's 16px floor. The audit exempts it by name (`data-font-floor-exempt="notice-spec"`), and nothing else on the page may go that small.
- bulletin's menu sends points, list, comparison, process, data and hierarchy pages here. It offers no statement, fact or evidence page: those need their own boards first.
