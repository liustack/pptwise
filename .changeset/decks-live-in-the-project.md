---
"@liustack/pptwise": minor
---

Decks live in the project. A deck target is always a path, a deck project directory or an IR file, resolved against the current directory. The bare deck name that looked under `~/.pptwise/decks/` is gone, and so is the `decksDir` setting in `pptwise.config.json` and `~/.pptwise/config.json`. A config that still sets `decksDir` is rejected with the key named. Move any deck you kept under `~/.pptwise/decks/` into the project you work in.
