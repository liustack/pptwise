---
"@liustack/pptwise": patch
---

`pptwise schema --kind --theme` now resolves the theme name the way `validate` does: the deck directory first (`theme.json`, `<name>.theme.json`), then workspace `themes/`, then the presets. The deck directory is the new `--deck <dir>` option, or the cwd when it holds `deck.spec.json` or a deck-local file for that name (`theme.json`, `<name>.theme.json`, `<name>.json`), the same directory `validate deck.json` reads a bare IR's theme from. A deck-local theme with a custom id, or one that reuses a preset id with a different menu, answers the kind query with the same menu validate applies.
