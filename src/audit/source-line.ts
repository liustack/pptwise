import type { Slide } from "@/ir"
import { stripEmphasis } from "../render/emphasis"

/*
 * Whether a rendered page paints its source line.
 *
 * `slide.footnote` is text the author wrote, the same as any component field,
 * and a face has the same two postures toward it: draw it, or give the page
 * to something that does. A face that simply has no place for it used to
 * leave no trace at all: the image takeovers drew no source line on any
 * theme, and neither validate nor the audit noticed, because every drop
 * check in the engine reads a marker a face stamps on purpose and a face
 * that never looked at the field stamps nothing.
 *
 * So this check asks the rendered page directly. The source counts as
 * painted when a run of neighbouring text elements set in one face and size
 * spells it out (a source wrapped onto two lines is two elements), or when an
 * element that says it was cut (`data-truncated`) shows its opening: the cut
 * itself is the truncation check's to report.
 *
 * The comparison folds what a renderer may change without losing a word:
 * case, whitespace and the ellipsis a fit appends.
 */

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, "").replace(/…/g, "")
}

function signature(el: Element): string {
  return [el.getAttribute("font-size") ?? "", el.getAttribute("font-family") ?? ""].join("|")
}

function isCut(el: Element): boolean {
  return el.hasAttribute("data-truncated") || el.querySelector("[data-truncated]") !== null
}

/** Whether `run` ends on the first two or more characters of `needle`. */
function showsOpening(run: string, needle: string): boolean {
  for (let at = 0; at <= run.length - 2; at += 1) {
    const tail = run.slice(at)
    if (needle.startsWith(tail)) return true
  }
  return false
}

/**
 * The text elements that paint `slide`'s source line on `root`, the page's
 * rendered SVG, or `null` when no run of them does.
 */
export function sourceLineElements(root: Element, slide: Pick<Slide, "footnote">): Element[] | null {
  const needle = normalize(stripEmphasis(slide.footnote ?? ""))
  if (needle.length === 0) return null
  const texts = Array.from(root.querySelectorAll("text"))
  for (let start = 0; start < texts.length; start += 1) {
    let run = ""
    for (let i = start; i < texts.length; i += 1) {
      const el = texts[i]!
      if (i > start && signature(el) !== signature(texts[start]!)) break
      const own = normalize(el.textContent ?? "")
      run += own
      if (run.includes(needle)) return texts.slice(start, i + 1)
      // A cut source shows its opening and says so on the element that cut
      // it, alone or after another text the face set on the same line.
      if (isCut(el) && showsOpening(run, needle)) return texts.slice(start, i + 1)
      // A run that has stopped spelling the source's opening cannot spell it.
      if (!needle.startsWith(run)) break
    }
  }
  return null
}

/**
 * True when `slide` carries a source line that `root`, the page's rendered
 * SVG, never paints.
 */
export function sourceLineMissing(root: Element, slide: Pick<Slide, "footnote">): boolean {
  if (!normalize(stripEmphasis(slide.footnote ?? ""))) return false
  return sourceLineElements(root, slide) === null
}
