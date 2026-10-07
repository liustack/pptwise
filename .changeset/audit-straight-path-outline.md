---
"@liustack/pptwise": patch
---

`pptwise audit` grades text near a slanted panel against the panel's real outline. A filled path drawn in straight segments used to stand for its whole bounding box, so text on the page just past a slanted edge was graded as if it sat on the panel and reported as low contrast when it read fine.
