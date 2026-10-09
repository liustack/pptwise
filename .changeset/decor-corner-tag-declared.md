---
"@liustack/pptwise": patch
---

A page's `decor` corner tag that has to give way to the layout is now reported instead of vanishing. The tag sits in the top right corner behind the page's own content, and where a layout draws something there (the blackboard's frame on every lecture page, the photograph on the photo pages of brief, bulletin, ledger and swiss, ink's chapter) the tag and its words were removed without a word from validate, render or audit. They are still not painted over the layout, and the page is now reported as `content-dropped` and refused at export, so the author can remove the tag or move its words into the page.
