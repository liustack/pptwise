---
"@liustack/pptwise": patch
---

The thesis cover now prints the page's subheading. It sits under the title in the type of the report's fields, and the short gold rule and the fields move down only as far as it needs. Until now the cover left the subheading off the slide without a word from validate, render or audit. A subheading that cannot be set whole above four fields is reported as `content-dropped` and refused at export, never cut short.
