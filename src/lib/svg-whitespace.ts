/**
 * SVG's whitespace rules, in the one place both consumers read them.
 *
 * Two things in this repo have to agree about which characters a `<text>`
 * actually paints: `svg2pptx/text.ts`, which turns those characters into
 * OOXML runs, and the gallery's ink-containment scan, which measures how wide
 * they are. When they disagree, the export ships one string and the geometry
 * gate checks another.
 *
 * The rules, per [CSS Text](https://www.w3.org/TR/css-text-3/) and
 * [SVG 2 text](https://www.w3.org/TR/SVG2/text.html):
 *
 *  - Under the default mode, every run of whitespace collapses to one space,
 *    and whitespace at the two ends of the text is dropped. **The character
 *    stream is what collapses, not each element separately**: two adjacent
 *    spaces either side of a tspan boundary are still two adjacent spaces,
 *    and the page paints one. Collapsing run by run leaves both.
 *  - Under `xml:space="preserve"`, every character stands. `code.tsx` sets it
 *    on each code line because the indentation is the author's content.
 *
 * Position attributes are applied *after* this step, to the surviving
 * characters — which is why this runs before anything is laid out.
 */

/**
 * The characters SVG and CSS call *document whitespace*: the ones a default
 * `white-space` collapses. Space, tab, and the segment breaks.
 *
 * Deliberately not JavaScript's `\s`, which also matches NBSP, the narrow
 * no-break space, the ideographic space and the rest of the Unicode space
 * separators. Those are content — an author writing a no-break space means
 * the glyph to stay — and folding them into one ordinary space rewrites what
 * was written and measures it narrow. `String.trim()` has the same over-broad
 * reach, which is why nothing here uses it either.
 */
const DOCUMENT_WHITESPACE_RUN = /[ \t\r\n\f\v]+/g

/** One run of characters, with the whitespace mode it was written under. */
export interface WhitespaceRun {
  readonly text: string
  /** `xml:space="preserve"`, inherited from the element or its ancestors. */
  readonly preserve?: boolean
}

/**
 * The text each run actually paints, index-aligned with the input.
 *
 * A run can come back empty — it collapsed away entirely — and the caller
 * decides what that means for whatever metadata it hangs off that run.
 */
export function collapseWhitespaceRuns(runs: readonly WhitespaceRun[]): string[] {
  const out: string[] = []
  // Seeded `true` so whitespace at the very start of the text is dropped by
  // the same rule that drops it between two runs.
  let lastCharWasCollapsible = true
  for (const run of runs) {
    if (run.preserve) {
      out.push(run.text)
      if (run.text.length > 0) lastCharWasCollapsible = /[ \t\r\n\f\v]$/.test(run.text)
      continue
    }
    let text = run.text.replace(DOCUMENT_WHITESPACE_RUN, " ")
    if (lastCharWasCollapsible) text = text.replace(/^ /, "")
    if (text.length > 0) lastCharWasCollapsible = text.endsWith(" ")
    out.push(text)
  }
  // Trailing whitespace at the end of the text goes too, and never inside a
  // preserved run.
  for (let i = out.length - 1; i >= 0; i--) {
    if (runs[i]!.preserve) break
    if (out[i] === "") continue
    out[i] = out[i]!.replace(/ $/, "")
    break
  }
  return out
}

/** True when this element or an ancestor asks for `xml:space="preserve"`. */
export function preservesWhitespace(el: Element, inherited: boolean): boolean {
  const declared = el.getAttribute("xml:space") ?? el.getAttribute("xmlSpace")
  if (declared === "preserve") return true
  if (declared === "default") return false
  return inherited
}
