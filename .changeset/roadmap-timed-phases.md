---
"@liustack/pptwise": minor
---

A roadmap's phases can say how long each lasts (`duration` on every phase, counted in the roadmap's `duration_unit`), the check held as one ends (`checkpoint`, such as 「小测一」 or "Gate review") and what it covers (`points`, one to three short lines). The ordinary roadmap adds the length to the period line (「环节一 · 15 分钟」), the points under the title and the checkpoint as a tag under them, and a face that lays phases to scale draws each as long as it lasts. validate refuses a length on some phases only, lengths with no unit, and a unit with no lengths.
