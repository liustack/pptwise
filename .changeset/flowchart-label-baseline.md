---
"@liustack/pptwise": patch
---

A `flowchart`'s node and edge labels sit centered in the exported deck, the way the preview shows them. They were centered with an SVG attribute the export does not read, so in PowerPoint every label rose by about a third of its height: node text sat high in its box, and in a long chain squeezed to the smallest type the tops of the characters crossed the node's edge onto the incoming arrow. The labels now state their baseline directly, so the preview and the deck agree.
