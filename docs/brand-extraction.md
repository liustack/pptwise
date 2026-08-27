---
summary: 'Brand extraction into a partial version 1 theme, OOXML slot mapping, strict legacy-file rejection, registration, selection, and live reload'
read_when:
  - touching src/themes/extract/brand-extract.ts, src/themes/brand-theme-file.ts, or the CLI theme-file loading path
  - an extracted theme is refused at load time or renders with unexpected colors
  - extending extraction to new sources or tokens
---

# Brand extraction and custom-theme loading

`pptwise brand extract <file.thmx|.potx|.pptx> -o my-brand.theme.json` reads the OOXML theme part from a user's Office file and writes a version 1 partial pptwise theme. The whole path is local and makes no network request.

The result always contains `base: "consulting"`, a complete public `style`, and optional brand metadata. It inherits faces, motif, tendencies, and sparse-page support from consulting at registration time. Change the written `base` field before loading if another built-in structure is intentional.

Extraction does not attempt to author a complete theme. A complete file has no `base` and must explicitly declare non-empty `faces` for cover, chapter, content, and ending. Both completeness modes use the same strict schema in `src/themes/schema.ts`.

Feasibility is covered by programmatically built fixtures in `src/themes/extract/__fixtures__/thmx.ts`. User Office files are not committed.

## Slot to token mapping

| OOXML slot | pptwise token | Rule |
| --- | --- | --- |
| `dk1` / `lt1` | `text` / `bg` | Assigned by measured lightness. The darker value becomes `text` |
| `lt2` | `surface` | Falls back to `bg` when absent |
| `accent1`, else `dk2` | `primary` | First brand color |
| `accent2`, else `primary` | `accent` | Second brand color |
| `accent1` through `accent6` | `chartPalette` | Direct six-slot mapping |
| derived | `muted` | Blends `text` toward `bg` while keeping at least 4.5:1 contrast against `bg` and `surface` |
| `<a:majorFont>` and `<a:minorFont>` Latin faces | `fonts.heading` and `fonts.body` | Extracted face followed by a safe serif or sans-serif fallback stack |

The same input bytes produce the same theme JSON. `hlink` and `folHlink` are parsed but not mapped because there is no hyperlink color token. Missing theme parts, dark and light anchors, or accent colors are hard errors. Softer gaps use documented fallbacks.

## Strict file loading

Theme loading starts in `src/themes/brand-theme-file.ts`, validates against `ThemeFileSchema`, then registers through `registerTheme` in `src/themes/definitions.ts`. There is no separate extraction-only registration path.

An old unversioned `{ id, style }` file is rejected. The error tells the author to add `version: 1`, then either add `base` and keep only partial fields, or omit `base` and provide all four face pools. The loader does not guess, auto-upgrade, or silently supply structure for the old shape.

Registration enforces these invariants:

- `style.id` equals the top-level theme id.
- A custom id does not collide with any built-in id.
- Partial files do not contain complete-only fields.
- Complete files provide all four non-empty face pools.
- Every face id exists, matches its page type, and uses valid parameters.
- Theme tendencies stay inside the matching face pool.
- Checked text and muted colors clear the contrast floor against page backgrounds.

The contrast error names the token, measured ratio, and background. Extraction also checks the written file and appends a warning when registration would refuse it.

## Registration is not selection

`--theme-file <path>` is available on render, validate, audit, preview, and serve. It registers the file before validation. It does not select the id.

For a bare IR, add `--theme <id>` or author the same id in `theme.id`:

```bash
pptwise render deck.json --theme-file my-brand.theme.json --theme my-brand
```

For a deck project, keep the extracted file under a candidate name during visual review. After confirmation, save the unchanged candidate as `theme.json` beside `deck.spec.json` and put the custom id in the spec. The project registers that file before assemble and every consumer command. This is the zero-flag path.

`pptwise serve` watches both deck-project `theme.json` and a bare IR's `--theme-file`. On every rebuild it removes the previous custom registration and reads the file again, so edits apply without restarting the server.

## Known limits

- East Asian font slots are empty in many Western Office themes. CJK text then uses the existing fallback in `src/render/fonts.ts`.
- Logos live in slide-master and media parts, not the theme part. Extraction does not import them.
- A visible slide background can come from a slide master's `<p:bg>`. The theme part alone cannot see that background, so a visually dark template can still extract its light theme palette. Adjust the written JSON when that dark background is essential.
