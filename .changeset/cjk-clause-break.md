---
"@liustack/pptwise": patch
---

Chinese headings and other balanced Chinese lines now break after a comma or a full stop instead of one character past it. A cover title such as 「内需缩了两成，四季度怎么打」 used to split 「四」 from 「季度」 across the lines and now breaks after the comma. A two-line Chinese heading also evens its lines when a better place to break leaves them at least as even.
