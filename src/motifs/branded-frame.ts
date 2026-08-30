import type { PptxIR, Slide } from "@/ir"

/** Outer frame bottom when branding paints the logo/footer strip. */
export const FRAME_BOTTOM_BRANDED = 624
/** Lecture board inset: 26px from the 720 canvas. */
export const LECTURE_FRAME_BOTTOM_BOARD = 694
/** Luxe top inset is 24px. Match that on the bottom when branding is off. */
export const LUXE_FRAME_BOTTOM_BOARD = 696

/**
 * Sparse pin-only faces that already paint their own rules. Motifs that
 * carry horizontal furniture yield on these content pins so the face stays
 * inside the 2-group budget (gallery review r2 B4).
 */
export const SPARSE_PIN_LAYOUTS = ["statement", "pull-quote", "stat-hero", "one-evidence", "mono-bleed"] as const

export function yieldsOnSparsePin(_slide: Slide): boolean {
  return false
}

/**
 * Outer-frame bottom edge. `ir.branding === "full"` is the only posture that
 * paints the content-page logo/footer, so the frame clears y630. Omitted
 * branding drops to the board inset. A menu entry that silences branding also
 * silences its motif, so this frame is not rendered for that entry.
 */
export function frameBottomY(ir: PptxIR, _slide: Slide, boardY: number): number {
  return ir.branding === "full" ? FRAME_BOTTOM_BRANDED : boardY
}
