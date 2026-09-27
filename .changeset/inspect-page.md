---
"@liustack/pptwise": minor
---

`pptwise inspect <deck> --page <id>` shows one page's fill contract: the fields the spec locked, the fields the page file may carry, the components the bound theme's face draws on that page, the counts `validate` holds it to, and `validate`'s findings on it. It reads only that page's file, so an unfinished or broken page elsewhere in the deck does not change its answer. `--component <type>` expands one component for the page with its story, its limits there, and its schema. `--fit` draws the page and reports whether render would drop any of its content, with the same verdict render's content-drop gate gives. The skill now fills pages through this command, and the agentic benchmark allows it.
