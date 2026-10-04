---
"@liustack/pptwise": patch
---

`pptwise audit` reports a block that runs over the page's source line. A layout that gave its body more height than the room above the source passed every check while a closing note's panel covered the source. The audit now compares each block with the source line under it and reports an `overlap` finding naming the block.
