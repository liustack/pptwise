---
"@liustack/pptwise": patch
---

`asset-brief` on a deck with no `image` component no longer prints `no image components found for theme "<id>"`, which read as if the theme drew no pictures. It now says no page holds an image component yet, that the theme does not decide this, and that `image_grid`, `image_compare`, `device_mockup` and page backgrounds are not listed. Every factory theme draws a `photo` page's picture.
