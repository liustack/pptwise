# Examples

Seven ready-to-run decks cover the main page kinds, component families, and
factory themes. Every example uses IR v5 or a version 1 deck spec. Run
`pnpm build` before using the compiled CLI commands below.

| example | what it shows | preview |
| --- | --- | --- |
| [`basic.json`](basic.json) | A five-page starter with `points` and `data` content kinds. Theme `brief`. | <img src="previews/basic.svg" width="280" alt="basic cover"> |
| [`product-pitch.json`](product-pitch.json) | A customer pitch using `points`, `list`, `data`, `comparison`, and `quote`. Theme `thesis`. | <img src="previews/product-pitch.svg" width="280" alt="product pitch cover"> |
| [`quarterly-review-zh.json`](quarterly-review-zh.json) | A Chinese business review with `data`, `points`, and `statement` pages. Theme `vermilion`. | <img src="previews/quarterly-review-zh.svg" width="280" alt="quarterly review cover"> |
| [`data-charts.json`](data-charts.json) | Grouped bar, line, donut, and heatmap components under the `data` kind. Theme `ledger`. | <img src="previews/data-charts.svg" width="280" alt="data charts cover"> |
| [`strategy-analysis.json`](strategy-analysis.json) | SWOT, five forces, matrix, and recommendation components under semantic kinds. Theme `thesis`. | <img src="previews/strategy-analysis.svg" width="280" alt="strategy analysis cover"> |
| [`team-onboarding.json`](team-onboarding.json) | People, lists, and process structures using `hierarchy`, `list`, and `process`. Theme `homeroom`. | <img src="previews/team-onboarding.svg" width="280" alt="team onboarding cover"> |
| [`launch-deck/`](launch-deck/) | A deck project whose spec binds theme `rally` and whose page files supply content. | <img src="previews/launch-deck.svg" width="280" alt="launch deck cover"> |

Preview images show each deck's first page and are produced by
`pptwise preview`.

## Run an IR example

From the repository root:

```bash
pnpm build
node dist/cli.js validate examples/basic.json
node dist/cli.js render examples/basic.json -o out/basic.pptx
node dist/cli.js preview examples/basic.json -o out/svgs
node dist/cli.js audit examples/basic.json
```

The theme is part of the IR. To compare alternatives before binding one, use
the fixed theme sample:

```bash
node dist/cli.js theme try brief,swiss,memo -o out/theme-try
```

## Run the deck project

Validate the spec, assemble it with the page files, then render the project:

```bash
node dist/cli.js spec validate examples/launch-deck/deck.spec.json
node dist/cli.js assemble examples/launch-deck
node dist/cli.js render examples/launch-deck -o out/launch.pptx
```

Assembly writes `examples/launch-deck/deck.json` as a generated artifact.
The file is ignored by Git.

`pnpm e2e` drives `basic.json` through the built CLI, structural assertions,
preview generation, and the optional LibreOffice conversion probe. Output is
written under `.e2e-out/`.

## Refresh a preview

```bash
node dist/cli.js preview examples/<name>.json -o /tmp/preview-<name>
cp /tmp/preview-<name>/001-cover.svg examples/previews/<name>.svg
```
