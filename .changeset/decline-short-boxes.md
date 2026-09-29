---
"@liustack/pptwise": patch
---

A comparison table, matrix, timeline, KPI card row, chevron process, progress donut row, icon card row, set of steps or cycle that is given less height than its smallest form now declines the box, marking the whole component as dropped so the layout can find it more room or the export stops, instead of drawing its last row, card or line below the box. Before declining, each still gives back what it can: a side-by-side timeline gives back description lines and then a title's second line, and a cycle gives back description lines, each cut marked. A comparison table no longer keeps a row it has no room for, and a stacked timeline no longer keeps a milestone it has no room for. Components given the height they ask for render exactly as before.
