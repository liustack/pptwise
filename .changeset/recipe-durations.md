---
"@liustack/pptwise": patch
---

terminal's `log` and `span` recipes now say what their figures must be: each value a length of time as a console prints it (`2h52m`, `22h 06m`), with no unit, icon, delta, tag, source or note on an item. A page with figures such as 「16 个月」 used to be told it had the recipe and only its words ran long, and no shortening could get it the drawing. `inspect` and the build report now name what to change. Recipes can say a field must be left out (`!items[].unit|note`).
