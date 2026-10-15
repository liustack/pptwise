---
"@liustack/pptwise": patch
---

A deck kept in `.pptwise/decks/<name>/` now builds to `.pptwise/<name>/` instead of `.pptwise/pptwise-decks-<name>/`. No deck output takes the names `decks` or `themes` any more, and a deck whose output folder would be another deck's sources is refused with a message that names the clash, instead of reading that deck's files and clearing its `.pptx`.
