---
summary: 'Local Office brand extraction and `theme fork --brand`: reading the brand color and fonts, measuring a theme''s face, placing the brand, repainting the palette, validation, and known limits'
read_when:
  - touching brand extraction, `theme fork --brand`, theme-file loading, or palette derivation
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
  --from brief
```

`--from` names the theme to repaint. It defaults to `brief`. The written theme keeps that theme's complete menu, occasion metadata, identity strength, brand configuration, shape controls, emphasis stroke, and its own ground, text, and surface colors. Choose it for its menu and its look, not for colors close to the brand's.

From the template, extraction takes two things: the brand color (`accent1`) and the fonts. The theme is then repainted around the brand color by the same rules as `pptwise theme fork <name> --brand <hex>`, described below. The output contains:

- `version: 2`
- a custom `id` and matching `style.id`
- a complete public style object
- the donor's complete menu
- the donor's occasions, identity, and optional brand configuration
- no base reference and no load-time dependency on the donor

The template's `dk1`, `lt1`, and `lt2` (its text, background, and surface) are not used. Nearly every Office theme carries plain black on white there, which says nothing about the brand, and copying it wiped out the donor's own paper, ink's rice paper or lecture's blackboard. The template's other accents are not used either.

## Repainting around a brand color

`theme fork --brand` and `brand extract` share one route (`src/cli/brand-regen.ts`). The theme stays itself. Only its colored slots move.

### The theme's face

A theme's face is the color slot, `primary` or `accent`, that its own pages show most. It is measured, not declared (`src/cli/brand-face.ts`). The theme draws a sample deck: a cover, a chapter, one page for every content kind its menu offers, and an ending. For each slot, the area painted in its exact color (fills, strokes, and text) is summed and weighed by how far the color stands from the page ground (OKLab distance). Only a slot with real chroma can be the face: OKLCH chroma at least 0.04. Ink's warm black, lecture's blackboard green-grey, and stage's silver do not qualify. Brief's navy and proposal's petrol do. When neither slot has chroma (stage), the accent takes the brand.

The same pass notes whether a slot sets body-size text (under 24px), which decides the contrast it needs.

`src/cli/brand-face.test.ts` pins the face of all 22 built-in themes:

| face | themes |
| --- | --- |
| `primary` | brief, bulletin, thesis, homeroom, clinic, almanac, ember, vermilion, crayon, proposal |
| `accent` | ledger, rally, ink, terminal, runway, journal, luxe, museum, stage, lecture, swiss, memo |

### Placing the brand

A slot can hold the brand when the brand reads against the theme's `bg` at the slot's contrast: 4.5:1 when the slot sets body-size text on the sample pages, 3:1 otherwise, and never more than the theme's own color had in that slot. The brand goes to the first place that holds it:

1. The face, unchanged.
2. The face, a shade lighter or darker, when that shade is within 0.03 OKLab of the brand: too little to see, so it still counts as the brand.
3. The theme's other colored slot, unchanged. The face then keeps the theme's own color. Brief with an orange brand keeps its navy headings and puts the orange in the short accent rule. A slot that is only a shade of the page (within 0.15 OKLab of `bg`, like rally's plum primary) is not a colored slot.
4. The face, with the brand's hue and saturation and the face's own lightness, moved on to the nearest lightness that reads if that is not yet enough. Lecture's chalk yellow becomes a light chalk blue for a deep blue brand.

The command prints where the brand went. Routes 2 and 4 print the color actually written and the contrast that forced it.

### The rest of the palette

- Every other colored token (the other slot, `accentPool`, `emphasisInk`, chart colors) turns by the hue step the placed slot took, keeping its own saturation and lightness. Near blacks, greys, and shades of the page stay. A turned color that no longer reads as well as the original did (up to the slot's floor) moves to the nearest lightness that does.
- `bg`, `surface`, `text`, `muted`, `panel`, `border`, `cardStroke`, and the status colors `danger`, `warning`, `success` stay the theme's own. A default background that was the theme's primary or accent becomes the new primary or accent. Every other background stays.
- The chart palette keeps the theme's shape. An entry that was the theme's primary or accent becomes the new one, so a face that leaves the accent out of a chart (ink's seal, brief's highlight) still does. Colored entries turn by the hue step. Greys stay, so swiss and ink keep their black and grey charts. Each turned entry reads on `bg` at least as well as the theme's own did, up to 3:1. The palette keeps the blue-with-orange ban (`src/themes/chart-taboo.ts`): a new vivid blue beside a new vivid orange loses the later entry, unless the theme's own palette already paired those two positions, as brief's navy and yellow do.

`--brand` cannot be combined with `--primary`, `--accent`, `--bg`, `--text`, or `--surface`. Those flags set tokens exactly through the anchor fork, for an author who wants exact control.

## Office part discovery

The extractor opens the OOXML package and reads the shortest non-variant `theme<N>.xml` path. Normal locations are `ppt/theme/theme1.xml` for PowerPoint files and `theme/theme/theme1.xml` for `.thmx` files. Theme-variant subtrees are excluded.

User Office files are never committed as fixtures. Tests build small OOXML packages programmatically in `src/themes/extract/__fixtures__/thmx.ts`.

## Slot mapping

| OOXML source | use |
| --- | --- |
| `accent1`, then `dk2` | The brand color. Falls back to the first available accent. |
| major Latin font | Heading font stack. The extracted face is followed by safe family and CJK fallbacks. |
| minor Latin font | Body font stack. Falls back to the major face when absent. |
| `dk1`, `lt1`, `lt2`, `accent2` to `accent6` | Parsed and checked, not used. |

`hlink` and `folHlink` may be parsed but are not mapped because pptwise has no hyperlink color token.

The SDK's `extractBrandTheme` still returns the template's own palette mapped onto tokens, with a fixed menu. Only the CLI repaints a donor.

## Failure behavior

Extraction has hard structural requirements:

- the package must contain a theme part
- `dk1` and `lt1` must be present, and must leave room for a readable muted color
- at least one accent color must exist
- the target id must not collide with a factory preset
- the final file must satisfy the strict v2 schema

The repainted theme runs the contrast floor before it is written. A failure stops the command with the token, ratio, and background, and nothing is written. Do not hide a failure with page-level color overrides.

Theme loading uses the same `ThemeFileSchema` and compilation path as hand-authored themes. Face names, parameter bounds, menu shape, style identity, and contrast are checked when the file is resolved, before any command uses it.

## Binding

Place the file under a workspace `themes/` directory and bind its id in the spec, or save it as `theme.json` beside `deck.spec.json`:

```json
{
  "version": "1",
  "theme": "acme",
  "pages": []
}
```

Project commands load the bound file through normal four-level theme lookup and pass the compiled definition down the render chain by value. There is no registration flag and no render-time theme override. `serve` watches a deck-local `theme.json`, rereads it on every rebuild, and refreshes the review.

## Known limits

- Many Western Office themes omit East Asian font faces. CJK text then uses pptwise's normal font fallback stack.
- Logos are stored in master and media parts rather than the theme part. Extraction does not import them. Add a logo as a deck asset and reference it through `brand.logo_asset_id`.
- A visible dark slide background may come from a master `<p:bg>` rather than the Office theme part. Extraction never takes the template's ground anyway: pick a dark `--from` theme for a dark brand deck.
- A template font that is not on the export-safe list renders as the nearest safe face, so the theme's own type character (ink's kaishu, memo's typewriter serif) gives way to that fallback. Keep the theme's fonts by forking with `theme fork --brand` instead.
- The donor menu is copied as a whole. Extraction does not infer a new menu from example slides.
