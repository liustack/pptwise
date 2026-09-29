/**
 * A page that prints the same words twice, read the way a reader reads it.
 *
 * Text is compared with all whitespace removed, because a wrapped line is
 * split across elements at a break the reader never sees. Only that spelling
 * catches a sentence that is wrapped in one place and whole in another: the
 * whole copy is one `<text>`, and the wrapped copy is its lines laid end to
 * end in the page's own reading order.
 *
 * That still missed a line wrapped in *both* places. `show-gallery` sets each
 * caption as two `<text>` lines of about seven characters, and when two of
 * its frames printed the same caption, every single element was shorter than
 * {@link MIN_RUN}, so no element was long enough to be looked for. The lines
 * of one paragraph are now joined back into the run the reader sees, and
 * that run is looked for as well.
 */

import { getPlatform } from "@/platform/registry"

/** The shortest run worth calling a repetition. A word is not a repetition. */
export const MIN_RUN = 12

/**
 * What a wrapped line shares with the line above it. The lines of one
 * paragraph are set by one call, so they carry the same x, anchor and type,
 * and differ only in their baseline (and in `data-truncated` on the last).
 */
const PARAGRAPH_ATTRS = [
  "x",
  "text-anchor",
  "transform",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "fill",
  "letter-spacing",
] as const

/** Farthest one baseline may sit below the one above it and still be the next line, in font sizes. */
const MAX_LINE_STEP = 2

/**
 * Whether `next` is the line after `prev` in the same paragraph: a sibling
 * under the same parent, set in the same place and type, one line height
 * lower. A text without its own numeric size and baseline is never joined.
 */
function continuesParagraph(prev: Element, next: Element): boolean {
  if (prev.parentNode !== next.parentNode) return false
  if (PARAGRAPH_ATTRS.some((name) => prev.getAttribute(name) !== next.getAttribute(name))) return false
  const size = Number(next.getAttribute("font-size"))
  const step = Number(next.getAttribute("y")) - Number(prev.getAttribute("y"))
  return size > 0 && step > 0 && step <= size * MAX_LINE_STEP
}

/**
 * Every painted run of {@link MIN_RUN} characters or more the page draws
 * twice, whitespace removed. A run is one `<text>` or one paragraph of
 * wrapped lines, and only the longest repeated run is named where one
 * contains another.
 */
export function repeatedRuns(svg: string): string[] {
  const Parser = getPlatform().domParser ?? globalThis.DOMParser
  if (!Parser) throw new Error("DOMParser unavailable")
  const root = new Parser().parseFromString(svg, "image/svg+xml").documentElement
  const texts = Array.from(root.querySelectorAll("text"))
  const runs = texts.map((el) => (el.textContent ?? "").replace(/\s+/g, ""))
  const page = runs.join("")

  const paragraphs: string[] = []
  texts.forEach((el, i) => {
    if (i > 0 && continuesParagraph(texts[i - 1]!, el)) paragraphs[paragraphs.length - 1] += runs[i]
    else paragraphs.push(runs[i]!)
  })

  const repeated = [...new Set([...runs, ...paragraphs])].filter(
    (run) => run.length >= MIN_RUN && page.split(run).length - 1 > 1,
  )
  return repeated.filter((run) => !repeated.some((other) => other !== run && other.includes(run)))
}
