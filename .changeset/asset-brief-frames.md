---
"@liustack/pptwise": minor
---

`pptwise asset-brief` now briefs every picture frame a deck holds, not only `image` components: each item of an `image_grid`, both sides of an `image_compare`, the screen of a `device_mockup`, and each page's background picture, its own or the theme's default. Each item names its `kind`, the `field` that names the picture, its `slot` in a grid or comparison, and the `caption` or label set beside it. A full-slide background is noted as having the page's words set over it, and a device screen as wanting a real screenshot. A picture named in two frames on one page now reports each frame against its own component, still marked `shared`.
