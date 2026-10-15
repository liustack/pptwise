---
"@liustack/pptwise": patch
---

The skill and the DSH plugin's tools now say where a new deck goes: `.pptwise/decks/<name>/` in the project, with a short lowercase English name, unless the user names another place. A deck that already exists is edited where it is. Models no longer have to guess, and stop leaving new deck folders in the project's top level.
