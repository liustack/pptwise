# Kinds and theme menus

Read this when deciding what a content page is saying and which `kind` names that move.

## The authoring rule

Boundary pages use only `cover`, `chapter`, or `ending`. Every content page carries exactly one of the eleven `kind` values below. Authors choose the semantic move. The bound theme menu chooses the visual face.

Do not encode geometry in the spec or page file. If the requested kind is absent from the theme menu, the page is drawn as the nearest kind the menu offers, and `spec validate` prints a note. Keep the kind that tells the truth. The stand-ins are in `spec.md`.

## Close calls

- `points` is an argument whose order matters. `list` is a set of peers that can be reordered.
- `data` is a numeric set with a shape to read. `fact` is one number carrying the page.
- `photo` makes the image the subject. `evidence` makes an exhibit support one assertion.
- `statement` is the deck author's proposition. `quote` attributes the words to someone else.
- `process` expresses direction or time. `hierarchy` expresses containment or levels. `comparison` puts alternatives side by side.

## Menu consequences

A theme menu binds each boundary page and each offered content kind to one face. The same choice also fixes that face's capacity, motif posture, and branding permissions. Write to that physical capacity after binding the theme. Another theme, with the same menu or a different one, is bound by changing its name in the spec and building again. The build names any page the new faces need changed.

<!-- generated:begin kinds -->
### Complete kind vocabulary

This section is generated from the IR v5 kind vocabulary and the 24 preset menus. The final column shows how many preset menus offer each kind.

| kind | name | use it when | boundary | preset menus |
| --- | --- | --- | --- | ---: |
| `points` | Points | Advance an ordered argument whose sequence matters. | Use list when the items are peers that can be reordered. | 24/24 |
| `list` | List | Present peer items whose order may change. | Use points when the sequence carries the reasoning. | 24/24 |
| `comparison` | Comparison | Place alternatives, sides, or dimensions in direct contrast. | Containment belongs to hierarchy and direction belongs to process. | 24/24 |
| `process` | Process | Show directed steps, a timeline, or a closed cycle. | An ordered argument without motion is points. | 24/24 |
| `data` | Data | Make a set of numbers, a chart, or a table the subject. | Use fact when one number is the whole message. | 24/24 |
| `photo` | Photo | Make the image itself the content. | Use evidence when an exhibit exists to support a claim. | 24/24 |
| `statement` | Statement | Give the deck author's own proposition a full page. | Words attributed to someone else are quote. | 20/24 |
| `quote` | Quote | Center words attributed to another speaker or source. | The deck author's own proposition is statement. | 7/24 |
| `fact` | Fact | Build the page around one number. | A numeric set whose structure matters is data. | 20/24 |
| `evidence` | Evidence | Pair one assertion with one exhibit that supports it. | Use photo when the image stands on its own. | 12/24 |
| `hierarchy` | Hierarchy | Express containment, levels, or composition. | Sequence belongs to process and side-by-side contrast to comparison. | 20/24 |
<!-- generated:end kinds -->
