# span

Two or three lengths of time to scale, and a note on what they mean.

Code: [`src/layouts/compositions/span.tsx`](../../../src/layouts/compositions/span.tsx) (`parseDuration` reads "2h52m", "14h32m", "22h 06m", "45m", "3d 4h"). The console setting only.

## terminal, cloud outage review sample, 2026-10

Settled on the cascade page (p06) beside the [`log`](../log/terminal.board.png). The round's decisions are in [rounds/2026-10-05-terminal](../../rounds/2026-10-05-terminal/README.md).

**What it looks like.** Each figure of a `kpi_cards` is a bar under its label on one scale. The marked figure (`**2h52m**`) is a solid bar in the mark. A figure with a `tone` is an outline in the tone's ink with the marked bar's length echoed inside it as a tint, so the eye reads how much of the longer stretch the marked one is. The value stands after its bar in mono. An `info` callout heads the panel with its label and closes it with its text, and one more callout becomes a note panel under it, in mono when it is a quoted line.

**Why.** "Down 2 hours 52 minutes, event 14 hours 32 minutes" is a ratio the room should see, not compute.

**What it gave up.**

- Only lengths of time written as a console prints them. A unit, icon, delta, tag or source on a figure sends the column back.
