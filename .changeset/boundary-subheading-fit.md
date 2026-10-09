---
"@liustack/pptwise": minor
---

`validate` now refuses a cover, chapter or ending subheading the bound face would cut or leave off, and quotes how much of it the face holds on that page. Such a subheading used to pass validate and only show up later as a cut line in the audit or a refused export. The check draws the page with its face, so the room it reports moves with whatever else the page carries.
