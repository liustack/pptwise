# Project Overview for AI Agents

## Goal

`pptwise` turns semantic IR into native editable PPTX. It ships as a skill folder under `skills/pptwise/` and as a DSH plugin through `dsh/index.js` plus `cordis.patch.yml`. The stable public surface is the CLI, IR schema, theme schema, deck project format, skill, and DSH plugin. JavaScript internals carry no semver promise. See `docs/internal-api.md`.

## Authoring model

The causal chain is:

```text
intent -> narrative -> theme -> spec -> fill -> render
```

The four public nouns are:

- **theme**: one complete self-contained v2 file with style, optional brand configuration, occasion metadata, identity strength, and a menu. The 24 built-ins are factory presets for copying.
- **spec**: a version 1 semantic contract that binds one theme and locks narrative, page order, id, type, heading, and content kind.
- **component**: one of 38 typed units that fill a page.
- **kind**: one of 11 content-page moves. The vocabulary is `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `quote`, `fact`, `evidence`, and `hierarchy`.

Boundary pages are `cover`, `chapter`, and `ending`. Content pages require `kind`. The bound theme menu maps each boundary type and each offered content kind to exactly one internal face. Authors never write face ids. IR v5 has no `seed`, `layout`, `beat`, or `arrangement`.

See `docs/concepts.md`, `docs/menu-lookup.md`, `docs/themes.md`, `docs/ir.md`, and `docs/deck-projects.md`.

## Architecture

IR and project content flow through one shared theme-menu route into the React SVG page system under `src/layouts`, `src/components`, `src/motifs`, and `src/render`. Checks live under `src/audit`. Static SVG markup goes through `src/pptx`, svg2pptx, PptxGenJS, and JSZip patches before producing `.pptx`.

Validation, capacity, asset briefs, and rendering consume the same resolved menu route. Pacing supplies the editorial budget and body baseline. The chosen face supplies physical capacity. Pacing never chooses a face.

Browser services are isolated behind `src/platform`. The Node installer provides linkedom and sharp. See `docs/architecture.md`.

## Engine rules

- The dependency closure of `src/index.ts` must remain free of Node-only dependencies. Commander, filesystem shells, linkedom, and sharp belong under `src/cli*` or `src/platform/node.ts`.
- Migrated code keeps its Chinese comments. Do not translate them wholesale or combine a migration with unrelated refactoring.
- Every theme, kind, face, and component carries a design story, written as public copy beside its definition. A name names a voice or a genre, never a vertical, a function, an audience, or an organization type. See `docs/concepts.md`.
- The alias `@/*` maps to `src/*` in both TypeScript paths and the Vitest alias. Change both declarations together.
- Public theme files are always complete v2 objects. Creation means copy. Palette changes use a fork with full token rederivation.
- Assembly combines spec semantics and page content into IR v5 without persisting face choices or other rendering state.
- A face declares its slots, capacity, parameter bounds, and structural motif or brand facts. Menu entries provide valid values and optional page-level motif or brand posture.
- A face has two legal postures toward authored content: render it completely, or decline the page. It never takes part of a component and drops the rest, and it never uses `heading` or `subheading` in place of content an author wrote into a component. A face that cannot hold what it was given steps aside so a rendering that can draws the page, or declares its limit so validate rejects the page. Every drop leaves a mark a machine can find: a validate error, `data-truncated`, or `data-dropped`. A slide never carries an overflow count, an ellipsis pill, or any other bookkeeping element that says there was more: content that does not fit either makes the face decline, or is declared with `data-dropped` and the export refuses the deck until an author shortens it.

## Commands

`pnpm check` runs typecheck, lint, and tests and is the default acceptance gate. `pnpm e2e` builds and drives the real CLI, with a LibreOffice probe when available. `pnpm docs:list` lists operational docs. `pnpm gallery` produces the visual review matrix.

## Workflow

- Work on a topic branch with a `feat/`, `fix/`, `docs/`, or `chore/` prefix, then merge to main.
- Use conventional commits and keep each commit atomic.
- Never pass `-u` blindly after a snapshot failure. A snapshot diff is a behavior change that must be traced and reviewed.
- Changes to exported XML structure require the PowerPoint repair-dialog probe before release. See `docs/testing.md`.

## Operational docs

Every file under `docs/` keeps `summary` and `read_when` front matter. Run `pnpm docs:list` before adding a new file and avoid overlapping scope.
