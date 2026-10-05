---
"@liustack/pptwise": patch
---

The audit reads a word drawn as an outline only (no fill, a stroke) by its stroke, the ink a reader sees, and skips a text with neither. It used to measure the missing fill and report a large outlined numeral as unreadable.
