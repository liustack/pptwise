---
"@liustack/pptwise": patch
---

A figure card no longer cuts its unit short or leaves it off without a word. When a unit does not fit beside its figure, the figure gives a few points of type first, and a unit that still cannot be set whole marks the figure's line, so `audit` reports it as `content-truncated` and the export refuses the deck until the unit is shortened. A figure such as "2.0 billion years" in a narrow column now keeps "billion years".
