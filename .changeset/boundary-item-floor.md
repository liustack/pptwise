---
"@liustack/pptwise": patch
---

`validate` now refuses a block with fewer items than its cover, chapter or ending face draws, and names the floor: a ticker cover with one figure, a line-up chapter with two looks, a year-scale cover with one year. Such a block used to pass validate and be left off the page, with only the export saying so.
