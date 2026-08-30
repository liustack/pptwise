# Images

Read this when declaring image assets, choosing `photo` or `evidence`, searching stock, or generating art.

## Choose the semantic move first

Use `kind: "photo"` when the image itself is the subject. Use `kind: "evidence"` when one exhibit supports one assertion. The bound theme menu chooses the face for that kind. Authors do not name image geometry.

Cover and chapter pages can use an asset background. The renderer applies the dedicated image-cover treatment with a dark readability scrim. Content and ending asset backgrounds retain the theme-toned scrim. Use a background image only when the page truly needs a full-canvas scene.

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

Fetched and generated files live under `.pptwise/<deck>/assets/` with sidecars. Do not delete that directory to rerun a step because it contains selected assets. Without an available source, leave the asset missing and report it. Do not invent a photo or scrape an unsupported provider. Print required attribution in the terminal unless the license or user asks for on-slide credit.
