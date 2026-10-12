---
"@liustack/pptwise": minor
---

Finding `~/.pptwise` no longer writes anything. The CLI used to copy a leftover `~/.pptpress` or `~/.pptfast` into `~/.pptwise` the first time any command looked for it, which failed every command in a sandbox whose home directory is read-only. The copy is gone. Move an old home by hand if you still need it. `PPTPRESS_HOME` and `PPTFAST_HOME` still work as aliases.
