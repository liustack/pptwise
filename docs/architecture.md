---
summary: 'Architecture: five owning dimensions, one SVG render chain, platform seams, domain files, themes, and audit boundaries'
read_when:
  - first time in this repo
  - adding themes, components, or layouts
  - touching rendering, audit, or PPTX export
---

# Architecture

pptwise separates a deck into five concerns. Each concern has one owning layer, which keeps style changes out of layout code and geometry decisions out of authored content.

| Dimension | Owning layer | Location |
| --- | --- | --- |
| Content model | Strict semantic IR and typed components | `src/ir/` |
| 2D layout | Page layouts, component renderers, layout selection, variety, and render composition | `src/layouts/`, `src/components/`, `src/render/` |
| Visual style | Public theme schema, built-in declarations, tokens, motifs, and compiled definitions | `src/themes/`, `src/themes/builtin/`, `src/motifs/` |
| Time-based interaction | IR animation metadata and DrawingML patches | `src/pptx/` |
| Narrative | Strategy, pacing, audience, deck spec, assembly, and authoring workflow | `src/narrative/`, `src/spec/`, `skills/` |

Visual variety comes from tokens, curated layout faces, tendencies, and a deterministic seed. A theme can change both palette and the layout sequence selected at assembly time. [`selection-and-seed.md`](./selection-and-seed.md) documents that path.

## Render chain

Every slide uses one render path:

```text
validated IR
  -> src/render/full-slide-svg.tsx
  -> one flat 1280 x 720 SVG
  -> src/pptx/svg2pptx native DrawingML operations
  -> pptxgenjs plus JSZip patches
  -> editable .pptx bytes
```

`renderSlideSvg` and PPTX generation both begin with the same `FullSlideSvg`. Preview, audit, and export therefore inspect the same page composition.

Layout selection is centralized in `src/render/layout-selection.ts`. Page layouts live under `src/layouts/`. Typed component renderers live under `src/components/`. Backgrounds, branding, heading treatments, ink resolution, icons, and slide composition live under `src/render/`.

## SVG fidelity boundary

The SVG to PPTX dispatcher is closed. Recognized leaves become native DrawingML. Unsupported leaves are skipped and are never rasterized as a fallback.

| SVG leaf | PPTX result |
| --- | --- |
| `<rect>` | Editable native rectangle or rounded rectangle |
| `<circle>` and `<ellipse>` | Editable native ellipse |
| `<line>` | Editable native line |
| `<polygon>`, `<polyline>`, and `<path>` | Editable custom geometry |
| `<text>` | Editable native text box and runs |
| `<image>` | Picture part backed by a resolved asset |

Icons in `src/render/icons.tsx` use the same vector primitives and follow the same conversion path.

The only raster exit in PPTX export is a real resolved `<image>` asset. Missing image assets degrade to vector placeholders or omission. SVG rasterization is a separate audit capability in `src/audit/pixel-audit.ts` and is not called by PPTX generation. `src/pptx/generate-fidelity-export.test.ts` guards this boundary.

## Audit and information passes

Deterministic deck auditing lives in `src/audit/`. `src/audit/deck-audit.ts` combines SVG findings with the IR-level monotony advisory. `src/audit/pixel-audit.ts` optionally samples rasterized pixels for photo-background contrast.

`src/render/asset-brief.ts` is another read-only render pass. It measures real image frames and crop modes for prompt construction. Neither audit nor asset briefs mutate the IR or export path.

## Platform seam

The dependency closure of `src/index.ts` must remain browser-safe. It cannot import Commander, Linkedom, Sharp, or other Node-only modules.

`src/platform/registry.ts` defines the runtime seams for DOM parsing, image recoding, and SVG rasterization. `src/platform/node.ts` installs Linkedom and Sharp for CLI use. `src/platform/browser.ts` provides browser rasterization where the platform supports canvas. Node SDK consumers install the Node platform before rendering.

The CLI is isolated in `src/cli.ts` and `src/cli/`. Node-specific dependency wiring stays there or under `src/platform/node.ts`.

The supported public surface is CLI commands, IR and spec schemas, deck projects, the skill, and the DSH plugin. JavaScript internals do not carry a semantic-versioning promise. See [`internal-api.md`](./internal-api.md).

## Domain files and aggregators

Definitions live beside the behavior they describe:

- Each standard layout file under `src/layouts/<name>.tsx` exports both its React implementation and `layoutDef`. `src/layouts/registry.ts` imports and aggregates all 130 definitions. The four image takeovers are implemented and declared in `src/render/image-pages.tsx`.
- Each component has an IR domain file under `src/ir/components/<name>.ts` and a render domain file under `src/components/<name>.tsx`. The IR file owns schema, aliases, and traits. The render file owns measure and render behavior.
- `src/ir/index.ts` builds the component union. `src/components/index.tsx` builds render definitions. `src/render/component-traits.ts` builds shared trait sets. `src/ir/field-aliases.ts` builds alias tables.
- `src/themes/builtin/<id>.ts` declares each built-in theme. `src/themes/index.ts` owns canonical registration. `src/themes/occasions.ts` owns occasion and identity metadata. `src/themes/select.ts` owns deterministic routing. `src/themes/definitions.ts` compiles and validates the runtime form.

Aggregators construct total records from imported domain values. They do not repeat component, layout, or theme definitions as a second hand-maintained source.

## Adding a layout

Create the layout under `src/layouts/` and keep its `layoutDef` in the same file. Add its import and ordered registry entry in `src/layouts/registry.ts`. Registry order is load-bearing because deterministic weighted sampling walks candidates positionally.

Choose `pinOnly` when the face should never enter the shared automatic pool. Declare slot capacities as physical facts. Do not infer capacity from current example content.

Update registry migration guards, rendering tests, and the generated SKILL reference table by running `pnpm gen:skill-refs`.

## Adding a component

At minimum, add the matched pair under `src/ir/components/` and `src/components/`, then wire these total aggregators and coverage points:

1. Component schema union in `src/ir/index.ts`.
2. Render definitions in `src/components/index.tsx`.
3. Traits in `src/render/component-traits.ts`.
4. Validation corpus coverage in `src/ir/corpus-coverage.test.ts`.
5. Fidelity export fixture in `src/pptx/generate-fidelity-export.test.ts`.
6. Muted-surface classification in `src/audit/full-matrix-contrast.test.ts`.
7. Agent authoring guidance in `skills/pptwise/SKILL.md` when the type needs a new selection rule.

`pnpm check` catches missing total-record entries and most coverage gaps.

## Adding a theme

A built-in theme is a complete version 1 declaration in `src/themes/builtin/<id>.ts`. It must provide all four face pools and a complete style. Add its id to the canonical lists in `src/themes/index.ts` and `src/ir/index.ts`, then add occasion and identity metadata in `src/themes/occasions.ts`. `suggestThemes` in `src/themes/select.ts` consumes that metadata without a per-theme routing branch.

Faces reference shared layouts. Motifs reference the finite implementations in `src/motifs/`. Tendencies may only name ids inside the matching face pool. `registerTheme` validates these invariants and the contrast floor.

A user-authored custom theme follows the public partial or complete schema in `src/themes/schema.ts`. [`themes.md`](./themes.md) describes both modes and the five-level selection chain.
