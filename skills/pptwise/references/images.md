# Images

Read this when deciding which pages get pictures, declaring image assets, choosing `photo` or `evidence`, searching stock, or generating art.

## Which pages get a picture

Give the deck pictures without being asked, unless the user said not to. The spec holds at least one `photo` page, more when the material has places, products, people, or work to show (see `spec.md`). Every `photo` page gets a picture: without it the page is an empty frame. Every factory theme draws it, so keep the theme picked for the occasion. The cover gets one when `pptwise inspect deck-dir/ --page <cover id>` lists the photograph recipe or says the cover is drawn over its background picture. It goes in as the page's background, `"background": { "kind": "asset", "asset_id": "cover" }`, and fills the whole slide, so search landscape for it. A theme whose cover offers no photograph keeps its cover plain. Other pages get a picture only where the picture is the point (a place, a product, a person, a photo that is the evidence), never to fill space. Pictures the user supplied come first.

Source pictures once a batch of pages is written and before building it: write the page with its `asset_id`, run the brief, search, look, fetch, then build. A picture no source can supply stays missing: the build warns about it, and you tell the user which page still needs one.

## Choose the semantic move first

Use `kind: "photo"` when the image itself is the subject. Use `kind: "evidence"` when one exhibit supports one assertion. The bound theme menu chooses the face for that kind. Authors do not name image geometry.

Cover and chapter pages can use an asset background. The renderer applies the dedicated image-cover treatment with a dark readability scrim. Content and ending asset backgrounds retain the theme-toned scrim. On a content or ending page, use a background image only when the page truly needs a full-canvas scene.

A `color` background should be clearly light or clearly dark. On a mid-tone such as `#777777` or `#6B7B8C`, white and near-black text both miss the 4.5:1 body text needs. The renderer sets such text in pure black, which reads, shades cards to the side where that black still reads, and sets a cover's top-left mark against the band it stands on. Should `audit` still report `low-contrast`, pick a lighter or darker color.

Declare each image once in `assets.images`, then reference it by `asset_id` from `image`, `image_grid`, `image_compare`, or `device_mockup`. Check every key. `validate` reports a dangling reference, and an unresolved source cannot become a real image.

`image_side: "left"` or `"right"` is an optional preference for a face that supports a side image. Other faces ignore no authoring geometry because none is supplied.

## Brief before sourcing

Run the real renderer before sourcing any missing asset:

```bash
pptwise asset-brief <target>
```

The brief reports the actual frame, crop mode, safe zone, suggested pixel size, theme palette, and a paste-ready prompt. Match the reported aspect ratio and palette. It lists every `image` component the pages hold. `image_grid`, `image_compare`, `device_mockup` and page backgrounds are not in it: a background fills the whole 16:9 slide. When it reports no image component, no page holds one yet. The theme is not the cause.

## Stock photos

Search works with no setup. With no key configured, `images search` asks Openverse, an index of CC0 and public-domain photos, anonymously. Its daily quota is small and its picks are uneven. A free Pexels key, or a Pixabay key, gives larger and better curated results, and once set it is searched first. Setting a key is the user's call: offer it when Openverse comes up short or answers HTTP 429, and never hold a deck up waiting for one.

```bash
pptwise config set pexels.apiKey
pptwise config set pixabay.apiKey
```

Use a short concrete English query of two to four words, such as `office desk` or `wind farm`. Keep mood, quality claims, and negative keywords out of the query. Pass the orientation the brief reported, and `--sheet`:

```bash
pptwise images search "wind farm" --orientation landscape --sheet
```

Results are numbered, each with its size, the library's own description of the picture, author, and license. `--sheet` also draws every thumbnail into one picture under the same numbers and prints its path after `contact sheet:`. Read the descriptions to drop plain misses, then open the sheet and look at it. Choose the number whose picture fits the page: its subject, the frame's shape, room for the text that sits on it, and the theme's palette. Never take the first result without looking. When nothing fits, search again with other words. Where a `pptwise_images` tool exists, search with it instead: its result shows you the same sheet.

Fetch the id with the number you chose, under the `asset_id` the page names:

```bash
pptwise images fetch openverse:<id> --deck <dir> --as hero
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

A generator keeps its login and sessions in its own home folder (such as `~/.codex` or `~/.grok`) and writes there before it draws anything. In an agent sandbox whose home folder is read-only it fails with `Operation not permitted`, `EPERM`, or `FS_PERMISSION_DENIED`, and `images generate` says so by name. Run the command outside the sandbox, or ask the user to let that generator write its home folder in the host's sandbox settings. Never copy, move, or redirect any login or credential file to a writable place to get around the error.

For a deck project, fetched and generated pictures go into the deck's own `assets/` as `<asset_id>.jpg` with a `<asset_id>.json` sidecar, and move with the deck. For a single IR file they go under `.pptwise/<deck>/assets/`. Do not delete either directory to rerun a step because it holds selected assets. When validate warns that an `asset_id` is not defined, it names the path the picture belongs at. Without an available source, leave the asset missing and report it. Do not invent a photo or scrape an unsupported provider. Print required attribution in the terminal unless the license or user asks for on-slide credit.
