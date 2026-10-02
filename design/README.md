# Design boards

The settled design for each reusable part of the engine, kept beside a render of what the engine draws today. Before you draw a composition, component, motif or face that already has a folder here, start from its board: it records what was decided, why, and what was given up, so the next theme does not argue the same page again.

The brief that every board is drawn against is [docs/design-brief.md](../docs/design-brief.md). The list of reusable parts, with the code behind each one, is [docs/reusable-parts.md](../docs/reusable-parts.md).

## How it is organized

Folders follow the engine's own domains, one folder per part, so a part's design history sits in one place and can be reviewed or removed with the part.

```text
design/
  compositions/<id>/       shared hand-set compositions, src/layouts/compositions/<id>.tsx
  components/<type>/       components a board changed, src/components/<type>.tsx
  motifs/<id>/             motifs, src/motifs/motif-<id>.tsx
  faces/<id>/              faces drawn to a board, src/layouts/<page type>-<id>.tsx
  rounds/<date>-<theme>/   the source of one design round
```

A part folder holds:

| file | what it is |
| :-- | :-- |
| `README.md` | What the settled design looks like, why it was settled that way, and what it gave up. One section per theme round, oldest first. |
| `<theme>.board.png` | The approved board for that theme, 1280 by 720. |
| `<theme>.engine.png` | The engine's render of that theme's showcase page for the same part, 1280 by 720, taken when the board was archived. |

A later round on the same theme names its pair after the round, `<theme>-<round>.board.png` and `<theme>-<round>.engine.png` (brief's tea sample is `brief-tea`), with a page suffix when one part was settled on two pages.

A part that was settled on another part's page, such as a component field shown on a composition's page, links to that page instead of keeping a copy.

A round folder holds what the boards were drawn from (the generator script or tool export) and a `README.md` with the round's decisions, including every place the engine departs from the board on purpose.

The engine render shows the showcase deck's own content, which is often not the board's. Compare the geometry, type and colour, not the words.

## Adding a round

1. Put the board source and the decisions in `rounds/<YYYY-MM-DD>-<theme>/`.
2. For each part the round settled, add `<theme>.board.png` and `<theme>.engine.png` to its folder, creating the folder if the part is new, and add a section to its `README.md`.
3. Add or update the part's entry in [docs/reusable-parts.md](../docs/reusable-parts.md).

Nothing here ships. `package.json` `files` publishes only `dist`, `dsh`, `cordis.patch.yml`, the skill folder and `README.zh-CN.md`.
