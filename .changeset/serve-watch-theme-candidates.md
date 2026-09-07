---
"@liustack/pptwise": patch
---

`pptwise serve` now watches every place the bound theme name could resolve to, not only the file the first build happened to find. A deck started on a factory preset picks up a workspace `themes/<name>.theme.json` created later, follows its edits and removal, and a spec rebound to another name moves the watch to that name's files before they exist. Candidates above the project root whose `themes/` does not exist yet are checked for existence every 2 seconds rather than watched, so a theme created there without a `pptwise.config.json` below it still refreshes the preview.
