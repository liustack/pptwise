---
summary: 'Deck project files, the spec and fill workflow, custom theme persistence, live preview, placeholders, locked fields, selection precedence, and workspace artifacts'
read_when:
  - authoring or debugging a deck project directory
  - touching src/spec or deck-related CLI modules
  - tracing placeholder, orphan-file, locked-field, or boundary-page errors
  - running the live review loop or generating an image asset brief
---

# Deck projects

## Directory layout

```text
my-deck/
  deck.spec.json         page order, type, heading, narrative, theme, branding, seed
  theme.json             optional version 1 custom theme, registered automatically
  pages/<page-id>.json   one file per filled page, no type or heading
  assets/                local image assets, registered by filename
  deck.json              materialized IR written by assemble
```

`deck.spec.json` is the sole source of page order and locked page fields. `pages/` owns page content. `theme.json` owns a custom theme definition, while the spec owns the selected theme id.

Filesystem handling lives in `src/cli/deck-dir.ts`. Pure assembly and disassembly live in `src/spec/assemble.ts` and do no filesystem work. Every page or asset id passes through the safe-file-segment check before becoming a path.

A legacy `deck.plan.json` is not read as a current project. `pptwise migrate` converts it to `deck.spec.json`. Keeping both names in one directory is a hard error.

## Authoring workflow

The skill in `skills/pptwise/SKILL.md` maps to these phases:

1. **Read vocabulary.** Run `schema`, `schema --spec`, `narratives --json`, `themes --json`, and `layouts --json` fresh.
2. **Choose the theme and lock the spec.** Route occasion signals through `themes --json` metadata. Use narrative recommendations only as a reference. When a built-in visual direction remains open, run `preview <target> --themes <id,id,...>` and let the user choose from the cover and content contact sheet. Keep an extracted custom theme under a candidate filename while previewing it with both `--theme-file` and `--theme`. Only after confirmation, persist it as project `theme.json`, put its id in the spec, validate the spec, and persist a seed.
3. **Fill pages.** Write `pages/<id>.json` in small batches and run `assemble` plus `validate` after each batch.
4. **Audit.** Run `audit` after all pages are filled. Geometry findings and the monotony advisory come from `src/audit/deck-audit.ts`.
5. **Preview and review.** Use `preview --html` for a file or `serve` for a live browser loop. Preview is read-only.
6. **Revise and render.** Edit the smallest source file, then assemble, validate, audit, and render again.

Consumer commands accept a bare IR file, a deck project directory, or a bare deck name. `src/cli/deck-dir.ts` dispatches the target form.

## Custom project theme

Project `theme.json` is a registration source for a confirmed custom theme. It is loaded before `assemble` so `deck.spec.json` can name the custom id. Validate, audit, preview, serve, and render also register it automatically. No `--theme-file` or `--theme` flag is required.

`--theme-file` serves the equivalent registration role for a bare IR. It never selects the id. The IR must name the id in `theme.id`, or the command must also pass `--theme <id>`.

Changing `theme.json` style tokens keeps the selected id and project workflow unchanged. Changing the spec to another theme requires assemble again if the deck should adopt the new theme's face pools. A one-off `--theme` repaint keeps layout ids already materialized in `deck.json`.

## Live preview

`pptwise serve <target> [--port 4400] [--no-open]` serves the same review page as `preview --html` on `127.0.0.1`. It is a local review tool, not a remote server.

For a deck project it watches `deck.spec.json`, `pages/`, `assets/`, and `theme.json`. For a bare IR it watches the IR and any `--theme-file`. Saves are debounced, successful rebuilds refresh the open tab, and a temporary invalid JSON save displays a recoverable error until the next valid rebuild.

Each rebuild rereads a custom theme and replaces the previous registration. Theme edits therefore apply without restarting `serve`.

## Asset briefs

`pptwise asset-brief <target> [--json]` is implemented in `src/render/asset-brief.ts`. It performs an off-screen render to report each `image` component's real frame, aspect ratio, crop mode, palette, and suggested prompt. It does not copy nominal layout constants.

An unresolved asset still receives a full brief with `missing: true`. A component the selected layout does not draw reports `rendered: false`. The command is informational and does not change the IR or call an image service.

## Placeholders and draft rendering

A spec page without `pages/<id>.json` assembles into a heading-only placeholder. Assemble, validate, preview, and serve accept it. Audit skips it. Render refuses it unless the caller explicitly passes `--draft`.

An orphan page file, duplicate id, unsafe id, or locked-field contradiction remains a hard error. Placeholder support is for incremental filling, not structural ambiguity.

## Locked fields

`type` and `heading` belong to `deck.spec.json`. A page file that declares either key fails assembly, even if its value is `undefined`.

Page files may supply `components`, `layout`, `arrangement`, `background`, `image_side`, `footnote`, and `notes`. Notes become native speaker notes and never enter the canvas.

`branding` is a deck-level spec field. Omitted behaves like `cover-only`. Use `full` only when every content page needs the brand frame, including confidential or restricted decks. A layout with `branding: "none"` can still suppress the frame on its own page.

## Boundary-page render surface

The page-file shape is shared, but fields render only when the resolved layout has a matching surface.

| Page type | Components | Footnote |
| --- | --- | --- |
| `cover` | Only when the known cover layout declares a slot that accepts the component type | Never |
| `chapter` | Rejected by current chapter layouts | Never |
| `content` | Rendered through the selected standard layout or image takeover | Depends on the selected content layout |
| `ending` | Only when the known ending layout declares a compatible body slot | Never |

`checkBoundaryPageContent` in `src/validate-core.ts` resolves a known pin or single-item theme pool before deciding. A multi-item boundary pool cannot promise a matching slot and therefore rejects authored components. `subheading` is not globally banned because many boundary layouts render it. Notes remain outside the canvas for every page type.

## Theme and style precedence

Theme selection has five levels:

1. CLI `--theme`
2. Authored artifact selection, meaning project `deck.spec.json` or bare IR `theme.id`
3. Project `pptwise.config.json`
4. User `$PPTWISE_HOME/config.json`
5. Schema default `consulting`

Project `theme.json` and `--theme-file` register ids but do not add selection levels. For style overrides, the chain is CLI `--style`, project config, user config, then IR-authored `theme.style`.

`pptwiseHome()` in `src/cli/home.ts` resolves `$PPTWISE_HOME` or `~/.pptwise`. Bare deck names resolve under its `decks/` directory unless a local target or configured `decksDir` wins. Project config paths resolve relative to the config file. User config paths resolve relative to the pptwise home.

## Workspace artifacts

Without `-o`, render and preview write under the nearest project root:

```text
.pptwise/<deck>/
  preview.html
  contact-sheet.html
  manifest.json
  001-cover.svg
  <deck>.pptx
  assets/
```

Preview and render outputs are regenerable. Downloaded stock assets and sidecars under the artifact `assets/` directory are pinned inputs and are not regenerable by deletion alone.

The CLI adds `.pptwise/` to `.git/info/exclude` when it creates the default artifact root. It does not edit the shared `.gitignore`. `--no-git-ignore`, an explicit `-o`, or a configured `outDir` changes that behavior as documented in [`cli.md`](./cli.md).

## Disassembly

`disassembleDeck` in `src/spec/assemble.ts` converts a single IR into a project and is intentionally lossy. It preserves page identity and recoverable summary fields, but inline theme overrides collapse to a theme id. Layout ids already materialized by assembly return as explicit page pins. Reassembling such a project keeps those pins until the author removes them.
