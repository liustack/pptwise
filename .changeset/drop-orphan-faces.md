---
"@liustack/pptwise": minor
---

Delete the 99 faces no built-in theme's menu used. The registry now holds 107 faces: 22 covers, 22 chapters, 22 endings and 41 content faces (39 standard and the `image-split` and `image-top` takeovers). A page never named a face directly, so a deck on a built-in theme renders exactly as before.

- Gone are the old shared pool (`poster-center`, `two-column`, `bento-panel`, `rail-numbered`, `narrow-column`, `quiet-frame`, `stacked-poster`, `image-bottom`, `image-annotate`, `quote-stage` and the rest) and every theme's earlier faces that its 2026-08 and 2026-10 redesigns replaced (`verdict-index`, `crayonbox-*`, `show-*`, `tone-adaptive-*`, `fashion-*` and the rest).
- A theme file whose menu names a deleted face is refused like any other unknown face. Point that entry at a face `pptwise layouts` lists.
- The engine-only `shape.cover` knobs that only the deleted covers read are gone from the built-in themes.
- The SDK's `extractBrandTheme` no longer copies a fixed menu of these faces. It repaints a theme (bulletin by default, or the one passed as `from`) around the template's brand colors, the way `pptwise brand extract` does:

```ts
const { file, placement, fontNotes } = await extractBrandTheme(bytes, { id: "acme", label: "Acme", from: "swiss" })
```
