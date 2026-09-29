---
"@liustack/pptwise": patch
---

Punctuation, symbols and accented letters are no longer measured narrower than their fonts draw them. In Georgia, Microsoft YaHei, SimSun and KaiTi, a mark such as the middle dot (a full em in SimSun and KaiTi), the em dash (1.08em in YaHei), ‰, …, №, arrows, currency signs, an ideographic space or an accented letter is now priced at its real width, so a line that holds one no longer runs past its box. Nothing is measured narrower than before.

When balanced lines of mixed Chinese and English have nearly even alternatives, the break now falls where English meets Chinese rather than inside an English name: Linjiang Group over 临江咨询, not Linjiang over Group 临江咨询. Line counts, line widths and the rule against a single-character last line are unchanged.
