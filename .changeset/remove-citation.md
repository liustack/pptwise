---
"@liustack/pptwise": minor
---

Breaking: the `citation` component is removed, and the IR now has 38 typed components. A list of references is document content, not slide content: it belongs to the PDF or the report a deck is presented alongside, and a page that stacked labels, refs and links was reproducing a bibliography on a screen nobody reads it from. Every component that rests on outside material keeps its own one-line `source` field, which stays the only form a source takes on a slide. There is no migration and no alias: a page with `type: "citation"` is refused, in the IR and in a spec page's `focus`, with a message that says the component was removed and where a source goes instead. The faces that offered it a body slot no longer list it, and the review corpus draws another component on every page that used to carry one.
