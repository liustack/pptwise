---
"@liustack/pptwise": patch
---

Chinese text no longer ends a paragraph on a single character. Where a card note, a bullet or a node label used to wrap as 植物染批次色差需沟通成 over 本, one more character now comes down with it, and a four-character label splits two and two. Line counts and line widths stay within what the box allowed before. A cycle node whose three-character label cannot be split that way widens into a capsule and keeps the label on one line.

Georgia body text is measured by the font's own letter widths instead of averages that ran about 20% wide, so a note that fits one line stays on one line (the timeline's and chevron band's last notes in the brief theme). Two chevron notes that share a baseline now keep at least 24px between them, and a decision tree steps its connector back when a condition such as 100% needs more room than half the gap gives. The `chevron_process` schema now says a note may take two lines, which is what the drawing has always given it.

A row of icon cards now tops every column at one line, so icons and titles align when the bodies differ in length. Numbered cards keep at least 8px between a card's edge and its words, and a staircase's lowest step keeps the same room under its number as beside it.
