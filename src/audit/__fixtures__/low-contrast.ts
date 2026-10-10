/**
 * A deck that validates clean and that the audit flags for low contrast,
 * for the tests that pin what a `low-contrast` finding says and how the CLI
 * and the preview show it.
 *
 * These used to borrow the engine's own next real low-contrast case, and
 * moved on each time one was fixed: a hardcoded delta red, a gutter grey,
 * a primary-on-panel layer name, and last a runway cover painted #777777
 * whose mark took its ink from the grey page and stood on the cover's own
 * near-black band. That mark now reads its ground off the face
 * (`LayoutDefinition.coverMarkGround`), and a sweep of every face, the
 * stress decks and every built-in theme on ten painted grounds with every
 * mark on found no case left. So the low contrast is built on purpose,
 * where an author can put it: a theme file (`greycard.theme.json`, brief's
 * copy) whose text reads 5.7:1 on its page and 3.4:1 on its own cards. The
 * theme check holds a theme's inks to 3:1 and passes it. A card's words in
 * that ink are body text, held to 4.5:1, and the audit says so.
 */
import { readFileSync } from "node:fs"

/** The theme file, as an author would write it next to a deck. */
export const GREYCARD_THEME_FILE: Record<string, unknown> = JSON.parse(readFileSync(new URL("./greycard.theme.json", import.meta.url), "utf8"))

/** One content page of row cards on greycard, its id `p-body`. */
export const LOW_CONTRAST_IR = {
  version: "5",
  filename: "low-contrast",
  theme: { id: "greycard" },
  slides: [
    {
      type: "content",
      kind: "points",
      id: "p-body",
      heading: "Three things",
      components: [
        {
          type: "row_cards",
          items: [
            { title: "Signed", text: "New contract value grew by a fifth" },
            { title: "Active", text: "Team activity rose" },
            { title: "Onboarded", text: "Setup time fell" },
          ],
        },
      ],
    },
  ],
}
