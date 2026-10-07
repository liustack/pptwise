---
"@liustack/pptwise": patch
---

`pptwise audit` no longer reports a people card's initials as low contrast. The contrast check measured every line of text as if it had descenders, a quarter of its height below the baseline, and under wide initials such as "MC" the corners of that band fell outside the round badge onto the card around it. A line now reaches below its baseline only when one of its characters does, so text that sits wholly on a badge or band is graded against it, while letters that do hang past an edge are still reported.
