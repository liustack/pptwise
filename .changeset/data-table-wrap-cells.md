---
"@liustack/pptwise": patch
---

A table cell longer than its column now wraps onto up to three lines, and its row grows to hold them. Every cell used to be one line, so a sentence in a column of short words lost its tail and the only ways out were to cut the words or switch to a comparison. A table that would cut a word also sizes its columns from what each needs, so a column of short words keeps them on one line and the long column wraps. A box too short for the wrapped table gives back lines first, down to one line a row with the cuts reported, before it drops a row. A table whose cells all fit one line is drawn exactly as before.
