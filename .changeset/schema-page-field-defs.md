---
"@liustack/pptwise": patch
---

The printed IR schema keeps the page fields only some faces draw (`kicker`, `fields`, `stamp`, `stage`) once under `$defs`, as `Kicker`, `Fields`, `Stamp` and `Stage`, with every page type pointing at them. Validation is unchanged.
