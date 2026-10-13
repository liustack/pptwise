---
"@liustack/pptwise": minor
---

A deck switched to another theme now builds in one go. A build that draws every page whole records its theme in `.pptwise/<deck>/written-for.json`. A later build under another theme draws the deck instead of refusing pages written for the first theme: what the new faces cannot take (a cover's list or source line, a block beside a full-body one, `fields`, `ballot`, the last items of a list too long for the new box) is left off, and text too long for the new box is cut. Each page that lost something gets a warning naming what and how to keep it, and the report's `writtenFor` names the theme that draws it whole. The page files keep everything, so switching back draws them whole again. Without a record, every page is checked as strictly as before.
