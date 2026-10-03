---
"@liustack/pptwise": patch
---

English text no longer ends a paragraph on one word alone. A closing column that read "IEA sees coal power up 1.4% in" over "2026" now reads "IEA sees coal power up 1.4%" over "in 2026": the last word of the line before moves down to keep it company, the way CSS `text-wrap: pretty` sets body text. The move never adds a line, never leaves the line above a single word, and never makes the last line wider than the others, so nothing gets smaller or cut. Chinese text keeps its own rule for a lone last character.
