import { Children, isValidElement, type ReactNode } from "react"

/**
 * The attribute a face's drawing carries when it runs a photograph from the
 * page's left edge and the page's frame starts further in: luxe's half-page
 * photograph (`layouts/compositions/vitrine.tsx`). The page renderer reads
 * it off the body and hands it to the motif as `frameLeft`, so the motif
 * frames the rest of the page and sets its footer beside the photograph.
 */
export const FRAME_LEFT_ATTR = "data-frame-left"

/**
 * The same for a photograph run to the page's right edge, or a page whose
 * words keep to a column short of it: where the page's frame ends. Profile's
 * page with the portrait at the right ends its footer at the portrait's edge
 * (`layouts/compositions/credo.tsx`). Handed to the motif as `frameRight`.
 */
export const FRAME_RIGHT_ATTR = "data-frame-right"

/**
 * The attribute a face's drawing carries when something of its own (a
 * chart's legend) sits at the bottom left where the footer's words would
 * start: the motif then packs the footer's words to its right end. Handed to
 * the motif as `footerPack: "end"`.
 */
export const FOOTER_PACK_ATTR = "data-footer-pack"

/** The first value of `attr` in a drawing that `accept` takes, or `undefined` when none carries it. */
function treeAttr<T>(node: ReactNode, attr: string, accept: (value: unknown) => value is T): T | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = treeAttr(child, attr, accept)
      if (found !== undefined) return found
    }
    return undefined
  }
  if (!isValidElement(node)) return undefined
  const props = node.props as Record<string, unknown> & { children?: ReactNode }
  const own = props[attr]
  if (accept(own)) return own
  let found: T | undefined
  Children.forEach(props.children, (child) => {
    if (found === undefined) found = treeAttr(child, attr, accept)
  })
  return found
}

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value)
const packEnd = (value: unknown): value is "end" => value === "end"

/** The first `data-frame-left` in a drawing, as a number, or `undefined` when none says where the frame starts. */
export function treeFrameLeft(node: ReactNode): number | undefined {
  return treeAttr(node, FRAME_LEFT_ATTR, finite)
}

/** The first `data-frame-right` in a drawing, as a number, or `undefined` when none says where the frame ends. */
export function treeFrameRight(node: ReactNode): number | undefined {
  return treeAttr(node, FRAME_RIGHT_ATTR, finite)
}

/** `"end"` when a drawing asks the footer's words packed to the right, `undefined` otherwise. */
export function treeFooterPack(node: ReactNode): "end" | undefined {
  return treeAttr(node, FOOTER_PACK_ATTR, packEnd)
}
