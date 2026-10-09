---
"@liustack/pptwise": patch
---

The skill references and the IR and CLI docs now advise against a mid-tone page `background` color, about as light as `#777777` or `#6B7B8C`. On such a color neither white nor near-black text reaches the 4.5:1 body text needs, so `audit` reports `low-contrast`, and the fix is a lighter or darker background rather than anything about the text.
