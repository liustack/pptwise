---
"@liustack/pptwise": patch
---

The schema now says how a timeline on lanes is drawn. It used to promise one lane above the axis and one below on every page. The ordinary timeline keeps its milestones in one row and prints each one's lane over its date, and only bulletin, clinic, ledger, swiss and vermilion set the first lane above the axis and the second below it. The errors for a third lane and for lanes on a vertical timeline no longer make that promise either.
