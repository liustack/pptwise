---
"@liustack/pptwise": patch
---

When the DSH plugin is the first to create a project's `.pptwise/`, it now keeps the folder out of git the same two ways the CLI does: a `.pptwise/` line in the repository's local exclude file, then a `.gitignore` holding `*` inside the folder. Outside a repository, without git, or with a `.git` it cannot write, it skips the exclude line and the preview goes ahead.
