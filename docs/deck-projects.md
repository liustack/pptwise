---
summary: 'Deck projects: where a new deck goes (.pptwise/decks/), theme-shaped specs, content-only page files, assets, placeholders, deterministic assembly, theme rebinding, and live review'
read_when:
  - authoring or debugging a deck project directory
  - touching spec, assemble, disassemble, deck-directory loading, or live review
  - tracing placeholder, orphan-file, locked-field, theme-menu, or asset errors
  - changing or freezing a project's bound theme
  - deciding where a deck lives, or why its output folder has the name it has
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
  "footer": { "page_number": true, "organization": true, "confidentiality": "footer" },
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

The spec owns narrative, theme binding, output filename, metadata, deck brand, branding posture, footer marks, the course a talk runs through (`course`, whose stages each page file names with `stage`), page order, each page's id, type, heading, and every content page's kind. `summary` and `focus` are optional fill guidance. Prefer a component type for `focus`.

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

The fillable fields are `components`, `background`, `image_side`, `footnote`, `fields`, `stamp`, `tag`, `ballot`, `years`, `stage`, and `notes`. Page files cannot contain `type`, `kind`, or `heading`. Those are locked by the spec. An orphan file whose id is absent from the spec is also a hard error.

Fill in batches of at most four pages, then run assemble and validate. This keeps capacity and component mistakes local.

## Placeholders are normal

When a spec page has no matching page file, assembly creates a semantic placeholder with its locked id, type, kind, and heading. Assemble and validate accept placeholders. Final render blocks them unless `--draft` is explicit.

Placeholders let the author confirm the whole page sequence before writing every page. They do not weaken the spec contract.

## Assets are project-local

Files under `assets/` are registered by filename. Components reference the basename as `asset_id`. A `.json` file there is a picture's provenance sidecar and is not registered. `pptwise images fetch` and `pptwise images generate` pin pictures into this directory, so a deck keeps its pictures when it moves. Pictures an earlier version pinned under `.pptwise/<place>/assets/` still count while the deck stays where it was, and a picture of the same id in `assets/` wins.

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

`spec.theme` resolves by name from the deck directory, upward workspace `themes/` directories, installed content packs, then factory presets. Render has no theme override.

Freeze a workspace theme by copying it to `my-deck/theme.json` with the same id. Project commands load it automatically, and `serve` watches it.

A palette fork preserves the menu byte for byte. It may replace the project binding, followed by spec validation, assembly, IR validation, audit, and render.

Switching to a theme with another menu is the same name change: edit `spec.theme` and build. Page files keep their kinds. A kind the new menu lacks is drawn by its nearest offered kind, and furniture the new faces have no place for (`kicker`, `stamp`, `tag`, `years`, `stage`) is left off with a warning while staying in the page file. See [Menu lookup](./menu-lookup.md#theme-changes).

A build that draws every page whole records its theme as the one the pages are written for, in `.pptwise/<place>/written-for.json`. A later build under another theme draws the deck rather than refusing pages written for the first theme's faces. What the new faces cannot take (a cover's list, a block beside a full-body one, `fields`, `ballot`, the last items of a list too long for the new box) is left off, and a text too long for the new box is cut. Each such page gets a warning that names what it lost and how to keep it under the new theme, and the report's `writtenFor` names the theme that draws it whole. The page files keep everything, so building under the recorded theme again draws them whole. A build under the new theme that draws every page whole, after the pages are rewritten for it, moves the record. Without a record (a deck never built whole, a fresh checkout) every page is checked as strictly as a new deck's.

A deck that froze its theme in its own `theme.json` keeps that file until it is deleted or replaced: the build refuses another name with a different menu rather than leaving the frozen file unused.

## Live review

For a self-contained review file:

```bash
pptwise preview my-deck/ --html
```

For a browser session that refreshes when the spec, page files, assets, or the bound theme's file change:

```bash
pptwise serve my-deck/ --no-open
```

Watching is directory-level, so atomic saves (write-tmp-then-rename) and directories created after startup (`pages/`, `assets/`) trigger a rebuild. Watching starts before the first build, so a page saved while that build is still rendering triggers a rebuild that runs as soon as the server is up. The bound theme is covered two ways. Inside the project root (the directory holding `pptwise.config.json`, or the working directory itself without one), file events refresh the preview at once: the deck directory's `theme.json`, `<name>.theme.json`, and `<name>.json`, then `themes/` in each directory from the working directory up to the root, whether those exist yet or not. The rest rests on one record. Every build reads all of its theme inputs once, at its start: the spec or IR itself, for the name it binds, where that name resolves to (which built-in, or a theme file and its content), and the deck's own `theme.json` when the rebind guard compares against it. The spec or IR the build assembles is that one read, never a second, so what a build binds is what its record says. The build reports that record whether it succeeds or fails. Every 2 seconds, the same record is collected again the same way and compared with the last build's. A different record triggers a rebuild, and an identical one does not, so a file that stays broken is built once and left alone until it changes. Because the comparison is by content, a theme file rewritten with its size and modification time kept (a restore, a save that preserves timestamps, a symlink pointed at another file) still refreshes, and a whitespace-only save does not. The same goes for the spec or IR itself when it is a symlink to a file no watcher sees: an edit there, a rebind and a rebind back included, is a different record. Because a failed read is part of the record, a plain file named `themes` on the lookup chain fails the build and the comparison alike, so the page enters the failure state within one check and leaves it as soon as the path is fixed, and a rebind refused because the deck's `theme.json` has a different menu clears as soon as that file, or the file its symlink points at, matches. That comparison catches any change to the theme inputs, inside or outside the project root: a `themes/` created, deleted, moved away whole, or replaced by a plain file, at any level of the lookup. A deck started on a factory preset picks up a `themes/<name>.theme.json` created later, and rebinding the spec to another name moves both the watch and the comparison to that name. When a rebuild fails, the page shows the failure and keeps the last good result without treating it as current. A file event the watcher itself cannot act on (a directory swapped for a plain file in the same instant) is reported as a failed build and retried, never left to end the process, and a watched directory that was there at startup and is later removed or replaced is still reported by the directory above it, so removing the obstacle clears the failure on its own.

Preview output is read-only. A reviewer describes a change, and the author edits the smallest owning source file. Content revisions belong to one page file. Order, type, kind, heading, and theme changes belong to the spec.

## Disassemble an IR

```bash
pptwise disassemble deck.json -o my-deck/
```

Disassembly writes a version 1 spec, one content-only file for every non-placeholder page, and local asset files when possible. It refuses to overwrite an existing `deck.spec.json`. The resulting project still contains no persisted face choice.

## Where decks live

A deck lives in the project, and a `<target>` is always a path: a deck project directory or an IR file, resolved against the current directory. There is no deck folder under the home directory and no setting that points at one.

A new deck goes in `.pptwise/decks/<name>/` under the project root, the directory holding `pptwise.config.json`, or the working directory without one. The skill and the DSH plugin's tools tell the model so, with `<name>` a few lowercase English words joined by hyphens. A place the user names wins, and a deck that already sits elsewhere is read where it is, never moved. Nothing in PPTwise writes into `decks/`: the author does.

```text
my-project/
  .pptwise/
    .gitignore          *
    decks/
      q3-review/        deck.spec.json, pages/, assets/
    q3-review/          pages, preview.html, written-for.json, q3-review.pptx
    previews/           DSH cards
```

A deck in `decks/` builds to `.pptwise/<name>/`, its path inside `decks/` with hyphens, so `.pptwise/decks/q3/zh/` builds to `.pptwise/q3-zh/`. A deck at the project's top level with the same name builds to the same folder, so keep the names apart. No deck output takes the names `decks`, `themes`, `previews`, or `theme-try`. A deck that would gets `-deck` after its name. A deck kept straight under `.pptwise/` (`.pptwise/q3/`, as some were started before `decks/`) keeps building where it always did, to `.pptwise/pptwise-q3/`. Its folder is the one `.pptwise/decks/q3/` would build to, so while both exist, the deck in `decks/` is refused with a message naming the shared name, before anything reads or clears that folder. Rename one of them.

The output folder follows the deck's path, so a deck that moves builds to a new folder. The old one (its `.pptx`, `written-for.json`, and any pictures pinned there) stays until it is deleted, and the first build in the new place checks every page as strictly as a new deck's until a build draws them all whole. This is one reason a deck that already exists is edited where it is.

A command run from inside `.pptwise/` (from the deck's own folder, say) works for the project that holds that `.pptwise/`. Output lands in the project's `.pptwise/`, never in one nested under the deck, and `theme new` writes to the project's `themes/`. The theme lookup walks up from the deck, through `.pptwise/` to the project's `themes/`, wherever the command runs from.

Because the sources sit in `.pptwise/`, they share its git posture. The first command that writes there keeps the folder out of git, also when the author created it by starting a deck in it. A deck that should be committed belongs somewhere else in the project, or is added with `git add -f`.
