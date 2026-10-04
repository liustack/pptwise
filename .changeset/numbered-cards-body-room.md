---
"@liustack/pptwise": patch
---

Numbered cards keep their text when there is room for it. Five cards in a short band used to print their titles alone, because a card under 68px dropped its text even when one line of it fit. A card now holds as many lines of its text as its height clears, and a card's `sub` prints whenever the card holds its title.
