---
summary: 'Current CLI surface for IR v5, theme v2, deck projects, fixed-sample theme comparison, validation, audit, images, preview, and installation health'
read_when:
  - looking up a supported command or flag
  - wiring an agent around the spec, fill, validate, audit, and render loop
  - creating, forking, comparing, extracting, or resolving themes
  - diagnosing audit output, image sourcing, or an installation
---

# CLI

The CLI accepts an IR v5 file, a deck project directory, or a bare deck name for most deck operations. A bare name resolves under the configured deck root. An explicit path wins.

There is no render-time theme option. A project binds its theme in `deck.spec.json`. A bare IR binds it in `theme.id`. Compare unbound candidates with `theme try` before authoring the spec.

## Recommended project loop

```bash
pptwise spec validate deck-dir/deck.spec.json
pptwise assemble deck-dir/
pptwise validate deck-dir/
pptwise audit deck-dir/
pptwise render deck-dir/
pptwise preview deck-dir/ --html
```

Fill no more than four pages between validation passes. Use `serve` when a reviewer needs a live browser round.

## Command index

| command | purpose |
| --- | --- |
| `render <target>` | Render native editable PPTX. |
| `validate <target>` | Validate IR, theme binding, menu kinds, components, assets, and content quality. |
| `audit <target>` | Run deterministic visual and geometry checks. |
| `asset-brief <target>` | Report real image frames, crop, palette, safe zones, and prompts. |
| `schema` | Print the IR, spec, or style-override JSON Schema. |
| `spec validate <file>` | Validate a theme-shaped deck spec. |
| `assemble <dir|name>` | Merge a deck project into derived IR v5. |
| `disassemble <ir.json>` | Split IR v5 into a spec, page files, and assets. |
| `themes` | List the 24 factory presets and metadata. |
| `theme new` | Copy a named theme into a self-contained v2 file. |
| `theme fork` | Copy a theme and rederive its palette around new anchors. |
| `theme try` | Render the fixed fitting-room sample across two to four themes. |
| `brand extract` | Extract Office colors and fonts into a complete v2 theme. |
| `narratives` | List named narrative presets and axes. |
| `layouts` | Inspect the internal face registry for engine maintenance. |
| `images search` | Search configured stock providers. |
| `images fetch` | Pin one selected stock image to a deck. |
| `images list` | List pinned images for a deck. |
| `images generate` | Generate and pin an image through an enabled local CLI. |
| `config set` | Set optional user configuration. |
| `config show` | Show effective user configuration with secrets masked. |
| `init` | Create `pptwise.config.json` in the current directory. |
| `preview <target>` | Write SVG pages and an optional self-contained review file. |
| `serve <target>` | Start a live-reloading review server. |
| `doctor` | Check runtime, skill copies, plugin state, optional capabilities, and a self-test render. |
| `check-update` | Check npm for a newer release. |
| `self-update` | Update the global installation. |

`layouts` exposes engine vocabulary for maintainers. Deck authors and authoring agents choose content `kind`, never internal face ids.

## Render

```bash
pptwise render <target> \
  [-o <out.pptx>] \
  [--draft] \
  [--allow-dropped-content] \
  [--no-git-ignore]
```

Without `-o`, output goes to `.pptwise/<deck>/<deck>.pptx` under the project root. Change colors with `pptwise theme fork`. That writes a complete theme. Render does not take a partial recolor overlay.

`--draft` permits placeholder pages. `--allow-dropped-content` permits known content loss and should be used only with explicit user approval. The normal response is to shorten or split the page.

## Validate and audit

```bash
pptwise validate <target>
pptwise audit <target> [--json] [--pixels]
```

Validation covers strict IR v5 shape, installed theme, theme-menu kinds, effective boundary faces, component rules, duplicate ids, assets, narrative, physical capacity, and editorial warnings. Errors block `OK`. Warnings do not.

Audit renders deterministic SVG and checks:

- `overflow`
- `out-of-bounds`
- `low-contrast`
- `overlap`
- `content-truncated`
- `content-dropped`
- `monotony`

Any finding exits with code 1. `--pixels` adds image-backed text contrast sampling and requires `sharp`.

## Schemas and specs

```bash
pptwise schema
pptwise schema --spec
pptwise spec validate deck-dir/deck.spec.json
```

IR is version `"5"`. The deck spec is version `"1"`. Theme files are numeric version `2`. Current IR has no `seed`, `layout`, `beat`, or `arrangement` fields.

## Assemble and disassemble

```bash
pptwise assemble <dir|name> [-o <deck.json>]
pptwise disassemble <ir.json> -o <dir>
```

Assembly combines spec-owned semantics, content-only page files, and local assets. Missing page files become placeholders. It does not persist face choices or other rendering state.

Disassembly refuses to overwrite an existing `deck.spec.json`. It preserves page ids and writes asset files when the input source can be copied or decoded.

## Themes

```bash
pptwise themes [--json]

pptwise theme new --from <preset-or-name> \
  [-o <theme.json>] [--id <id>] [--label <label>]

pptwise theme fork <name> --primary "#0B5FFF" \
  [--bg <hex>] [--accent <hex>] [--text <hex>] [--surface <hex>] \
  [-o <theme.json>] [--id <id>] [--label <label>]

pptwise theme try <id,id,...> [-o <dir>]
```

`theme new` copies a preset or resolved workspace theme. Pass either an output path or an id. A created theme is complete and independent.

`theme fork` preserves the menu, rederives dependent style tokens, and runs the contrast gate. Quote hex values in shells where `#` begins a comment.

`theme try` requires two to four distinct names. It writes a contact sheet under `.pptwise/theme-try/` by default. It never changes a deck binding.

Theme names resolve from the deck directory, then workspace `themes/` directories while walking upward, then factory presets. Unknown names fail. Workspace themes cannot shadow preset ids.

## Brand extraction

```bash
pptwise brand extract <file.thmx|file.potx|file.pptx> \
  -o <theme.json> \
  [--id <id>] [--label <label>] [--from <donor>]
```

Extraction is local. It copies the donor's complete menu, applies extracted color and font anchors through full palette derivation, and writes a complete v2 theme. `--from` defaults to `consulting`.

## Narratives and engine inspection

```bash
pptwise narratives [--json]
pptwise layouts [--json]
```

Narratives reports named presets, concrete strategy, pacing, audience axes, and theme recommendations. Recommendations guide pre-spec theme choice. They do not select faces.

`layouts` reports internal registry records, capacities, slots, and engine flags. It is useful when developing faces or checking menu registrations. Its ids do not belong in IR v5 or deck specs.

## Images

```bash
pptwise asset-brief <target> [--json]
pptwise images search <query> \
  [--orientation landscape|portrait|square] \
  [--color <name-or-hex>] [--min-width <px>] [--min-height <px>]
pptwise images fetch <provider:id> --deck <dir> --as <asset_id> [--query <text>]
pptwise images list --deck <dir>
pptwise images generate --deck <dir> --as <asset_id> [--prompt <text>]
```

Search checks Pexels, then configured Pixabay, then commercially filtered Openverse sources. Fetching pins the chosen file and provenance sidecar under `.pptwise/<deck>/assets/`. Generate uses an enabled local generator and falls back to the asset brief prompt when `--prompt` is omitted.

## Preview and serve

```bash
pptwise preview <target> [-o <dir>] [--html] [--no-git-ignore]
pptwise serve <target> [--port <number>] [--no-open]
```

Preview writes one SVG per page. `--html` also writes an inlined review interface with thumbnails, keyboard navigation, placeholder badges, and audit output for a complete deck.

Serve watches the IR or project sources, including deck-local `theme.json`, and refreshes the browser. Agents should pass `--no-open`, report the exact URL, and stop only the process they started.

## Configuration and health

```bash
pptwise init
pptwise config set <key> [value]
pptwise config show
pptwise doctor [--json]
pptwise check-update
pptwise self-update
```

Omit a secret value from `config set` to enter it through a hidden prompt. `doctor` exits with code 1 only on a hard failure. Optional `sharp` and LibreOffice capabilities are reported separately.

Generated `.pptwise/` output is added to the repository's local exclude file unless a command receives `--no-git-ignore`.
