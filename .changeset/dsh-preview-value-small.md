---
"@liustack/pptwise": patch
---

In DSH's PTC (Code Mode), `pptwise_preview` no longer returns every page's SVG to the model's program. Its result now carries the preview id, title, page count, finding count and draft flag, and the preview card loads the pages from the plugin's own route, as it already did in Code Mode.
