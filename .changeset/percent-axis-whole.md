---
"@liustack/pptwise": patch
---

A chart in percent whose values all lie between 0 and 100 now ends its axis at 100%. The headroom over the top value used to push a progress or share chart that reaches 100% out to a 150% tick no value can mean. A percent chart that passes 100, and a chart in any other unit, keep their headroom.
