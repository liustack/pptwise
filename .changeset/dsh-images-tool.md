---
"@liustack/pptwise": minor
---

The DSH plugin has a `pptwise_images` tool. It searches free stock photos and hands the model the hits numbered, with each one's description, plus the contact sheet of their thumbnails as an image it can look at, so the model picks a photo by sight before pinning it with `images fetch`. Where the session's model takes no images, the result names the sheet's file instead.
