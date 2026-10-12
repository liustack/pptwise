---
"@liustack/pptwise": minor
---

The skill no longer runs `pptwise packs sync` at the start of every deck. Content packs are installed once at setup (`license set`, then `packs sync`), as the install guides now say, and again only when the license changes or the user asks for newer packs. Making a deck never writes the pptwise home folder, so the whole deck flow works in an agent sandbox whose home folder is read-only. The docs say which commands write `~/.pptwise`: `config set`, `license set`, `license clear` and `packs sync`.
