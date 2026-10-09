---
"@liustack/pptwise": patch
---

Four ending faces that only a theme file of your own can pick (`defense-close-ending`, `homework-close-ending`, `next-lecture-ending` and `decision-close-ending`) drew no heading at all on a page that also had bullets, and nothing said so. The heading now takes the list's first row, in the same size and place as a heading written as the list, and the bullets follow it. Such a page holds one bullet fewer, and `validate` says so when it has too many. `action-pad-ending` had no place for a subheading beside bullets, where the heading is the call to action, and `validate` now refuses one there instead of letting it vanish.
