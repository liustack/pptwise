---
"@liustack/pptwise": patch
---

A sentence a card had no line for at all (a numbered card's text or its short line, an icon card's text, a hub-and-spoke caption's description, a journey stage's action) now counts as a cut of that very field. It used to be marked on the card as a whole, which named no field, so the page kept its theme's layout with the sentence missing, validate passed it, and `audit` reported only a cut with no field. Now the page goes to the plainer layout when that layout draws every sentence, validate refuses it otherwise and names the card, and `audit` names the field and says it was left out.
