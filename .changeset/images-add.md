---
"@liustack/pptwise": minor
---

`pptwise images add <url|file> --deck <dir> --as <asset_id>` pins a picture the stock search did not supply: a file of the project or the user's, or a picture found on the web. A picture from the web needs the license its own page states (`--license cc0|pdm|cc-by[-<version>]|press|own`), that page (`--source`), and, for `cc-by` and `press`, its author (`--author`). Share-alike, non-commercial and no-derivatives pictures are refused. The sidecar records where the picture came from and its credit line, which the command prints. A PNG stays a PNG, an SVG is drawn into a PNG, and other formats become JPEG.
