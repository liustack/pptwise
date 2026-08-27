/**
 * Shared optical air on the 1280×720 canvas.
 *
 * Layouts and components used to pick their own 8 / 10 / 16 / 20 px gaps,
 * which is how a kicker kisses a title on one cover while a date sits on
 * its rule on another. These numbers are the minimum that stops two
 * siblings from reading as one blob. A layout can go larger. It should
 * not go smaller.
 */

/** Air between a label and the next sibling (kicker→title, title→pills). */
export const SIBLING_AIR_PX = 24

/** Inner pad of a content card. Matches icon-cards' own PAD_X. */
export const CARD_INSET_PX = 24

/**
 * Air from a hairline to the type it captions, in em of that type.
 * A 16px date under a rule needs 16px from glyph-top to the stroke, not
 * the 2px leftover a fixed y-pair leaves after the title wraps.
 */
export const RULE_TYPE_AIR_EM = 1
