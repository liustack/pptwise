---
"@liustack/pptwise": patch
---

A long label squeezed into its last allowed line keeps the spaces between its words. When a text needed more lines than its box allows, the leftover lines were joined with nothing between them, so "below the" and "target" printed as "below thetarget", and a flowchart decision split "Staging" across two lines. The last line now joins them the way the source reads: a space between words, nothing between two Chinese characters.
