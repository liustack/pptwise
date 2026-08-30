---
summary: 'Self-contained v2 themes, factory-preset copying, menu binding, three-level name lookup, color forks, and fixed-sample visual comparison'
read_when:
  - choosing, creating, binding, or freezing a theme
  - authoring or loading a version 2 theme file
  - changing colors with `theme fork` or comparing candidates with `theme try`
  - debugging which named theme a deck resolves
---

# Themes

A theme is one self-contained version 2 file. It combines a complete style system, an optional brand configuration, occasion metadata, identity strength, and a menu that maps semantic page moves to faces.

There is no partial format, base reference, or load-time inheritance. Creating a theme means copying an existing complete theme and owning the copy independently.

## Public v2 shape

```json
{
  "version": 2,
  "id": "acme-report",
  "label": "Acme Report",
  "occasions": ["business"],
  "identity": "medium",
  "style": {
    "id": "acme-report",
    "colors": {
      "bg": "#F7F6F2",
      "surface": "#FFFFFF",
      "primary": "#1E2A4A",
      "accent": "#F5C518",
      "text": "#1C1E23",
      "muted": "#5B6069",
      "border": "#DDDCD4",
      "chartPalette": ["#1E2A4A", "#3B76A8", "#797D86"]
    },
    "fonts": {
      "heading": ["Georgia", "Source Han Serif SC", "serif"],
      "body": ["Georgia", "Source Han Serif SC", "serif"]
    },
    "shape": {
      "radius": 2,
      "gapScale": 1,
      "typeScale": 1
    },
    "defaultBackgrounds": {
      "cover": { "kind": "color", "value": "#F7F6F2" },
      "chapter": { "kind": "color", "value": "#1E2A4A" },
      "content": { "kind": "color", "value": "#F7F6F2" },
      "ending": { "kind": "color", "value": "#F7F6F2" }
    }
  },
  "menu": {
    "cover": { "face": "gauge-verdict" },
    "chapter": { "face": "gauge-section" },
    "content": {
      "points": { "face": "narrow-column" },
      "comparison": { "face": "two-column" },
      "process": { "face": "rail-numbered" },
      "data": { "face": "gauge-stats" },
      "statement": { "face": "gauge-point", "brand": "none" },
      "photo": {
        "face": "image-split",
        "decor": { "kind": "silent" }
      }
    },
    "ending": { "face": "gauge-next" }
  }
}
```

`version`, `id`, `style`, and `menu` are required. `style.id` must equal the theme `id`. A theme id is a slug of lowercase letters, digits, and hyphens. Deck and workspace files may keep a factory preset id and shadow it.

The style object is complete. Its required core contains background, surface, primary, accent, text, muted, chart palette, heading fonts, body fonts, and four default backgrounds. Additional colors, mono fonts, shape controls, and `allowCustomBackground` are optional.

The menu must contain one entry for every boundary page and at least one content kind. It does not need all eleven kinds. Each offered kind maps to one face. `params` must match the adjustable values declared by that face. `decor` can select a motif or silence it. `brand: "none"` suppresses the shared brand fragment on that page.

## Start from a factory preset

List the 24 preset starting points with their occasion and identity metadata:

```bash
pptwise themes --json
```

Copy one into the workspace:

```bash
pptwise theme new --from consulting \
  -o themes/acme-report.theme.json \
  --id acme-report \
  --label "Acme Report"
```

The written file contains copied style tokens, brand configuration, metadata, and menu. It has no link back to `consulting`. Later changes to either file do not affect the other.

`--from` can also name another workspace theme. This is the standard way to begin menu editing or create a visual sibling.

## Compare before binding

`theme try` renders one fixed fitting-room sample across two to four named themes and writes a contact sheet:

```bash
pptwise theme try consulting,swiss,memo
```

The sample is independent of any deck. It exists so visual choice happens before the spec. Render and preview commands do not accept a temporary theme override.

## Bind and freeze

A deck spec binds the theme by name:

```json
{
  "version": "1",
  "theme": "acme-report",
  "pages": []
}
```

For a bare IR file, the binding is `"theme": { "id": "acme-report" }`.

Name resolution uses three levels in order:

1. The deck directory. It checks `theme.json`, `<name>.theme.json`, and a matching complete `<name>.json`.
2. Workspace `themes/` directories while walking upward from the starting directory.
3. The 24 factory presets.

Deck and workspace files may shadow a factory preset by keeping the same id. Freeze is a copy that preserves the bound name, for example `pptwise theme new --from consulting -o deck-dir/theme.json --id consulting`. Unknown names fail loudly and report the searched locations.

To freeze a workspace theme for one deck, copy it into the deck directory as `theme.json` while preserving its id:

```bash
pptwise theme new --from acme-report \
  -o deck-dir/theme.json \
  --id acme-report
```

Project commands load this file automatically. `serve` rereads it and refreshes the open review when the file changes.

## Change a palette with a fork

Never edit one shared token as an isolated patch. Fork the theme and let pptwise rederive the complete palette around the chosen anchors:

```bash
pptwise theme fork acme-report \
  --primary "#0B5FFF" \
  --accent "#FFB000" \
  -o themes/acme-blue.theme.json \
  --id acme-blue
```

The fork preserves the source menu byte for byte, derives dependent tokens such as muted color, and runs the contrast gate. The source stays unchanged.

A same-menu fork may replace a deck binding inside the workflow. If menus differ, return to theme selection and revise the spec and affected page fills. Useful claims, data, images, and copy can be reused, but the old semantic page sequence is not assumed to fit.

## Extract a company brand

```bash
pptwise brand extract corp.pptx \
  -o themes/acme-brand.theme.json \
  --id acme-brand \
  --from consulting
```

Extraction runs locally, reads Office colors and fonts, copies the donor's complete menu, rederives the full token system, and writes a complete v2 file. Choose the donor for its menu and occasion fit, not only its colors. See [Brand extraction](./brand-extraction.md).

Every loaded theme passes strict schema, face-parameter, and contrast checks. Fix the theme at its source when one fails. Do not compensate with per-page color overrides.
