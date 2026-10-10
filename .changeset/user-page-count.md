---
"@liustack/pptwise": patch
---

A deck can have the number of pages the user asked for. `spec validate` used to reject a spec whose page count fell outside the range its pacing usually spans (dense 8 to 30, balanced 6 to 24, spacious 4 to 16), so a four-page weekly brief failed and agents added pages to get past it. The range is now a warning that says to keep a count the user gave. A one-page spec, which cannot hold both a cover and an ending, now says the shortest decks are two or three pages and to ask the user instead of adding pages. The skill says the spec has exactly the page count the user named.
