---
"@liustack/pptwise": minor
---

A deck now moves to another theme by changing `spec.theme` alone. A page whose kind the new theme does not offer is drawn by the nearest kind it does offer whose face takes the page's components (a fact page as data, then statement, a quote as statement, an evidence page as data or photo by its exhibit, a hierarchy as points), instead of failing validation. The page keeps its own kind, so a theme that offers it draws it there again. `spec validate` prints a note for each such page, `build --json` lists them under `drawnAs`, and `inspect` and `schema --kind` show the kind that draws the page. Theme furniture a face has no place for (`kicker`, `stamp`, `tag`, `years`, `stage`) is now left off with a warning and kept in the page file, while `fields` and `ballot` still fail. A deck that froze its theme in its own `theme.json` now says how to switch instead of asking for the spec to be rewritten.
