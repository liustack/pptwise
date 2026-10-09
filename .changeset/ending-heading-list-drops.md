---
"@liustack/pptwise": patch
---

Seven ending faces that set a heading written as a list in fixed rows (`defense-close-ending`, `homework-close-ending`, `next-lecture-ending`, `decision-close-ending`, `action-pad-ending`, `care-plan-ending` and `reminder-list-ending`) now declare the lines they have no row for. `validate` already refused such a heading, but a deck rendered past it, or exported with `--allow-dropped-content`, lost those lines with nothing to say so. The export now stops and names them as items, and `audit` reports them as `content-dropped`.
