---
summary: 'Local Office brand extraction and `theme fork --brand`: reading the brand and second color and fonts, measuring a theme''s face, placing the brand, drawing the palette from it, validation, and known limits'
read_when:
  - touching brand extraction, `theme fork --brand`, theme-file loading, or palette derivation
  - an extracted theme is refused or renders with unexpected colors or fonts
  - deciding which donor menu to copy from an Office brand asset
---

# Brand extraction

`pptwise brand extract` reads the Office theme part from a `.thmx`, `.potx`, or `.pptx` file and writes one complete, self-contained version 2 PPTwise theme. The operation is local and deterministic. The same input bytes and options produce the same theme data.

```bash
pptwise brand extract corp.pptx \
  -o themes/acme.theme.json \
  --id acme \
  --label "Acme" \
  --from bulletin
```

`--from` names the theme to repaint. It defaults to `bulletin`, the business theme that keeps a brand color as given and on its face across the colors we tested. The written theme keeps that theme's complete menu, occasion metadata, identity strength, brand configuration, shape controls, emphasis stroke, fonts, and its own ground, text, and surface colors. Choose it for its menu and its look, not for colors close to the brand's.

From the template, extraction takes the brand color (`accent1`) and, when it is a real color and not the same as `accent1`, the company's second color (`accent2`). The theme is then repainted around them by the same rules as `pptwise theme fork <name> --brand <hex>[,<hex>]`, described below. The output contains:

- `version: 2`
- a custom `id` and matching `style.id`
- a complete public style object
- the donor's complete menu
- the donor's occasions, identity, and optional brand configuration
- no base reference and no load-time dependency on the donor

The template's `dk1`, `lt1`, and `lt2` (its text, background, and surface) are not used. Nearly every Office theme carries plain black on white there, which says nothing about the brand, and copying it wiped out the donor's own paper, ink's rice paper or lecture's blackboard. The template's `accent3` to `accent6` are not used either.

### Fonts

By default the theme keeps its own fonts: ink's kaishu, memo's typewriter serif, and every theme's tuned width tables stay. The command prints the fonts it kept.

`--brand-fonts` puts the template's Latin heading and body faces first in the theme's font stacks, ahead of the theme's own. Chinese faces are never replaced: the stack's CJK face stays where it was, and Chinese text keeps using it. The command warns, per role, in two cases:

- The template's face is not on the export-safe list (`SAFE_FONTS`, the fonts a stock Windows machine has). Slides are set only in safe faces, so such a face has no effect at all: the text is set in the next safe face in the stack, which the warning names. Aptos, Trebuchet MS, and most brand fonts land here.
- The face is safe but has no exact width table (`src/lib/svg-text-layout.ts`). Text widths are then estimated, and a long line can overflow where the real font runs wider. Calibri, Arial, and Verdana land here.

## Repainting around a brand color

`theme fork --brand` and `brand extract` share one route (`src/themes/brand/brand-regen.ts`). The theme stays itself. Only its colored slots move. The aim is to keep the brand color exactly as the company wrote it and build a calm palette around it, not to scatter new hues.

`--brand` takes one hex color, or two separated by a comma for a company that pairs two colors: `--brand '#156082,#E97132'`. More than two is an error.

### The theme's face

A theme's face is the color slot, `primary` or `accent`, that its own pages show most. It is measured, not declared (`src/themes/brand/brand-face.ts`). The theme draws a sample deck: a cover, a chapter, one page for every content kind its menu offers, and an ending. For each slot, the area painted in its exact color (fills, strokes, and text) is summed and weighed by how far the color stands from the page ground (OKLab distance). Only a slot with real chroma can be the face: OKLCH chroma at least 0.04. Ink's warm black, lecture's blackboard green-grey, and stage's silver do not qualify. Brief's navy and proposal's petrol do. When neither slot has chroma (stage), the accent takes the brand.

The same pass records, for each slot, whether it sets body-size text (under 24px), whether it writes the deck's headings and at what size, whether it fills a page as a ground (one rectangle covering half the page or more), and how much of its area is fields of color (bars, blocks, and discs at least 16px across) rather than marks (rules, strokes, words). The sample is then drawn once more with each colored slot turned to the opposite hue. A rectangle whose color follows the slot without being it is a field the layouts work out from the slot, like homeroom's blackboard, which is its primary darkened.

`src/themes/brand/brand-face.test.ts` pins the face of all 22 built-in themes:

| face | themes |
| --- | --- |
| `primary` | brief, bulletin, thesis, homeroom, clinic, almanac, ember, vermilion, crayon, proposal |
| `accent` | ledger, rally, ink, terminal, runway, journal, luxe, museum, stage, lecture, swiss, memo |

### Rule 1: the brand stays, the words change ink

- A slot that fills a page as a ground (bulletin's cover), or whose area is mostly fields of color (bars, blocks), takes the brand unchanged. The words and values on it take an ink that reads on it (`readableOn`), white or near black. No layout assumes white words on a brand ground.
- A slot that writes the headings takes the brand only when a heading reads in it at its size: 3:1 at 24px and above, 4.5:1 below (`requiredContrastRatio`). When it would not, that slot keeps the theme's own color and the brand goes to the theme's other colored slot, which draws rules and marks and writes nothing. Brief with an orange brand keeps its navy headings and puts the orange in its accent rule. A slot that is only a shade of the page (within 0.15 OKLab of `bg`, like rally's plum primary) is not a colored slot.
- A face the layouts work into a field covering half a page or more takes the brand only when that field still looks like it: the color the field would come out for the brand is drawn, and if it lands more than 0.1 OKLab from the brand, the face keeps the theme's own color and the brand goes to the other colored slot. homeroom's board darkens its own blue-grey 0.06 and a deep red 0.07, so those stay. Berlin's orange would come out brown, 0.20 away, so homeroom keeps its blue-grey board and the orange goes to its accent.
- When no slot can hold the brand unchanged, it goes into the face with its lightness moved as little as reading needs (rule 2).

The command prints where the brand went, which slot kept the theme's color and why, and every color it had to move with the contrast that forced it.

### Rule 2: fields keep the brand, marks reach their contrast

Bars, areas, and blocks are fields of color, and they take the brand exactly as given: the chart's series are the brand and the second color as they are, and so is a slot that is mostly fields. A slot that mostly draws marks (rules, short lines, small icons) takes the brand as it is when it stands off `bg` at 3:1 (or at what the theme's own color had, when that was less). Otherwise only the OKLCH lightness moves, step by step, until it reaches that ratio. The hue stays and the chroma never rises above the brand's own, so nothing turns fluorescent. A chart entry that is a slot's own color stays the slot's value exactly, so a face that keeps that slot out of its charts still finds it.

The theme file has one value per token, so the split is made per slot by what the slot mostly paints, not per mark at render time. A chart line drawn in a light brand therefore stands off the page as little as the brand does, the same as built-in palettes such as crayon's yellow.

### Rule 3: the palette comes from the brand

Every other colored token is drawn from the brand in OKLCH. Nothing is turned by a global hue step.

- The theme's second colored slot becomes a shade of the brand: the same hue, clearly lighter or darker (at least 0.12 OKLab away), near the lightness and chroma the theme gave that slot, chroma no higher than the brand's. A neighbouring hue within 30° is tried only when the brand's own hue cannot give a distinct shade.
- A shade never changes the color's name. `src/themes/brand/color-name.ts` names a color by OKLCH hue band, and in the warm bands by lightness too: a red from lightness 0.62 up is pink, an orange below 0.6 is brown and from 0.82 up peach, a yellow below 0.6 is olive and from 0.9 up cream. A shade whose name differs from the brand's is not used. The theme's own grey or ink stands in (its chart's neutrals, then its muted and text inks), so brief under a red brand draws its accent rule in its grey, not in pink.
- `emphasisInk` follows the slot it matched in the theme, or becomes a shade of the brand, lifted to 4.5:1 so emphasized words read. If the lifted ink would change name (Berlin's orange lifted to 4.5:1 is brown), the theme's own emphasis ink stays.
- The chart palette leads with the brand, then its shades, then the theme's neutrals (near blacks and greys), with every pair of neighbours at least 0.1 OKLab apart. A theme whose chart is one color among inks and greys (swiss, ink, journal, memo, ledger, luxe, runway, stage) stays that way: the brand takes its one color, the inks stay, and a second color never enters it. The blue-with-orange ban (`src/themes/chart-taboo.ts`) still holds for derived colors.
- `bg`, `surface`, `text`, `muted`, `panel`, `border`, `cardStroke`, and the status colors `danger`, `warning`, `success` stay the theme's own. A default background that was the theme's primary or accent becomes the new one. Every other background stays.

A color outside the brand's family appears only when the company names it. The second color goes to the theme's second colored slot and the chart's second series, under rules 1 and 2. When that slot writes headings it cannot read in, the second color is drawn in the chart only. On a theme whose chart is one color among inks, it goes to the second slot only, and with no colored second slot it is not used. The command says which. `src/themes/brand/brand-regen.test.ts` sweeps every theme against several brands and checks that each new color is within 30° of the brand's hue, of the second color's hue, or a neutral.

`--brand` cannot be combined with `--primary`, `--accent`, `--bg`, `--text`, or `--surface`. Those flags set tokens exactly through the anchor fork, for an author who wants exact control.

## Office part discovery

The extractor opens the OOXML package and reads the shortest non-variant `theme<N>.xml` path. Normal locations are `ppt/theme/theme1.xml` for PowerPoint files and `theme/theme/theme1.xml` for `.thmx` files. Theme-variant subtrees are excluded.

User Office files are never committed as fixtures. Tests build small OOXML packages programmatically in `src/themes/extract/__fixtures__/thmx.ts`.

## Slot mapping

| OOXML source | use |
| --- | --- |
| `accent1`, then `dk2` | The brand color. Falls back to the first available accent. |
| `accent2` | The second color, when it has chroma and differs from the brand. |
| major Latin font | With `--brand-fonts`, first in the heading stack. Otherwise not used. |
| minor Latin font | With `--brand-fonts`, first in the body stack (the major face when absent). Otherwise not used. |
| `dk1`, `lt1`, `lt2`, `accent3` to `accent6` | Not used. |

`hlink` and `folHlink` may be parsed but are not mapped because PPTwise has no hyperlink color token.

A template whose brand color has no chroma (a grey, a black or a white, OKLCH chroma under 0.04) is not refused. The theme is repainted around that grey, and the command says so first: the template has no colored brand color, and the theme comes out grey. `placement.brand.neutral` is `true` in that case, and `theme fork --brand` with a grey says the same.

The SDK's `extractBrandTheme(bytes, { id, label, from, brandFonts })` is the same route: the CLI reads the file and resolves `--from` by name, then calls it. `from` is a built-in theme id or a complete theme file passed by value, `"bulletin"` by default. It returns `{ file, placement, fontNotes }`: the repainted theme, where the brand and second color went, and the font warnings `--brand-fonts` prints. It renders the theme's sample deck to measure its face, so a platform must be installed first (`installPlatform`).

## Failure behavior

Extraction has hard structural requirements:

- the package must contain a theme part
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

- Many Western Office themes omit East Asian font faces. CJK text then uses PPTwise's normal font fallback stack.
- Logos are stored in master and media parts rather than the theme part. Extraction does not import them. Add a logo as a deck asset and reference it through `brand.logo_asset_id`.
- A visible dark slide background may come from a master `<p:bg>` rather than the Office theme part. Extraction never takes the template's ground anyway: pick a dark `--from` theme for a dark brand deck.
- With `--brand-fonts`, a template font that is not on the export-safe list has no effect: the slides are set in the next safe face in the stack. A safe face without an exact width table is measured by estimate, so long lines can overflow. The command warns about both.
- A brand that cannot be read as heading ink on a light theme (a bright orange or yellow) lands only in rules, marks, and charts. On a theme that leads every chart with its own mark (vermilion), the brand is the second series. On a theme whose chart faces keep the accent out as a highlight (brief), a brand placed in the accent appears in rules and highlights but not in charts.
- Raw brand fields stand off the page only as far as the brand does: a deep blue on lecture's blackboard or luxe's black is dim.
- Where no shade keeps the brand's name, the theme's own ink stands in. On themes with few neutrals that can be an ink tinted the theme's way (rally's lavender) or a near white (ember's cream).
- The donor menu is copied as a whole. Extraction does not infer a new menu from example slides.
