/**
 * Whether one page's content fits its drawn page (`pptwise inspect --fit`).
 *
 * Counts cannot answer this. A face declares its body capacity as a number
 * of components, and a page of one short paragraph plus a long table passes
 * every count and still loses the table when it is laid out (`../api.ts`'s
 * note on `generatePptx`). So this check draws the page, through the same
 * single source the export draws it with, and reads the drop count from the
 * same step the export's content-drop gate reads it from (`drawSlide`,
 * `../render/render-slide.tsx`). There is no second layout here and no
 * estimate: `fits` is the export gate's own verdict for this page.
 *
 * It also reports what the page gave up without losing content, since an
 * author deciding whether to shorten a page wants to know: text the drawing
 * cut to fit (`data-truncated`, which the export allows and `audit` reports),
 * and a face that declined the page so a plainer rendering could draw all of
 * it (`data-face-mode`, and the takeover faces' own fallbacks).
 */
import type { PptxIR } from "../ir"
import { dropPhrase, type DropKind } from "../render/drop-marker"
import { drawSlide } from "../render/render-slide"
import { STEP_ASIDE_ATTR } from "../render/step-aside"
import type { ThemeDefinition } from "../themes/definitions"
import { pageIndex } from "./page-contract"

export interface PageFit {
  /** Nothing dropped: the export's content-drop gate passes this page. */
  fits: boolean
  /** What the drawing lost, per unit, in the words the export gate uses. */
  dropped: { kind: DropKind; count: number; what: string }[]
  /** Text the drawing cut to fit. The export allows it, and audit reports it. */
  truncated: string[]
  /** The bound face declined the page, and a plainer rendering drew all of it. */
  steppedAside: boolean
}

/**
 * The markers a face or takeover writes when it hands its page to a plainer
 * rendering: the shared step-aside (`../render/step-aside.tsx`) and the two
 * image takeover fallbacks (`../render/image-pages.tsx`).
 */
const FALLBACK_SELECTOR = [
  `[${STEP_ASIDE_ATTR}="fallback"]`,
  '[data-takeover-mode="fallback"]',
  '[data-annotate-mode="fallback"]',
].join(", ")

/**
 * Draw the page with id `pageId` and report what it keeps. `ir` is a
 * validated deck with its local assets resolved, the input the export draws.
 */
export function pageFit(ir: PptxIR, pageId: string, opts: { theme: ThemeDefinition }): PageFit {
  const index = pageIndex(ir, pageId)
  const { root, dropped, drops } = drawSlide(ir, ir.slides[index]!, index, opts.theme)
  return {
    fits: dropped === 0,
    dropped: drops.map((drop) => ({ ...drop, what: dropPhrase(drop.kind, drop.count) })),
    truncated: Array.from(root.querySelectorAll('[data-truncated="1"]')).map((el) => (el.textContent ?? "").trim()),
    steppedAside: root.querySelector(FALLBACK_SELECTOR) !== null,
  }
}
