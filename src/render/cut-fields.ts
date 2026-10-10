import type { Slide } from "@/ir"
import { truncationSources, type TruncationTier } from "../ir/truncation-tiers"
import { stripEmphasis } from "./emphasis"

/**
 * The cut lines on a rendered page, each with the field it was cut from and
 * that field's tier (`ir/truncation-tiers.ts`).
 *
 * A face declares a cut on the element it cut (`data-truncated="1"`) and
 * says nothing about which field it was: the same fit routine sets a
 * heading, a kicker and a card's sentence. So the line is read against the
 * slide, the way the source-line check reads a page (`audit/source-line.ts`):
 * a cut line shows an unbroken run of the field it came from, ending before
 * that field ends. A face may set its own words before it on the same line
 * (a number, "Source:"), so what has to match is the line's tail. The field
 * whose text holds the longest such tail is the one that was cut, a hard
 * field winning a tie. A line that matches no field of the page is the
 * face's own furniture.
 *
 * A text its block had no line for at all shows nothing to match. Its mark
 * carries the words it left out (`data-omitted`, `components/omitted-text.tsx`),
 * and the field holding exactly those words is the one left out.
 *
 * Read on demand only: a page with no `data-truncated` never reaches here.
 */
export interface CutLine {
  /** The cut line as the page shows it, or the words left out of it. */
  readonly text: string
  /** The field had no line at all: `text` is every word of it. */
  readonly omitted?: true
  /** The slide field it was cut from, such as `heading` or `components.0.items.2.text`. Absent for the face's own furniture. */
  readonly field?: string
  readonly tier: TruncationTier
}

/** The shortest tail of a cut line that names the field it came from, unless the line is shorter. */
const MIN_TAIL = 6

/** What a renderer may change about text without changing its words: case, spaces, the ellipsis a fit appends. */
function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/gu, "").replace(/…|\.\.\.$/gu, "")
}

/** How long a tail of `line` runs inside `field` and stops before the field ends. */
function cutTail(line: string, field: string): number {
  for (let at = 0; at < line.length; at += 1) {
    const tail = line.slice(at)
    let from = field.indexOf(tail)
    while (from >= 0) {
      if (from + tail.length < field.length) return tail.length
      from = field.indexOf(tail, from + 1)
    }
  }
  return 0
}

/** The cut lines of `root`, a page rendered from `slide`. */
export function cutLines(root: Element, slide: Slide): CutLine[] {
  const elements = Array.from(root.querySelectorAll('[data-truncated="1"]'))
  if (elements.length === 0) return []
  const sources = truncationSources(slide).map((source) => ({ ...source, plain: normalize(stripEmphasis(source.text)) }))
  return elements.map((el) => {
    const omitted = el.getAttribute("data-omitted")
    if (omitted !== null) {
      const words = normalize(stripEmphasis(omitted))
      const matches = sources.filter((source) => source.plain === words)
      const found = matches.find((source) => source.tier === "hard") ?? matches[0]
      return found === undefined ? { text: omitted, tier: "declared" as const, omitted: true as const } : { text: omitted, field: found.field, tier: found.tier, omitted: true as const }
    }
    const text = (el.textContent ?? "").trim()
    const line = normalize(text)
    let best: { field: string; tier: TruncationTier; length: number } | undefined
    for (const source of sources) {
      const length = cutTail(line, source.plain)
      if (length === 0) continue
      if (best === undefined || length > best.length || (length === best.length && source.tier === "hard" && best.tier !== "hard")) {
        best = { field: source.field, tier: source.tier, length }
      }
    }
    // A few letters turn up in any long field, so a tail names its field only
    // when it is six characters or the whole line.
    if (best === undefined || best.length < Math.min(MIN_TAIL, line.length)) return { text, tier: "declared" as const }
    return { text, field: best.field, tier: best.tier }
  })
}

/** Whether a page rendered from `slide` cut any of its hard fields. */
export function cutsHardField(root: Element, slide: Slide): boolean {
  return cutLines(root, slide).some((line) => line.tier === "hard")
}
