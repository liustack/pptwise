---
"@liustack/pptwise": patch
---

The em dash and the middle dot now take the width PowerPoint gives them. Like the curly quotes, PowerPoint paints "—" and "·" from the run's Latin face, so in Georgia a 「——」 measured about half an em wider than drawn and a "·" about a fifth of an em wider. The words after them, and the highlight under a marked run, sat to the right of where PowerPoint draws them, and in the preview a highlight after a dash left a gap. Regular YaHei measured its "·" twice as wide as drawn, and code set in Consolas counted its em dash a full em. Lines that hold a dash or a dot may now fit a few more characters.
