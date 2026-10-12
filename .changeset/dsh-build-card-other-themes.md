---
"@liustack/pptwise": minor
---

The DSH build card now shows the deck in other themes when the build drew them: a numbered column per theme under the deck's pages, the same way the theme wall draws them. Clicking one starts the message that asks for that theme ("Switch to Memo", 「换成 Memo」) in the composer, for the user to send or change. `pptwise_build` tells the model which themes are shown, not to stop for them, and that switching is setting `theme` in `deck.spec.json` and building again.
