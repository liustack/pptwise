---
"@liustack/pptwise": patch
---

The space beside a marked run now survives in every renderer. A `**…**` run set in the theme's emphasis colour is drawn as its own text span, and `rsvg-convert` dropped the blank at the edge of each span, so "Added worldwide: **112 GW**, up 48%" previewed as "worldwide:112 GW". Such spans now carry `xml:space="preserve"`. Browsers and the PowerPoint export already kept the space and draw the same text as before.
