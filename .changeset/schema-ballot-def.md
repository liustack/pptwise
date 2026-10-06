---
"@liustack/pptwise": patch
---

`pptwise schema` keeps a page's ballot in `$defs` once, as `Ballot`, and each page type points at it beside its own description. Validation is unchanged.
