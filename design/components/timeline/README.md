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

## almanac, CBAM sample, 2026-10

`periods`, and `tag` and `source` on milestones. Settled on the timeline page (p03) and the rules page (p15): see the boards in [compositions/calendar](../../compositions/calendar/almanac.board.png) and [compositions/outlook](../../compositions/outlook/almanac.board.png). The round's decisions are in [rounds/2026-10-05-almanac](../../rounds/2026-10-05-almanac/README.md).

**What it looks like.** `periods` names stretches of time (`from`, `to`, `label`, and an optional `basis`). The ordinary timeline spaces its milestones evenly, so it names the spans rather than laying them on the axis: one row each under the milestones, a swatch, the span's label bold and its run from one date to the other in the muted ink, the swatch of a span that is not settled a dashed outline in its basis's ink. The yearbook's `calendar` and `outlook` lay the spans on a scaled axis instead. A milestone's `source` is a quiet line under its description and its `tag` a small tag under that.

**Why.** A year that is counted and a year that is paid, or a span that is law and one that is only proposed, are stretches of time, not points on it.

**What it gave up.** Up to three periods, each dated the way the milestones are. A face that sets milestones by hand without room for a tag or a source declines a timeline that carries them.
