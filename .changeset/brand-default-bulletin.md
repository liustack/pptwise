---
"@liustack/pptwise": patch
---

`brand extract` without `--from` now repaints bulletin instead of brief. Across the brand colors we tested, bulletin is the business theme that keeps a brand color as given and on its face, while brief cannot set a bright brand color in its headings and leaves it to a short rule. Pass `--from brief` to keep the old choice.
