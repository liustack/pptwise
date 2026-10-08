---
"@liustack/pptwise": patch
---

`audit` no longer counts a cover, a chapter or an ending in a run of pages that repeat their lead component. A chapter that draws its photograph from an `image` component used to start a run with the photo pages after it, and a run could carry across a chapter. Only content pages make a run now.
