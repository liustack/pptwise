---
"@liustack/pptwise": patch
---

`schema --kind` and `inspect` list what a kind's own face takes again whenever the bound theme offers the kind, instead of every component a stand-in's face takes. A page holding something its kind's face does not take is still drawn, as the nearest kind whose face does, and validate now warns about it, naming what the kind's own face takes. A kind the theme does not offer still lists its stand-ins' components with `drawnAs`.
