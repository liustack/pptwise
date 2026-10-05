---
"@liustack/pptwise": patch
---

`pptwise schema` keeps the tag that rows, figures, cards, charts and pages share in `$defs` once, as `Tag`, and each use points at it beside its own description. The printed schema shrinks by about a tenth. Validation is unchanged.
