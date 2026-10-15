---
"@liustack/pptwise": patch
---

`audit`, and so `build`, now report an `overlap` when the milestones of a timeline laid across the page stand less than two characters apart on one row. Their words then read as one line, and the area check could not see it, since the labels never touch. The build holds back the `.pptx` until it is fixed.
