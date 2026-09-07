---
"@liustack/pptwise": patch
---

`pptwise schema --kind` now prints a valid JSON Schema when the bound face takes no component: `not: {}` with a description, instead of an empty `oneOf` that Draft 2020-12 validators refuse to compile.
