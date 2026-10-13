---
"@liustack/pptwise": patch
---

`pptwise inspect <deck> --page <id>` lists only the page file keys this page's face places, and says what the easily misread ones hold: `fields` is a form's header lines, not a list of fields. The line now reads `page file keys (the top-level keys of pages/<id>.json)`.
