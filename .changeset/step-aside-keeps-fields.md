---
"@liustack/pptwise": patch
---

A content page whose theme layout could not hold its body no longer loses its own fields when the plainer step-aside layout takes over. That layout now sets the page's `kicker` over the heading and its page `tag` beside it, except on the museum and runway themes, whose running head already prints the kicker. A page that carries a stamp, a ballot, a course `stage`, `years` or header `fields`, which the plainer layout has no place for, keeps the theme's layout instead, and what that layout could not hold is reported as `content-dropped` and refused at export, as before. Until now such a page went to the plainer layout and lost those fields without a word from validate, audit or render. The same rule now decides a page whose layout cut its heading or other hard text: a page with a kicker or page tag can go to the plainer layout too.
