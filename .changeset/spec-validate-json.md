---
"@liustack/pptwise": minor
---

`pptwise spec validate --json` prints the result as JSON: for a valid spec, the pages in order with their number, id, type, kind, heading and summary, plus the theme, narrative and warnings. For an invalid one, every error with its path, and exit code 1. An agent can now show the user the outline page by page straight from the checked spec.
