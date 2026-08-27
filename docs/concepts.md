---
summary: 'The theme, layout, component, and narrative model, plus the split between editorial and geometric capacity'
read_when:
  - first time touching the pptwise vocabulary
  - adding a theme, layout, or component
  - deciding whether a rule belongs to pacing or layout capacity
---

# Concepts

Four nouns divide responsibility. Theme owns visual language and curated page faces. Layout owns page geometry. Component owns a typed content unit. Narrative owns argument strategy and editorial density. [`selection-and-seed.md`](./selection-and-seed.md) explains layout choice, and [`contrast-system.md`](./contrast-system.md) explains readable ink selection.

## Theme

The public theme contract is the strict version 1 `ThemeFileSchema` in `src/themes/schema.ts`. It contains a complete public `style`, optional `brand`, optional `occasions`, and optional `identity`. The file then has one of two completeness modes:

- A partial theme includes `base`. It changes style and brand while inheriting faces, motif, tendencies, and sparse support from a built-in theme. Complete-only fields are rejected.
- A complete theme omits `base` and provides non-empty `faces` for cover, chapter, content, and ending. It may also provide motif parameters, per-page-type tendencies, and sparse layout support.

Both modes compile into the internal `ThemeDefinition` in `src/themes/definitions.ts`. That internal form carries `layouts`, resolved style tokens, brand, motif, tendencies, and sparse layout ids. `registerTheme` validates layout ids, page types, face parameters, tendency boundaries, contrast, and id collisions before adding a custom theme to `src/themes/registered-themes.ts`.

The 24 built-ins live in `src/themes/builtin/`. Their canonical ids and labels come from `src/themes/index.ts`. `src/themes/occasions.ts` is the source of truth for controlled occasion tags and the `low`, `medium`, or `high` identity band exposed by `pptwise themes --json`. `suggestThemes` in `src/themes/select.ts` ranks occasion hits first, then identity match, narrative recommendations, and canonical catalog order.

A theme is not appearance-only. Its face pools are a hard curation boundary. Its `tendencies` softly favor ids already inside that boundary. Its motif comes from `src/motifs/`. Theme selection uses task occasion and desired identity first. Narrative `themeRecommendations` remain a reference or no-occasion fallback signal.

## Layout

A layout is a page-level React template with named slots. Each of the 130 standard layout files under `src/layouts/<name>.tsx` keeps its JSX and exported `layoutDef` together. `src/layouts/registry.ts` imports and aggregates those definitions. The four image takeovers are defined in `src/render/image-pages.tsx` and join the same registry.

`LayoutDefinition` declares `id`, `kind`, `slideTypes`, `slots`, optional `arrangements`, optional `narrativesOnly`, and optional `pinOnly`. Each slot declares a name, accepted component types, and an optional capacity. The registry has 134 entries in total:

- 130 standard layouts, still serialized internally as `kind: "archetype"`
- 43 standard layouts in the shared auto-selectable pool
- 87 standard layouts marked `pinOnly`
- 4 image takeovers

`pinOnly` keeps a layout out of the shared automatic pool. A page reaches one through an explicit `slide.layout` pin, or through a theme that deliberately lists it in a curated face pool. `src/render/layout-selection.ts` resolves the effective id for validation and rendering.

Layout is not arrangement. A layout is the whole page template. An arrangement controls how components flow inside a layout body slot, such as `single`, `two_column`, or `assertion_evidence`.

## Component

The 37 component types are the discriminated `Component` union in `src/ir/`. Their render definitions live under `src/components/`, and `src/components/index.tsx` aggregates them. Shared rendering traits, including full-body ownership, live in `src/render/component-traits.ts`.

Components express meaning without coordinates. Examples include `chart`, `timeline`, `roadmap`, `comparison`, `image`, `data_table`, `device_mockup`, `people_cards`, and `tag_row`. The model chooses a type and supplies structured fields. The component renderer and layout decide geometry.

Full-body components such as `swot`, `bmc`, `waterfall`, `gantt`, `pest`, `five_forces`, `heatmap`, and `sankey` must be the only component on a slide. `src/validate-core.ts` enforces that invariant.

## Narrative

Narrative is a three-axis profile in `src/narrative/`:

- `strategy` controls argument structure and contributes layout tendencies.
- `pacing` controls editorial density and type scale.
- `audience` records who the deck addresses. It currently affects authoring guidance, not render geometry.

Named presets resolve to those axes and include `themeRecommendations`. Theme routing uses `occasions` and `identity` first, with recommendations available as a reference, tie-break, or no-occasion fallback. The theme id is selected separately through the CLI, authored artifact, configuration, or default chain.

A slide's optional `beat` adds a local soft layout tendency. Strategy, beat, and theme tendencies combine inside `src/render/layout-selection.ts` with `Math.max`. Agreement reinforces a candidate without multiplying its weight.

## Capacity has two owners

Capacity is the minimum of two independent ceilings:

- Editorial capacity comes from `PACING_BUDGETS` in `src/narrative/`. It answers how much content belongs on a page.
- Geometric capacity comes from the resolved layout's slot metadata in `src/layouts/registry.ts`. It answers how many components physically fit.

`src/render/ir-quality.ts` resolves the same layout as the render path and applies the lower ceiling. This keeps validation and rendering in agreement. A component's own item bound is a separate schema rule. Speaker notes are also separate because they never enter the canvas.

## Stable source boundaries

The v4 IR schema in `src/ir/` evolves additively. A future breaking shape needs a new top-level version and an explicit migration path.

The deck project's authored sources are `deck.spec.json`, `pages/*.json`, optional `theme.json`, and assets. Preview remains read-only. Every revision returns through assemble, validate, and audit.

The model owns semantics. The engine owns geometry. Public authoring never asks a model to produce coordinates or free-form SVG.
