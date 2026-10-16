# Images

Read this when deciding which pages get pictures and where they come from, declaring image assets, choosing `photo` or `evidence`, searching stock, taking a picture from the web, or generating art.

## Which pages get a picture

Give the deck pictures without being asked, unless the user said not to. A deck of text alone reads as a draft. The spec holds at least one `photo` page, more when the material has places, products, people, or work to show (see `spec.md`). Every factory theme draws a `photo` page's picture, so keep the theme picked for the occasion.

| frame | when it takes a picture |
| --- | --- |
| `photo` page | Always: without one the page is an empty frame. |
| Cover | When `pptwise inspect deck-dir/ --page <cover id>` lists the photograph recipe or says the cover is drawn over its background picture. It goes in as the page's background, `"background": { "kind": "asset", "asset_id": "cover" }`. A theme whose cover offers no photograph keeps its cover plain. |
| Chapter | When its `inspect` lists a photograph recipe: one picture per chapter that names the part it opens, a place, an object, a scene. Keep the chapters of one deck alike: all with a picture or none. |
| Content background | Only when the page needs a whole scene behind a few words: a statement, a quote, a single figure. Never behind a dense page. |
| `evidence`, `image_grid`, `image_compare`, `device_mockup` | When the picture is the proof: the product, the place, the before and after, the running software. A screenshot goes in `device_mockup` and is never generated. |
| Any other page | Only where the picture is the point, never to fill space. A diagram, chart or list page takes none. |

Pictures the user supplied come first. Source pictures once a batch of pages is written and before building it: write the page with its `asset_id`, run the brief, find the picture, pin it, then build. A picture no source can supply stays missing: the build warns about it, and you tell the user which page still needs one.

## Where pictures come from

Plan them while gathering materials, in the `Pictures` section of `deck-dir/materials.md` (the reference `materials.md` gives its shape), and take them in this order, within the picture direction the user approved with the outline:

1. **The user's and the project's own.** Files the user handed over, and the pictures and logo `pptwise brand scan` found. Pin each with `images add`. With no network, these are the only source: use them, and leave the rest missing.
2. **Stock search.** `images search`, below. It works with no key.
3. **The web**, when stock has nothing that fits: a museum or archive collection, Wikimedia Commons, a government or agency library, or the subject's own press page. Search the web yourself and take only a picture whose page says it may be used, then pin it with `images add`.
4. **A local generator**, when the user has enabled one (`pptwise doctor` lists them): `images generate`, for an illustration or a scene no photograph shows. Never for a real person, product, place, or interface.

## Choose the semantic move first

Use `kind: "photo"` when the image itself is the subject. Use `kind: "evidence"` when one exhibit supports one assertion. The bound theme menu chooses the face for that kind. Authors do not name image geometry.

Cover and chapter pages can use an asset background. The renderer applies the dedicated image-cover treatment with a dark readability scrim. Content and ending asset backgrounds retain the theme-toned scrim.

A `color` background should be clearly light or clearly dark. On a mid-tone such as `#777777` or `#6B7B8C`, white and near-black text both miss the 4.5:1 body text needs. The renderer sets such text in pure black, which reads, shades cards to the side where that black still reads, and sets a cover's top-left mark against the band it stands on. Should `audit` still report `low-contrast`, pick a lighter or darker color.

Declare each image once in `assets.images`, then reference it by `asset_id` from `image`, `image_grid`, `image_compare`, or `device_mockup`. Check every key. `validate` reports a dangling reference, and an unresolved source cannot become a real image.

`image_side: "left"` or `"right"` is an optional preference for a face that supports a side image. Other faces ignore no authoring geometry because none is supplied.

## Brief before sourcing

Run the real renderer before sourcing any missing asset:

```bash
pptwise asset-brief <target>
```

The brief lists every picture frame the pages hold: each `image`, every item of an `image_grid`, both sides of an `image_compare`, the screen of a `device_mockup`, and each page's background picture. For each it reports the actual frame, the crop, the safe zone, a suggested pixel size, the theme palette, and a paste-ready prompt, plus the caption or label the deck sets beside it. Match the reported aspect ratio and palette. A background whose frame fills the slide has the page's words set over it: pick a picture with a calm area behind the text. A frame marked as not drawn is one the page's layout leaves out, such as a background the face does not draw. When it lists nothing, no page holds a picture yet. The theme is not the cause.

## Stock photos

Search works with no setup. With no key configured, `images search` asks Openverse, an index of CC0 and public-domain photos, anonymously. Its daily quota is small and its picks are uneven. A free Pexels key, or a Pixabay key, gives larger and better curated results, and once set it is searched first. Setting a key is the user's call: offer it when Openverse comes up short or answers HTTP 429, and never hold a deck up waiting for one. How to set each one is under "Setting up the sources" below.

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

## Pictures from the project and the web

`images add` pins a file or a picture at an https address, with a sidecar that records where it came from:

```bash
pptwise images add public/hero.jpg --deck <dir> --as cover
pptwise images add https://upload.wikimedia.org/wikipedia/commons/<path>.jpg --deck <dir> --as river --license pdm --source https://commons.wikimedia.org/wiki/File:<name>.jpg --author "<author>"
```

A file is the user's own unless you say otherwise. A picture from the web goes in only on the terms its own page states, and `--license` names them:

| `--license` | the source page says | credit |
| --- | --- | --- |
| `cc0` | CC0, no rights reserved | none needed |
| `pdm` | public domain, or the Public Domain Mark | none needed |
| `cc-by`, `cc-by-4.0` | Creative Commons Attribution, without SA, NC or ND | the author, the license, and the page |
| `press` | the subject's own press or newsroom material, offered for coverage | "Courtesy of" the owner |
| `own` | the user's or their organization's own picture | none |

Pass the page that shows the picture and states its license as `--source`, and the author or owner it names as `--author` (required for `cc-by` and `press`). The command refuses share-alike, non-commercial, and no-derivatives terms, and any it does not know. A page that states no license, a search engine's image results, a news photo, a stock site's watermarked preview, or a social media post is no source: find another picture. Use press material only to show its own subject. Credit is printed in the terminal and listed by `images list`: name it to the user when you deliver, and put it on a slide only when the license or the user asks.

A PNG stays a PNG, so a logo keeps its transparency. An SVG logo is drawn into a PNG. Set the deck's logo with `"brand": { "logo_asset_id": "logo" }` in the spec.

## Generated images

```bash
pptwise images generate --deck <dir> --as <asset_id>
```

It draws with the first enabled generator in the configured order and takes the prompt from `asset-brief` unless you pass `--prompt`. Generators are off until the user turns one on (see below). Never enable one yourself.

A generator keeps its login and sessions in its own home folder (such as `~/.codex` or `~/.grok`) and writes there before it draws anything. In an agent sandbox whose home folder is read-only it fails with `Operation not permitted`, `EPERM`, or `FS_PERMISSION_DENIED`, and `images generate` says so by name. Run the command outside the sandbox, or ask the user to let that generator write its home folder in the host's sandbox settings. Never copy, move, or redirect any login or credential file to a writable place to get around the error.

## Setting up the sources

Setting up a source is the user's decision, done once on their machine. Tell them the command and let them run it. `pptwise doctor` shows what is set: each stock provider's key and where it came from (never the key itself), and each generator, whether it is installed and whether it is on.

| source | setup | without it |
| --- | --- | --- |
| Openverse | none. A client id and secret raise the quota: `pptwise config set openverse.clientId`, `pptwise config set openverse.clientSecret` | searched anonymously, small daily quota |
| Pexels | a free key: `pptwise config set pexels.apiKey` | skipped |
| Pixabay | a free key: `pptwise config set pixabay.apiKey` | skipped |

Run without a value, `config set` asks for the key with a hidden prompt, so it never lands in the shell history. Keys can also come from the environment: `PPTWISE_PEXELS_API_KEY`, `PPTWISE_PIXABAY_API_KEY`, `PPTWISE_OPENVERSE_CLIENT_ID`, and `PPTWISE_OPENVERSE_CLIENT_SECRET`. The config file wins: a provider named in the file takes all its keys from the file, and its environment variables are ignored.

The local generators are grok, codex, and antigravity, the command-line agents of those names. Each must be installed and logged in on its own. They are off by default because PPTwise runs each one with its permission checks turned off (grok `--permission-mode bypassPermissions`, codex `--dangerously-bypass-approvals-and-sandbox`, antigravity `--dangerously-skip-permissions`), so it acts without asking anyone. Only the user turns one on:

```bash
pptwise config set images.generators.grok.enabled true
pptwise config set images.generators.codex.enabled true
pptwise config set images.generators.antigravity.enabled true
```

They are tried in the order grok, codex, antigravity, and each gets 180 seconds. `pptwise config set images.generators.order codex,grok` changes the order (a generator left out of it is never tried), and `pptwise config set images.generators.timeoutMs 300000` the time each gets.

## Where pinned pictures live

For a deck project, fetched, added, and generated pictures go into the deck's own `assets/` as `<asset_id>.jpg` (or `.png`) with a `<asset_id>.json` sidecar, and move with the deck. For a single IR file they go under `.pptwise/<deck>/assets/`. Do not delete either directory to rerun a step because it holds selected assets. When validate warns that an `asset_id` is not defined, it names the path the picture belongs at. Without an available source, leave the asset missing and report it. Do not invent a photo.
