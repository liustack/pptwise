# ikb-field-cover

A cover painted full in the theme's primary: a small line, the title large in white, a short white bar, the subtitle and the date.

Code: [`src/layouts/cover-ikb-field-cover.tsx`](../../../src/layouts/cover-ikb-field-cover.tsx), with the field's type in [`src/layouts/field-type.tsx`](../../../src/layouts/field-type.tsx).

## bulletin, NEV sample, 2026-10

The round's decisions are in [rounds/2026-10-03-bulletin](../../rounds/2026-10-03-bulletin/README.md).

| board (p01) | engine |
| :-: | :-: |
| ![board](bulletin.board.png) | ![engine](bulletin.engine.png) |

**What it looks like.** The whole page in IKB with the motif's three white steps enlarged top right. At y96 one 18px line (`meta.organization`) in white at 78%. The title bold at 80/98 in white from y232, at most two lines in 1040px. A 64 by 6 white bar, the subtitle at 22px in white at 86%, and the date at 16px in white at 70% near the foot. Every quieter white is held to the contrast its size needs on IKB.

**Why.** The old subtitle was grey on IKB at about 3:1. White at a share of its strength stays quieter than the title and still reads.

**What it gave up.**

- A marked run in the title keeps the title's white and gets a straight white underline, since IKB cannot mark anything on an IKB field.
- No tracking: the board tightens the title by 1px, and the export does not carry letter spacing.
