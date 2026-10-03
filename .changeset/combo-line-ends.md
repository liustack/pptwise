---
"@liustack/pptwise": patch
---

A marked line in a combo chart now prints its first and last values when the values between them would land on taller bars. It used to print none at all, so a line climbing from 45% to 96% under the cash-flow bars said nothing about where it started or ended. When every value has room, every value still prints.
