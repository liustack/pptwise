import type { MotifId } from "./types"

/**
 * Which footer marks a motif paints itself, so the shared footer
 * (`render/branding.tsx`) leaves them out instead of printing them twice.
 *
 * - `"row"`: the motif paints the whole content-page footer row, rule and
 *   words and page number, through the same `FooterRow` the shared footer
 *   uses. folio-motif is brief's footer: brief's content faces leave the
 *   brand frame to it.
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
  "ink-motif": "organization",
  "poster-motif": "organization",
}
