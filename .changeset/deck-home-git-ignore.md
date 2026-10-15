---
"@liustack/pptwise": patch
---

`.pptwise/` is now kept out of git on the first build or preview even when it already existed because a deck was started inside it. Before, a folder created by writing a deck there was taken as one pptwise had set up already, and the deck, its pages and its `.pptx` all showed up in `git status`.
