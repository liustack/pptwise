# gantt

`items[].text` and `items[].emphasis`: a line under a stretch's label, and the one stretch the page is about.

Code: [`src/components/gantt.tsx`](../../../src/components/gantt.tsx), schema in [`src/ir/components/gantt.ts`](../../../src/ir/components/gantt.ts).

## bulletin, NEV sample, 2026-10

Settled on the subsidy page. See the board and engine render in [compositions/window](../../compositions/window/), which sets a calendar of whole months as one band. The round's decisions are in [rounds/2026-10-03-bulletin](../../rounds/2026-10-03-bulletin/README.md).

**What it looks like.** In the ordinary component, `text` sits under the label at 16/20, up to three lines, and the row grows to hold it. The marked bar takes the theme's emphasis colour and the others recede to grey.

**Why.** "Window: help buyers claim local money" needs both the name and what to do in it. One marked stretch says which one the page is about.

**What it gave up.**

- One marked stretch per chart. validate refuses a second.
