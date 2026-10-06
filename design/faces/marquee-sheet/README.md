# marquee-sheet

rally's ordinary content page: the section's ticket stub at the top left, the claim bold at 34px, the body handed to the shared compositions in the `marquee` setting, and the source small at the foot.

Code: [`src/layouts/content-marquee-sheet.tsx`](../../../src/layouts/content-marquee-sheet.tsx), with the frame (`MarqueeHead`, `MarqueeTicket`, `MarqueeStandfirst`, `MarqueeSource`, `sectionNumber`) in [`src/layouts/marquee-shared.tsx`](../../../src/layouts/marquee-shared.tsx) and the stub (`Ticket`) in [`src/layouts/compositions/marquee.tsx`](../../../src/layouts/compositions/marquee.tsx). Used by rally for every content kind but `statement`.

## rally, summer concert season proposal sample, 2026-10

Settled on every content page but the one-line plan. The boards and engine renders are in the composition folders each page links from the round. The round's decisions are in [rounds/2026-10-06-rally](../../rounds/2026-10-06-rally/README.md).

**What it looks like.** At the top left, on y30, the ticket stub: the section's number on the magenta stamp, its name (the page's `kicker`) on the stub. The number is counted, not written: the deck's sections in the order their names first appear on a chapter or a content page. The confetti at the top right and the folio are the motif's. The claim bold at 34/46 from x64 across 1152px, on one line whenever it fits and broken at a comma when it does not, its last line ending at y172 either way. A subheading becomes a standfirst at 16/24 in the grey at the body's top. The body runs from y188 to y640 over a source and to y648 without one, and is offered to the compositions in this order: `crest`, `branch`, `season`, `makeup`, `origins`, `route`, `spots`, `wall`, `loop`, `stubs`, `fallbacks`, `timetable`, `scoreboard`, `allotment`, `asks`. A page none of them takes is drawn by the component renderer in the same band. The source at 12/16 in the grey from y650, up to two lines.

**Why.** A campaign proposal is read section by section. The stub says which part of the plan a page is where the eye starts, and the claim says what the page asks the room to believe before the evidence.

**What it gave up.**

- A page the band cannot hold steps aside to the plain sheet, and is declined when that cannot hold it either.
- A page with no `kicker` carries no stub. A name too long for the stub is declared dropped.
- A `ballot` is drawn by `asks` only. A page whose ballot no composition draws declares it dropped.
- The body takes up to four components.
