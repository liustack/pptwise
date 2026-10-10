---
"@liustack/pptwise": minor
---

The DSH plugin adds two tools. `pptwise_themes` draws the user's own title as a cover, plus one content page, in every theme and shows them side by side in the conversation, so a theme is picked by looking rather than by reading names. `pptwise_build` runs `pptwise build` in the conversation's workspace, shows the drawn pages in the same card as `pptwise_preview`, and hands the model either the deck's one `.pptx` or each problem with its page, file and field. Both return small facts to the model and serve the pages to the card by id, so they work the same in Code Mode and in direct calls. A build that needs revision shows its pages without a download button.
