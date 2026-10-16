---
"@liustack/pptwise": patch
---

`audit` and `build` now report icon cards whose words stand closer to the next card's than a gutter (a character and a quarter for Chinese, two characters for a line with Latin letters), as they already did for timeline milestones. People, product and quote cards and matrix cells are checked the same way on ruled themes, where they draw no card behind their words.
