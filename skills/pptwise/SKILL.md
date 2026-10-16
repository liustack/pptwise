---
name: pptwise
description: Generate a native, editable PPTX deck from an outline, notes, or source material with the PPTwise CLI. Use when the user asks to create a PPT, deck, presentation, or slides and wants a deterministic, editable, theme-consistent result.
---

# PPTwise deck generation playbook

PPTwise turns semantic JSON into native DrawingML `.pptx` files. Text and shapes stay editable in PowerPoint. Authors describe what each page is doing and which typed components it contains. The theme and engine own the page face, geometry, color, type, and decoration.

Use this one-way chain. Do not skip backward or decide two layers at once.

```text
clarify -> gather materials -> outline and theme -> make -> check -> deliver
```

## Run the CLI

Run every command through the launcher bundled beside this file. Replace `<skill-dir>` with this skill directory.

```bash
bash <skill-dir>/scripts/run.sh <args>                                       # macOS / Linux
powershell -ExecutionPolicy Bypass -File <skill-dir>\scripts\run.ps1 <args>  # Windows
```

The launcher tries a compatible `pptwise` on `PATH`, then `npx`, then `bunx`. It forwards arguments and exit codes unchanged. Exit 78 means no JavaScript runtime was found. Relay the `nextSteps` from stderr instead of retrying.

If scripts are unavailable, use the first available route:

1. `pptwise <args>` when the installed version is compatible with the pin: on a 0.x pin, the same major and minor and a patch at or above it. On 1.0 and later, the same major and at or above the pin.
2. `npx --yes --package @liustack/pptwise@0.48.0 pptwise <args>`.
3. `bunx --bun @liustack/pptwise@0.48.0 <args>`.
4. Otherwise ask the user to install Node 22.19+ or Bun.

Run `pptwise doctor` after installation and whenever a failure is not explained by its own error. Relay the result instead of guessing. Content packs are installed at setup, not per deck. When the user has a license, `pptwise login <key>` is the installation step: it checks the key with the pack server, saves it, and installs the packs. Relay its answer. A key whose purchase is still being reviewed is saved, and `pptwise sync` installs the packs once the review clears. `pptwise sync` runs again only when the user asks to update packs, a review clears, the license changes, or `pptwise doctor` reports packs that can be updated. These are the only commands that write the PPTwise home folder (`~/.pptwise`), with `pptwise logout` and `config set`. Making a deck writes nothing there, so it works in a sandbox whose home folder is read-only. Never run `login`, `sync`, or `logout` as part of a deck task.

## Read live truth first

Never write IR or a spec from memory. Run these at the start of each deck task:

```bash
pptwise schema --spec
pptwise narratives --json
pptwise themes --json
```

`themes --json` lists installed content pack themes with `"source": "pack"`. Each theme row carries its `menu`: the keys of `menu.content` are the content kinds it offers. The IR component contract is read per page while making, never whole. See step 4.

Scan the workspace before asking questions, `.pptwise/decks/` included: a file search that honours `.gitignore` skips it. An existing `deck.spec.json` already records the narrative, bound theme, page order, headings, and content kinds: a change to that deck starts at step 4. A deck-local `theme.json`, a workspace `themes/` file, a named theme, or a supplied `.thmx`, `.potx`, or branded `.pptx` is a theme signal.

## Where the user decides

Write every message to the user in the language they wrote in, from the first status line to the final answer. The user decides in two places only: the one round of questions in step 1, and the outline and theme in step 3. Everything else runs without stopping. When the user has said to go ahead without asking ("just do it", "you decide"), skip the questions in step 1, and in step 3 still show the outline and the theme, then keep going in the same reply.

## Workflow

### 1. Clarify the request

Settle four facts: audience, desired outcome, whether the deck will be presented or circulated, and available time. With them, settle the narrative: argument `strategy`, `pacing` (how dense the pages are), and `audience` (the tone). Use a named preset from `pptwise narratives --json` when it matches. Derive what the request and workspace already say, and ask what is still missing in one round, with `ask_user_question` when that tool exists. Never ask twice. When the user said to go ahead, infer the rest. Narrative never chooses a page face. See `references/spec.md`.

### 2. Gather materials, quietly

Ask the user nothing here. Create the deck folder: `.pptwise/decks/<name>/` under the project folder (the folder holding `pptwise.config.json`, else the working directory), `<name>` a few lowercase English words joined by hyphens, such as `q3-review`. Put it elsewhere only when the user names a place. Edit a deck that already exists where it is, and never move it. Run commands from the project folder: `deck-dir/` below is the deck's path from there. Then gather two kinds of material:

- **Content.** Do desk research by default: search the web for the figures, dates, and examples the deck needs, each with its source. When the user's material already holds the content, only add its sources. Never invent a figure.
- **Visual.** Run `pptwise brand scan --json` for the project's logo, pictures, brand colors and fonts, and Office templates (see `references/branding.md`), and plan the picture each page should have (see `references/images.md`).

Write both into `deck-dir/materials.md`, in the shape `references/materials.md` gives. Every later step reads it instead of memory, so the same materials make the same deck. When something changes, change the file first.

### 3. Outline and theme, settled at once

Write `deck-dir/deck.spec.json` from the materials. The spec locks narrative, theme, branding posture, footer marks, page order, page type, heading, and the `kind` of every content page. Bind the theme you would pick for now. A theme file, pack theme, or brand file in the workspace comes first. Otherwise take the factory theme whose `occasions` and `identity` in `themes --json` fit best. Theme names resolve in this order:

1. The deck directory.
2. A workspace `themes/` directory while walking upward from the deck.
3. Installed content packs (`pptwise packs list`).
4. The 24 factory presets.

A deck prints no page number, organization, date, or confidentiality line unless the spec's `footer` asks for it, see `references/branding.md`.

- `cover`, `chapter`, and `ending` are page types and do not use `kind`.
- Every `content` page requires exactly one explicit `kind`. Authors write only a semantic `kind`, never a page face or geometry choice. `focus` and `summary` are optional writing hints.
- Unless the user said not to show pictures, at least one content page is a `photo` page, more when the material has places, products, people, or work to show. Every factory theme draws its picture: pick the theme for the occasion, never for pictures.
- When the user names a page count, the spec has exactly that many pages, the cover and the ending included. Never add or drop pages to get past a check.

Run `pptwise spec validate deck-dir/deck.spec.json` until it prints `OK`. A `kind` the bound menu lacks is a note, not an error: the page is drawn as the nearest offered kind. Keep the kind that tells the truth about the page. Then put three things to the user in one message, with `ask_user_question` when that tool exists:

1. **Outline**: one line per page with its number, page type or `kind`, heading, and what it says. Call `pptwise_outline` on the deck directory too where it exists.
2. **Theme**: a wall drawn with the deck's own cover title. Call `pptwise_themes` with the title, subtitle, and `occasion`. When the scan found the brand's colors, also pass `brand` set to its `next.brandFlag`: the wall then ends with one more option, the first theme repainted in the brand's colors. Offer one option per theme, labelled with its number. Without the tool, draw the same wall and show its SVGs or `contact-sheet.html`:

```bash
pptwise theme try --title "<cover title>" --subtitle "<subtitle>" --occasion <words> --json
```

   Add `--brand '<next.brandFlag>'` for the brand option. When the user named a theme, show it instead of a wall.

3. **Pictures**: the direction from the materials, in one line: what the pictures show, and where they come from.

Bind what the user chose. For the brand option, run the `theme fork` line the wall printed, writing `deck-dir/theme.json` under the deck's own id, and bind that id. Validate again. The spec is now locked: the theme does not change while the deck is made. Creating and forking themes are in `references/spec.md`.

### 4. Make the deck

Write `pages/<id>.json` in batches of at most four. A page file may contain `components`, `background`, `image_side`, `footnote`, `fields`, `stamp`, `tag`, `ballot`, `years`, `stage`, and `notes`. Never repeat `type`, `kind`, or `heading`, because the spec owns them. Choose components that serve the page's `kind`. `quote` is a page kind. The quotation component is `blockquote`. See `references/components.md` and `references/density.md`.

Read one page's contract before writing it. `inspect` prints what the spec locked, the fields the page file may carry, the components the bound theme's face draws there, the counts `validate` holds the page to, and `validate`'s current findings on it. Expand a component before writing it. When a page runs long, `--fit` draws it and says whether render would drop anything. Icon fields take a name from `pptwise icons`. `inspect` also lists the theme's signature layouts for the page, each with how it looks and a recipe (`write:` the components, item counts and fields it takes). A page written to a recipe gets that drawing. On a cover, chapter or ending whose face draws over a photograph, the recipe is a background photograph. Write to one when the content you have holds it.

```bash
pptwise inspect deck-dir/ --page <id>
pptwise inspect deck-dir/ --page <id> --component <type>
pptwise inspect deck-dir/ --page <id> --fit
pptwise icons
```

Give the deck pictures, following the picture plan, unless the user said not to: every `photo` page, the cover and chapter pages where their `inspect` lists a photograph recipe, and other pages where the picture is the point, never to fill space. Take them in this order: the user's and the project's own, then stock search, then the web, then a local generator when one is enabled. Once a batch is written and before building it, run `pptwise asset-brief deck-dir/` for every frame's shape, crop and palette, search with `pptwise images search "<two to four English words>" --orientation <shape> --sheet`, look at the numbered contact sheet, and pin the number that fits with `pptwise images fetch <id> --deck deck-dir/ --as <asset_id>`. Where a `pptwise_images` tool exists, search with it. Pin a project file or a web picture with `pptwise images add`, which takes a web picture only with the license its own page states. The rules are in `references/images.md`.

After each batch, build. Use the `pptwise_build` tool when it exists. Otherwise run:

```bash
pptwise build deck-dir/ --json
```

Each entry in `errors` names its `page`, the `file` and `field` to edit, and the check's own fix. Fix every error and build again until `status` is `ok`. Pages not written yet are reported as such until the last batch. Restructure content instead of deleting what a check caught. The report also gives each page drawn plain the nearest signature recipe: rewrite a plain page to its recipe where its content already holds it. Never invent facts, figures or pictures to fill a recipe.

### 5. Check what the deck looks like

The build report is the first check: `status` is `ok` and no warning is left that you could fix. The second is your own eyes. Build with the sheet, every page drawn small in one numbered picture, and look at it: `pptwise build deck-dir/ --json --sheet` prints its path as `preview.sheet`, and `pptwise_build` with `sheet: true` shows it to you. Look for three things:

- **Pictures**: each one shows what its page says, is not a generic stock cliché, keeps its subject inside the crop, and leaves the words over it readable.
- **Holes**: an empty frame, a page that is mostly blank, a picture the plan wanted and the deck lacks.
- **Rhythm**: three pages in a row that look the same, text page after text page, chapters that do not match.

Fix what you find in step 4 and look again. Stop after two rounds, and tell the user what you left as it is. `references/validate.md` has the details.

### 6. Deliver

`pptx` in the build report is the deck's one final file, under `.pptwise/<deck>/`. Deliver exactly that file. Do not run `render` again, copy, rename, or export another `.pptx`. On DSH, hand it over with `present`. Elsewhere, give its absolute path, start `pptwise serve deck-dir/ --no-open` in the background, and give the address it prints for a live review. Name the pictures that need a credit, from `pptwise images list`.

The user's changes go back to step 4. When the user asks for another theme, build once with `--alternatives` (`alternatives: true` on `pptwise_build`): it draws the deck's cover and a page or two in three other themes, numbered. The latest build's result lists them with the numbers the card shows: read the number off it, not off files. To switch, change only `theme` in `deck.spec.json` and build again. Pages keep their kinds and files: the build lists pages drawn as another kind under `drawnAs` and warns about what the new faces leave off. When the user asks for other colors without naming one, fork two or three fitting colors, draw them with `theme try`, and let the user choose before binding.

Add `pptwise audit deck-dir/ --pixels` when text sits over photo backgrounds. Use `render --draft` or `--allow-dropped-content` only when the user explicitly requests that compromise.

## Fast component routing

| Page intent | `kind` | Typical component |
| --- | --- | --- |
| Ordered reasoning | `points` | `bullets`, `numbered_cards`, `paragraph`, `concept_equation` |
| Reorderable inventory | `list` | `row_cards`, `icon_cards`, `people_cards`, `word_cloud` |
| Side-by-side differences | `comparison` | `comparison`, `from_to`, `image_compare`, `matrix`, `swot`, `harvey_balls`, `venn`, `positioning_map`, `pros_cons` |
| Directed steps or time | `process` | `steps`, `chevron_process`, `staircase`, `swimlane`, `journey_map`, `flowchart`, `timeline`, `roadmap`, `gantt`, `cycle`, `value_chain` |
| Numeric structure | `data` | `chart`, `data_table`, `kpi_cards`, `progress_donuts`, `scorecard`, `pictogram`, `heatmap`, `sankey` |
| Image as the message | `photo` | `image`, `image_grid`, `device_mockup` |
| Author's own proposition | `statement` | `verdict_banner`, `callout`, or no component |
| Another speaker's words | `quote` | `blockquote` |
| One number as the message | `fact` | one-item `kpi_cards`, `pictogram`, or no component |
| Claim plus one exhibit | `evidence` | `image`, `chart`, `data_table`, `code`, `device_mockup`, `sketch` |
| Containment or levels | `hierarchy` | `architecture`, `bmc`, `five_forces`, `rings`, `hub_spoke`, `decision_tree`, `org_tree`, `issue_tree`, `pyramid`, `iceberg`, `pillar_model`, `fishbone`, `segmented_wheel` |

## Rules

- Never edit or post-process the generated `.pptx`.
- Never add coordinates, SVG, page face names, or geometry controls to authored content.
- Talk to the user in their language throughout, including progress notes and questions, and keep public deck copy in it too. Keep schema keys and enum values in English.
- Never claim that `chart` or `data_table` values are native PowerPoint data objects. They export as editable grouped shapes and text. Change figures in the source and rerender.
- Write the value itself. Never stand in for content with a leftover count or an ellipsis. validate rejects it.
- Never put a picture in a deck whose source does not say it may be used, and never copy one from a page that states no license.
- Preview is read-only. Revisions go back into `deck.spec.json`, `pages/*.json`, assets, or the bound theme file.
- When an image generator fails because a sandbox will not let it write its own home folder, run `images generate` outside the sandbox or ask the user to allow it. Never copy, move, or redirect any login or credential file to get around it.

## Read when

- `references/spec.md`: intent, narrative, theme creation, binding, rebinding, spec, and menu errors.
- `references/materials.md`: the materials file, desk research, and the picture plan.
- `references/layouts.md`: choosing among the 11 `kind` words.
- `references/components.md`: component ownership, fields, and lookalike choices.
- `references/density.md`: pacing, capacity, full-page components, and local decoration.
- `references/branding.md`: brand scan, footer marks (page numbers, organization, confidentiality), deck branding posture, frameless pages, logos, and brand extraction.
- `references/images.md`: which pages get pictures, where they come from, image assets, stock search and its contact sheet, web pictures and their licenses, source setup, generation, and `photo` versus `evidence`.
- `references/validate.md`: build, the deck sheet and what to look for, assemble, validate, audit, preview, serve, render, and revision loops.
