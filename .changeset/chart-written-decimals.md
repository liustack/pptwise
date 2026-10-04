---
"@liustack/pptwise": patch
---

Charts print a whole value with the decimals its neighbours carry. A deck's JSON keeps no trailing zero, so an author's 1.0 reached the chart as 1 and printed as 「1」 beside 「1.3」. A whole value now prints with the fewest decimals the chart's other values carry, 「1.0」, and a value with a fraction keeps its own, so 4.4 beside 5.66 stays 「4.4」 on the hand-set plots too, where it used to print 「4.40」.
