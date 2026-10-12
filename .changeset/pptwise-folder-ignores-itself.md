---
"@liustack/pptwise": minor
---

`.pptwise/` now keeps itself out of git from the inside. The first command that creates it writes `.pptwise/.gitignore` holding `*`, beside the local exclude line it already added. In a sandbox where `.git` cannot be written, the exclude line fails with a note and the folder still stays out of `git status`. `--no-git-ignore` skips both, and `pptwise doctor` counts the inner file as ignored.
