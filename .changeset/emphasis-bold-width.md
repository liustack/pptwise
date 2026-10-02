---
"@liustack/pptwise": patch
---

A `**…**` run in a callout is now measured at the bold weight it is drawn in. Before, the highlight under it stopped short of the bold words and the text after it started on top of them, most visibly with Latin letters and figures. Callout lines now wrap to their drawn width, so a line ending in bold words stays inside the panel. Paragraphs and bullets place their highlight from the same face as their text.
