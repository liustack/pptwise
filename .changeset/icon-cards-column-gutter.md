---
"@liustack/pptwise": patch
---

`icon_cards` keeps two characters of space between one column's words and the next. Columns used to set their titles and sentences a few pixels apart, so four cards across a page read as one line of text. Each line is now set in its column less two characters of its own size, and a short title shrinks to stay on one line rather than break in two. Pages with four cards across set their type a little smaller than before.
