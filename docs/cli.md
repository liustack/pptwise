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

The CLI accepts an IR v5 file or a deck project directory for most deck operations. Either is a path, resolved against the current directory.

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

`pptwise build deck-dir/ --json` runs assemble, validate, audit, preview, and render in one pass and reports every problem in one list. See [Build](#build).

Fill no more than four pages between validation passes, and read each page's contract with `inspect` before writing it. Use `serve` when a reviewer needs a live browser round.

## Command index

| command | purpose |
| --- | --- |
| `build <target>` | Assemble, validate, audit, preview, and render in one pass, with one structured report. |
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
| `theme fork` | Copy a theme and repaint it around one brand color, or around exact anchor colors. |
| `theme try` | Render the fixed fitting-room sample across two to four themes, or the caller's own cover and one content page across any number of themes. |
| `brand scan [dir]` | Find a project's logo files, pictures, brand colors, fonts, and Office templates. |
| `brand extract` | Repaint a theme around an Office template's brand color and fonts. |
| `narratives` | List named narrative presets and axes. |
| `icons` | List every icon name an `icon` field accepts. |
| `layouts` | Inspect the internal face registry for engine maintenance. |
| `images search` | Search configured stock providers. |
| `images fetch` | Pin one selected stock image to a deck. |
| `images add` | Pin one picture from an https address or a file, with its source, author, and license. |
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

## Build

```bash
pptwise build <target> [--json] [--no-git-ignore] [--alternatives | --no-alternatives]
```

`build` assembles a deck project (or reads an IR file), validates it, draws every page, audits the drawing, and renders the `.pptx`, in one process from one read of the sources. It exits 0 when the deck passed every check and 1 when it needs revision.

Output goes where `render` and `preview` put it by default: the pages, `preview.html`, and `manifest.json` in `.pptwise/<place>/`, and the deck's one `.pptx` at `.pptwise/<place>/<filename>.pptx`, the same path `render` writes. There is no `-o`. The `.pptx` is written only when every check passes, and a build that does not pass removes any `.pptx` an earlier build left in that folder (a renamed `filename` leaves no old file behind either), so the file there always matches the sources the last build read. The pages are drawn whenever validate passes, so a deck with audit findings can still be looked at.

`--json` prints the report. `status` is `ok` or `needs_revision`. Each entry in `errors` says which check raised it (`stage`: `assemble`, `validate`, `audit`, or `render`), where it is (`page`, `pageId`, and for a deck project the `file` to edit, `pages/<id>.json` or `deck.spec.json`, with the `field` inside it), and the check's own `message`, which says how to fix it when the check knows. An audit entry adds its `code` and `detail`. An unwritten page is an error that names the page file to write, and the audit is skipped until every page is written. `warnings` are validate's warnings and never block the `.pptx`.

```json
{
  "status": "needs_revision",
  "target": "/work/weekly",
  "theme": "brief",
  "pageCount": 6,
  "audited": true,
  "errors": [
    {
      "stage": "audit",
      "page": 2,
      "pageId": "why",
      "file": "pages/why.json",
      "code": "monotony",
      "message": "pages 2-4 repeat component type \"bullets\" (3 consecutive pages) — vary the lead component across neighbouring pages (mix bullets, chart, kpi, blockquote) so the deck does not read as a repeating template",
      "detail": { "componentType": "bullets", "fromPage": 2, "toPage": 4, "length": 3 }
    }
  ],
  "warnings": [],
  "preview": {
    "dir": "/work/.pptwise/weekly",
    "html": "/work/.pptwise/weekly/preview.html",
    "manifest": "/work/.pptwise/weekly/manifest.json",
    "pages": [{ "page": 1, "id": "cover", "type": "cover", "file": "/work/.pptwise/weekly/001-cover.svg" }]
  },
  "pptx": null,
  "notes": []
}
```

A passing build has `"status": "ok"`, an empty `errors`, and `pptx` set to the absolute path of the deck's `.pptx`. A target that does not exist, or a configuration file that cannot be read, fails the command instead of producing a report.

`signature` counts the pages whose face offers a signature layout (`offered`), the pages one drew (`drawn`), and the pages in the deck (`pages`), and lists each of those pages in `perPage` with the drawing that drew it (`drawnBy`), or `null` and the nearest recipe (`nearest`: its id, look, the recipe as one line, and the changes the page needs) when the face drew it plain. The text report prints one summary line and a hint for each plain page. These are hints, never problems: they do not block the build, and a page whose content does not hold a recipe stays as it is.

`themeSource` says where the bound theme came from: `builtin`, `file` (a theme file the lookup found), or `pack`. `drawnAs` lists the content pages the bound theme draws as another kind, with the kind that draws each (see [Menu lookup](./menu-lookup.md#content-pages)). `writtenFor` names the theme the deck's pages were written for, present when this build drew them under another theme and left something off or cut it. Each such page is in `warnings` (see [Deck projects](./deck-projects.md#theme-binding-and-rebinding)).

The first build of a deck bound to a built-in theme that draws its pages also draws the deck's own cover and one or two of its content pages in up to three other themes, picked from the same shortlist `theme try` uses for the bound theme's occasions and the deck's narrative strategy. Each page is drawn the way the build after switching to that theme draws it: what the theme has no place for (a cover's footnote, say) is left off, and a page is passed over only when that build could not draw it either. They go to `.pptwise/<place>/alternatives/` with a `manifest.json`, and `alternatives` in the report lists each theme's id, display name, and page files, with the time it took (`ms`, about a tenth of a second for a 16-page deck). A later build under the same theme lists them again: the same files while the pages they show are unchanged, and drawn again from the deck as it is now once one of those pages changed, so they never show pages the deck has since rewritten. The manifest keeps a hash of what they were drawn from. `--alternatives` draws them again, for a deck on a theme file too. `--no-alternatives` draws none and keeps the deck's later builds from offering them, for a theme the user named or picked from a theme wall. A deck moved to another theme is treated the same way, and stays so if it moves back. Switching is still changing `theme` in `deck.spec.json` and building again.

## Render

```bash
pptwise render <target> \
  [-o <out.pptx>] \
  [--draft] \
  [--allow-dropped-content] \
  [--no-git-ignore]
```

Without `-o`, output goes to `.pptwise/<place>/<filename>.pptx` under the project root. `<filename>` is the deck's own `filename` (the spec's, or the IR file's), with or without `.pptx`, and falls back to the deck directory's or IR file's name when the deck sets none. `<place>` is the deck's path from the project root joined with hyphens, so `decks/q3/zh` and `decks/q4/zh` keep separate folders (`decks-q3-zh`, `decks-q4-zh`). A deck at the top level keeps its own name, and so does a deck in `.pptwise/decks/`, named by its path inside that folder (`.pptwise/decks/q3-review/` builds to `.pptwise/q3-review/`). A deck outside the project, or one whose path has characters other than Latin letters and digits, adds a short hash of its path. Change colors with `pptwise theme fork`. That writes a complete theme. Render does not take a partial recolor overlay.

`--draft` permits placeholder pages. `--allow-dropped-content` permits known content loss and should be used only with explicit user approval. The normal response is to shorten or split the page.

## Validate and audit

```bash
pptwise validate <target>
pptwise audit <target> [--json] [--pixels]
```

Validation covers strict IR v5 shape, installed theme, theme-menu kinds (a kind the menu lacks lands on its nearest offered kind, see [Menu lookup](./menu-lookup.md)), effective boundary faces, component rules, duplicate ids, assets, narrative, physical capacity, and editorial warnings. Errors block `OK`. Warnings do not.

Validation also draws every page the way `render` draws it. Content pages are drawn too, a plainer layout taking over included, and a page that would leave anything off or cut a heading, source line or a component's words is refused, naming what would be lost and, when one more drawing finds it, what to take off. `render`, `preview` and `inspect` validate the same way. `render --allow-dropped-content` skips this drawing of content pages along with the export's own content-drop gate.

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

A `low-contrast` finding on a page whose `background` is a mid-tone color, about as light as `#777777` or `#6B7B8C`, is fixed at the background. The renderer already sets text the theme's ink cannot carry there in pure black, shades cards to the side where that black still reads, and sets a cover's top-left mark against the band of the cover's own it stands on. Text color is the theme's, so a finding that is still left is fixed by moving the background lighter or darker.

A cut is weighed by the field it cut. The page's heading, subheading and source line (`footnote`), and every word a component carries except its tags, are text a reader needs whole. When the theme's layout cuts one of them, a plainer layout that draws them whole takes the page, and audit reports `stepped-aside`. `content-truncated` then names a cut no layout could avoid, with the field and its tier in `detail` (`"tier": "hard"`). A cut kicker, stamp, tag or other label stays on the theme's layout and is reported as `"tier": "declared"`.

The plainer layout, whether it takes a page for a cut or for content the theme's layout cannot hold, sets the page's kicker over the heading and its page tag beside the kicker. It has no place for `fields`, a stamp, a ballot, `stage` or `years`, so a page that carries one keeps the theme's layout, and what that layout could not hold stays reported: a cut as `content-truncated`, a body over capacity as `content-dropped`. The tiers live in `src/ir/truncation-tiers.ts`, and the fields the plainer layout draws in `src/render/step-aside.tsx`.

## Schemas and specs

```bash
pptwise schema [--pretty]
pptwise schema --spec [--pretty]
pptwise schema --component <type> [--pretty]
pptwise schema --kind <kind> [--theme <name> [--deck <dir>]] [--pretty]
pptwise icons [--json]
pptwise spec validate deck-dir/deck.spec.json [--json]
```

The IR schema keeps every shared piece in `$defs` once: each component under its own type name, the component union as `Component`, the icon-name enum as `IconName`, the tag rows, figures, cards, charts and pages share as `Tag`, the kind of news a figure, row or milestone is as `Tone`, a page's strip of years as `Years`, a page's ballot as `Ballot`, and the page fields only some faces draw as `Kicker`, `Fields`, `Stamp` and `Stage`. Output is one line unless `--pretty` is passed.

`--component` prints one component's schema with only the `$defs` it needs. `--kind` prints the components a page of that kind may hold, the face each built-in theme and each installed pack theme binds to it (a pack that cannot be read is left out, with a note on stderr), a `oneOf` over those components, and their `$defs`. Add `--theme` to answer for the bound theme alone. The name resolves the way `validate` resolves a spec's theme: the deck directory first (`theme.json`, `<name>.theme.json`), then workspace `themes/`, then installed packs, then the presets. The deck directory is `--deck <dir>`, or the cwd when it holds `deck.spec.json` or a deck-local file for that name (`theme.json`, `<name>.theme.json`, `<name>.json`), which is where `validate deck.json` reads a bare IR's theme from. A face that draws no component prints an empty list and `not: {}` in place of the `oneOf`. The list comes from the same theme-menu route validate uses. A component outside it fails `validate`, or, when a stand-in kind's face takes it, draws the page as that kind with a warning. For a kind the theme does not offer, the list is its stand-ins' and `drawnAs` names them, nearest first. An unknown type, kind, or theme fails and lists the valid names.

`spec validate --json` prints the result as one JSON object. A valid spec gives `ok: true`, the theme, the resolved narrative, the cover heading as `title`, and `pages` in order, each with its number, `id`, `type`, `kind` for content pages, `heading` and `summary` when the spec has one, plus any warnings. An invalid spec gives `ok: false` with every error and its path, and exits 1.

Icon fields print as a string that points at `pptwise icons`. Validation always checks the closed enum.

IR is version `"5"`. The deck spec is version `"1"`. Theme files are numeric version `2`. Current IR has no `seed`, `layout`, `beat`, or `arrangement` fields.

## Inspect one page

```bash
pptwise inspect <deck> --page <id> [--json]
pptwise inspect <deck> --page <id> --component <type> [--json]
pptwise inspect <deck> --page <id> --fit [--json]
```

`inspect` reads one page of a deck project the way `validate` reads the deck, with one difference: it reads only that page's file, and every other page assembles as a placeholder. A broken or unwritten page elsewhere in the deck does not change the answer.

The default report shows the spec's locked fields and fill hints, the page file and whether it exists yet, the top-level keys the page file may carry on this page's face with their schema (a key only some faces place, such as `fields`, the header lines of a form, is listed only where the face places it), the components the bound theme's face draws on this page (with the full-body and required ones among them), candidates from the spec's `focus` and from what the page already holds, the counts `validate` applies to the page, and `validate`'s findings on the page or on the deck as a whole. Counts come in two levels. Past an `error` limit `validate` refuses the page, and past a `warning` limit it warns. A limit no drawn page can reach is left out: one that a stricter error on the same count makes unreachable, and one above the most a whole 1280×720 canvas can show of that unit, since content is dropped in the drawing long before such a count. The command exits 1 when the page has an error.

The report also lists the theme's signature layouts for the page: the compositions its face offers (the hand-set drawings the theme's samples are made of), the ones made for the page's kind first (or for the kind it lands on), each with how it looks and its recipe, the components, item counts and fields a page needs for that drawing. The face's drawings for other kinds follow by name. A cover, chapter or ending whose face draws its own page over a photograph lists that photograph, written as a background picture. When the page is written and valid, the report draws it and marks the drawing that draws it now, or says the face draws it plain. A recipe is a way in, not a promise: the words still have to fit. Recipes are engine facts and never go into the IR.

`--component <type>` expands one component the page may hold: its design story, the page's limits on it, whether it must be the page's only component, and the schema `schema --component` prints for it. A type the page's face does not draw fails and lists the types it does draw.

Counts do not prove that content fits the drawn page. `--fit` draws the page with the same renderer and reads the same drop count as the content-drop gate in `render`, so a page it reports as fitting is a page `render` accepts. It also reports text cut to fit and a face that stepped aside so a plainer layout could draw the whole page. It exits 1 when content would be dropped or the page has a validate error. A page not written yet, or one `validate` refuses, is not drawn, and the report says why. Since `validate` draws content pages too, a page that would lose content is one `validate` refuses, and its errors say what would be lost.

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

pptwise theme fork <name> --brand "#C8102E[,#E97132]" \
  [-o <theme.json>] [--id <id>] [--label <label>]

pptwise theme fork <name> --primary "#0B5FFF" \
  [--bg <hex>] [--accent <hex>] [--text <hex>] [--surface <hex>] \
  [-o <theme.json>] [--id <id>] [--label <label>]

pptwise theme try <id,id,...> [-o <dir>]
pptwise theme try [<id,...|all>] --title <text> [--occasion <words>] \
  [--brand <hex>[,<hex>]] [--subtitle <text>] [--lang zh|en] [--page <page.json>] [--json] [-o <dir>]
```

`theme new` copies a preset or resolved workspace theme. Pass either an output path or an id. A created theme is complete and independent.

`theme fork` preserves the menu and runs the contrast gate. It repaints in one of two ways, which do not mix:

- `--brand <hex>[,<hex>]` keeps the theme's own ground, text, surface, and fonts, puts the brand color unchanged where the theme shows color most, and draws the theme's other colors as shades of the brand. A second color, the company's own pairing, takes the theme's second colored slot and the chart's second series, except that a chart drawn as one color among inks stays so. Bars and blocks take the brand exactly as given. When the brand cannot be read as heading ink, or the theme would rework its main color into something that no longer looks like the brand (homeroom's blackboard), that slot keeps the theme's color and the brand goes to the other colored slot. The command prints where each color went, and says so whenever it had to lighten or darken one to read on the theme's ground. See [Brand extraction](./brand-extraction.md#repainting-around-a-brand-color) for the rules.
- `--primary <hex>`, with any of `--accent`, `--bg`, `--text`, `--surface`, sets those tokens exactly and rederives the rest around them. Use it when you need exact control.

Passing `--brand` together with any anchor flag is an error. Quote hex values in shells where `#` begins a comment.

`theme try` requires two to four distinct names. It writes a contact sheet under `.pptwise/theme-try/` by default. It never changes a deck binding.

With `--title`, `theme try` draws the caller's own pages instead of the fixed sample: a cover with that title (and `--subtitle` as its subheading), and one content page. The content page is three short points in the language `--lang` names, `zh` or `en`, by default `zh` when the title has Chinese, Japanese or Korean characters and `en` otherwise. `--page <file>` replaces it with one content page written the way a deck page is in IR: `kind`, `heading`, `components`, and `type` if you like, which must be `content`. The names may be one or more, or `all` for every theme `themes` lists. With no names, `theme try` draws a shortlist of four to six: the themes whose occasions match `--occasion` (occasion words such as `business` or `tech`, or a narrative preset such as `weekly-brief`, comma-separated), filled from a spread of quiet to bold general themes when fewer than four match. Without `--occasion` it draws that spread: brief, swiss, journal, terminal. The language decides only the sample page, never which themes are drawn.

`--brand <hex>[,<hex>]` adds one more row: the first theme on the wall repainted around a brand color, or a brand and second color, the same repaint `theme fork --brand` writes. The row's id is `<theme>-brand`, its label ends in `· brand`, and it carries `base` (the theme it was made from) and `brand` (the colors as read). Nothing is bound or written outside the output directory. When the user picks it, bind it with `theme fork <base> --brand '<brand>' -o <deck-dir>/theme.json --id <id>`, which the text report prints. Put the theme the brand should wear first in the ids, or let `--occasion` order the shortlist.

Each page is validated alone against each theme. A page a theme refuses, such as a title its cover would cut or components no face it offers for that kind can take, is left out of that theme and listed under `skipped` with validate's own message. `--json` adds `notes`, one line per distinct reason naming the themes it applies to, so a page that fails in every theme reads as one line. The output directory gets one SVG per drawn page, named `<theme>-cover.svg` and `<theme>-content.svg`, a `contact-sheet.html` with one row per theme, and `manifest.json`. `--json` prints the manifest with the absolute output directory as `dir`. Drawing all 22 presets takes about half a second.

```json
{
  "manifestVersion": 1,
  "generator": "pptwise theme try",
  "pptwiseVersion": "0.40.0",
  "title": "Q3 review",
  "lang": "en",
  "slide": { "width": 1280, "height": 720 },
  "contactSheet": "contact-sheet.html",
  "themes": [
    {
      "id": "crayon",
      "label": "Crayon",
      "source": "builtin",
      "pages": [{ "type": "cover", "file": "crayon-cover.svg" }],
      "skipped": [{ "type": "content", "kind": "fact", "reason": "kind: ..." }]
    }
  ]
}
```

`source` is `builtin`, `pack`, or `file` for a deck or workspace theme file. Page files are relative to the manifest.

`themes --json` marks each row's `source`: `builtin` for a factory preset, `pack` for a theme an installed content pack ships (with its `pack` id). A pack that cannot be read is listed as one entry with an `error` field, and the rest of the list is unaffected.

Each theme row also carries its `menu`: the face `cover`, `chapter`, and `ending` resolve to, and under `content` the face of every content kind the theme offers, in the kind vocabulary's order. A kind the theme does not offer is absent from `content`, and a spec page of that kind is drawn by its nearest offered stand-in, with a note from `spec validate` (see [Menu lookup](./menu-lookup.md#content-pages)). The list is read off the same compiled menu validate and render resolve pages through. Part of crayon's row:

```json
"menu": {
  "cover": "crayonbox-cover",
  "chapter": "crayonbox-chapter",
  "ending": "crayonbox-ending",
  "content": { "points": "crayonbox-sheet", "list": "crayonbox-sheet", "statement": "crayonbox-sheet" }
}
```

Theme names resolve from the deck directory, then workspace `themes/` directories while walking upward, then installed content packs, then factory presets. Unknown names fail and list every place searched, each installed pack directory included. Deck and workspace files may keep a factory or pack id and shadow that theme. A theme id is `^[a-z0-9-]+$`. Pass `--force` to overwrite an existing theme file.

## Brand extraction

```bash
pptwise brand extract <file.thmx|file.potx|file.pptx> \
  -o <theme.json> \
  [--id <id>] [--label <label>] [--from <donor>] [--brand-fonts]
```

Extraction is local. It reads the template's brand color (its `accent1`) and second color (its `accent2`), repaints the `--from` theme around them the way `theme fork --brand` does, and writes a complete v2 theme. The theme keeps its own fonts. `--brand-fonts` puts the template's Latin fonts first instead, never its Chinese ones, and warns when a font is not export-safe (it then has no effect) or has no exact width table (long lines may overflow). The template's background, text, and other accent colors are not used. `--from` defaults to `bulletin`, the business theme that keeps a brand color as given and on its face across the colors we tested.

## Brand scan

```bash
pptwise brand scan [dir] [--json]
```

`brand scan` reads what a project already says about its brand, so the user can be asked about colors, theme, and pictures before the deck is planned. `dir` defaults to the project folder (the one holding `pptwise.config.json`), else the current directory. It reports:

- `logos`: files named like a logo (`logo`, `wordmark`, `brand`, `emblem`, a favicon or touch icon), with their size. `deckReady` is `false` for an SVG, which `images add` turns into a PNG.
- `images`: PNG, JPEG, WebP, and GIF pictures at least 1000 px on the long edge and 500 px on the short one, largest first, each with its orientation.
- `colors`: every color found in style sheets (custom properties, Sass and Less variables, and the colors of plain `color` and `background` declarations), Tailwind and design-token files, web manifests, and the `theme-color` of HTML pages, with the names the project gives it. A name with `brand`, `primary`, `theme-color`, `accent`, or `secondary` counts for more. A state, ink, ground or grey name (`danger`, `foreground`, `background`, `muted`, `gray`) counts for almost nothing. `neutral` marks a grey, black, or white.
- `fonts`: the lead family of each font stack, Tailwind `fontFamily`, Google Fonts links, and the fonts of Office templates.
- `office`: `.potx`, `.thmx`, and `.pptx` files, each with its color scheme's name, its `accent1` and `accent2`, and its fonts. A scheme named `Office` is the stock theme and says nothing about the brand.
- `brand`: the brand color and second color the evidence points to: an Office template's when one carries its own scheme (templates before decks), else the strongest named colored value and the next one of another hue. A color only ever used, never named, is not picked.
- `next`: the `--brand` value, and the `theme try`, `theme fork`, and `brand extract` lines that use it, with placeholders in angle brackets.
- `summary`: one line, which the text report prints first.

The scan is local and bounded. It never follows a symlink and skips hidden folders (`.git` and `.pptwise/` among them), dependency folders, build output, caches, and test folders. It never opens a file whose name marks it as a secret (`.env`, keys, credentials, passwords), whatever its extension. It looks at no more than 20,000 directory entries ten folders deep, reads the first 256 KB of at most 400 style, token, manifest, and HTML files, reads only the headers of pictures, and opens at most six Office files of up to 64 MB. A scan cut short sets `scanned.truncated` and says so in its summary.

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
  [--color <name-or-hex>] [--min-width <px>] [--min-height <px>] \
  [--sheet [file]] [--no-git-ignore] [--json]
pptwise images fetch <provider:id> --deck <dir> --as <asset_id> [--query <text>]
pptwise images add <https-url|file> --deck <dir> --as <asset_id> \
  [--license cc0|pdm|cc-by[-<version>]|press|own] [--source <page-url>] \
  [--author <name>] [--attribution <text>]
pptwise images list --deck <dir>
pptwise images generate --deck <dir> --as <asset_id> [--prompt <text>]
```

`asset-brief` lists every `image` component a page holds, with its real frame, crop, safe zone, palette and a prompt. It does not list `image_grid`, `image_compare`, `device_mockup` or page backgrounds. A deck whose pages hold no `image` component yet prints one line saying so: the theme does not decide it, since every factory theme draws a `photo` page's picture.

Search checks Pexels, then configured Pixabay, then commercially filtered Openverse sources. Each result carries the provider's own words for the picture when it has some: Pexels alt text, Pixabay tags, or the Openverse title. `--json` prints the same results as `{ query, hits, notes }`, each hit with the `id` that `images fetch` takes. Hits are numbered. `--sheet` also downloads every thumbnail and draws them in one JPEG, each under its number, at `.pptwise/image-search/<query>.jpg` or the file you name, and prints its path (`sheet` in `--json`). Look at that one picture to choose, then fetch the id with that number. A thumbnail that will not download is drawn from the full-size picture where the search has one, else crossed out, with a note naming it. Fetch and generate pin the picture as `<asset_id>.jpg` with a provenance sidecar `<asset_id>.json`. For a deck project they go into the deck's own `assets/`, which the deck registers by file name, so the pictures move with the deck. For a single IR file they go under `.pptwise/<place>/assets/`. Pictures an earlier version pinned under `.pptwise/<place>/assets/` for a deck project still count while the deck stays where it was. To keep them after a move, copy them into the deck's `assets/`. Generate uses an enabled local generator and falls back to the asset brief prompt when `--prompt` is omitted. A generator that a sandbox stops from writing its own home folder (`Operation not permitted`, `EPERM`, `FS_PERMISSION_DENIED`) is reported by name with the fix: run the command outside the sandbox, or allow that generator to write its home folder in the host. Copying its login files elsewhere is not a fix.

`images add` pins a picture the stock search did not supply: a file of the project or the user's, or a picture found on the web. A picture from the web comes in only on the terms its own page states. `--license` names them, and only terms that let a deck use the picture as it is are taken: `cc0`, `pdm` (public domain), `cc-by` or `cc-by-<version>`, `press` (the subject's own press or newsroom material, used to show that subject), and `own` (the user's or their organization's own picture). Share-alike, non-commercial, and no-derivatives licenses are refused, and so is a license the list does not name. `--source` is the page that shows the picture and states its license, required for an address. `--author` is the author or owner that page names, required for `cc-by` and `press`. A file is the user's own unless `--license` says otherwise. A PNG stays a PNG, so a logo keeps its transparency, an SVG is drawn into a PNG (this needs `sharp`), and JPEG, WebP, and GIF become JPEG, the long edge held to 1920 px. The sidecar records `provider` (`web` or `file`), the license, author, source page, the address or file it came from, and, where the license asks for credit, the credit line, which the command also prints. An earlier pin of the same id in the other format is replaced, and a file under that id that pptwise did not pin is left alone with an error.

Every download, thumbnails included, refuses a host that resolves to a private, loopback, link-local, multicast, or other reserved address. One reserved range is allowed: 198.18.0.0/15. It is a benchmark range the internet does not route, and fake-ip proxies such as Clash and Surge resolve every name into it before carrying the connection to the real host, so refusing it failed every download behind such a proxy.

When a page names an `asset_id` no file supplies, validate warns with the path the picture belongs at, such as `decks/q3/zh/assets/hero.jpg`.

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

Only `config set`, `license set`, `license clear`, and `packs sync` write the pptwise home folder (`$PPTWISE_HOME`, default `~/.pptwise`). Every command that makes or checks a deck at most reads it, and takes the defaults when its config cannot be read, so decks build where the home folder is read-only or missing. Run `packs sync` at installation, not per deck.

Omit a secret value from `config set` to enter it through a hidden prompt. `doctor` exits with code 1 only on a hard failure. Optional `sharp` and LibreOffice capabilities are reported separately.

The first command that writes into `.pptwise/` keeps it out of git two ways, also when the folder already holds a `decks/` the author started a deck in: it writes `.pptwise/.gitignore` holding `*`, and adds `.pptwise/` to the repository's local exclude file. Either alone is enough, so a `.git` that cannot be written (some agent sandboxes) only costs a note. `--no-git-ignore` skips both. Your shared `.gitignore` is never touched.

The DSH plugin keeps its cards in the same folder: deck previews, theme walls and outlines go to `.pptwise/previews/<id>/` of the session's project, and stay there until you delete them. When the plugin is the first to write into `.pptwise/`, it keeps it out of git the same two ways. A card finds its preview again from any later session as long as the project has not moved. A call with no working directory puts the preview in the project of an absolute deck path (the folder holding its `.pptwise/` for a deck in `.pptwise/decks/`), and refuses when it has neither. Five folder names are not a deck's to take: `previews/`, `theme-try/` and `image-search/`, which pptwise writes for itself, `decks/`, which holds deck sources, and `themes/`. A deck that would land on one gets `-deck` after its name.
