# Density and decoration

Read this when writing to pacing budgets, fitting the bound face, or deciding whether a page needs local decoration.

## Two capacity limits

Every content page has two independent limits. Narrative pacing sets an editorial budget. The face selected by the bound theme menu sets a physical body capacity. The effective component limit is the smaller value.

| pacing | body baseline | components | bullet items | width units per bullet |
| --- | ---: | ---: | ---: | ---: |
| `dense` | 24px | 5 | 6 | 27 |
| `balanced` | 24px | 4 | 5 | 25 |
| `spacious` | 32px | 3 | 4 | 22 |

`validate` reports the effective limit for the actual theme and kind. Editorial excess is normally a warning. Render-safety limits and content loss remain hard errors. Shorten or split a page instead of hiding overflow.

`spacious` means fewer elements at a larger body size. It does not mean the same content compressed into a cleaner-looking page. Keep headings assertive and keep bullet items near two lines.

Three consecutive content pages with the same kind produce a spec advisory. Repetition can be correct, but confirm that the story truly calls for the same semantic move three times.

Eight components own the whole body: `swot`, `bmc`, `waterfall`, `gantt`, `pest`, `five_forces`, `heatmap`, and `sankey`. Each must be the page's only component.

## Decoration ownership

Decoration resolves in this order:

1. A face with structural `suppressMotif: true` never receives a theme motif.
2. Otherwise a menu entry may choose `decor.kind: "silent"` or select another motif.
3. With no menu opinion, the theme's ordinary motif paints.

The face's structural silence cannot be undone by a menu. A page-level `decor` is a controlled local primitive such as a rule, tag, quote mark, dots, or large number. Use it only when the page meaning needs that accent. It does not replace the theme menu and should not be stamped across the deck.
