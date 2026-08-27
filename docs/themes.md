---
summary: 'Theme files, the 24 built-in themes, occasion routing, visual comparison, selection precedence, and live custom-theme reload'
read_when:
  - picking a theme, or looking up a theme id
  - authoring or loading a version 1 theme file
  - making the output look like your own company (`pptwise brand extract`)
  - comparing themes or changing the look of an assembled deck
---

# Themes

A theme owns both skin and structure. Its style tokens control color, type, spacing, and backgrounds. Its brand config controls the identity frame. Its four face pools curate cover, chapter, content, and ending layouts. Motif, layout tendencies, and sparse-page support complete the definition.

## Choose a built-in theme

Run `pptwise themes --json` instead of choosing from the name alone. Each row includes `id`, `label`, colors, controlled `occasions`, and `identity`. Identity is the strength of the visual voice. `low` is quiet and institutional, `medium` is a professional house style, and `high` is strongly expressive.

| id | label | occasions | identity |
| --- | --- | --- | --- |
| `consulting` | Business Consulting | business | medium |
| `enterprise` | Enterprise | business, institutional | low |
| `academic` | Academic | education | medium |
| `insight` | Financial Insight | finance | medium |
| `campaign` | Marketing Campaign | marketing, event | high |
| `classroom` | Classroom | education | medium |
| `ink` | Ink Wash | culture | high |
| `tech` | Tech | tech | medium |
| `runway` | Fashion Runway | fashion | high |
| `journal` | Editorial Journal | editorial | medium |
| `luxe` | Luxe | luxury, event | high |
| `heritage` | Heritage | culture, luxury | medium |
| `pulse` | Health & Life Science | health | medium |
| `terra` | Sustainability & ESG | sustainability | medium |
| `ember` | Startup Pitch | startup | high |
| `vermilion` | Official Report | government, institutional | low |
| `crayon` | Kids Education | kids, education | high |
| `arena` | Esports & Entertainment | entertainment | high |
| `museum` | Museum | museum, culture | high |
| `stage` | Keynote Stage | keynote | high |
| `lecture` | Lecture Hall | education | high |
| `swiss` | Swiss Institutional | institutional | low |
| `memo` | Decision Memo | business, institutional | low |
| `playbill` | Playbill | event, entertainment | high |

Route the request in this order:

1. Derive one or more occasion signals from the task and source material.
2. Keep themes whose `occasions` match.
3. Use the requested restraint or expressiveness to match `identity`.
4. Use narrative `themeRecommendations` only as a reference signal or final tie-break.
5. If the look is still open, compare two to four candidates visually.

`suggestThemes` in `src/themes/select.ts` implements the deterministic source route. It ranks occasion hit count, identity match, narrative recommendations, then canonical catalog order. With no occasion hit, it falls back through narrative recommendations, an identity-only list, then `consulting`. The SKILL performs the same route from `themes --json` so the user can see and confirm the candidates.

```bash
pptwise preview my-deck/ --themes consulting,swiss,memo
```

The command writes `contact-sheet.html` with one column per theme and rows for the cover and first content page. No extra `--html` flag is required. For a deck project, it is a repaint comparison over the layouts materialized by assembly, not a structural face comparison. A bare IR that omits layout ids can resolve different faces under each theme. Show the sheet to the user and record the chosen id in `deck.spec.json`. Assemble again after that spec change to adopt the selected theme's structure.

## One schema, two completeness modes

Every public theme file uses the strict version 1 schema in `src/themes/schema.ts`. The presence of `base` selects partial mode. Its absence selects complete mode.

| Mode | Required structure | Inheritance |
| --- | --- | --- |
| partial | `version`, `id`, complete public `style`, and `base`. `label`, `brand`, `occasions`, and `identity` are optional | Inherits faces, motif, tendencies, and sparse support from the built-in `base`. Complete-only fields are rejected |
| complete | `version`, `id`, complete public `style`, and non-empty `faces` for cover, chapter, content, and ending. `brand`, `occasions`, `identity`, `motif`, `tendencies`, and `sparse` are optional | Inherits nothing. Omitting any face pool is an error |

Both modes require `style.id` to equal the top-level `id`. A custom id cannot shadow a built-in id. Unknown fields are rejected. Old unversioned `{ id, style }` files fail with an upgrade message instead of being guessed into a mode.

Use partial mode for a brand skin over an existing structural language. Use complete mode only when the theme owns all four layout face pools.

## Registration and selection

Theme registration and theme selection are separate operations. `--theme-file <path>` registers the file so its id becomes available. It never selects that id.

For a bare IR file, either author the custom id in `theme.id` or pair registration with `--theme`:

```bash
pptwise render deck.json --theme-file acme.theme.json --theme acme
```

For a deck project, store the confirmed file as `theme.json` beside `deck.spec.json`, then write its id into the spec. Assemble, validate, audit, preview, serve, and render auto-register the local file. No theme flags are needed.

Theme selection has five levels, highest first:

1. CLI `--theme`
2. The authored artifact, meaning `deck.spec.json` for a project or `theme.id` for a bare IR
3. Project `pptwise.config.json`
4. User `$PPTWISE_HOME/config.json`
5. Schema default `consulting`

Project `theme.json` and `--theme-file` are registration sources, not extra selection levels.

## Extract your own brand

`pptwise brand extract` reads colors and fonts from a `.thmx`, `.potx`, or `.pptx` locally and writes a partial theme with `base: "consulting"`. Edit the resulting `base` field before registration if a different built-in structure is intentional. Keep the extracted file under a candidate name until the look is confirmed.

```bash
pptwise brand extract corp-template.pptx -o my-deck/acme.theme.json --id acme
pptwise preview my-deck/ --theme-file my-deck/acme.theme.json --theme acme --html
```

After confirmation, save the unchanged candidate as `my-deck/theme.json`, set `"theme": "acme"` in `my-deck/deck.spec.json`, and use the project with no theme flags:

```bash
pptwise render my-deck/
```

The OOXML color slots map to style tokens, and the six accent colors become the chart palette. Loading applies the same contrast floor as every other registered theme. See [`brand-extraction.md`](./brand-extraction.md) for the mapping and limits.

## Repaint, reassemble, and live reload

`--theme <id>` on render or preview is a repaint. It swaps the visual skin while keeping the layout ids already materialized in `deck.json`. This is useful for a quick look comparison, but it does not adopt the new theme's structural faces.

To use a new theme's full structure, change `theme` in `deck.spec.json` and run `pptwise assemble` again before validate, audit, and render.

`pptwise serve` watches project `theme.json`. For a bare IR it also watches the file passed through `--theme-file`. Each rebuild removes the previous custom registration, reads the file again, and refreshes the browser without a server restart.

## Style overrides

A style override changes tokens without creating a theme. Author it against `pptwise schema --style`, pass it with `--style`, or store it in `pptwise.config.json`. It does not change face pools, motif choice, or theme metadata.
