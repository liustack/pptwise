---
summary: 'IR v5: deck fields, required content kinds, slide fields, components, assets, narrative pacing, branding, and strict removal of selection fields'
read_when:
  - writing or validating a bare IR file
  - a field name, page kind, component, or version was rejected
  - deciding between a bare IR and a deck project
  - checking which semantic fields survive into render
---

# IR v5

IR is the typed semantic input to pptwise. Version 5 describes what the deck says, which theme it binds, and which components fill each page. It does not store face selection or random state.

```json
{
  "version": "5",
  "filename": "hello.pptx",
  "narrative": "general",
  "theme": { "id": "consulting" },
  "meta": { "organization": "Acme", "date": "2026-08-30" },
  "assets": { "images": {} },
  "slides": [
    {
      "type": "cover",
      "heading": "Hello pptwise",
      "subheading": "A native editable deck"
    },
    {
      "type": "content",
      "kind": "points",
      "heading": "Why it works",
      "components": [
        {
          "type": "bullets",
          "items": ["Semantic input", "Theme-menu lookup", "Editable PowerPoint output"]
        }
      ]
    },
    { "type": "ending", "heading": "Thanks" }
  ]
}
```

Validate the live contract rather than copying examples blindly:

```bash
pptwise schema > ir.schema.json
pptwise validate deck.json
```

## Top-level fields

| field | shape | meaning |
| --- | --- | --- |
| `version` | `"5"` | The only accepted IR version. Omission is authored as v5. |
| `filename` | string | Output filename. Defaults to `presentation`. |
| `narrative` | preset string or partial axes | Argument, pacing, and audience decision. |
| `theme` | object | Bound theme id, plus optional low-level style or brand overrides. Defaults to `consulting`. |
| `meta` | object | Organization, authors, date, version, confidentiality, contact, copyright, and animation. |
| `assets` | object | Named image sources under `assets.images`. |
| `brand` | object | Deck logo asset id and corner position. |
| `branding` | enum | `full`, `cover-only`, or `minimal`. Omission equals `cover-only`. |
| `slides` | array | Ordered pages. |

The root object is strict. Unknown fields fail validation.

## Page types and fields

The four page types are `cover`, `chapter`, `content`, and `ending`. If `type` is omitted, the page is content and still requires `kind`.

Common page fields are:

- `id`, an optional stable page identifier
- `placeholder: true`, normally produced by an unfinished deck project
- `heading` and `subheading`
- `components`
- `background`
- `decor`, one controlled local primitive
- `image_side`, either `left` or `right` for a supporting face
- `footnote`
- `notes`, exported as native speaker notes

Only content pages carry `kind`. Boundary pages do not. Components on a boundary page render only when the face bound by the theme menu declares compatible slots. Validation checks the effective face before output.

## Content kinds

Every content page requires exactly one kind. A kind names the page's semantic move. It is never inferred from components.

| kind | use it when | nearest boundary |
| --- | --- | --- |
| `points` | An argument advances in an order that matters. | Reorderable peers belong to `list`. |
| `list` | Peer items may be reordered. | Ordered reasoning belongs to `points`. |
| `comparison` | Alternatives or dimensions need direct contrast. | Direction belongs to `process`, containment to `hierarchy`. |
| `process` | Steps, time, or a cycle have direction. | Ordered claims without motion are `points`. |
| `data` | A numeric set, chart, or table is the subject. | One number carrying the page is `fact`. |
| `photo` | The image itself is the content. | An exhibit supporting a claim is `evidence`. |
| `statement` | The deck author's own proposition needs a full page. | Attributed words are `quote`. |
| `quote` | Words are attributed to another source. | The author's own proposition is `statement`. |
| `fact` | One number is the whole message. | A numeric set with structure is `data`. |
| `evidence` | One assertion is paired with one supporting exhibit. | A standalone image is `photo`. |
| `hierarchy` | The page expresses containment, levels, or composition. | Sequence is `process`, side-by-side contrast is `comparison`. |

The bound theme may offer only a subset. A requested kind outside that menu is a hard error that lists the available kinds.

## Fields that do not exist

IR v5 has no `seed`, `layout`, `beat`, or `arrangement`. It also does not accept aliases for them.

- The spec chooses `kind`.
- The theme menu maps that kind to one face.
- The face adapts its own geometry to the filled components.
- Rendering is deterministic without stored random state.

Old IR versions and retired fields are rejected with the current-format requirement. There is no migration command. Rewrite the source as v5.

## Narrative

Use a named preset or an object with any of the three axes:

```json
{ "strategy": "pyramid", "pacing": "spacious", "audience": "executive" }
```

Valid values are:

- `strategy`: `pyramid`, `storytelling`, `instructional`, `showcase`, `briefing`
- `pacing`: `dense`, `balanced`, `spacious`
- `audience`: `executive`, `technical`, `customer`, `public`

Named presets are `general`, `boardroom-report`, `pitch`, `training`, `product-launch`, `weekly-brief`, and `annual-review`. Omission resolves to `general`, which is `briefing`, `balanced`, and `public`.

Narrative guides the argument, tone, theme choice, body-text baseline, and editorial capacity. It does not choose a face. Theme recommendations are guidance only.

## Components

`components` is a discriminated union of 37 typed units. Ask the installed schema for exact fields:

```bash
pptwise schema > ir.schema.json
```

The attributed prose component is `blockquote`. There is no component type named `quote`.

`swot`, `bmc`, `waterfall`, `gantt`, `pest`, `five_forces`, `heatmap`, and `sankey` occupy the full body and must be the page's only component.

See the [SKILL component guide](../skills/pptwise/references/components.md) for semantic kind ownership and close component choices.

## Assets and backgrounds

Each `assets.images` entry contains `src` and may include `alt` or `error`. `src` can be a data URI or a supported local or remote source accepted by the loader. Components refer to entries by `asset_id`.

Backgrounds are `color`, `gradient`, or `asset`. Cover and chapter asset backgrounds use the dedicated readable image treatment. Run `pptwise asset-brief <target>` before sourcing image content so the real frame and crop are known.

## Deck project or bare IR

Use a bare IR for a small generated input or a direct API boundary. Use a deck project for iterative work. A project keeps theme binding and page semantics in `deck.spec.json`, stores content in `pages/<id>.json`, and assembles the same IR v5 without writing rendering choices back into source files.

See [Deck projects](./deck-projects.md) and [Menu lookup](./menu-lookup.md).
