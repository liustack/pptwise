---
"@liustack/pptwise": patch
---

Stop painting overflow ellipses. The renderer now clips text to its budget, stamps `data-truncated="1"`, and leaves the cut unmarked. Ending seat-cta wraps its CTA to two lines so the gallery verdict stays whole. Citation sources keep a visible gap before a URL, wider after CJK than after Latin. Campaign chips and tech statement arcs stay fully on the 1280×720 canvas.
