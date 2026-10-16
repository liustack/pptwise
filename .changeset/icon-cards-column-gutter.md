---
"@liustack/pptwise": patch
---

`icon_cards` keeps a clear gap between one column's words and the next. Columns used to set their titles and sentences a few pixels apart, so four cards across a page read as one line of text. Each line is now set in its column less a gutter of its own size: a character and a quarter for Chinese, two characters for a line with Latin letters in it. The type keeps the size it had and takes the gutter in an extra line where the row has the height, with a smaller icon if need be. A Chinese title that wraps breaks between words, and a title comes down only as far as its longest English word needs to stay whole. Type is set smaller only when the row is too short for those lines.
