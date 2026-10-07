---
"@liustack/pptwise": patch
---

A `hub_spoke` badge number sits centered in its disc in the exported deck, and a `concept_equation`'s plus and equals signs sit on the line they join. Both were centered with an SVG attribute the export does not read, so in PowerPoint they rose by about a third of their height above where the preview showed them. They now state their baseline directly, so the preview and the deck agree.
