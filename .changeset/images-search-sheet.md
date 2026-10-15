---
"@liustack/pptwise": minor
---

`images search --sheet` draws the results' thumbnails as one numbered picture, `.pptwise/image-search/<query>.jpg` (or the file you name), and prints its path. Look at that one image to pick a photo, then fetch the id with the same number. Results are numbered in the text and in `--json` (`n`), and `--json` names the sheet as `sheet`. A thumbnail that will not download is drawn from the full-size picture when there is one, else crossed out with a note.
