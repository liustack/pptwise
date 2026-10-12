---
"@liustack/pptwise": minor
---

Artifacts always go to `.pptwise/` under the project root, the directory holding `pptwise.config.json` or the current directory without one. The `outDir` setting is gone, and a leftover `.pptpress/` or `.pptfast/` is no longer reused. A `pptwise.config.json` that still sets `outDir` is rejected with the key named. `pptwise doctor` stops reporting a configured output folder.
