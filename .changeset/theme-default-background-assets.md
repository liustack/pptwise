---
"@liustack/pptwise": patch
---

Export and validate now see an asset a theme's `style.defaultBackgrounds` refers to. A page that sets no `background` of its own draws the theme default, so that asset is fetched and decoded before export like any page background, and a corrupt one is refused with the pages it would have covered. Validate warns on a theme default background whose `asset_id` the deck does not declare.
