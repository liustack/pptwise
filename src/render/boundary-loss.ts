/**
 * What a cover, chapter or ending page loses when its face draws it, asked
 * by drawing it.
 *
 * A boundary face has no step-aside sheet to give a page to. What it cannot
 * set it cuts and marks (`data-truncated`) or leaves off and marks
 * (`data-dropped`), and the author used to learn of either from the audit
 * or the export, after the deck was written. The heading has a declared fit
 * of its own (`../layouts/heading-set.ts`). The rest of what a face sets
 * does not, and how much room it gets moves with everything else on the
 * page: a subheading sits beside a button whose width is the author's own
 * words, a row of cards stands under however many lines the heading took.
 * No number declared beside the face could say that without drawing the
 * page again in other code.
 *
 * So validate asks the face's own drawing, the same one the export reads
 * (`slideToSvgMarkup`), with the marks the export and the audit read
 * (`cutLines`, `data-dropped`). A page validate passes is then one the face
 * draws without those marks, by construction.
 */
import type { PptxIR, Slide } from "@/ir"
import type { ThemeDefinition } from "../themes/definitions"
import { cutLines } from "./cut-fields"
import { droppedIn, slideToSvgMarkup } from "./render-slide"
import { parseSvgRoot } from "./serialize"

/** What one drawing of a page lost: how much it declared dropped, and which of the page's fields it cut. */
export interface PageLoss {
  dropped: number
  /** The slide fields a cut line came from (`heading`, `subheading`, `components.0.items.2`). */
  cut: readonly string[]
}

/** Draw page `index` of `ir` and read what it lost. */
export function drawnLoss(ir: PptxIR, index: number, theme: ThemeDefinition): PageLoss {
  const slide = ir.slides[index]!
  const markup = slideToSvgMarkup(ir, slide, index, theme)
  if (!markup.includes("data-dropped") && !markup.includes('data-truncated="1"')) return { dropped: 0, cut: [] }
  const root = parseSvgRoot(markup)
  return {
    dropped: droppedIn(root).dropped,
    cut: cutLines(root, slide).flatMap((line) => (line.field === undefined ? [] : [line.field])),
  }
}

/** `ir` with page `index`'s own fields replaced, a field set to undefined taken off. */
export function withPageFields(ir: PptxIR, index: number, fields: Partial<Pick<Slide, "heading" | "subheading">>): PptxIR {
  const slides = ir.slides.map((slide, i) => {
    if (i !== index) return slide
    const next = { ...slide, ...fields } as Record<string, unknown>
    for (const [key, value] of Object.entries(fields)) if (value === undefined) delete next[key]
    return next as unknown as Slide
  })
  return { ...ir, slides }
}

/**
 * How a face sets a subheading on this page: whole, cut (a cut line from
 * the subheading), or declined (the page drops more with it than without
 * it).
 */
export type SubheadingVerdict = "whole" | "cut" | "declined"

/**
 * The page's subheading verdict for any text in its place, the rest of the
 * page as it stands. The page without a subheading is drawn at most once,
 * to tell what the subheading itself costs from what the page drops anyway.
 */
export function subheadingSet(ir: PptxIR, index: number, theme: ThemeDefinition): (text: string) => SubheadingVerdict {
  let bare: number | undefined
  return (text) => {
    const loss = drawnLoss(withPageFields(ir, index, { subheading: text }), index, theme)
    if (loss.cut.includes("subheading")) return "cut"
    if (loss.dropped === 0) return "whole"
    bare ??= drawnLoss(withPageFields(ir, index, { subheading: undefined }), index, theme).dropped
    return loss.dropped > bare ? "declined" : "whole"
  }
}
