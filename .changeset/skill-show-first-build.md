---
"@liustack/pptwise": minor
---

The skill now shows the user the theme and the outline before going on: a theme wall drawn with their own cover title (`pptwise_themes`, or `theme try --title` outside DSH) and the validated spec as a page list, previewed as soon as it exists. A user who says to go ahead is not asked, but still sees both. The agent checks its work through `pptwise build --json` (or `pptwise_build`) after each batch instead of converting pages to images, and delivers only the one `.pptx` that build wrote, through `present` on DSH.
