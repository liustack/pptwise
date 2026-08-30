---
summary: 'Deck projects: theme-shaped specs, content-only page files, assets, placeholders, deterministic assembly, theme rebinding, and live review'
read_when:
  - authoring or debugging a deck project directory
  - touching spec, assemble, disassemble, deck-directory loading, or live review
  - tracing placeholder, orphan-file, locked-field, theme-menu, or asset errors
  - changing or freezing a project's bound theme
---

# Deck projects

A deck project separates the locked semantic contract from page content:

```text
my-deck/
  deck.spec.json
  theme.json
  pages/
    cover.json
    problem.json
    close.json
  assets/
    hero.jpg
    logo.png
  deck.json
```

Only `deck.spec.json` is required. `theme.json` is an optional frozen copy of the bound theme. Page and asset directories grow as work proceeds. `deck.json` is derived output from `assemble`, not an authoring source.

The project follows the same serial chain as the product:

```text
intent -> narrative -> theme -> spec -> fill -> render
```

## The spec owns semantics

```json
{
  "version": "1",
  "narrative": "boardroom-report",
  "theme": "acme-report",
  "filename": "quarterly-review.pptx",
  "meta": {
    "organization": "Acme",
    "date": "2026-08-30",
    "confidentiality": "internal"
  },
  "branding": "full",
  "pages": [
    {
      "id": "cover",
      "type": "cover",
      "heading": "Quarterly review",
      "summary": "Decisions for the next operating cycle"
    },
    {
      "id": "performance",
      "type": "chapter",
      "heading": "Performance"
    },
    {
      "id": "growth",
      "type": "content",
      "kind": "data",
      "heading": "Expansion drove the quarter",
      "summary": "Show revenue mix and the two largest contributors",
      "focus": "chart"
    },
    {
      "id": "close",
      "type": "ending",
      "heading": "Decisions"
    }
  ]
}
```

The spec owns narrative, theme binding, output filename, metadata, deck brand, branding posture, page order, each page's id, type, heading, and every content page's kind. `summary` and `focus` are optional fill guidance. Prefer a component type for `focus`.

Validate it before filling pages:

```bash
pptwise schema --spec > deck-spec.schema.json
pptwise spec validate my-deck/deck.spec.json
```

Validation resolves the bound theme. A content kind absent from its menu is a hard error with the available kinds. Headings and page-count ranges are also checked. Three consecutive content pages with the same kind produce an advisory.

## Page files contain only fill

`pages/growth.json` can contain:

```json
{
  "components": [
    {
      "type": "chart",
      "chart_type": "bar",
      "series": [
        {
          "name": "Revenue",
          "data": [
            { "x": "Expansion", "y": 62 },
            { "x": "New business", "y": 38 }
          ]
        }
      ]
    }
  ],
  "footnote": "Share of quarterly growth",
  "notes": "Expansion was concentrated in the enterprise segment."
}
```

The fillable fields are `components`, `background`, `image_side`, `footnote`, and `notes`. Page files cannot contain `type`, `kind`, or `heading`. Those are locked by the spec. An orphan file whose id is absent from the spec is also a hard error.

Fill in batches of at most four pages, then run assemble and validate. This keeps capacity and component mistakes local.

## Placeholders are normal

When a spec page has no matching page file, assembly creates a semantic placeholder with its locked id, type, kind, and heading. Assemble and validate accept placeholders. Final render blocks them unless `--draft` is explicit.

Placeholders let the author confirm the whole page sequence before writing every page. They do not weaken the spec contract.

## Assets are project-local

Files under `assets/` are registered by filename. Components reference the basename as `asset_id`. Keep human-selected stock and generated assets under this directory or the managed `.pptwise/<deck>/assets/` directory used by image commands.

Run `pptwise asset-brief my-deck/` before sourcing images. It resolves the bound theme and real page face, then reports actual frames, crop posture, palette, safe zones, and generation prompts.

## Assembly stores no rendering choice

```bash
pptwise assemble my-deck/
```

Assembly writes IR v5 to `my-deck/deck.json` by default. It combines spec-owned fields, page fills, and scanned assets. It does not write face ids, seeds, page arrangements, or any other rendering selection into source or derived IR.

All main consumer commands also accept the directory directly and assemble it in memory:

```bash
pptwise validate my-deck/
pptwise audit my-deck/
pptwise render my-deck/
pptwise preview my-deck/ --html
```

Treat `deck.json` as an inspection or interchange artifact. Edit the spec or page files, then regenerate it.

## Theme binding and rebinding

`spec.theme` resolves by name from the deck directory, upward workspace `themes/` directories, then factory presets. Render has no theme override.

Freeze a workspace theme by copying it to `my-deck/theme.json` with the same id. Project commands load it automatically, and `serve` watches it.

A palette fork preserves the menu byte for byte. It may replace the project binding, followed by spec validation, assembly, IR validation, audit, and render.

If the next theme menu differs, return to the theme step. Keep useful claims, facts, data, images, and copy, then revise the semantic page sequence and affected fills around the new menu. A theme change is not a repaint of an already assembled deck.

## Live review

For a self-contained review file:

```bash
pptwise preview my-deck/ --html
```

For a browser session that refreshes when the spec, page files, assets, or deck-local theme change:

```bash
pptwise serve my-deck/ --no-open
```

Preview output is read-only. A reviewer describes a change, and the author edits the smallest owning source file. Content revisions belong to one page file. Order, type, kind, heading, and theme changes belong to the spec.

## Disassemble an IR

```bash
pptwise disassemble deck.json -o my-deck/
```

Disassembly writes a version 1 spec, one content-only file for every non-placeholder page, and local asset files when possible. It refuses to overwrite an existing `deck.spec.json`. The resulting project still contains no persisted face choice.

## Workspace names

`pptwise.config.json` can set a deck root. Commands that accept `<target>` can then resolve a bare deck name under that root. An explicit path still wins. This affects project discovery, not theme binding or page semantics.
