# timeline

`milestones[].lane` and `timeline.lanes`: two tracks on one time order.

Code: [`src/components/timeline.tsx`](../../../src/components/timeline.tsx), schema in [`src/ir/components/timeline.ts`](../../../src/ir/components/timeline.ts).

## bulletin, NEV sample, 2026-10

Settled on the regulation page. See the board and engine render in [compositions/lanes](../../compositions/lanes/), which sets the first lane above the axis and the second below. The round's decisions are in [rounds/2026-10-03-bulletin](../../rounds/2026-10-03-bulletin/README.md).

**What it looks like.** The ordinary component keeps one track and prefixes each date with its lane, 「海外 · 7 月」. `lanes` names the two lanes and which runs above the axis. Without it, the lane a milestone names first runs above.

**Why.** Home and abroad rules move on one calendar. Two timelines would hide the order, one unlabelled timeline would hide the side.

**What it gave up.**

- Every milestone names a lane, or none does. At most two lanes, and none on a vertical timeline. validate refuses the rest.

## terminal, cloud outage review sample, 2026-10

`milestones[].icon` and `milestones[].tone`. Settled on the cascade page (p06): see the board in [compositions/log](../../compositions/log/terminal.board.png). The round's decisions are in [rounds/2026-10-05-terminal](../../rounds/2026-10-05-terminal/README.md).

**What it looks like.** In the ordinary timeline, a milestone's icon sits in a 13px ring on its node, and its tone colours the node in the theme's danger, warning or success ink. A milestone's lane is named on a line of its own over its date. In the console log the tone colours the dot and the icon replaces it.

**Why.** "DNS records were emptied" and "DynamoDB recovered" are different kinds of turn, and the reader should see which before reading the words.

**What it gave up.** Faces that set milestones by hand without room for an icon or a tone decline a timeline that carries them.
