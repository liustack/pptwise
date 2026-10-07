/**
 * How far a text run's ink reaches below its baseline, as a fraction of its
 * font size, for the contrast walk's ink box (`deck-audit.ts`) and the
 * pixel layer that grids the same box (`pixel-audit.ts`).
 *
 * Both used to hang a quarter em below every run, the depth of a "g" or a
 * "y". A run with no descender has no ink there. Initials in a people card
 * badge ("MC", "SW") are wide enough that the two bottom corners of that
 * quarter em fall outside the 16px disc, onto the card around it, so the
 * walk graded the badge's white ink against the white card and reported
 * 1.00:1 for letters that sit wholly inside the disc and read cleanly.
 *
 * Which glyphs reach below the baseline was read off the font files the
 * export can name, not guessed: every `SAFE_FONTS` face (`render/fonts.ts`)
 * at Regular and Bold where a Bold exists, from the binaries Office ships
 * (PowerPoint.app's `DFonts`, macOS Supplemental for Georgia and Courier New,
 * Office's cloud cache for Segoe UI), each printable ASCII glyph's outline
 * bounds through fontTools. `SITS_ON_BASELINE` holds the characters whose
 * lowest point stays within `BASELINE_OVERSHOOT_EM` of the baseline in every
 * one of those faces. The overshoot is the optical undershoot of round and
 * spurred letters, at most 0.026em (Georgia's "b"; "C", "G", "O", "S" and
 * "U" reach 0.019em in Georgia Bold), rounded up.
 *
 * Everything else keeps the full quarter em, because some face hangs it: the
 * descenders g j p q y, Q's tail, J in Cambria and SimSun, Georgia's
 * old-style figures 3 4 5 7 9, brackets, slashes, the comma and semicolon,
 * $ @ _ | and, in Courier New, #. So does anything outside printable ASCII
 * (a CJK character sits about a tenth of an em below the baseline in YaHei
 * and SimSun), which this table has not measured. A run takes the deepest of its
 * characters, so one descender anywhere puts the whole run back on the
 * quarter em.
 */

/** The quarter em a descender hangs below the baseline, the depth every run used to be given. */
export const FULL_DESCENT_EM = 0.25

/** How far a glyph in `SITS_ON_BASELINE` reaches below the baseline at most, in any exported face. */
export const BASELINE_OVERSHOOT_EM = 0.03

const SITS_ON_BASELINE: ReadonlySet<string> = new Set(
  Array.from("!\"&'*+-.01268:<=>?ABCDEFGHIKLMNOPRSTUVWXYZ^`abcdefhiklmnorstuvwxz~"),
)

/** The depth of `text`'s ink below its baseline, in ems. Whitespace has no ink and does not count. */
export function inkDescentEm(text: string): number {
  for (const char of text) {
    if (/\s/.test(char)) continue
    if (!SITS_ON_BASELINE.has(char)) return FULL_DESCENT_EM
  }
  return BASELINE_OVERSHOOT_EM
}
