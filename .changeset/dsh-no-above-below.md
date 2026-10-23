---
"@liustack/pptwise": patch
---

`pptwise_themes` and `pptwise_outline` no longer tell the model the user is looking at their cards. The model now names themes by number and id instead of pointing to "the themes above", and puts the outline's page list in the question itself, since the outline card folds away with the turn's steps.
