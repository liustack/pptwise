import { createElement } from "react"
import type { PptxIR, Slide } from "@/ir"
import { svgToOps, type Op } from "../pptx/svg2pptx/dispatch"
import { FullSlideSvg } from "./full-slide-svg"
import { renderSvgMarkup, parseSvgRoot } from "./serialize"
import { parseDropKind, type DropKind } from "./drop-marker"
import type { ThemeDefinition } from "../themes/definitions"

/**
 * Export-side entry: render one slide through the single source. `FullSlideSvg`
 * is the same component the preview mounts, so the exported DrawingML matches the
 * preview by construction. Lives in a `.tsx` so `pptx-generate.ts` stays JSX-free.
 */
export function slideToSvgMarkup(ir: PptxIR, slide: Slide, index: number, theme: ThemeDefinition): string {
  return renderSvgMarkup(createElement(FullSlideSvg, { ir, slide, index, theme }))
}

/** What one slide's drawing lost: the content-drop verdict for that page. */
export interface SlideDrops {
  /**
   * How much this slide lost — the sum of every `data-dropped` marker in its
   * markup, whether the page-level drop path (`DroppedContentMarker`) or a
   * component declaring its own cut. Nothing on a slide ever says a drop
   * happened, so every drop counts here and `checkContentDropGate`
   * (`../pptx/generate.ts`) refuses the export.
   */
  dropped: number
  /**
   * The same loss broken down by what was lost, in input order and merged
   * per unit. One number could only ever be called "content blocks", which
   * was a lie about the chart that dropped fourteen series names, so the
   * unit travels with the count (`data-dropped-kind`, `./drop-marker.tsx`).
   */
  drops: readonly { kind: DropKind; count: number }[]
}

/** One slide's export render: what svg2pptx will draw, and what got lost doing it. */
export interface SlideRender extends SlideDrops {
  ops: Op[]
}

/** One slide drawn and parsed: the root svg2pptx converts, and what it lost. */
export interface DrawnSlide extends SlideDrops {
  root: Element
}

/**
 * Draw one slide through the single source, parse it once, and count the
 * content the layout dropped on the way.
 *
 * This is the one place a page's drop verdict is read. The export converts
 * this root to ops and gates on these counts (`slideToRender` below), and
 * `pptwise inspect --fit` (`../inspect/page-fit.ts`) reports the same counts
 * for one page, so the single-page check and the export cannot disagree
 * about what a page loses.
 */
export function drawSlide(ir: PptxIR, slide: Slide, index: number, theme: ThemeDefinition): DrawnSlide {
  const root = parseSvgRoot(slideToSvgMarkup(ir, slide, index, theme))
  const byKind = new Map<DropKind, number>()
  let dropped = 0
  for (const el of Array.from(root.querySelectorAll("[data-dropped]"))) {
    const count = Number(el.getAttribute("data-dropped")) || 0
    if (count <= 0) continue
    const kind = parseDropKind(el.getAttribute("data-dropped-kind"))
    byKind.set(kind, (byKind.get(kind) ?? 0) + count)
    dropped += count
  }
  const drops = Array.from(byKind, ([kind, count]) => ({ kind, count }))
  return { root, dropped, drops }
}

/**
 * Render a slide to pptxgenjs ops via single-source SVG → svg2pptx, and
 * count the content the layout dropped on the way. Both come out of one
 * render and one parse ({@link drawSlide}), which is why
 * `generatePptxBlob`'s content-drop gate (`../pptx/generate.ts`) costs
 * nothing beyond the work the export already does — and why it reads the
 * exact markup that becomes the file, rather than a second render that could
 * in principle disagree with it.
 */
export function slideToRender(ir: PptxIR, slide: Slide, index: number, theme: ThemeDefinition): SlideRender {
  const { root, dropped, drops } = drawSlide(ir, slide, index, theme)
  return { ops: svgToOps(root), dropped, drops }
}

/** Render a slide to pptxgenjs ops via single-source SVG → svg2pptx. */
export function slideToOps(ir: PptxIR, slide: Slide, index: number, theme: ThemeDefinition): Op[] {
  return slideToRender(ir, slide, index, theme).ops
}
