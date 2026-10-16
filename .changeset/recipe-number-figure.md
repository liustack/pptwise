---
"@liustack/pptwise": patch
---

A recipe that asks for a number in a figure now counts a figure written as a JSON number (`"value": 16`). `inspect` and the build report used to tell the author to write a number into a value that already held one.
