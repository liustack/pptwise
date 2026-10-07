import { Children, isValidElement, type ReactNode } from "react"

/**
 * The attribute a face's drawing carries when it runs a photograph from the
 * page's left edge and the page's frame starts further in: luxe's half-page
 * photograph (`layouts/compositions/vitrine.tsx`). The page renderer reads
 * it off the body and hands it to the motif as `frameLeft`, so the motif
 * frames the rest of the page and sets its footer beside the photograph.
 */
export const FRAME_LEFT_ATTR = "data-frame-left"

/** The first `data-frame-left` in a drawing, as a number, or `undefined` when none says where the frame starts. */
export function treeFrameLeft(node: ReactNode): number | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = treeFrameLeft(child)
      if (found !== undefined) return found
    }
    return undefined
  }
  if (!isValidElement(node)) return undefined
  const props = node.props as Record<string, unknown> & { children?: ReactNode }
  const own = props[FRAME_LEFT_ATTR]
  if (typeof own === "number" && Number.isFinite(own)) return own
  let found: number | undefined
  Children.forEach(props.children, (child) => {
    if (found === undefined) found = treeFrameLeft(child)
  })
  return found
}
