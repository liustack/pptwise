import { createElement } from "react"
import type { PptxIR, Slide } from "@/ir"
import { svgToOps, type Op } from "../pptx/svg2pptx/dispatch"
import { FullSlideSvg } from "./full-slide-svg"
import { renderSvgMarkup, parseSvgRoot } from "./serialize"

/**
 * Export-side entry: render one slide through the single source. `FullSlideSvg`
 * is the same component the preview mounts, so the exported DrawingML matches the
 * preview by construction. Lives in a `.tsx` so `pptx-generate.ts` stays JSX-free.
 */
export function slideToSvgMarkup(ir: PptxIR, slide: Slide, index: number): string {
  return renderSvgMarkup(createElement(FullSlideSvg, { ir, slide, index }))
}

/** One slide's export render: what svg2pptx will draw, and what got lost doing it. */
export interface SlideRender {
  ops: Op[]
  /**
   * How many content blocks this slide lost — the sum of every
   * `data-dropped` marker in its markup, whether the page-level drop path
   * (`DroppedContentMarker`) or a component declaring its own cut. Nothing
   * on a slide ever says a drop happened, so every drop counts here and
   * `checkContentDropGate` (`../pptx/generate.ts`) refuses the export.
   */
  dropped: number
}

/**
 * Render a slide to pptxgenjs ops via single-source SVG → svg2pptx, and
 * count the content the layout dropped on the way. Both come out of one
 * render and one parse, which is why `generatePptxBlob`'s content-drop gate
 * (`../pptx/generate.ts`) costs nothing beyond the work the export already
 * does — and why it reads the exact markup that becomes the file, rather
 * than a second render that could in principle disagree with it.
 */
export function slideToRender(ir: PptxIR, slide: Slide, index: number): SlideRender {
  const root = parseSvgRoot(slideToSvgMarkup(ir, slide, index))
  const dropped = Array.from(root.querySelectorAll("[data-dropped]")).reduce(
    (sum, el) => sum + (Number(el.getAttribute("data-dropped")) || 0),
    0,
  )
  return { ops: svgToOps(root), dropped }
}

/** Render a slide to pptxgenjs ops via single-source SVG → svg2pptx. */
export function slideToOps(ir: PptxIR, slide: Slide, index: number): Op[] {
  return slideToRender(ir, slide, index).ops
}
