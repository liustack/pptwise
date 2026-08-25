---
summary: 'The 24 built-in themes, extracting your own brand from a PowerPoint template, and style overrides via CLI flag, IR, or project config'
read_when:
  - picking a theme, or looking up a theme id
  - making the output look like your own company (`pptwise brand extract`)
  - re-coloring a theme without forking it
---

# Themes

A theme bundles a style (design tokens), a brand (identity frame: logo, footer, page number), and a layout set for each page type. There are 24 built-in themes, 24 ids.

| id | label |
|---|---|
| `consulting` | Business Consulting |
| `enterprise` | Enterprise |
| `academic` | Academic |
| `insight` | Financial Insight |
| `campaign` | Marketing Campaign |
| `classroom` | Classroom |
| `ink` | Ink Wash |
| `tech` | Tech |
| `runway` | Fashion Runway |
| `journal` | Editorial Journal |
| `luxe` | Luxe |
| `heritage` | Heritage |
| `pulse` | Health & Life Science |
| `terra` | Sustainability & ESG |
| `ember` | Startup Pitch |
| `vermilion` | Official Report |
| `crayon` | Kids Education |
| `arena` | Esports & Entertainment |
| `museum` | Museum |
| `stage` | Keynote Stage |
| `lecture` | Lecture Hall |
| `swiss` | Swiss Institutional |
| `memo` | Decision Memo |
| `playbill` | Playbill |

`pptwise themes [--json]` prints the same list from the installed version.

The shared `LAYOUT_REGISTRY` contains 134 entries: 130 standard layouts and 4 image takeovers. Of the standard layouts, 43 belong to the shared auto-selectable pool and 87 are `pinOnly`. Theme redesign waves supplied most pin-only constructions. The consulting gauge family and crayon crayonbox family each add five pin-only faces. The runway show family adds seven. Pin-only layouts stay out of the shared automatic pool unless a theme explicitly lists one in its curated set. Authors can also reach them through an explicit `slide.layout` pin.

Cover, chapter, and ending pages now lock to their Claude Design board construction. Soft preference cannot hold those pages in place. The registry exposes 9 auto-selectable content layouts. consulting and crayon each prepend one theme-locked pin-only content face while retaining those 9 shared choices. runway prepends show-statement and show-figures. show-gallery and show-spotlight remain explicit-pin only. lecture and luxe drop `split-band` and `stacked-poster` from that baseline. A registered custom theme that omits `layouts` receives the 9 auto-selectable content ids.

Layouts still live in the shared pool. A lock is how a theme uses the pool, not a private fork of a layout file. Every built-in also names the covers, chapter breaks, content pages, and endings it leans toward, so two themes rendering the same deck under the same seed usually pick different layouts. Soft preference (`layoutTendencies`) remains for content, and for identity pages that have not locked yet. For a locked cover the preference is the lock itself. Pin `slide.layout` when a single page has to be exactly one thing. Cover locks do not move when a later wave fills the other three page types. Every layout adapts its text color to the theme's actual background, so the pool stays readable everywhere.

`memo` is a typewriter decision memo (stamp-red rules, never a red fill). It pairs naturally with deck `branding: "full"` so the footer, page numbers, and organization line stay on the page. The pairing is a note, not an engine lock. `branding` still belongs to the deck.

## Your own brand

The fastest way to make the output look like *your company* instead of a built-in theme is to extract the brand from a template you already have. `pptwise brand extract` reads colors and fonts out of a `.thmx` theme, `.potx` template, or `.pptx` presentation and writes a pptwise theme file. It runs **entirely locally — the file never leaves your machine** (verified against all 39 Office themes that ship with a macOS PowerPoint install).

```bash
pptwise brand extract corp-template.pptx -o my-brand.theme.json
pptwise render deck.json -o deck.pptx --theme-file my-brand.theme.json
```

`--theme-file` works on `render`, `validate`, `audit`, `preview`, and `serve`. In a deck project directory, drop the file in as `theme.json` and it auto-loads on every command — reference its id from `deck.spec.json`, no flag needed.

The 12 OOXML color slots map almost 1:1 onto pptwise's tokens, with the six accent colors becoming the chart palette. The one derived token, `muted`, is stepped toward the background only as far as it can go while still clearing a 4.5:1 contrast ratio.

Loading enforces the same contrast floor every registered theme faces: a palette whose text and background are too close is refused, naming the failing token, the measured ratio, and the background. It is never rendered unreadable. A custom theme can never shadow a built-in id.

Extraction internals are in [`brand-extraction.md`](./brand-extraction.md), the contrast machinery in [`contrast-system.md`](./contrast-system.md).

## Style overrides and project config

To re-color a theme without forking it, write a style JSON (schema: `pptwise schema --style`) and pass it per render (`--style brand.json`), or pin it project-wide in a `pptwise.config.json` (found by walking up from the current directory — `pptwise init` scaffolds one).

```json
{ "theme": "consulting", "style": { "colors": { "primary": "#0B5FFF", "accent": "#FF6A00" } } }
```

Precedence: CLI flag > project config file > user config file > IR. The IR can carry the same override in `theme.style` for a fully self-contained deck. The full four-layer chain is in [`ir.md`](./ir.md#deck-projects).
