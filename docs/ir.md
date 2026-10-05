---
summary: 'IR v5: deck fields, required content kinds, slide fields, components, assets, narrative pacing, branding, footer marks, and strict removal of selection fields'
read_when:
  - writing or validating a bare IR file
  - a field name, page kind, component, or version was rejected
  - deciding between a bare IR and a deck project
  - checking which semantic fields survive into render
  - choosing a chart_type, or writing a stacked, percent_stacked, or combo chart
  - adding page numbers, a confidentiality mark, or other footer marks
---

# IR v5

IR is the typed semantic input to pptwise. Version 5 describes what the deck says, which theme it binds, and which components fill each page. It does not store face selection or random state.

```json
{
  "version": "5",
  "filename": "hello.pptx",
  "narrative": "general",
  "theme": { "id": "brief" },
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
| `theme` | object | Bound theme id only: `{ "id": "acme" }`. Required — bind a workspace theme, an installed pack theme, or a factory preset. Recolor with `pptwise theme fork`. Brand config lives on the theme file. |
| `meta` | object | Organization, authors, date, version, confidentiality, legal classification, contact, copyright, and animation. |
| `assets` | object | Named image sources under `assets.images`. |
| `brand` | object | Deck logo asset id and corner position. |
| `branding` | enum | Where the logo appears: `full`, `cover-only`, or `minimal`. Omission equals `cover-only`. |
| `footer` | object | Page number and other small marks in the page corners. Omission prints none. See [Footer marks](#footer-marks). |
| `course` | object | The stages a talk runs through in order (`stages`, two to eight, each a `label` and an optional `quiz: true`), such as the parts and quizzes of a lesson. Each page names its own `stage`. |
| `slides` | array | Ordered pages. |

The root object is strict. Unknown fields fail validation.

## Page types and fields

The four page types are `cover`, `chapter`, `content`, and `ending`. If `type` is omitted, the page is content and still requires `kind`.

Common page fields are:

- `id`, an optional stable page identifier
- `placeholder: true`, normally produced by an unfinished deck project
- `heading` and `subheading`
- `kicker`, a short label over the heading (the occasion on a cover, what an ending asks for), drawn only by a face that declares a place for it. validate refuses it on any other and names the face
- `tag`, a small tag set with the heading that says what the whole page rests on (`text`, and an optional `evidence` kind that colours it by its source, such as `trial` for "RCT · NEJM 2025", or a `basis` that says how firm what it marks is: `law`, `estimate`, `pending` or `proposal`, the last three dashed). Like `kicker`, only a face that declares a place for it draws it
- `fields`, one to four header lines a document form prints, each a `label`, a `value` and an optional `note` (a memo's To, From, Date and Re on its cover, Signed and Copied to under its decision), and `stamp`, a stamp pressed on the page (`text`, an optional `date`). Like `kicker`, only a face that declares a place for them draws them
- `ballot`, the boxes a committee ticks beside each of the page's items (`choices`, two to four, such as For, Against and Abstain) and an optional line left blank to sign (`signature`, its label). Only a face that declares a place for it draws it
- `years`, the run of years a deck follows and the ones this page is about (`from`, `to`, and `marked`, such as 2026 to 2034 with 2026 and 2027 marked), drawn as a strip of years in the running head with the page's own years lit. At most 13 years. Only a face that declares a place for it draws it
- `stage`, which stage of the deck's `course` this page belongs to, written as that stage's label ("Part 1"), drawn as the course's strip of pills with this stage lit and a quiz stage dashed. It needs the deck's `course` and must name one of its stages. Only a face that declares a place for it draws it
- `components`
- `background`
- `decor`, one controlled local primitive
- `image_side`, either `left` or `right` for a supporting face
- `footnote`
- `notes`, exported as native speaker notes

Only content pages carry `kind`. Boundary pages do not. Components on a boundary page render only when the face bound by the theme menu declares compatible slots, and a boundary page's `footnote` only when that face declares it sets one (an ending's disclaimer at its foot). Validation checks the effective face before output.

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

IR v5 has no `seed`, `layout`, `beat`, or `arrangement`. It also does not accept aliases for them. `theme` is `{ id }` only. There is no `theme.style` or `theme.brand` overlay.

- The spec chooses `kind`.
- The theme menu maps that kind to one face.
- The face adapts its own geometry to the filled components.
- Rendering is deterministic without stored random state.
- Recolor with `pptwise theme fork`. Brand config lives on the theme file.

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

`components` is a discriminated union of 62 typed units. Ask the installed schema for exact fields, one component or one kind at a time:

```bash
pptwise schema --component kpi_cards
pptwise schema --kind data --theme brief
```

The attributed prose component is `blockquote`. There is no component type named `quote`.

`swot`, `bmc`, `waterfall`, `gantt`, `pest`, `five_forces`, `heatmap`, and `sankey` occupy the full body and must be the page's only component. A face may name the companions it sets beside one of them: bulletin's content page sets a `waterfall` or a `gantt` beside a `kpi_cards`, so on bulletin that pair validates and nothing else joins it.

A `waterfall` reads every bar against one value axis, so every item's `value`, and every running total a bar ends at, must stay within 1e300 in size. To get under it, divide every item by the same power of ten and name the unit in `unit`, so the bars keep their proportions.

See the [SKILL component guide](../skills/pptwise/references/components.md) for semantic kind ownership and close component choices.

### Charts

`chart` draws a numeric set as one shape. `chart_type` picks the shape, and each type holds its series to a count:

| chart_type | draws | series |
| --- | --- | --- |
| `bar` | One column per category, or one row with `direction: "horizontal"`. Several series stand side by side. | 1 or more |
| `stacked` | Each category's series piled into one column, with the column total printed above it. | 2 or more |
| `percent_stacked` | The same piles scaled so every column reaches 100%, read on a 0% to 100% axis. | 2 or more |
| `combo` | Bars and lines on one category axis, with an optional second value axis on the right. | at least one bar and one line |
| `line` | One line per series, each named where it ends. | 1 or more |
| `area` | A line with the region under it filled. | 1 or more |
| `scatter` | Numeric x-y points. A per-point `size` makes a bubble. | 1 or more |
| `pie`, `donut` | One whole split into named slices. | exactly 1 |
| `funnel` | One value narrowing across ordered stages. | exactly 1 |
| `dumbbell` | A from value and a to value per row. | exactly 2 |
| `gauge` | One value against a target. | exactly 1, with one point |

`axes` titles and units apply to `bar`, `stacked`, `percent_stacked`, `combo`, `line`, `area`, and `scatter`. Within one series, a category may appear once.

`bar` prints each value beside its bar, above it or past its end, when every value fits there clear of the bars and inside the chart. Otherwise it prints none, and export stops on that page until the numbers are shorter (divide them and name the unit in `y_unit`, or `x_unit` for `direction: "horizontal"`) or the chart has fewer categories or series. A horizontal bar chart grows taller with its category count, so each category keeps a row of its own.

Every value read against a value axis must stay within 1e300 in size: every `y` of `bar`, `line`, `area`, `scatter`, `dumbbell`, and `combo`, and every `x` of `scatter`. To get under it, divide every series on that axis by the same power of ten and name the unit in that axis's unit field, so the series keep their proportions. A dumbbell names its values on one line under its rows, so name the unit in `axes.x_unit`.

`stacked` keeps the amounts. Positive values pile up from zero and negative values pile down from it, in series order, and a zero line marks the seam when a pile hangs below it. The number above each column is the category's net total. Segments carry no numbers, so read them against the axis. The totals are printed together or not at all: when they do not all fit above their columns, none is printed and export stops on that page until the numbers are shorter (divide them and name the unit in `y_unit`) or the chart has fewer categories. Each category's positive values, and its negative values, must add up to no more than 1e300 in size. To get under it, divide every series by the same power of ten and name the unit in `y_unit`, so the columns keep their proportions.

```json
{
  "type": "chart",
  "chart_type": "stacked",
  "axes": { "x_title": "Quarter", "y_title": "Revenue", "y_unit": "M" },
  "series": [
    { "name": "Consulting", "data": [{ "x": "Q1", "y": 42 }, { "x": "Q2", "y": 48 }] },
    { "name": "Software", "data": [{ "x": "Q1", "y": 30 }, { "x": "Q2", "y": 34 }] }
  ]
}
```

A `stacked` chart with `direction: "horizontal"` is a share bar: one whole drawn as a single bar across the page, cut into its parts in series order. Each series is one part with one value at the chart's one category, and that category's name is printed over the bar as its caption. Each part carries its name and value, inside it when they fit and over the bar's end when it is too narrow. Marking a run of adjacent parts with `emphasis` adds a line under the bar with the run's total and share of the whole, beside the largest other part's. Values must not be negative and no part takes a `status`.

```json
{
  "type": "chart",
  "chart_type": "stacked",
  "direction": "horizontal",
  "axes": { "y_unit": "GW" },
  "series": [
    { "name": "Solar", "emphasis": true, "data": [{ "x": "China's capacity at the end of 2025, by source", "y": 1202 }] },
    { "name": "Wind", "emphasis": true, "data": [{ "x": "China's capacity at the end of 2025, by source", "y": 640 }] },
    { "name": "Thermal", "data": [{ "x": "China's capacity at the end of 2025, by source", "y": 1539 }] },
    { "name": "Hydro", "data": [{ "x": "China's capacity at the end of 2025, by source", "y": 448 }] },
    { "name": "Nuclear", "data": [{ "x": "China's capacity at the end of 2025, by source", "y": 62 }] }
  ]
}
```

`percent_stacked` divides each value by its category's total, so every column reaches 100% and only the make-up is compared. It prints no totals and draws gridlines at every quarter by default. Values must not be negative, every category must add up above zero, and `y_unit` may only be `%`. A category that adds up to zero is refused rather than drawn as an empty column, because an empty column reads as missing data.

`combo` draws bars and lines against the same categories. Set `plot: "line"` on each series to draw as a line. The rest are bars. A series with `axis: "right"` is read against a right-hand axis with its own scale, titled by `axes.y2_title` and `axes.y2_unit`. The right axis ticks sit on the same rows as the left axis ticks, so one set of gridlines serves both.

```json
{
  "type": "chart",
  "chart_type": "combo",
  "axes": { "x_title": "Quarter", "y_title": "Revenue", "y_unit": "M", "y2_title": "Gross margin", "y2_unit": "%" },
  "series": [
    { "name": "Revenue", "data": [{ "x": "Q1", "y": 72 }, { "x": "Q2", "y": 82 }] },
    { "name": "Gross margin", "plot": "line", "axis": "right", "data": [{ "x": "Q1", "y": 31.5 }, { "x": "Q2", "y": 29.8 }] }
  ]
}
```

A combo needs at least one bar series and one line series, and at least one series on the left axis. `plot`, `axis`, `y2_title`, and `y2_unit` exist only on `combo`, and `y2_title` or `y2_unit` without a series on the right axis is refused. Every combo value must stay within 1e300 in size. To get under it, divide every series on that value's axis by the same power of ten and name the unit in that axis's `y_unit` or `y2_unit`. `percent_stacked` and `combo` do not take `direction: "horizontal"`, and `stacked` takes it only as a share bar.

### Marking what a page is about

A page usually argues about one thing. These fields let the author say which, and say what a value is when it is not a reported figure. Every theme reads them. The marked thing takes the theme's emphasis and the rest steps back.

| field | marks | limits |
| --- | --- | --- |
| `chart.series[].data[].status` | `"forecast"` hatches the bar, `"target"` draws it as a dashed outline over a pale tint. A series that mixes statuses gets a Forecast or Target legend entry, and a forecast's value label says so. | `bar` and `stacked` only |
| `chart.series[].data[].emphasis` | the one bar the page is about, such as the latest year in a run of years: it keeps its series' colour and the other bars step back | `bar` only, one point per chart, not beside a marked series |
| `chart.bands` | `[{ "from": 4.5, "to": 5, "label": "Target range" }]` tints a value range across the plot behind the data, labelled inside it, and the value axis grows to hold it. Write a target range this way rather than as two flat series | `line`, `area` and upright `bar`, at most 2 |
| `chart.changes` | `[{ "from": "2025 Q3", "to": "2026 Q3" }]` draws a bracket over two columns with the change between them (relative, or in points on a `%` axis). With `"at": "BYD"`, `from` and `to` name two series compared at that category. A horizontal chart writes the change after the later bar. | `bar` and `stacked`, at most 3. A horizontal chart needs `at`, a stacked one must not have it |
| `chart.reference` | `{ "value": 1.37, "label": "EU benchmark 1.370" }` draws one value as a dashed line across the bars, such as a benchmark or a threshold, names it in the legend, and grows the value axis to hold it. Write a benchmark this way rather than as a bar of its own | `bar` only, upright or on its side |
| `chart.series[].data[].note` | a few words printed after a bar's value, after a middle dot ("2.34 · baseline", "€7.68 · ¥62.36") | `bar` on its side and the parts of a share bar only |
| `chart.series[].data[].upper` | the high end of a value known only as a range, `y` its low end: the bar is solid to `y` and dashed on to `upper`, its label naming both ends ("60–70") | `bar` on its side only, at zero or above |
| `chart.emphasis_label` | a share bar's line for its marked parts in the author's own words ("Downstream goods €9.35bn, 69.5%"), set where the computed total would stand | a share bar with at least one marked series |
| `concept_equation.excluded` | what the result leaves out on purpose, as a term (`{ "label": "Not yet", "value": "Lunch-hour food in the city core", "note": "Last in the order of release" }`): drawn under the equation in a dashed outline, its value struck through | needs a value |
| `data_table.columns[].emphasis` and `icon` | the one column the page is about, such as the figure no company has published: its header and cells bold in the primary and the column outlined; an icon set before each of a column's cells (`"circle-help"`) | at most one marked column; an icon on a left-aligned column only |
| `numbered_cards.items[].emphasis` | the one card the page lands on: its pill is filled | at most one |
| `gantt.items[].text` and `emphasis` | a line under the stretch's label, and the one stretch the page is about | at most one marked |
| `heatmap.bands` | `[{ "from": "Jun", "to": "Sep", "label": "2027 season, Jun to Sep" }]` frames a run of columns across every row in a dashed outline and names it under the grid, such as the season a plan is built around. `from` and `to` name two `x_labels` | at most 2, apart. A heatmap runs up to 12 columns, a year of months |
| `gantt.range` and `gantt.items[].period` | the stretch the axis runs over when it is longer than the bars (`{ "from": 0, "to": 18 }` for a whole 18-month plan), and how a bar's stretch reads in words ("Months 16 to 18") | every bar inside the range |
| `gantt.bands` | `[{ "from": 8, "to": 12, "label": "Concert season, Jun to Sep" }]` tints a span of the axis behind the bars and names it under the axis, such as the season a plan is built around. `from` and `to` are on the bars' own axis | at most 2, apart, inside the axis |
| `timeline.milestones[].lane` and `timeline.lanes` | two tracks on one time order. `lanes` names them, the one above the axis first. A face with no room for two sides prints the lane before the date | every milestone names a lane or none does, at most two, not on a vertical timeline |
| `timeline.periods` | `[{ "from": "2026-01", "to": "2026-12", "label": "2026: counted, nothing to buy" }]` divides the axis into named spans. A face that lays dates to scale draws each span along its stretch of the axis; the ordinary timeline names them in a row under its milestones. A span with `"basis": "proposal"` (or any basis not yet settled) is drawn dashed | at most 3, not on a vertical timeline |
| `timeline.milestones[].tag` and `source` | where a milestone stands, as a small tag (`{ "text": "Proposal", "basis": "proposal" }`), and where its date or rule comes from, a small line under it ("COM(2025) 989"). A tag with a basis that is not settled is dashed | |
| `callout.title` and `callout.tag` | a short bold line over the note ("Who pays"), and what the note rests on as a small tag under its text (`{ "text": "Company figure, as reported", "evidence": "company" }`) | |
| `waterfall.items[].note` | a short line under a bar's label, such as the quantity it stands for ("3.187 t") | |
| `roadmap.items[].rows[].basis` | what a row's value rests on, such as `"pending"` for a budget line still to be set. A value that is not settled is marked dashed | |
| `roadmap.items[].duration` and `roadmap.duration_unit` | how long each phase lasts and the unit they are counted in (`15` and `"min"`), on every phase or none. The ordinary roadmap adds the length to the period line ("Part 1 · 15 min"), and a face that lays phases to scale draws each as long as it lasts | |
| `roadmap.items[].checkpoint` and `roadmap.items[].points` | a check held as the phase ends ("Quiz 1"), as a tag on its card, and one to three short lines on what it covers | |
| `pyramid.layers[].tone` | what kind of news a level is (`danger`, `warning`, `success`), its band painted in the theme's own ink for it, such as data graded from what must never leave to what is safe. Every level or none | |
| `kpi_cards.items[].value` written `**…**` | the one figure set in the theme's emphasis | |
| `progress_donuts.items[].detail` and `emphasis` | a line under a rate's label with the amounts behind it ("1.18 of 1.3 trillion"), and the one rate the page is about, whose ring, figure and label take the emphasis colour | at most one marked |
| `kpi_cards.items[].tag` | what the figure is, in a few words printed as a small tag with it (`{ "text": "Binding" }`): filled on the marked figure, outlined otherwise, grey when `quiet` | |
| `from_to.rows[].tag` and `emphasis` | a tag after the row's values and the one measure the page is about, as on a `comparison` row | at most one marked |
| `comparison.rows[].emphasis` | the one row the page is about: it sits on a pale tint of the emphasis colour | at most one |
| `comparison.rows[].tag` and `comparison.tag_column` | what happened to each row, in a few words printed as a small tag after its cells (`{ "text": "Now a range" }`), with `tag_column` the header over the tags. A tag on the marked row fills in the emphasis colour, a `quiet` one (nothing changed) steps back in grey, any other is outlined in the accent | `tag_column` only with tags |

```json
{
  "type": "chart",
  "chart_type": "bar",
  "axes": { "y_title": "Million units" },
  "series": [
    { "name": "2025", "data": [{ "x": "July", "y": 1.826 }, { "x": "August", "y": 1.995 }, { "x": "September", "y": 2.241 }] },
    { "name": "2026", "emphasis": true, "data": [{ "x": "July", "y": 1.461 }, { "x": "August", "y": 1.541 }, { "x": "September", "y": 1.69, "status": "forecast" }] }
  ]
}
```

```json
{
  "type": "timeline",
  "lanes": ["Home", "Abroad"],
  "milestones": [
    { "date": "July", "title": "Brazil: 35% tariff", "lane": "Abroad" },
    { "date": "July 7", "title": "Price Law revision", "lane": "Home", "highlight": true }
  ]
}
```

## Footer marks

A deck prints no footer unless `footer` asks for it: no page number, no organization, no date, no confidentiality line. Each mark is opt-in, and every text is the author's own or the deck's own `meta`.

| field | prints | where |
| --- | --- | --- |
| `page_number` | The page number. Exported as PowerPoint's slide-number field, so it renumbers when slides move. | Content pages, bottom right. Never on cover, chapter, or ending pages. |
| `organization` | `meta.organization`. | Content pages, bottom left. |
| `label` | The author's occasion-and-date line, as written. | After the organization. |
| `notice` | The author's copyright line or disclaimer pointer, as written. | After the label. |
| `draft` | The author's draft or version mark, as written. | Bottom right, before the page number. |
| `confidentiality` | The `meta.confidentiality` mark, in the deck's language. `"cover"` prints it once on the cover. `"footer"` prints it on the cover and on every content page. | Cover: the face's own spot, or top left. Content pages: bottom right. |

```json
{
  "meta": { "organization": "华东区域运营中心", "confidentiality": "confidential" },
  "footer": { "page_number": true, "organization": true, "label": "2026 年中期业绩 | 2026.08", "confidentiality": "footer" }
}
```

```json
{
  "meta": { "organization": "Acme Holdings", "confidentiality": "confidential" },
  "footer": { "page_number": true, "label": "Investor Presentation | February 2026", "confidentiality": "cover" }
}
```

The confidentiality words follow the deck's language, read from its headings. A Chinese deck prints 「仅供内部讨论」 for `internal`, 「内部资料，请勿外传」 for `confidential`, and 「限定范围阅读，请勿转发」 for `restricted`, never 「机密」, which is a legal classification level in Chinese. An English deck prints Internal, Confidential, or Restricted. `public` prints nothing.

A legal classification with its term goes in `meta.classification`, written exactly as given ("秘密★1年"). It prints once, on the cover, top left, and nowhere else.

The footer is one line of 16px meta-tier text (12pt, PowerPoint's own footer size) along the bottom of the type area, with a hairline above it when it carries words. Faces that leave no room for the brand frame (`branding: "none"`, such as a full-page statement or a big number), faces whose artwork runs to the bottom edge (`footerRow: "none"`, such as a full-height photo column), and menu entries with `brand: "none"` carry no footer row, page number included.

`branding` and `footer` answer different questions. `branding` decides where the logo appears. `footer` decides which marks print. A deck with `branding: "full"` and no `footer` keeps its older footer, read as `{ "organization": true, "confidentiality": "footer" }` for whichever of the two `meta` carries. The date and version it used to repeat on every page stay on the cover and ending, where `full` still prints them. Writing `footer` replaces that reading, and `footer: {}` turns it off.

`validate` refuses:

- `organization` without `meta.organization`
- `confidentiality` without `meta.confidentiality`, or with `public`
- `confidentiality` together with `meta.classification`
- a legal classification written into `label`, `notice`, or `draft`
- a footer line too long for one line at the bottom of the page (a footer never trims the author's words)

## Assets and backgrounds

Each `assets.images` entry contains `src` and may include `alt` or `error`. `src` can be a data URI or a supported local or remote source accepted by the loader. Components refer to entries by `asset_id`.

Backgrounds are `color`, `gradient`, or `asset`. Cover and chapter asset backgrounds use the dedicated readable image treatment. Run `pptwise asset-brief <target>` before sourcing image content so the real frame and crop are known.

## Validation

`pptwise validate` is the live contract. Authored strings must write the value itself. Never stand in for content with a leftover count or an ellipsis. validate rejects it.

The check walks every string leaf under `slides` and `meta`, so a new component field is covered automatically. Spec headings get the same check.

## Deck project or bare IR

Use a bare IR for a small generated input or a direct API boundary. Use a deck project for iterative work. A project keeps theme binding and page semantics in `deck.spec.json`, stores content in `pages/<id>.json`, and assembles the same IR v5 without writing rendering choices back into source files.

See [Deck projects](./deck-projects.md) and [Menu lookup](./menu-lookup.md).
