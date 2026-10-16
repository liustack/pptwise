---
"@liustack/pptwise": patch
---

`icon_cards` keeps a clear gap between one column's words and the next. Columns used to set their titles and sentences a few pixels apart, so four cards across a page read as one line of text. Each line is now set in its column less a gutter of its own size: a character and a quarter for Chinese, two characters for a line with Latin letters in it. A short title shrinks to stay on one line rather than break in two, and pages with four cards across set their type a little smaller than before.
