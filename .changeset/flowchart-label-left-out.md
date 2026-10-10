---
"@liustack/pptwise": patch
---

A flowchart node too narrow to set any of its label used to draw an empty, cut line in its place, which named no field, so the page kept its theme's layout with the label gone and validate passed it. The node now marks its label left out, the page goes to the plainer layout when that layout draws every label, and validate refuses it otherwise, naming the node.
