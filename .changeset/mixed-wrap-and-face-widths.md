---
"@liustack/pptwise": patch
---

A Chinese clause now breaks between any two characters even when the sentence has spaces elsewhere, as in 镜像构建从 Jenkins 迁到 GitHub Actions，平均构建时长…. It used to move to the next line whole, which could leave a short English word alone on a line or end a line early with room to spare. English words, numbers and their punctuation are still never split.

Text set in Microsoft YaHei, SimSun or KaiTi at regular weight is now measured by each font's own letter widths, as Georgia already is. English in these fonts was priced 9 to 16% too wide, so it wrapped early, while YaHei digits and the percent sign were priced too narrow. Sankey node labels are measured in the font they are drawn in, so a label no longer runs past its node's box. A unit beside a number (a staircase step, a decision tree outcome, a from/to row) keeps its full room when its width is known exactly, instead of giving up a third of it.

The `numbered_cards` schema notes and design story now describe the drawing as it is: one column of numbered cards beside a disc that counts them.
