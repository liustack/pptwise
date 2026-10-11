---
"@liustack/pptwise": minor
---

`pptwise theme fork --brand <hex>` repaints a theme around one brand color. The brand goes into the color the theme shows most, unchanged when it reads there. When it cannot read there it moves to the theme's other color, and when neither can hold it the CLI keeps its hue and saturation, moves its lightness, and says what it changed. The other colors turn by the same hue step, while the theme keeps its own ground, text, surface, chart style and contrast floor. `pptwise brand extract` now does the same with the template's accent1 and fonts, and no longer takes the template's ground, text or other accents. `--primary` and the other anchor flags keep their literal meaning and cannot be combined with `--brand`.
