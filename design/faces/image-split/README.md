# image-split

The side takeover: a photograph bleeding full height down one side of the page, the heading, a short accent bar and the page's other blocks in a column beside it.

Code: [`src/render/image-pages.tsx`](../../../src/render/image-pages.tsx) (`ImageSplitPage`, `SPLIT_COLUMNS`). Shared by bulletin, ember, heritage, ink, journal, luxe, museum and brief.

## brief, tea sample, 2026-10

| board (p04) | engine |
| :-: | :-: |
| ![board](brief-tea.board.png) | ![engine](brief-tea.engine.png) |

**What it looks like.** brief's menu asks for the face's `report` column (`params: { column: "report" }`). The photograph is 600px wide. The column starts at x672: the title at 40/52 regular weight in primary, a 48 by 6 accent bar 32px under it, and a list of "Label: value" facts set as ruled pairs by the shared [`pairs`](../../compositions/pairs/) composition. The source line sits at the foot of the column, up to two 16px muted lines ending on y642.

**Why.** A report sets a photograph beside the facts it stands for. The regular title and the short heavy bar are brief's voice on every page, and the pairs read as a ledger next to the picture.

**What it gave up.**

- The `standard` column, which every other theme keeps, is unchanged: a 540px photograph, a 44px semibold title, a 72 by 4 bar and the components stacked under it.
- A list the pairs cannot set whole is stacked under the bar the ordinary way.

**The source line, on every theme.** The four takeovers (`image-split`, `image-top`, `image-bottom`, `image-annotate`) drew no `footnote` at all before this round, so a photo credit or a data source on a photo page reached nobody, and nothing said so. Each now sets it at 16px in muted ink within two lines: at the foot of the text column here, on the footnote line across the page under `image-top` and `image-annotate`, and centred between the text and the picture under `image-bottom`. `pptwise audit` reports a source line a page never paints.
