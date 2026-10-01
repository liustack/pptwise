---
"@liustack/pptwise": minor
---

Brief has a new look. The corner mark in the top left is gone. Content pages now open with a navy heading over a fine rule, and with `branding: "full"` they close with a footer that names the organization and the confidentiality. The cover, statement, chapter and ending pages are redrawn. Points, list, comparison, process, data and hierarchy pages use the new `gauge-sheet` face, which chooses a layout from the page's content. Evidence pages use `gauge-exhibit` and fact pages use `gauge-figure`. If you copied brief into your own theme file, its menu still names the old faces and keeps working as before.

Authors can now mark the one thing a page is about:

- `emphasis` on a run of waterfall bars, with an optional `emphasis_label` drawn as a bracket over them
- `emphasis` on one chart series
- `recommended` on a comparison column
- `emphasis` on one roadmap item

The marked item takes the theme's highlight and the rest steps back. Comparison cells now read `**…**` as emphasis instead of printing the asterisks.

When every level of a waterfall sits well above zero, the axis now starts from a round floor below the lowest level, and break marks on the total bars show that the axis is cut. The small steps between the totals are now readable.
