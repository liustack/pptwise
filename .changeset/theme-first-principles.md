---
"@liustack/pptwise": minor
---

The theme model is rebuilt from first principles. A deck is content bound to one theme: every content page declares a `kind` from an eleven-word vocabulary (points, list, comparison, process, data, photo, statement, quote, fact, evidence, hierarchy), and the bound theme's menu maps each kind — plus cover, chapter, and ending — to exactly one face. Rendering is a pure lookup: no seed, no weighted selection, no per-page layout or arrangement fields, and the same deck always renders the same bytes.

Themes are workspace assets. `theme` is required (no silent default), resolved by name through deck directory, workspace `themes/`, then factory presets. `pptwise theme new` copies a preset into an editable file, `pptwise theme fork` re-derives a complete palette around new anchor colors through the contrast gates, and `pptwise theme try` renders a fitting-room contact sheet. Theme files publish atomically and exclusively (`--force` to overwrite). `--theme`, `--theme-file`, `--style`, partial style/brand overrides, the migrate tooling, and every v4-era compatibility path are removed; retired fields fail with messages that state the current format.
