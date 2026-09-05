---
"@liustack/pptwise": minor
---

Breaking: `tag_row` is removed and three picture- and voice-carrying components take its place, so the IR now has 40 typed components. A row of bare labels was the answer a model reached for when it had nothing to say: every real use either had prose behind each label, which is a bullet list, or a picture and a line behind each one, which is a card. A page with `type: "tag_row"` is refused, in the IR and in a spec page's `focus`, with a message naming `bullets` and `icon_cards` as the two homes short labels actually have. There is no migration and no alias.

`logo_wall` sets 4 to 12 organizations on equal tiles in one ink, with no frames and no hero, so the page says only that these names are together. A tile takes a picture through the same asset pipeline `image` and `image_grid` use, and falls back to the organization's own name set as a wordmark.

`product_cards` puts 2 to 4 things side by side, each a required picture with a name, one line, and a price under a hairline, for a page someone is meant to choose from. When the asset pipeline hands back nothing the card leaves an empty ground marked `data-dropped` rather than inventing stand-in art.

`quote_wall` stands 2 to 4 short remarks side by side with each speaker's initials, name and role, for the argument that several people agree rather than that one of them said it well. `blockquote` still stages a single remark at full size.

Each of the three may single out one item, and singling out means filling that whole card in the theme primary with its text reset to read against it. `logo_wall` and `product_cards` span a multi-column arrangement and drop a column rather than narrow past the width their content stays readable at, so a box that cannot hold them makes the face step aside instead of printing cut names.
