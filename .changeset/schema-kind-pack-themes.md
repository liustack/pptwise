---
"@liustack/pptwise": patch
---

`pptwise schema --kind` without `--theme` now answers for installed content pack themes too, not only the presets. A pack that cannot be read is left out with a note on stderr instead of failing the query.
