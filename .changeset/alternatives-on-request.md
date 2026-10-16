---
"@liustack/pptwise": minor
---

`pptwise build` no longer draws the deck in other themes on its first build. The theme is settled with the outline, so the other themes appear only when asked: `--alternatives` draws the deck's cover and a page or two in up to three other themes, and later builds under the same theme keep them current. `--no-alternatives` works as before. The DSH plugin's `pptwise_build` passes `--alternatives` for `alternatives: true`, and its result now tells the model to ask the user which theme they want.
