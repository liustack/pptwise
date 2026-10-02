---
"@liustack/pptwise": minor
---

`pptwise audit` has a new `stepped-aside` finding. It names every page the theme's layout could not hold, which a plainer layout drew whole but with a heading that does not match the rest of the deck, and it makes the audit exit with code 1. `pptwise inspect --fit` already said so for one page at a time.
