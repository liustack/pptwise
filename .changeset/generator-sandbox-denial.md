---
"@liustack/pptwise": minor
---

`pptwise images generate` names a generator that a sandbox stopped from writing its own home folder (`Operation not permitted`, `EPERM`, `EACCES`, `FS_PERMISSION_DENIED`), and says to run the command outside the sandbox or allow that generator to write its home folder in the host, never to copy or move its login files. The skill says the same.
