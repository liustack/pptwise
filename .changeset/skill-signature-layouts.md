---
"@liustack/pptwise": patch
---

The pptwise skill reads a page's signature layouts in `inspect` before writing it, and after the first full build rewrites the pages drawn plain to their recipe where the content holds it, never adding content to fit.
