---
name: pptwise
description: Generate a native, editable PPTX deck from an outline, notes, or source material with the pptwise CLI. Use when the user asks to create a PPT, deck, presentation, or slides and wants a deterministic, editable, theme-consistent result.
---

# pptwise deck generation playbook

pptwise turns semantic JSON into native DrawingML `.pptx` files. Text and shapes stay editable in PowerPoint. Authors describe what each page is doing and which typed components it contains. The theme and engine own the page face, geometry, color, type, and decoration.

Use this one-way chain. Do not skip backward or decide two layers at once.

```text
intent -> narrative -> theme binding -> spec with kind -> fill -> render
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
2. `npx --yes --package @liustack/pptwise@0.42.0 pptwise <args>`.
3. `bunx --bun @liustack/pptwise@0.42.0 <args>`.
4. Otherwise ask the user to install Node 22.19+ or Bun.

Run `pptwise doctor` after installation and whenever a failure is not explained by its own error. Relay the result instead of guessing.

## Read live truth first

Never write IR or a spec from memory. Run these at the start of each deck task:

```bash
pptwise schema --spec
pptwise narratives --json
pptwise packs sync
pptwise themes --json
```

`packs sync` installs or updates the user's content packs when a license is configured, so `themes --json` lists their themes with `"source": "pack"`. Without a license it prints one line and exits 0. If it fails, relay its message and continue with what is installed. Each theme row carries its `menu`: the keys of `menu.content` are the content kinds it offers. The IR component contract is read per page while filling, never whole. See step 5.

Scan the workspace before asking questions. An existing `deck.spec.json` already records the narrative, bound theme, page order, headings, and content kinds. A deck-local `theme.json`, a workspace `themes/` file, a named theme, or a supplied `.thmx`, `.potx`, or branded `.pptx` is a theme signal.

## Show the user before you check it yourself

Two decisions belong to the user: the theme and the outline. At each, show it in the conversation and ask before going on. When the user has said to go ahead without asking ("just do it", "you decide"), do not ask, but still show the theme wall and the outline, say what you picked, and continue.

Show pages early and often. The user should see a page within the first minute, not at the end. Your own checks run on `pptwise build` reports. Never convert pages to PNG or read page images to judge them: the report already names every problem, and the pictures are for the user.

## Workflow

### 1. Intent

Record four facts before choosing how to tell the story: audience, desired outcome, whether the deck will be presented or circulated, and available time. Derive facts already present in the request or workspace. If a user is present and material facts are still missing, ask all unresolved questions in one round.

### 2. Narrative

Choose the narrative before the theme. The narrative decides argument strategy, pacing, and tone. Use a named preset when it matches, or write explicit `strategy`, `pacing`, and `audience` axes. Pacing controls editorial budgets and the body-text baseline. Narrative never chooses a page face.

Say the narrative you chose in one line when you show the theme wall, so one answer from the user settles both. See `references/spec.md` for the compact interview and spec example.

### 3. Bind a theme

A theme is one complete, self-contained file containing style, a page menu, optional brand rules, and occasion metadata. Its content menu serves a subset of the 11 global `kind` words. Missing words are intentional.

Resolve theme names in this order:

1. The deck directory.
2. A workspace `themes/` directory while walking upward.
3. Installed content packs (`pptwise packs list`).
4. The 22 factory presets.

Show the user their own cover title in four to six themes. When a `pptwise_themes` tool exists, call it with the deck's cover title, subtitle, and `occasion`: the occasion words from `themes --json` or the narrative preset that fit the request. It picks the shortlist and draws each theme's cover and one content page in the conversation, numbered, and returns the theme ids in that order. Pass `themes` only when the user named themes. Leave `page` out unless it is a page of this deck you already validated. Otherwise draw the same wall from the CLI:

```bash
pptwise theme try --title "<cover title>" --subtitle "<subtitle>" --occasion <words> --json
```

It prints a manifest naming one cover and one content SVG per theme, plus `contact-sheet.html`. Show the user those SVGs where the host can display images, or hand over the contact sheet's path. Then ask which theme they want, one option per theme in the wall's order, or name your pick when they left it to you.

Create means copy: copy the closest preset into the workspace, extract a brand from an Office file, or fork for a color change. The commands are in `references/spec.md`.

Write the selected theme name into `deck.spec.json` before writing page content. Bound deck commands use that name. There is no render-time theme switch.

A same-menu color fork may replace the bound theme during the workflow. A different menu means a different theme. Return to this step, keep the intent, narrative, facts, data, images, and useful copy, then rewrite the spec and fill against the new menu.

### 4. Write the spec with `kind`

The spec locks theme, narrative, branding posture, footer marks, page order, page type, heading, and the `kind` of every content page. It contains no render selection state.

A deck prints no page number, organization, date, or confidentiality line unless the spec's `footer` asks for it. Ask only for what the occasion needs, see `references/branding.md`.

- `cover`, `chapter`, and `ending` are page types and do not use `kind`.
- Every `content` page requires exactly one explicit `kind`.
- Authors write only a semantic `kind`, never a page face or geometry choice.
- `focus` and `summary` are optional writing hints.

When the user names a page count, the spec has exactly that many pages, the cover and the ending included. Never add or drop pages to get past a check.

Run `pptwise spec validate deck.spec.json` until it prints `OK`. A content `kind` outside the bound theme menu is a hard error that lists what the menu offers. Do not relabel the page merely to silence the error. Change the page's intent only when that is semantically honest, or return to the theme step.

The validated spec is the outline. Show it to the user as one line per page: number, page type or `kind`, heading, and what the page says. Call `pptwise_preview` on the deck directory as well when it exists, so the user sees the cover and the page sequence before any page is written. Ask for changes unless the user said to go ahead.

The 11 words and their boundaries are in `references/layouts.md`. Full spec guidance and theme creation are in `references/spec.md`.

### 5. Fill pages

Write `pages/<id>.json` in batches of at most four. A page file may contain `components`, `background`, `image_side`, `footnote`, `fields`, `stamp`, `tag`, `ballot`, `years`, `stage`, and `notes`. Never repeat `type`, `kind`, or `heading`, because the spec owns them.

Choose components that serve the page's `kind`. `quote` is a page kind. The quotation component is `blockquote`. Component ownership and lookalike choices are in `references/components.md`. Pacing and physical capacity are in `references/density.md`. Image workflows are in `references/images.md`.

Read one page's contract before writing it. `inspect` prints what the spec locked, the fields the page file may carry, the components the bound theme's face draws there, the counts `validate` holds the page to, and `validate`'s current findings on it. Anything outside its component list fails `validate`. Expand a component before writing it. The counts do not prove the content fits: when a page runs long, `--fit` draws it and says whether render would drop anything. Icon fields take a name from `pptwise icons`.

```bash
pptwise inspect deck-dir/ --page <id>
pptwise inspect deck-dir/ --page <id> --component <type>
pptwise inspect deck-dir/ --page <id> --fit
pptwise icons
```

After each batch, build the deck. Use the `pptwise_build` tool when it exists: it shows the user the pages drawn so far. Otherwise run:

```bash
pptwise build deck-dir/ --json
```

Each entry in `errors` names its `page`, the `file` and `field` to edit, and the check's own fix. Fix every error and build again. Restructure content instead of deleting what a check caught. Pages not written yet are reported as such, which is expected until the last batch.

### 6. Build, review, and deliver

When every page is written, build until `status` is `ok`. Build runs assemble, validate, audit, preview, and render in one pass, and writes the `.pptx` only when all of them pass. `pptx` in the report is the deck's one final file, under `.pptwise/<deck>/`.

Deliver exactly that file. Do not run `render` again, copy, rename, or export another `.pptx`. On DSH, hand it over with `present`. Elsewhere report its absolute path. Without an in-conversation preview tool, also give the report's `preview.html` path, or run `pptwise serve deck-dir/ --no-open` for a live browser review.

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
- Keep public deck copy in the user's language. Keep schema keys and enum values in English.
- Never claim that `chart` or `data_table` values are native PowerPoint data objects. They export as editable grouped shapes and text. Change figures in the source and rerender.
- Write the value itself. Never stand in for content with a leftover count or an ellipsis. validate rejects it.
- Preview is read-only. Revisions go back into `deck.spec.json`, `pages/*.json`, assets, or the bound theme file.

## Read when

- `references/spec.md`: intent, narrative, theme creation, binding, rebinding, spec, and menu errors.
- `references/layouts.md`: choosing among the 11 `kind` words.
- `references/components.md`: component ownership, fields, and lookalike choices.
- `references/density.md`: pacing, capacity, full-page components, and local decoration.
- `references/branding.md`: footer marks (page numbers, organization, confidentiality), deck branding posture, frameless pages, logos, and brand extraction.
- `references/images.md`: image assets, stock search, generation, and `photo` versus `evidence`.
- `references/validate.md`: build, assemble, validate, audit, preview, serve, render, and revision loops.
