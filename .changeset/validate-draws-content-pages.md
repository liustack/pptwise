---
"@liustack/pptwise": minor
---

`validate` now draws every content page the way `render` draws it, a plainer layout taking over included, and refuses a page that would leave anything off or cut its heading, its source line or a component's words. Such a page used to pass `validate` and only stop at `render`, or reach the file with a cut the audit reported. The error names the page and what would be lost: which block, how many items, which text. When one more drawing of the page finds it, the error also says what to take off: a text to shorten, how many items of a list the page holds, the blocks past the ones it draws, or a stamp or tag the layout has no place for. `render`, `preview` and `inspect` validate the same way, so `preview` now refuses such a page instead of drawing it with a note. `render --allow-dropped-content` (and `generatePptx`'s `allowDroppedContent`) skips this check along with the export's own content-drop gate, and `validateIr` takes the same option.
