---
"@liustack/pptwise": minor
---

On DeepSeek Harness a new `pptwise_outline` tool checks the deck's spec and shows its outline as a card in the conversation: one row per page with its number, page type, heading and what the page says. The skill calls it once the spec validates, before any page is written, and asks the user to confirm through the harness's own question panel unless they said to go ahead. Card words follow the language DSH is set to.
