# folio-motif

brief's report footer: a hairline across the type area with a row of small marks under it.

Code: [`src/motifs/motif-folio-motif.tsx`](../../../src/motifs/motif-folio-motif.tsx). Which pages carry it and which marks it prints are the engine's footer rules, described in the header comment there, so read the code for today's behaviour and this page for what the board settled.

## brief, 2026-10

Every board page carries it. See the foot of any board in this archive, for example [compositions/rows](../../compositions/rows/brief.board.png).

**What the board settled.** A 1px rule at y664 from x96 to x1184, and under it one 16px muted line: the organization on the left, "Confidential" on the right. On the dark chapter page the rule and the words are blended from the page's readable ink instead of using the light-page tokens. The cover draws its own footer.

**Why.** A consulting report marks its pages with who wrote it and how far it may travel, and the foot of the page is where readers look for that. Drawing it as the theme's motif keeps the faces free of footer code.

**What it gave up.**

- The board prints a page number beside "Confidential". When this round shipped, the engine printed no page numbers on any theme (a decision from 2026-07-09), so the footer left it out.
- brief turns off the shared brand footer's rule and meta row, so the footer is never drawn twice.

**Since the footer rework (2026-10-02).** A deck now prints no footer at all unless it asks for one. The folio draws only the marks the deck's `footer` object turns on (page number, organization, label, draft, confidentiality), and `branding: "full"` without a `footer` object still reads as organization plus confidentiality. The confidentiality words follow the deck's language: a Chinese deck prints 「内部资料，请勿外传」 for `confidential`, never 「机密」. A page number, when asked for, is PowerPoint's own slide-number field on content pages only, so it stays right after pages are reordered. The engine render beside this file was re-taken after the rework.
