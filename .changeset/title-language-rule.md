---
"@liustack/pptwise": patch
---

Built-in titles now follow a Chinese-specific count. An item counts as Chinese when it has Han characters, no Japanese kana or Korean hangul, and at least as many Han characters as ASCII letter runs, and a component switches to its Chinese titles when more than half of its items do. Japanese or Korean content with kana or hangul keeps the English titles, and so does English like "Strong brand in 中国". It is a count, not language detection: a short phrase around a long Chinese name ("Visit 上海") counts as Chinese, and an author who needs other titles writes them. PEST quadrants (政治 / 经济 / 社会 / 技术), the business model canvas blocks, and a waterfall's automatic total (合计) now follow the same rule as SWOT and the five forces.
