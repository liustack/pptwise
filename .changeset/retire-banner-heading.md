---
"@liustack/pptpress": minor
---

The banner-heading content layout is retired. Pages that pinned `layout: "banner-heading"` should run `pptpress migrate`. Unpinned decks pick another content layout. Heading treatments keep the title face.

**Unpinned decks change face.** A content page that used to land on the assertion banner now lands on another auto layout.
