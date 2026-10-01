---
"@liustack/pptwise": patch
---

Text in the exported .pptx now sits where the preview draws it. Before this change every line landed a little low in PowerPoint, about 4px for a 36px heading and over 20px for a large figure, so a rule drawn under big numbers could cut into them. Text boxes now use each font's own first baseline, measured in PowerPoint.

A unit set apart from its number, such as "$154M a year", keeps its gap. A superscript keeps its size and position.
