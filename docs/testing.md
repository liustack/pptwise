---
summary: 'Acceptance gates, generated-reference drift, menu and render coverage, visual gallery review, golden and byte-fixture rerecording, E2E, package audit, and PowerPoint repair checks'
read_when:
  - adding or debugging tests
  - changing IR, specs, themes, menus, faces, components, motifs, rendering, or export
  - a snapshot, gallery hash, golden, or byte fixture changed
  - preparing a release or validating the installed DSH plugin
---

# Testing

## Default gates

```bash
pnpm check
```

This is the default acceptance gate. It runs:

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm test`

Vitest tests are colocated as `*.test.ts`, `*.test.tsx`, and script tests under `scripts/*.test.mts`. The suite covers IR v5, spec v1, theme v2, menu validation, all registered components and faces, SVG rendering, audit, theme lookup and creation, CLI shells, PPTX conversion, ZIP patches, package audit, and the visual gallery matrix.

Run a focused test while developing, then finish with the full gate:

```bash
pnpm exec vitest run src/spec/theme-menu.test.ts
pnpm check
```

Do not replace the configured commands with a guessed build tool.

## End-to-end export

```bash
pnpm e2e
```

The E2E script builds the package, drives `dist/cli.js`, renders real examples and a deck project, exercises validation, audit, preview, placeholders, brand extraction, workspace theme lookup, image formats, package invariants, and native PPTX output. It converts representative output with LibreOffice when `soffice` is installed. Color changes go through `pptwise theme fork`, not a render-time overlay.

Run E2E when changing themes, menus, faces, components, motifs, render code, audit, CLI target loading, assets, or PPTX export. It is intentionally separate from `pnpm check` because it builds the package and may use external local applications.

For the installed DSH plugin path:

```bash
pnpm e2e:dsh --workspace /tmp/pptwise-dsh-e2e --profile web
```

Use an isolated workspace and profile. This host-level smoke proves plugin discovery and installed CLI execution. It does not replace the deterministic source E2E.

## Generated SKILL references

`scripts/gen-skill-refs.mts` owns four generated sections:

- English and Chinese kind tables in `skills/pptwise/references/layouts*.md`
- English and Chinese preset tables in `skills/pptwise/references/spec*.md`

The kind table derives from IR v5 `KIND_VALUES` plus every built-in theme menu. It contains all eleven kinds, boundary guidance, and preset availability counts.

The preset table derives from `THEME_PRESETS` plus `BUILTIN_THEME_FILES`. It contains all 24 ids, labels, occasions, identity strength, content-menu word count, and offered kinds.

After changing any source field that affects those tables, run:

```bash
pnpm gen:skill-refs
```

`scripts/gen-skill-refs.test.mts` renders the same sections in memory and compares every committed target byte for byte. Drift therefore fails `pnpm check`. Edit prose outside the generated markers and let the generator own the marked sections.

## Visual gallery

```bash
pnpm gallery
pnpm gallery --only=theme
pnpm gallery --languages=zh,en
pnpm gallery --bbox
```

The gallery renders the review matrix through the production validation and SVG path. It has no alternate renderer. Output goes to `.gallery/` by default and includes SVG pages, `manifest.json`, and a self-contained `index.html`.

The matrix covers themes, internal faces, components, full-load cases, and heading constructions across language tracks. `scripts/gallery.test.mts` exercises the matrix during `pnpm check`, including inventory coverage. A new component or theme must not disappear from review merely because its builder was forgotten.

`--bbox` mounts SVG in a real browser and compares `getBBox()` against declared boxes. It is optional because it needs Playwright and depends on installed fonts. Findings go to `.gallery/bbox.json` and make the command fail.

For automated gallery audit:

```bash
pnpm evals:gallery
pnpm evals:gallery --full
pnpm evals:gallery --l1-only
```

Default mode compares current page fingerprints with `evals/gallery/hashes.json` and audits changed or added pages. L1 is deterministic. L2 runs only when its local vision CLI is available and the environment permits it. Live findings are written to a gitignored verdict report.

## Golden rerecording discipline

A golden diff is behavior evidence, not routine noise. Never accept it blindly and never run a broad snapshot update merely to make the suite green.

Before rerecording any snapshot, hash set, SVG serialization, DrawingML sample, or package fixture:

1. Reproduce the failing test on the old expectation.
2. Trace the first source boundary that changed behavior.
3. State why the new output is intended and which outputs should remain unchanged.
4. Inspect a focused before and after diff. For visual changes, render the affected gallery pages and review them.
5. Use the repository's dedicated writer when one exists.
6. Review the committed diff for unrelated churn, unstable ordering, local paths, dates, and environment-dependent bytes.
7. Run the focused test, then `pnpm check`. Run E2E when the render or export chain changed.

Vitest's `-u` is allowed only after this analysis and only for the smallest intentional target. Do not pass it automatically after a failure.

### Gallery hash goldens

`evals/gallery/hashes.json` pins whole-page, geometry, and color fingerprints. Rerecord it only after the affected pages have passed human review:

```bash
pnpm gallery
pnpm evals:gallery --from=.gallery --full
pnpm exec tsx evals/gallery/write-hashes.mts
```

Inspect the hash diff and page inventory. Do not edit individual hashes by hand.

### Byte fixtures

Two fixtures pin the exact output for unassigned theme behavior:

- `src/render/__fixtures__/emphasis-unassigned-bytes.json`
- `src/render/heading-treatments/__fixtures__/unassigned-bytes.json`

Rerecord both through the single writer:

```bash
pnpm fixtures:unassigned-bytes
```

Do this only when an intended renderer change reaches those cases. Review the resulting byte-level diff. Never repair these files manually.

### Hand-authored goldens

Some tests use hand-derived SVG or structural expectations rather than generated snapshots. Update those expectations by reasoning from the contract and inspecting the emitted structure. Do not convert a precise test into an opaque snapshot to reduce maintenance.

## Package-audit hard gate

Every `generatePptxBlob` export runs `src/pptx/package-audit.ts` after ZIP patches and before returning bytes. There is no skip switch.

The gate checks required OOXML parts, content types, relationships, slide-list consistency, relationship targets, unique shape ids, finite positive transforms, animation references, and two-sided image-alt preservation for rendered image operations.

`src/pptx/package-audit.test.ts` creates real packages and surgically breaks one invariant at a time. The E2E script repeats key consistency checks against the built CLI output. When adding a ZIP patch, add a broken-package test that proves the audit rejects the failure mode.

## Platform smoke

`src/platform/node.smoke.test.ts` exercises the installed Node platform seam with real DOM parsing and image re-encoding. Raster tests exercise sharp and SVG fidelity. Browser-safe modules must not import Node-only dependencies through `src/index.ts`.

## Documentation checks

```bash
pnpm docs:list
```

Every operational document keeps `summary` and `read_when` front matter. Before adding a document, inspect the list for overlapping scope. When renaming a document, update all incoming links and any count-guard maintenance messages.

## PowerPoint repair-dialog gate

LibreOffice and package audit cannot reproduce every native PowerPoint parser decision. Any change to exported XML structure, especially under `src/pptx/svg2pptx` or animation, gradient, font, relationship, or media ZIP patches, requires the macOS PowerPoint probe before release:

```bash
pnpm e2e
osascript scripts/ppt-repair-check.applescript "$PWD/.e2e-out/basic.pptx"
osascript scripts/ppt-repair-check.applescript "$PWD/.e2e-out/webp.pptx"
```

The required result is `OK`. A repair dialog, repaired-title window, or timeout is a release blocker. Record which representative files were probed when handing off an export change.

## Acceptance by change type

| change | minimum evidence |
| --- | --- |
| Docs only | `pnpm docs:list`, relevant link and terminology checks, then `pnpm check` when generated or tested docs are involved. |
| IR, spec, or menu schema | Focused schema tests, red and green behavior, generated refs, `pnpm check`. |
| Theme palette or menu | Theme validation, `theme try`, affected gallery review, `pnpm check`, `pnpm e2e`. |
| Face, component, motif, render, or audit | Focused tests, affected gallery pages, `pnpm check`, `pnpm e2e`. |
| PPTX or ZIP structure | Focused package tests, `pnpm check`, `pnpm e2e`, LibreOffice result, PowerPoint repair probe. |
