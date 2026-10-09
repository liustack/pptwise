---
"@liustack/pptwise": patch
---

`validate` now refuses a cover, chapter or ending page whose face would leave part of a block off: a list item too long for the one-line label close-word-ending or console-ending sets it as, a button's words wider than binder-ending's pill, or a year-scale cover's timeline dated by quarter. Where words are too long, the error quotes the part that fits. binder-ending's button used to run off the page with nothing to say so, and now declares the loss.
