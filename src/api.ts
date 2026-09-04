/**
 * Public API surface: validateIr's own logic lives in `./validate-core`
 * (P2 browser-distribution wave, task 1 — see that file's own doc comment
 * for why) and is re-exported below unchanged, so every existing consumer
 * of this module keeps working exactly as before. `renderSlideSvg` and
 * `generatePptx` stay defined here — this is the one file allowed to reach
 * into `./render/render-slide` and `./pptx/generate` (react-dom/server, jszip,
 * pptxgenjs).
 */
export {
  validateIr,
  formatIssues,
  formatWarnings,
  listThemes,
  irJsonSchema,
  type ValidateResult,
  type ValidationIssue,
  type ThemeInfo,
} from "./validate-core"

import { PptwiseError } from "./errors"
import type { PptxIR } from "./ir"
import { generatePptxBlob } from "./pptx/generate"
import { slideToSvgMarkup } from "./render/render-slide"
import { formatIssues, validateIr } from "./validate-core"

/** Render a single slide to standalone SVG markup (preview / self-check). */
export function renderSlideSvg(ir: PptxIR, slideIndex: number): string {
  const slide = ir.slides[slideIndex]
  if (!slide) {
    throw new PptwiseError(`slide index ${slideIndex} out of range — deck has ${ir.slides.length} slides`)
  }
  return slideToSvgMarkup(ir, slide, slideIndex)
}

/**
 * Draft gate (W5 task 1): `generatePptx` refuses to export a deck that still
 * has unfilled `placeholder` pages unless the caller opts in with
 * `{ draft: true }` — a placeholder page is assemble's stand-in for content
 * nobody has written yet, so a plain export silently shipping it would be a
 * worse failure mode than a loud one. `renderSlideSvg` (single-slide
 * preview) deliberately never calls this — an agent iterating on a
 * partially-filled deck needs to preview whatever page it just wrote without
 * every other still-empty page blocking it.
 */
function checkDraftGate(ir: PptxIR): void {
  const placeholders = ir.slides
    .map((slide, i) => ({ slide, page: i + 1 }))
    .filter(({ slide }) => slide.placeholder)
  if (placeholders.length === 0) return
  const refs = placeholders
    .map(({ slide, page }) => (slide.id ? `${slide.id} (page ${page})` : `page ${page}`))
    .join(", ")
  throw new PptwiseError(
    `deck has ${placeholders.length} unfilled placeholder page${placeholders.length === 1 ? "" : "s"}: ${refs} — fill them or pass --draft`,
  )
}

/**
 * Full pipeline: validate → SVG → DrawingML → animation patches → pptx bytes.
 *
 * Two export gates, both "refuse to hand over a deliverable the caller
 * cannot see is broken, unless they say they know": `draft` skips the
 * unfilled-placeholder gate above, `allowDroppedContent` skips the
 * content-drop gate (`checkContentDropGate` in `./pptx/generate` — it lives
 * there because only a real layout can answer it, and the export renders
 * every slide there already).
 *
 * **Why `validateIr` does not answer the drop question too** (decided
 * 2026-09-04, after a review asked for it and an implementation was built
 * and measured). Validation stays structural: schema, menu, declared
 * capacity — everything answerable without laying the page out. Whether a
 * page's components actually fit the rect its bound face gives them is a
 * different question, and a face declares its body capacity as a count
 * (`capacity: 4`), which cannot express "this rect is 328px tall". So a page
 * of one short paragraph plus a five-row table passes every count-based
 * check and still loses the table at render.
 *
 * That page is not a silent loss. The export refuses it by name and says
 * what it would lose, and the author has to shorten the page or say
 * `allowDroppedContent` out loud. Moving that refusal up into `validateIr`
 * was tried: it makes validate as expensive as a render, and because
 * `generatePptx` validates first it kills the opt-in outright — the deck
 * fails validation before it can ever reach the gate whose whole purpose is
 * to let a caller through. It broke 46 tests across 10 files, all of them
 * pinning that two-stage arrangement.
 *
 * So the split is deliberate, not an oversight: structural answers here,
 * layout-aware refusal at the export, one explicit opt-in between them. A
 * page that renders short is caught loudly, once, at the moment it would
 * become a file. Tightening this means giving faces a real geometric
 * capacity to declare, not making validate render.
 */
export async function generatePptx(
  input: unknown,
  opts?: { draft?: boolean; allowDroppedContent?: boolean },
): Promise<Uint8Array> {
  const v = validateIr(input)
  if (!v.ok) throw new PptwiseError(`invalid IR:\n${formatIssues(v.errors)}`)
  if (!opts?.draft) checkDraftGate(v.ir!)
  const blob = await generatePptxBlob(v.ir!, { allowDroppedContent: opts?.allowDroppedContent })
  return new Uint8Array(await blob.arrayBuffer())
}
