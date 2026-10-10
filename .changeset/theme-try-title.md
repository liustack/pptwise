---
"@liustack/pptwise": minor
---

`pptwise theme try` can draw your own deck instead of the fixed English sample. Pass `--title` (and optionally `--subtitle`, `--lang zh|en`, or `--page <file>` with one content page) and each named theme, or `all` of them, draws that cover and one content page. Every page is written as its own SVG next to `manifest.json` and the contact sheet, so an agent or a chat host can show the pages directly. A page a theme cannot draw, such as a title its cover would cut, is left out of that theme with validate's reason. Without `--title` the command works as before.
