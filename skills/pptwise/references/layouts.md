# Kinds and theme menus

Read this when deciding what a content page is saying and which `kind` names that move.

## The authoring rule

Boundary pages use only `cover`, `chapter`, or `ending`. Every content page carries exactly one of the eleven `kind` values below. Authors choose the semantic move. The bound theme menu chooses the visual face.

Do not encode geometry in the spec or page file. If the requested kind is absent from the theme menu, validation stops with a hard error and lists the kinds that theme offers. Resolve the mismatch by choosing an offered kind that still tells the truth, binding a theme that offers the intended kind, or creating a complete theme whose menu does.

## Close calls

- `points` is an argument whose order matters. `list` is a set of peers that can be reordered.
- `data` is a numeric set with a shape to read. `fact` is one number carrying the page.
- `photo` makes the image the subject. `evidence` makes an exhibit support one assertion.
- `statement` is the deck author's proposition. `quote` attributes the words to someone else.
- `process` expresses direction or time. `hierarchy` expresses containment or levels. `comparison` puts alternatives side by side.

## Menu consequences

A theme menu binds each boundary page and each offered content kind to one face. The same choice also fixes that face's capacity, motif posture, and branding permissions. Write to that physical capacity after binding the theme. A different color fork with the same menu can be rebound without rewriting the story. A theme with a different menu requires a return to the theme step, followed by spec and page-fill revision.

<!-- generated:begin kinds -->
### Complete kind vocabulary

This section is generated from the IR v5 kind vocabulary and the 22 preset menus. The final column shows how many preset menus offer each kind.

| kind | name | use it when | boundary | preset menus |
| --- | --- | --- | --- | ---: |
| `points` | Points | Advance an ordered argument whose sequence matters. | Use list when the items are peers that can be reordered. | 22/22 |
| `list` | List | Present peer items whose order may change. | Use points when the sequence carries the reasoning. | 22/22 |
| `comparison` | Comparison | Place alternatives, sides, or dimensions in direct contrast. | Containment belongs to hierarchy and direction belongs to process. | 22/22 |
| `process` | Process | Show directed steps, a timeline, or a closed cycle. | An ordered argument without motion is points. | 22/22 |
| `data` | Data | Make a set of numbers, a chart, or a table the subject. | Use fact when one number is the whole message. | 22/22 |
| `photo` | Photo | Make the image itself the content. | Use evidence when an exhibit exists to support a claim. | 22/22 |
| `statement` | Statement | Give the deck author's own proposition a full page. | Words attributed to someone else are quote. | 17/22 |
| `quote` | Quote | Center words attributed to another speaker or source. | The deck author's own proposition is statement. | 7/22 |
| `fact` | Fact | Build the page around one number. | A numeric set whose structure matters is data. | 16/22 |
| `evidence` | Evidence | Pair one assertion with one exhibit that supports it. | Use photo when the image stands on its own. | 11/22 |
| `hierarchy` | Hierarchy | Express containment, levels, or composition. | Sequence belongs to process and side-by-side contrast to comparison. | 20/22 |
<!-- generated:end kinds -->
