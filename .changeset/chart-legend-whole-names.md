---
"@liustack/pptwise": patch
---

A chart legend sets every series name whole. Each name used to get 160px whatever room the header row had, about eighteen Latin characters, and lost the rest. A name now takes the width it needs, and when one row cannot hold every name the legend runs onto a second or third row, moving the plot down to make room. Only a name wider than the whole chart is cut, and it is still reported as cut. Names that do not fit in three rows are declared and the export stops, as before.
