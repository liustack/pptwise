---
"@liustack/pptwise": minor
---

`pptwise audit` now reports any text on a page that still prints an emphasis mark as asterisks, as `content-dropped` with kind `emphasis`, and exits with code 1. Before, a component that did not read `**…**` printed the asterisks and nothing said so.
