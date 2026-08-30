---
summary: 'Local Office brand extraction into a complete v2 theme, including OOXML slot mapping, donor-menu copying, palette derivation, validation, and known limits'
read_when:
  - touching brand extraction, theme-file loading, or palette derivation
  - an extracted theme is refused or renders with unexpected colors or fonts
  - deciding which donor menu to copy from an Office brand asset
---

# Brand extraction

`pptwise brand extract` reads the Office theme part from a `.thmx`, `.potx`, or `.pptx` file and writes one complete, self-contained version 2 pptwise theme. The operation is local and deterministic. The same input bytes and options produce the same theme data.

```bash
pptwise brand extract corp.pptx \
  -o themes/acme.theme.json \
  --id acme \
  --label "Acme" \
  --from consulting
```

`--from` names the donor theme whose complete menu, occasion metadata, identity strength, brand configuration, shape controls, and default-background structure are copied. It defaults to `consulting`. Choose a donor whose menu fits the intended deck, not merely one with similar colors.

The extracted anchors and fonts are then applied through the same full-palette derivation used by `theme fork`. The output contains:

- `version: 2`
- a custom `id` and matching `style.id`
- a complete public style object
- the donor's complete menu
- the donor's occasions, identity, and optional brand configuration
- no base reference and no load-time dependency on the donor

## Office part discovery

The extractor opens the OOXML package and reads the shortest non-variant `theme<N>.xml` path. Normal locations are `ppt/theme/theme1.xml` for PowerPoint files and `theme/theme/theme1.xml` for `.thmx` files. Theme-variant subtrees are excluded.

User Office files are never committed as fixtures. Tests build small OOXML packages programmatically in `src/themes/extract/__fixtures__/thmx.ts`.

## Slot mapping

| OOXML source | pptwise result | rule |
| --- | --- | --- |
| `dk1` and `lt1` | `text` and `bg` | Measured lightness decides which is darker. The darker value becomes text. |
| `lt2` | `surface` | Falls back to `bg`. |
| `accent1`, then `dk2` | `primary` | Falls back to the first available chart color. |
| `accent2` | `accent` | Falls back to `primary`. |
| `accent1` through `accent6` | `chartPalette` | Available accent slots are copied in order. |
| derived | `muted` | Text is blended toward bg until the most-muted candidate still clears 4.5:1 against both bg and surface. |
| major Latin font | heading font stack | The extracted face is followed by safe family and CJK fallbacks. |
| minor Latin font | body font stack | Falls back to the major face when absent. |

`hlink` and `folHlink` may be parsed but are not mapped because pptwise has no hyperlink color token.

The palette fork also remaps matching donor colors in chart palettes, optional accent pools, borders, panels, card strokes, and default backgrounds. Semantic status colors remain explicit donor values unless the theme author changes them deliberately.

## Failure behavior

Extraction has hard structural requirements:

- the package must contain a theme part
- `dk1` and `lt1` must be present
- at least one accent color must exist
- the target id must not collide with a factory preset
- the final file must satisfy the strict v2 schema

An unsafe palette is still written so the author can inspect it. The command appends a warning naming the contrast failure. Loading that theme later fails with the token, ratio, and background. Adjust the written colors or choose another source. Do not hide the failure with page-level color overrides.

Theme loading uses the same `ThemeFileSchema` and registration path as hand-authored themes. Face names, parameter bounds, menu shape, style identity, and contrast are checked before installation.

## Binding

Place the file under a workspace `themes/` directory and bind its id in the spec, or save it as `theme.json` beside `deck.spec.json`:

```json
{
  "version": "1",
  "theme": "acme",
  "pages": []
}
```

Project commands load the bound file through normal three-level theme lookup. There is no registration flag and no render-time theme override. `serve` watches a deck-local `theme.json`, reloads new bytes, and refreshes the review.

## Known limits

- Many Western Office themes omit East Asian font faces. CJK text then uses pptwise's normal font fallback stack.
- Logos are stored in master and media parts rather than the theme part. Extraction does not import them. Add a logo as a deck asset and reference it through `brand.logo_asset_id`.
- A visible dark slide background may come from a master `<p:bg>` rather than the Office theme part. Extraction reads the theme part only, so it may produce a light system from such a file.
- The donor menu is copied as a whole. Extraction does not infer a new menu from example slides.
