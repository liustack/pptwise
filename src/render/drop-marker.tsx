/**
 * Page-level content loss: `layoutContentFit` could not fit `count` blocks
 * into the content area and left them out entirely.
 *
 * Recorded, never painted. The visible overflow count this used to draw was a
 * maintainer's debug affordance that reached customer slides (visual review
 * 2026-08-15) and nobody outside this repo can read it. A slide tells its
 * story with the least language it can: it carries no count of what it left
 * out, no trailing sign, no bookkeeping of any kind. So the drop is
 * invisible on the page, which is exactly why the export refuses to ship it
 * (`checkContentDropGate`, `../pptx/generate.ts`).
 *
 * `data-dropped` is the whole protocol, and it means both things at once:
 * content was lost, and the slide does not say so. There is no second,
 * gentler category — every component that cuts its own items declares the
 * same way and stops the same export (`components/bullets.tsx`,
 * `data-table.tsx`, `timeline.tsx` and the rest). Visible truncation of the
 * text itself stays separate and stays allowed: that is `data-truncated`.
 */
export function DroppedContentMarker({ count }: { count: number }) {
  if (count <= 0) return null
  return <g data-dropped={count} />
}
