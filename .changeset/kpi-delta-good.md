---
"@liustack/pptwise": minor
---

A `kpi_cards` item can say whether its move is good news with `delta_good`. A rise is still drawn in the theme's success colour and a fall in its danger colour by default. `"delta_good": true` draws the move as good news whichever way it went, such as a delivery time that fell, and `false` as bad news, such as a return rate that rose. The kpi cards, the bento cards, the panel and ticker figures, the four-column statistics page and the paired figures with their change capsules all read it. `delta_good` needs a `delta` of `up` or `down`, and validate says so when it has none.
