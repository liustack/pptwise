/**
 * The part of the page an `<image>` actually paints.
 *
 * An `<image>` paints its `x`, `y`, `width` and `height`, unless it is cut by
 * a `clip-path` that names a `<clipPath>` of one rectangle: the shape a
 * cropped picture is drawn with (`render/cropped-image.tsx`), the only clip
 * the exportable subset admits (`render/subset-validate.ts`). Then it paints
 * where the two boxes overlap. Everything that reads where a picture lies
 * reads it here: the export's crop (`pptx/svg2pptx/image.ts`), the audit's
 * backgrounds and the depth contract, so none of them takes a picture drawn
 * whole and cut down for one that covers the page.
 *
 * Coordinates are the image's own, before any transform its ancestors
 * carry: the clip rectangle stands in the same user space.
 */

export interface ImageBox {
  x: number
  y: number
  w: number
  h: number
}

/** The id a `clip-path="url(#id)"` names, or `null`. */
export function clipRefId(value: string | null | undefined): string | null {
  const m = value?.trim().match(/^url\((["']?)#([^"')]+)\1\)$/)
  return m ? m[2]! : null
}

/** The one rectangle a `<clipPath>` holds, or `null` when it holds anything else. */
export function clipRect(clip: Element | null | undefined): ImageBox | null {
  if (!clip || clip.tagName.toLowerCase() !== "clippath") return null
  const children = Array.from(clip.children)
  if (children.length !== 1) return null
  const rect = children[0]!
  if (rect.tagName.toLowerCase() !== "rect" || rect.hasAttribute("transform") || clip.hasAttribute("transform")) return null
  const units = clip.getAttribute("clipPathUnits")
  if (units && units !== "userSpaceOnUse") return null
  const n = (name: string) => Number(rect.getAttribute(name) ?? 0) || 0
  return { x: n("x"), y: n("y"), w: n("width"), h: n("height") }
}

/** The `<clipPath>` element an element's `clip-path` names, looked up in its document. */
export function clipFor(el: Element): Element | null {
  const id = clipRefId(el.getAttribute("clip-path"))
  if (!id) return null
  const doc = el.ownerDocument
  const found = doc?.querySelector?.(`[id="${id.replace(/"/g, '\\"')}"]`) ?? null
  return found
}

/** The box an `<image>` is drawn in, before any clip. */
export function drawnImageBox(el: Element): ImageBox {
  const n = (name: string) => Number(el.getAttribute(name) ?? 0) || 0
  return { x: n("x"), y: n("y"), w: n("width"), h: n("height") }
}

/** The box an `<image>` paints: its own, cut by a one-rectangle clip when it has one. */
export function visibleImageBox(el: Element): ImageBox {
  const drawn = drawnImageBox(el)
  const clip = clipRect(clipFor(el))
  if (!clip) return drawn
  const x = Math.max(drawn.x, clip.x)
  const y = Math.max(drawn.y, clip.y)
  const right = Math.min(drawn.x + drawn.w, clip.x + clip.w)
  const bottom = Math.min(drawn.y + drawn.h, clip.y + clip.h)
  return { x, y, w: Math.max(0, right - x), h: Math.max(0, bottom - y) }
}
