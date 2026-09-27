---
"@liustack/pptwise": patch
---

`pptwise themes` and `pptwise schema --kind` now judge installed packs the same way: every pack theme is fully compiled, and a pack is reported instead of listed when any theme fails, when it ships a factory preset's or a retired id, or when another installed pack ships the same theme id. A pack theme can no longer stand in for a preset in the `schema --kind` answer.
