---
"@liustack/pptwise": minor
---

`pptwise images fetch` and `pptwise images generate` pin a deck project's pictures into the deck's own `assets/`, with their provenance sidecar beside them, so a deck moved to another folder keeps its pictures instead of drawing empty frames. A single IR file still keeps its pictures under `.pptwise/<deck>/assets/`. Pictures pinned there before for a deck project still count while the deck stays put, and `images list` shows them. A `.json` file in a deck's `assets/` is read as a sidecar, not a picture. When a page names an `asset_id` no file supplies, validate now says where to put the picture, such as `decks/q3/assets/hero.jpg`.
