---
"@liustack/pptwise": patch
---

A Chinese line no longer breaks inside a power figure's unit. 「1.58 亿千瓦」 kept 「1.58 亿」 on one line and sent 「千瓦」 to the next, because only a magnitude before a counted thing (「亿元」) was held together. A magnitude now stays with a magnitude after it (「亿千瓦」, 「万千瓦」), 「千瓦」 and 「千瓦时」 stay whole, and a figure stays with 「瓦」.
