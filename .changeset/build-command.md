---
"@liustack/pptwise": minor
---

New `pptwise build <deck> [--json]` runs assemble, validate, audit, preview and render in one pass. It reports every problem in one list, each with its page, the file and field to edit, and the check's own advice, and exits 1 while the deck needs revision. The pages are drawn whenever validate passes. The `.pptx` is written only when every check passes, at the same `.pptwise/<deck>/<deck>.pptx` path `render` uses, and a build that does not pass removes the one an earlier build left there, so a deck has one final file and it always matches its sources.
