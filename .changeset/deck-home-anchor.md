---
"@liustack/pptwise": patch
---

A command run from inside a project's `.pptwise/` folder, such as from a deck in `.pptwise/decks/<name>/`, now works for the project that holds that folder. Its output goes to the project's `.pptwise/` rather than a new `.pptwise/` nested under the deck, `theme new` writes to the project's `themes/`, and the DSH plugin keeps its previews in the same place.
