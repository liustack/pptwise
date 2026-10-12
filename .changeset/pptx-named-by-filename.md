---
"@liustack/pptwise": minor
---

The final `.pptx` that `build` and `render` write to `.pptwise/<deck>/` is named after the deck's own `filename`, the spec's or the IR file's, with or without the `.pptx` extension. A deck that sets none keeps the deck directory's or IR file's name, as before. Characters a file name cannot hold become `-`, and letters of any script are kept. Each deck folder holds one final `.pptx`: a build that does not pass, or a renamed `filename`, leaves no older export beside it.
