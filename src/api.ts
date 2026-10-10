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
import type { ThemeDefinition } from "./themes/definitions"
import { resolveIrTheme } from "./themes/resolve-ir-theme"
import { formatIssues, validateIr } from "./validate-core"

/**
 * Options shared by the entry points that draw a page. `theme` is the bound
 * theme's definition, passed by value from whoever resolved it (the CLI's
 * name lookup, or an SDK caller's own object). Omitted, `ir.theme.id` names
 * a built-in or an SDK-registered theme, and an unknown id is an error.
 * Either way the entry point resolves it once (`resolveIrTheme`) and the
 * render chain below only ever sees the definition.
 */
export interface RenderThemeOptions {
  theme?: ThemeDefinition
}

/** Render a single slide to standalone SVG markup (preview / self-check). */
export function renderSlideSvg(ir: PptxIR, slideIndex: number, opts?: RenderThemeOptions): string {
  const slide = ir.slides[slideIndex]
  if (!slide) {
    throw new PptwiseError(`slide index ${slideIndex} out of range — deck has ${ir.slides.length} slides`)
  }
  return slideToSvgMarkup(ir, slide, slideIndex, resolveIrTheme(ir, opts?.theme))
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
 * **Why `validateIr` answers the drop question too** (decided 2026-10-10,
 * reversing the 2026-09-04 decision that kept validate structural).
 * validate now draws every content page as the export will and refuses one
 * that would lose anything (`checkContentPagesDrawn` in `./validate-core`),
 * so a deck validate passes is one the export draws whole. That made the
 * opt-in unreachable, since this function validates first. So
 * `allowDroppedContent` is handed to `validateIr` as well, where it skips
 * that one gate and nothing else, and the deck reaches the export gate
 * whose whole purpose is to let a caller through, naming what is lost.
 */
export async function generatePptx(
  input: unknown,
  opts?: { draft?: boolean; allowDroppedContent?: boolean } & RenderThemeOptions,
): Promise<Uint8Array> {
  const v = validateIr(input, { theme: opts?.theme, allowDroppedContent: opts?.allowDroppedContent })
  if (!v.ok) throw new PptwiseError(`invalid IR:\n${formatIssues(v.errors)}`)
  if (!opts?.draft) checkDraftGate(v.ir!)
  // `v.theme` is what validation just resolved — the caller's own
  // definition, or the installed theme `ir.theme.id` names. Passing it on
  // keeps the omitted-option path to a single table read for the whole
  // export instead of one here and one inside `generatePptxBlob`.
  const blob = await generatePptxBlob(v.ir!, { allowDroppedContent: opts?.allowDroppedContent, theme: v.theme })
  return new Uint8Array(await blob.arrayBuffer())
}
