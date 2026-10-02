/**
 * v3 master-builder — single-source SVG era.
 *
 * The full-page SVG (FullSlideSvg → svg2pptx) now paints background, brand logo
 * and brand footer on every slide, so the masters are intentionally empty.
 * The footer's page number, when a deck asks for one, is drawn on the slide
 * itself and exported as PowerPoint's slide-number field, which renumbers
 * when slides move (`pptx-slide-number.ts`). No master carries a
 * placeholder for it.
 */
import type pptxgen from "pptxgenjs"
import type { StyleTokens, LayoutType } from "../themes"

const SLIDE_TYPES: LayoutType[] = ["cover", "chapter", "content", "ending"]

/** Define one master per slide type. 母版不放页码占位（页码随页脚画在页面上，导出为原生字段）。 */
export function defineMastersForIR(pptx: pptxgen, _tokens: StyleTokens) {
  for (const type of SLIDE_TYPES) {
    pptx.defineSlideMaster({ title: type })
  }
}
