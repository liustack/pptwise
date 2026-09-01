---
summary: 'How to design a complete v2 theme from its menu outward, including face coverage, palette, type, motif, branding, vector constraints, and visual acceptance'
read_when:
  - designing or redesigning a theme, motif, or internal page face
  - translating approved artboards into a v2 theme menu and engine code
  - deciding whether a visual idea can survive editable SVG to PPTX conversion
---

# Designing themes

A pptwise theme is a complete visual answer for a known set of semantic page moves. Design starts with the menu, not a palette sheet:

```text
occasion and identity
  -> offered kinds
  -> one face per boundary page and offered kind
  -> face parameters, motif posture, and brand posture
  -> complete style system
  -> fitting-room and gallery acceptance
```

The public result is one self-contained version 2 file. Internal drawing code may be needed for a new face or motif, but the theme file itself has no base or inherited half.

## Start with the menu

Every theme menu must provide:

- one `cover` entry
- one `chapter` entry
- one `ending` entry
- a non-empty subset of the eleven content kinds

The content vocabulary is `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `quote`, `fact`, `evidence`, and `hierarchy`.

Offering a kind is a promise that the theme has a convincing face for that semantic move. A theme does not need all eleven. Leaving out `quote` or `statement` can be the right decision when that expression would break the visual voice.

Each key maps to exactly one face. There is no rotation or conditional branch. Adaptation to actual content belongs inside the face.

## Face contract

A face declares:

- supported page type
- named slots and accepted component types
- body capacity
- adjustable parameter names, primitive types, and complete bounds
- whether it paints its own background
- whether motif suppression is structural
- whether shared branding is structurally absent

A menu entry may supply only declared parameter values. Registration rejects unknown names, wrong types, and values outside bounds.

Menu entries also own two page-specific choices:

- `decor`, either `silent` or one registered motif with valid parameters
- `brand: "none"`, which removes the shared brand fragment on that page

A face with structural `suppressMotif: true` remains silent regardless of the menu. A face with structural `branding: "none"` remains frameless regardless of deck posture.

## Hard visual constraints

### Canvas and editable drawing language

1. Use a 1280 by 720 artboard at final size.
2. Use flat vector primitives: solid fills, simple linear gradients, strokes, standard geometry, and text.
3. Do not depend on browser-only effects such as CSS filters, blend modes, frosted glass, or stacked shadows. They do not survive native editable conversion reliably.
4. Use external images only through declared image assets and image-aware faces. Do not bake raster decoration into a theme to avoid drawing it properly.

### Palette and contrast

Every color has a role. The required core is `bg`, `surface`, `primary`, `accent`, `text`, `muted`, and `chartPalette`. Add `panel`, `border`, `accentPool`, `cardStroke`, `emphasisInk`, `danger`, `warning`, or `success` only when the theme needs them.

`accent` answers to the page background: it must stay legible where it is painted. A `**marked**` run answers to the text it interrupts: it must look different from the words on either side. Most palettes have one color that does both, and those omit `emphasisInk`. A theme whose accent is a near-neutral in the same family as its text ink does not, and its marked runs read as faded rather than emphasized. Such a theme keeps `accent` for decoration and names `emphasisInk` for the run.

Body text must clear 4.5:1 against its painted background. Large headings and metadata must clear their audited floors. `danger` and `success` act as text in KPI deltas and must clear 4.5:1 on `surface`. `warning` is normally line or icon ink and must clear 3:1.

Never change one token in isolation. A palette change creates a new fork, rederives muted and dependent colors, remaps backgrounds and decoration colors, then passes contrast and visual review.

### Type

Fonts express family, weight, and rhythm. Never require a commercial face to exist on the target machine. Provide ordered fallbacks, including a suitable CJK family.

`shape.radius`, `shape.gapScale`, and `shape.typeScale` tune the complete theme within their schema bounds. They do not replace face design.

### Decoration

Decoration must stay subordinate to content and within audit-safe regions. Keep solid marks out of heading, body, footer metadata, logo, and footnote zones. Hairlines up to 1.5px and background-level marks may cross a reserved zone only when the composited result remains readable.

A page paints at most three named decoration pieces. Repeated marks that read as one field count as one piece. Wrap pieces in `<g data-decor-piece>` so the budget can audit them.

Ordinary motif ink is background material. Content-page motif paint should normally remain below the 3:1 foreground threshold after compositing. Two explicit roles can opt out:

- `structure` for page chrome such as a frame or institutional rule
- `identity` for one signature midground mark whose color carries the theme

Do not label an entire motif as an exception. Mark only the piece that needs the role. Keep at most one slanted filled tile per page.

Motif colors derive from theme tokens. A palette fork must recolor motifs without editing motif code.

### Branding safe zones

Design against all three deck postures. `full` can add a content footer, metadata, and logo. `cover-only` keeps the logo on cover and chapter. `minimal` keeps logos but removes the content footer and metadata.

When a composition has no safe place for the shared fragment, declare that fact on the face or set `brand: "none"` in the menu entry. Do not squeeze the brand frame into content or rely on authors to omit metadata.

## What makes themes different

A new palette alone is a color fork, not a new menu direction. A structural theme should differ in at least two of these dimensions:

- heading axis
- metadata placement
- whitespace scale
- motif language
- kind coverage
- face family

The menu is the theme's structural identity. Style and menu must be reviewed together. Two independent themes may intentionally share a byte-identical menu while carrying different complete palettes.

## Creation workflow

Start from the nearest complete theme:

```bash
pptwise theme new --from consulting \
  -o themes/new-theme.theme.json \
  --id new-theme
```

Then work in this order:

1. Record intended occasions and identity strength.
2. Decide which content kinds the theme can serve convincingly.
3. Choose or build one face for each boundary page and offered kind.
4. Set only valid face parameters.
5. Decide motif and brand posture entry by entry.
6. Establish the complete palette, font stacks, shape controls, and default backgrounds.
7. Validate the theme and every menu route.
8. Compare it with two to three relevant themes using `theme try`.
9. Review the full gallery matrix and native PPTX output.

Use `serve` with a deck-local `theme.json` for a live tuning round. Once approved, keep the complete file as an independent workspace theme.

For a color-only variation, use `theme fork`. Do not hand-copy token fragments:

```bash
pptwise theme fork new-theme \
  --primary "#0B5FFF" \
  --accent "#FFB000" \
  -o themes/new-theme-blue.theme.json \
  --id new-theme-blue
```

## Acceptance package

A finished theme hands back:

- one complete v2 theme file
- menu rationale for every offered and intentionally omitted kind
- visual examples for cover, chapter, ending, and every offered content kind
- minimum-content and full-load stress where the selected face supports both
- palette role and contrast results
- font fallback rationale
- motif piece count, depth role, and safe-zone evidence
- branding results under `full`, `cover-only`, and `minimal`
- a `theme try` contact sheet against relevant alternatives
- gallery, audit, PPTX export, and package-check results

## Source locations

- Public schema: `src/themes/schema.ts`
- Factory presets: `src/themes/presets.ts`
- Built-in declarations: `src/themes/builtin/`
- Theme registration: `src/themes/definitions.ts`
- Workspace name lookup: `src/cli/theme-resolve.ts`
- Palette forking: `src/cli/theme-fork.ts`
- Faces and parameter declarations: `src/layouts/`
- Motifs and decoration budgets: `src/motifs/`
- Composition and brand semantics: `src/render/full-slide-svg.tsx`
- Contrast system: [Contrast system](./contrast-system.md)
- Testing and visual acceptance: [Testing](./testing.md)
