---
"@liustack/pptwise": minor
---

A page may carry a `kicker`, a short label set over its heading, such as the occasion on a cover or what an ending asks for. A deck spec writes it on the page, beside `heading` and `summary`. Only a face with a place for it draws it, and validate refuses it on any other face, naming the face. A cover, chapter or ending face may also declare that it sets the page's `footnote`, such as a disclaimer at the foot of an ending; on every other boundary face a footnote is still refused.
