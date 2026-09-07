---
"@liustack/pptwise": patch
---

Export now fetches, decodes, and re-encodes only the image assets a page actually uses. An entry in `assets.images` that no background, component, or brand logo refers to used to be downloaded anyway, and a dead URL among those failed the whole export. It is now left in place untouched. Validate and export read one shared list of asset-bearing fields, so the dangling `asset_id` warning now also covers `logo_wall` and `product_cards` items.
