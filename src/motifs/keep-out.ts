import type { DecorKeepOutRect } from "../layouts/registry"
import type { PageRenderContext } from "../render/page-context"

/**
 * How much empty page a structural motif mark wants between itself and any
 * furniture the face paints. Two hairlines closer than this read as one
 * botched line rather than as two deliberate marks — brief's locator
 * corner sat 4px from `rail-numbered`'s progress rail and looked like a
 * misprint (gallery visual review fix/gallery-verdict-round, item 5).
 *
 * A mark's own value, not the face's: the face states where it paints (see
 * `LayoutDefinition.decorKeepOut`), and each motif decides how much room it
 * needs beside that.
 */
export const STRUCTURE_MARK_CLEARANCE = 24

/**
 * Whether `mark` (its own bounding box, in page coordinates) can be painted
 * without crowding anything the face reserved. True when the face reserves
 * nothing, which is every face but the handful that paint their own corner
 * or edge furniture.
 */
export function clearsFaceFurniture(
  page: PageRenderContext | undefined,
  mark: DecorKeepOutRect,
  clearance: number = STRUCTURE_MARK_CLEARANCE,
): boolean {
  const reserved = page?.decorKeepOut
  if (!reserved || reserved.length === 0) return true
  return !reserved.some(
    (r) =>
      mark.x - clearance < r.x + r.w &&
      mark.x + mark.w + clearance > r.x &&
      mark.y - clearance < r.y + r.h &&
      mark.y + mark.h + clearance > r.y,
  )
}
