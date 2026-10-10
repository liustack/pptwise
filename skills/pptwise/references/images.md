# Images

Read this when declaring image assets, choosing `photo` or `evidence`, searching stock, or generating art.

## Choose the semantic move first

Use `kind: "photo"` when the image itself is the subject. Use `kind: "evidence"` when one exhibit supports one assertion. The bound theme menu chooses the face for that kind. Authors do not name image geometry.

Cover and chapter pages can use an asset background. The renderer applies the dedicated image-cover treatment with a dark readability scrim. Content and ending asset backgrounds retain the theme-toned scrim. Use a background image only when the page truly needs a full-canvas scene.

A `color` background should be clearly light or clearly dark. On a mid-tone such as `#777777` or `#6B7B8C`, white and near-black text both miss the 4.5:1 body text needs. The renderer sets such text in pure black, which reads, and shades cards to the side where that black still reads, but a mark that stands on a band of the face's own, such as a cover's confidentiality mark, can still fall short, and `audit` reports `low-contrast`. Pick a lighter or darker color.

Declare each image once in `assets.images`, then reference it by `asset_id` from `image`, `image_grid`, `image_compare`, or `device_mockup`. Check every key. `validate` reports a dangling reference, and an unresolved source cannot become a real image.

`image_side: "left"` or `"right"` is an optional preference for a face that supports a side image. Other faces ignore no authoring geometry because none is supplied.

## Brief before sourcing

Run the real renderer before sourcing any missing asset:

```bash
pptwise asset-brief <target>
```

The brief reports the actual frame, crop mode, safe zone, suggested pixel size, theme palette, and a paste-ready prompt. Match the reported aspect ratio and palette.

## Stock photos

Use a short concrete English query of two to four words, such as `office desk` or `wind farm`. Keep mood, quality claims, and negative keywords out of the query. Search Pexels first, Pixabay when configured, then the commercially filtered Openverse sources.

```bash
pptwise config set pexels.apiKey
pptwise images search "office desk" --orientation landscape
```

Do not take the first result automatically. Have a person or vision model choose from the thumbnails, then fetch the selected asset.

```bash
pptwise images fetch pexels:123 --deck <dir> --as hero
pptwise images list --deck <dir>
```

## Generated images

```bash
pptwise images generate --deck <dir> --as <asset_id>
```

Local generators remain disabled until the user enables one:

```bash
pptwise config set images.generators.grok.enabled true
pptwise config set images.generators.codex.enabled true
pptwise config set images.generators.antigravity.enabled true
```

For a deck project, fetched and generated pictures go into the deck's own `assets/` as `<asset_id>.jpg` with a `<asset_id>.json` sidecar, and move with the deck. For a single IR file they go under `.pptwise/<deck>/assets/`. Do not delete either directory to rerun a step because it holds selected assets. When validate warns that an `asset_id` is not defined, it names the path the picture belongs at. Without an available source, leave the asset missing and report it. Do not invent a photo or scrape an unsupported provider. Print required attribution in the terminal unless the license or user asks for on-slide credit.
