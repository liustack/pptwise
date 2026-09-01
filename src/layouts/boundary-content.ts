import type { Component, Slide } from "@/ir"
import { stripEmphasis } from "../render/emphasis"

/**
 * What a boundary face takes from a page, in one place.
 *
 * A cover, chapter or ending face draws authored content into fixed
 * furniture: one list, three numbered arguments, four sign-off lines. Two
 * separate pieces of code used to answer "and how much of it?" — the face,
 * in its own `components.find(...).items.slice(0, N)`, and `validate-core`,
 * in its own reading of the same page. They disagreed in both directions:
 *
 *   - the face drew the *first* accepted block and validate counted none of
 *     the others, so a second `bullets` on a `capacity: 1` slot vanished
 *     with no error and no mark on the page.
 *   - the face filtered blank items before drawing and validate counted the
 *     raw array, so `["One", "", "Two", "Three", "Four"]` was rejected as
 *     five items against a four-item face that would have drawn four.
 *
 * Both sides now call these functions, so "which block, and which of its
 * items" has exactly one answer per page.
 */

/** Just enough of a slide to select from — faces and validate pass their own. */
interface HasComponents {
  components: Slide["components"]
}

/**
 * Every component this slot accepts, in authored order.
 *
 * `accepts` is the slot's own vocabulary (`layouts/registry.ts`). A boundary
 * slot declares `capacity` alongside it: this returns all matches so validate
 * can reject the overflow rather than letting the face drop it silently.
 */
export function boundarySlotBlocks(
  slide: HasComponents,
  accepts: readonly string[],
): Component[] {
  return slide.components.filter((component) => accepts.includes(component.type))
}

/** The single block a `capacity: 1` slot draws: the first one it accepts. */
export function boundarySlotBlock(
  slide: HasComponents,
  accepts: readonly string[],
): Component | undefined {
  return boundarySlotBlocks(slide, accepts)[0]
}

/**
 * The items of a `bullets` block that reach the page.
 *
 * An item with no glyphs in it — empty, whitespace, or an emphasis run
 * holding only spaces — draws no line on any face, so it is not one of the
 * items a face capacity is spent on. This is the count `itemCapacity` is
 * measured against, and the list every face draws from.
 */
export function drawableItems(items: readonly string[]): string[] {
  return items.filter((item) => stripEmphasis(item).trim().length > 0)
}

/**
 * The items a boundary face draws from the page's first `bullets` block:
 * the drawable ones, capped at the face's declared `itemCapacity`.
 *
 * Returns the authored strings, markers and all — a face that paints
 * emphasis keeps it, a face that does not calls `stripEmphasis` itself.
 */
export function boundaryBulletItems(slide: HasComponents, itemCapacity: number): string[] {
  const block = boundarySlotBlock(slide, ["bullets"])
  if (block?.type !== "bullets") return []
  return drawableItems(block.items).slice(0, itemCapacity)
}
