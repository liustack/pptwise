import { measureTextUnits } from "../lib/svg-text-layout"

/**
 * A cover's outlined confidentiality badge, grown to its label.
 *
 * The three faces that frame the mark in a box drew a fixed box sized for
 * one English word. The mark now follows the deck's language, and the
 * Chinese phrases (「内部资料，请勿外传」) run three times as wide, so the box
 * keeps its designed width as a minimum, keeps its right edge where the
 * face put it, and grows leftward when the label needs more room.
 */
export function coverBadgeBox(
  label: string,
  opts: { right: number; minWidth: number; fontSize: number; fontFamily: string | undefined; padX: number },
): { x: number; width: number; centerX: number } {
  const textWidth = measureTextUnits(label, { fontFamily: opts.fontFamily }) * opts.fontSize
  const width = Math.max(opts.minWidth, Math.ceil(textWidth + 2 * opts.padX))
  const x = opts.right - width
  return { x, width, centerX: x + width / 2 }
}
