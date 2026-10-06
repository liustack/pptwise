---
"@liustack/pptwise": patch
---

Icon cards with tags keep their text. The tag row under each icon could take the height a row of cards had for its text, and then no line of any card's text was drawn while the audit reported a cut title. The icons now shrink first to make room, and when even the smallest icon leaves a card no line of its text the cards decline the space, so the page finds a taller one or the export says what it lost. A text cut short is reported by its own opening words.
