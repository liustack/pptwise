import type { MotifId } from "./types"

/**
 * Which footer marks a motif paints itself, so the shared footer
 * (`render/branding.tsx`) leaves them out instead of printing them twice.
 *
 * - `"row"`: the motif paints the whole content-page footer row, rule and
 *   words and page number, through the same `FooterRow` the shared footer
 *   uses. folio-motif is brief's footer: brief's content faces leave the
 *   brand frame to it.
 *   memo-motif is memo's typed folio: the organization at the left, 「第 N
 *   页 共 M 页」 at the right in mono, and the deck's `label` moved up into
 *   the running head as the memo's subject.
 *   clinic-motif is clinic's assessment file folio: the organization at the
 *   left, 「N / M」 at the right, and the deck's `label` moved up to the
 *   top right as the file's subject.
 *   almanac-motif is almanac's yearbook folio: the organization, the label
 *   and the notice at the left, 「N / M」 at the right.
 *   homeroom-motif is homeroom's lesson folio, the same row.
 *   ember-motif is ember's pitch folio: the organization at the left, the
 *   page number at the right, and the deck's `label` moved up to the top
 *   left as the occasion beside the rail.
 *   rally-motif is rally's campaign folio: the organization, the label and
 *   the notice at the left, 「N / M」 at the right.
 *   proposal-motif is proposal's binder folio: the organization and the
 *   notice at the left, the page number at the right, and the deck's `label`
 *   moved up to the top left as the proposal's running label.
 *   rail-motif is thesis's book folio: the page number centred at the foot,
 *   the organization and the notice at the left, and the deck's `label`
 *   moved up to the top left as the thesis's running head.
 *   corner-ornament-motif is journal's magazine folio: 「· 3 ·」 centred at
 *   the foot, the notice at the left, and the organization and the deck's
 *   `label` moved up into the masthead as the column's name and the issue.
 * - `"organization"`: the motif prints the organization somewhere of its
 *   own, and the shared row carries everything else. ink's colophon rail
 *   sets the organization in a vertical column down the right edge.
 *
 * A fact of the motif, read page by page from the motif that actually
 * paints there (`render/page-context.ts`). A page whose motif is silenced
 * falls back to the shared footer with every mark in it. Leaf module: types
 * only, so the page context can read it without reaching the motif code.
 */
export type MotifFooterRole = "row" | "organization"

export const MOTIF_FOOTER_ROLES: Partial<Record<MotifId, MotifFooterRole>> = {
  "folio-motif": "row",
  "memo-motif": "row",
  "clinic-motif": "row",
  "almanac-motif": "row",
  "homeroom-motif": "row",
  "ember-motif": "row",
  "rally-motif": "row",
  "proposal-motif": "row",
  "rail-motif": "row",
  "corner-ornament-motif": "row",
  "ink-motif": "organization",
  "poster-motif": "organization",
}
