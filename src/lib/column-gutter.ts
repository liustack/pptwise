/**
 * The least gap between one column's words and the next that reads as a
 * break, in characters of the words' own size. Components that set items
 * side by side in open columns keep it, and the audit's crowded-columns
 * check (`findCrowdedColumns`) holds them to it.
 *
 * Chinese reads a gap as a break once it is clearly wider than any blank
 * inside a line, and the widest of those is about a character: a full-width
 * comma or bracket carries most of a character of air. A character and a
 * quarter clears it. Four Chinese cards across a page that stood 1.3 to 1.4
 * characters apart read as four columns (2026-10), and the estimate of a
 * Chinese line's width is exact, since every glyph is one character wide.
 *
 * A line with letters in it keeps two characters. A proportional font's
 * letters run a few pixels off the estimate, wider in some fallback fonts:
 * a terminal timeline's descriptions with Latin names in them stood 28px
 * apart at 16px by the estimate and about a character apart on screen
 * (2026-10).
 */
export const WIDE_COLUMN_GUTTER_EM = 1.25
export const LETTERED_COLUMN_GUTTER_EM = 2

/** Latin, Greek and Cyrillic letters: the scripts set in proportional fonts. */
const LETTER_RE = /[A-Za-zÀ-ɏͰ-ϿЀ-ӿ]/

/** The gutter, in characters of its own size, that a line of `text` keeps from the next column. */
export function columnGutterEm(text: string): number {
  return LETTER_RE.test(text) ? LETTERED_COLUMN_GUTTER_EM : WIDE_COLUMN_GUTTER_EM
}
