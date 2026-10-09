---
"@liustack/pptwise": patch
---

The ink cover's and close's seal no longer cuts part of a stamp. The seal holds one character, and it used to print only the first character of a longer stamp and never its date line, without a word from validate, render or audit. A one-character stamp with no date is cut in the seal as before. Any other stamp leaves the seal on the hall's first character, as on a page with no stamp, and is reported as `content-dropped` and refused at export, so the author can shorten it to one character.
