---
summary: 'How an omitted page layout is selected, how seed stability works, and why a theme repaint does not change materialized layouts'
read_when:
  - debugging why a page resolved to an unexpected layout
  - touching layout selection, seed derivation, or validate and render parity
  - adding strategy, beat, or theme layout tendencies
---

# Layout selection and seed

This document covers layout selection after a theme id has been resolved. Theme-id routing and precedence are documented in [`themes.md`](./themes.md).

## One implementation

`resolveLayoutId` in `src/render/layout-selection.ts` is the only implementation of standard layout selection. The render path in `src/render/full-slide-svg.tsx`, the density checks in `src/render/ir-quality.ts`, and spec assembly all call the same module. The invariant is simple: validation must inspect the layout that rendering will draw.

An applicable explicit `slide.layout` pin returns immediately. It bypasses curation, `narrativesOnly`, weighting, and seeded sampling. An unoffered sparse pin is the exception. `effectiveRequestedLayout` in `src/themes/definitions.ts` removes that request, automatic selection continues, and validate emits a warning.

Image-background cover and chapter pages can bypass the standard registry path. Explicit image takeovers are also handled before the ordinary theme pool.

## Four deterministic steps

When `slide.layout` is omitted, selection follows four steps:

1. **Theme face boundary.** The compiled `ThemeDefinition.layouts[slideType]` is the starting pool. Built-ins get those ids from version 1 `faces` in `src/themes/builtin/`. The theme may deliberately include a `pinOnly` board face. A tendency cannot add an id outside this pool.
2. **Narrative hard filter.** `filterByNarrativesOnly` in `src/layouts/registry.ts` removes candidates whose allowlist excludes the resolved strategy. No built-in layout currently uses this field.
3. **Soft weighting and seeded pick.** Strategy tendency, optional page `beat`, and optional theme tendency each contribute a weight. `Math.max` combines them, so agreement does not multiply the pull. `weightedPickBySeed` in `src/render/variety.ts` samples the resulting pool with a salt based on page type and stable page key.
4. **Adjacent anti-repetition.** If the pick equals the previous page's final effective layout and another candidate exists, selection performs one deterministic redraw with that id removed. A single-item pool remains unchanged.

The shared automatic source pool contains 43 standard layouts. Another 87 standard layouts are `pinOnly`. `fullLayoutSet` in `src/themes/definitions.ts` builds the shared pool from `LAYOUT_REGISTRY` in `src/layouts/registry.ts` by excluding `pinOnly` entries. A theme's compiled face boundary can then narrow that pool or lock a curated pin-only face.

Selection never inspects slide content. Capacity is validated separately as the lower of the narrative editorial budget and resolved layout slot capacity. Editing components therefore cannot silently change the selected layout.

## Seed behavior

`deckSeed` in `src/render/variety.ts` resolves in this order:

1. Explicit top-level `ir.seed`.
2. A deterministic hash of `filename` and every slide heading.

Both paths reproduce the same output for the same input. Only an explicit seed is stable across revisions. Without one, editing a heading changes the fallback hash and may redistribute automatic picks across the deck.

The sampling key uses `slide.id` when present, otherwise the slide index. Stable ids keep unaffected pages on the same salt when another page is inserted or reordered. The whole effective sequence is resolved in one left-to-right pass and cached by IR object identity so adjacent anti-repetition sees each previous page's final result.

## Assembly materializes the result

`materializeEffectiveLayouts` in `src/spec/assemble.ts` writes each automatically selected id into `deck.json`. An explicit layout in `pages/<id>.json` is left untouched. Reassembling from the same spec, page files, theme, and seed reproduces the same sequence.

This materialization explains theme repaint behavior. `render --theme <id>` changes the visual skin of an existing `deck.json`, but those layout ids are now explicit and remain in place. To adopt another theme's structural faces, change `theme` in `deck.spec.json` and assemble the project again.

Persist the seed immediately after spec validation. `pptwise assemble` prints a generated value when the spec omitted one, but it does not rewrite the spec automatically.
