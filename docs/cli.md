---
summary: 'Current CLI surface for IR v5, theme v2, deck projects, per-page inspection, fixed-sample theme comparison, validation, audit, images, preview, content packs, and installation health'
read_when:
  - looking up a supported command or flag
  - wiring an agent around the spec, fill, validate, audit, and render loop
  - reading one page's fill contract or checking whether a page fits before render
  - creating, forking, comparing, extracting, or resolving themes
  - diagnosing audit output, image sourcing, or an installation
  - setting a license key or syncing content packs
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

Fill no more than four pages between validation passes, and read each page's contract with `inspect` before writing it. Use `serve` when a reviewer needs a live browser round.

## Command index

| command | purpose |
| --- | --- |
| `render <target>` | Render native editable PPTX. |
| `validate <target>` | Validate IR, theme binding, menu kinds, components, assets, and content quality. |
| `audit <target>` | Run deterministic visual and geometry checks. |
| `asset-brief <target>` | Report real image frames, crop, palette, safe zones, and prompts. |
| `schema` | Print the IR or spec JSON Schema, or one component or kind cut from it. |
| `inspect <deck> --page <id>` | Show one page's fill contract, expand one component for it, or check whether it fits. |
| `spec validate <file>` | Validate a theme-shaped deck spec. |
| `assemble <dir|name>` | Merge a deck project into derived IR v5. |
| `disassemble <ir.json>` | Split IR v5 into a spec, page files, and assets. |
| `themes` | List the 24 factory presets and installed pack themes, with metadata. |
| `theme new` | Copy a named theme into a self-contained v2 file. |
| `theme fork` | Copy a theme and rederive its palette around new anchors. |
| `theme try` | Render the fixed fitting-room sample across two to four themes. |
| `brand extract` | Extract Office colors and fonts into a complete v2 theme. |
| `narratives` | List named narrative presets and axes. |
| `icons` | List every icon name an `icon` field accepts. |
| `layouts` | Inspect the internal face registry for engine maintenance. |
| `images search` | Search configured stock providers. |
| `images fetch` | Pin one selected stock image to a deck. |
| `images list` | List pinned images for a deck. |
| `images generate` | Generate and pin an image through an enabled local CLI. |
| `config set` | Set optional user configuration. |
| `config show` | Show effective user configuration with secrets masked. |
| `license set <key>` | Save the license key that unlocks content packs. |
| `license status` | Show whether a license key is configured. |
| `license clear` | Remove the saved license key. |
| `packs sync` | Install or update the content packs a license covers. |
| `packs list` | List installed packs and their themes. |
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
- `stepped-aside`
- `monotony`

Any finding exits with code 1. `--pixels` adds image-backed text contrast sampling and requires `sharp`.

## Schemas and specs

```bash
pptwise schema [--pretty]
pptwise schema --spec [--pretty]
pptwise schema --component <type> [--pretty]
pptwise schema --kind <kind> [--theme <name> [--deck <dir>]] [--pretty]
pptwise icons [--json]
pptwise spec validate deck-dir/deck.spec.json
```

The IR schema keeps every shared piece in `$defs` once: each component under its own type name, the component union as `Component`, the icon-name enum as `IconName`, and the tag rows, figures, cards, charts and pages share as `Tag`. Output is one line unless `--pretty` is passed.

`--component` prints one component's schema with only the `$defs` it needs. `--kind` prints the components a page of that kind may hold, the face each built-in theme and each installed pack theme binds to it (a pack that cannot be read is left out, with a note on stderr), a `oneOf` over those components, and their `$defs`. Add `--theme` to answer for the bound theme alone. The name resolves the way `validate` resolves a spec's theme: the deck directory first (`theme.json`, `<name>.theme.json`), then workspace `themes/`, then installed packs, then the presets. The deck directory is `--deck <dir>`, or the cwd when it holds `deck.spec.json` or a deck-local file for that name (`theme.json`, `<name>.theme.json`, `<name>.json`), which is where `validate deck.json` reads a bare IR's theme from. A face that draws no component prints an empty list and `not: {}` in place of the `oneOf`. The list comes from the same theme-menu route validate uses, so a component outside it fails `validate`. An unknown type, kind, or theme fails and lists the valid names.

Icon fields print as a string that points at `pptwise icons`. Validation always checks the closed enum.

IR is version `"5"`. The deck spec is version `"1"`. Theme files are numeric version `2`. Current IR has no `seed`, `layout`, `beat`, or `arrangement` fields.

## Inspect one page

```bash
pptwise inspect <deck> --page <id> [--json]
pptwise inspect <deck> --page <id> --component <type> [--json]
pptwise inspect <deck> --page <id> --fit [--json]
```

`inspect` reads one page of a deck project the way `validate` reads the deck, with one difference: it reads only that page's file, and every other page assembles as a placeholder. A broken or unwritten page elsewhere in the deck does not change the answer.

The default report shows the spec's locked fields and fill hints, the page file and whether it exists yet, the fields the page file may carry with their schema, the components the bound theme's face draws on this page (with the full-body and required ones among them), candidates from the spec's `focus` and from what the page already holds, the counts `validate` applies to the page, and `validate`'s findings on the page or on the deck as a whole. Counts come in two levels. Past an `error` limit `validate` refuses the page, and past a `warning` limit it warns. A limit no drawn page can reach is left out: one that a stricter error on the same count makes unreachable, and one above the most a whole 1280×720 canvas can show of that unit, since content is dropped in the drawing long before such a count. The command exits 1 when the page has an error.

`--component <type>` expands one component the page may hold: its design story, the page's limits on it, whether it must be the page's only component, and the schema `schema --component` prints for it. A type the page's face does not draw fails and lists the types it does draw.

Counts do not prove that content fits the drawn page. `--fit` draws the page with the same renderer and reads the same drop count as the content-drop gate in `render`, so a page it reports as fitting is a page `render` accepts. It also reports text cut to fit, which `render` allows and `audit` reports, and a face that stepped aside so a plainer layout could draw the whole page. It exits 1 when content would be dropped or the page has a validate error. A page not written yet, or one `validate` refuses, is not drawn, and the report says why.

`--json` prints the report as one line of JSON.

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

`themes --json` marks each row's `source`: `builtin` for a factory preset, `pack` for a theme an installed content pack ships (with its `pack` id). A pack that cannot be read is listed as one entry with an `error` field, and the rest of the list is unaffected.

Theme names resolve from the deck directory, then workspace `themes/` directories while walking upward, then installed content packs, then factory presets. Unknown names fail and list every place searched, each installed pack directory included. Deck and workspace files may keep a factory or pack id and shadow that theme. A theme id is `^[a-z0-9-]+$`. Pass `--force` to overwrite an existing theme file.

## Brand extraction

```bash
pptwise brand extract <file.thmx|file.potx|file.pptx> \
  -o <theme.json> \
  [--id <id>] [--label <label>] [--from <donor>]
```

Extraction is local. It copies the donor's complete menu, applies extracted color and font anchors through full palette derivation, and writes a complete v2 theme. `--from` defaults to `brief`.

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

`GET /status` returns a JSON object with `latestRevision`, `servedRevision`, `latestOk`, and an optional `error` message. `GET /` carries three response headers: `X-Pptwise-Build-Status` (`ok` or `failed`), `X-Pptwise-Served-Revision`, and `X-Pptwise-Latest-Revision`. When a rebuild fails, the browser shows an error banner and keeps serving the last good HTML without passing it off as current.

## Content packs

```bash
pptwise license set <key>
pptwise license status
pptwise license clear
pptwise packs sync [--json]
pptwise packs list [--json]
```

A content pack is a versioned set of extra themes unlocked by a license key. `license set` checks the key's shape and saves it to `$PPTWISE_HOME/license.json`, readable by the owner only. `license status` shows at most the key's first eight characters. `license clear` removes the key and leaves installed packs in place.

`packs sync` installs every pack the license covers that is missing or at another version, after checking its sha256, its `pack.json`, its engine range, and each theme file. A pack for a newer pptwise is skipped with a note to update. Without a license it prints one line and exits 0. A failed sync leaves installed packs as they were, and exits 1. `PPTWISE_PACKS_URL` points it at another server, which must be https (plain http only on `localhost`, `127.0.0.1`, or `::1`). See [Content packs](./packs.md) for the protocol, the archive format, and the `--json` report.

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
