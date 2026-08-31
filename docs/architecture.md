---
summary: 'Architecture: serial authoring chain, IR v5, self-contained theme menus, shared face resolution, React SVG rendering, audit parity, PPTX export, and platform seams'
read_when:
  - first time working in this repository
  - changing IR, specs, themes, menus, faces, components, motifs, or branding
  - touching validation, rendering, audit, platform code, or PPTX export
---

# Architecture

pptwise turns semantic input into native editable PowerPoint through one causal chain:

```text
intent -> narrative -> theme -> spec -> fill -> render
```

The first two steps are editorial decisions. The theme is selected before the spec because its menu determines which semantic page moves the deck can ask for. The spec orders those moves. Page files fill them with typed components. Render remains deterministic for the same bound inputs.

## Owning domains

| domain | owner | responsibility |
| --- | --- | --- |
| IR | `src/ir` | Strict v5 deck, page, asset, metadata, brand, and 39-component schemas. |
| narrative | `src/narrative` | Strategy, pacing, audience, presets, body baseline, and editorial budgets. |
| themes | `src/themes` | Public v2 schema, 24 presets, built-in declarations, workspace registration, tokens, occasions, and identity. |
| specs | `src/spec` | Version 1 theme binding, page semantics, menu-kind validation, placeholders, and pure assembly. |
| faces | `src/layouts` | Internal page drawing code, slots, capacities, parameter declarations, and structural motif or brand facts. |
| components | `src/components` | Typed content renderers that fill face slots. |
| motifs | `src/motifs` | Reusable decorative drawing code selected by theme menus. |
| render | `src/render` | Theme-menu resolution, context construction, SVG composition, branding, image routes, and static markup. |
| audit | `src/audit` | Deterministic SVG, browser, package, and optional pixel checks. |
| PPTX | `src/pptx` | SVG to native DrawingML conversion, PptxGenJS packaging, and ZIP-level patches. |
| CLI | `src/cli.ts`, `src/cli` | Filesystem boundary, theme lookup, commands, review server, image providers, and install operations. |
| platform | `src/platform` | Registry seam for browser services. Node installs linkedom and sharp implementations. |

The public model has four nouns: theme, spec, component, and kind. Internal faces are engine parts reached only through a theme menu.

## Theme and spec boundary

A public theme file is complete and self-contained:

```text
theme v2 = style + optional brand + occasions + identity + menu
```

The menu maps every boundary page and a non-empty subset of the eleven content kinds to one face each. It may also supply declared face parameters, motif posture, and page-level brand silence.

Theme creation is copy-based. `theme new` copies any resolved theme. `theme fork` copies a theme, preserves the menu, rederives the palette, and checks contrast. `brand extract` copies a donor menu and applies locally extracted Office anchors.

The CLI resolves a bound name from the deck directory, then upward workspace `themes/` directories, then factory presets. Render has no theme override path.

The spec locks theme, narrative, page order, id, type, heading, and content kind. Page fills carry only components, background, image side, footnote, and notes. `assembleDeck` is a pure function that combines them into IR v5 without storing a rendering decision.

## Shared face resolution

`src/render/layout-selection.ts` retains a historical filename, but its active job is direct menu lookup. The route is:

```text
boundary page type -> theme.menu boundary entry -> face
content page kind  -> theme.menu.content[kind] -> face
```

Cover and chapter asset backgrounds take the dedicated image-cover route. Content image routes are still selected by content kind through the menu.

One resolved route record is consumed by:

- spec and IR validation
- slot compatibility checks
- physical body-capacity calculation
- rendering
- asset briefs

This shared route is a parity invariant. Do not recreate menu lookup in a second consumer.

Pacing contributes a separate editorial capacity and body baseline. The effective component limit is the smaller of pacing budget and face capacity. Pacing never changes the chosen face.

## Render chain

```text
IR v5
  -> validate schema, theme, menu, components, assets, narrative, and capacity
  -> resolve theme tokens and one face per page
  -> build component context
  -> compose background, motif, local decor, face body, and branding in React SVG
  -> renderToStaticMarkup
  -> svg2pptx native shapes and text
  -> PptxGenJS package
  -> JSZip animation and gradient patches
  -> package audit
  -> .pptx
```

The SVG page is the single drawing source for preview and export. Shared text measurement, ink selection, and audit annotations keep browser review close to exported DrawingML.

## Decoration and branding

`src/render/full-slide-svg.tsx` resolves decoration before composing the page:

1. A face with `suppressMotif: true` is structurally silent.
2. Otherwise a menu entry may request `decor.kind: "silent"` or another registered motif.
3. Without a menu override, the built-in theme's ordinary motif is used.

The face fact wins over the menu. A copied public preset has ordinary motif choices written into its menu entries, so it needs no hidden inheritance.

Branding is independent. A face with `branding: "none"` or a menu entry with `brand: "none"` suppresses the shared fragment. Otherwise `src/render/branding.tsx` applies the deck's `full`, `cover-only`, or `minimal` posture. Omission equals `cover-only`.

## Strict boundaries

`src/index.ts` and its dependency closure must remain free of Node-only dependencies. Filesystem, Commander, linkedom, sharp, and other Node services belong under `src/cli` or the Node platform installer.

The alias `@/*` maps to `src/*` in both TypeScript and Vitest configuration. Change both declarations together.

Source files stay grouped by business domain. Adding a component means its IR schema, renderer, tests, and related helpers live together. Adding a theme means one complete declaration or v2 file, menu, validation coverage, and visual evidence.

## Extension paths

### Add a component

Define its schema under `src/ir/components`, register it in the IR union, implement the renderer under `src/components`, declare its normal kind ownership, and add component, export, capacity, and audit tests. A component addition does not automatically add a new kind.

### Add or change a face

Implement it under `src/layouts`, declare slots, capacity, parameters, and structural motif or brand facts, register it, then reference it from one or more theme menus. Validate every menu parameter against the face declaration.

### Add a theme

Start with a complete copied theme, establish style and menu together, validate every offered kind, run the full matrix and gallery review, and compare it through `theme try`. A palette variation is another independent complete theme.

### Change exported XML

Run the normal acceptance gate, end-to-end export, package audit, LibreOffice probe, and the PowerPoint repair-dialog probe described in [Testing](./testing.md).
