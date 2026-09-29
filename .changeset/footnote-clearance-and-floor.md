---
"@liustack/pptwise": patch
---

The bento panel page sets its footnote the same distance above the footer line as every other page, where it used to sit 8px from the rule. A line of text asked for at a size below the 16px floor now starts at the floor and is only shortened when it really does not fit there, where before it was always reported as cut even when it was drawn whole.
