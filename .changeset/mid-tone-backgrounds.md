---
"@liustack/pptwise": patch
---

The skill references and the IR and CLI docs now advise against a mid-tone page `background` color, about as light as `#777777` or `#6B7B8C`. Text on a card or band shaded from such a color can fall just short of the 4.5:1 body text needs, so `audit` reports `low-contrast`, and the fix is a lighter or darker background rather than anything about the text.
