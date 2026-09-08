/**
 * Authored leftover-count phrasing and ellipsis substitutes.
 *
 * A slide writes the value itself. These patterns are the leftover plus-count,
 * remainder-count, and ellipsis forms gallery L1 already flags in painted SVG.
 * validate walks string leaves with the same patterns so the authoring model
 * can rewrite before a page is painted.
 */

export const OVERFLOW_MARKER = /\+\d+\s*(…|\.{3}|more|项)/i
export const OVERFLOW_MARKER_ZH = /另有\s*\d+\s*项/
export const OVERFLOW_ELLIPSIS = /…|(?<![.])\.\.\.(?![.])/

export const OVERFLOW_VOCABULARY_CODE = "overflow-vocabulary"

/** Public validate wording. Never stand in for missing content with a leftover count or an ellipsis. */
export const OVERFLOW_VOCABULARY_MESSAGE =
  "overflow-vocabulary: write the value itself as data, not a count of what was left out"

export function findOverflowVocabulary(text: string): { pattern: string; match: string } | undefined {
  const marker = OVERFLOW_MARKER.exec(text)
  if (marker) return { pattern: "OVERFLOW_MARKER", match: marker[0] }
  const zh = OVERFLOW_MARKER_ZH.exec(text)
  if (zh) return { pattern: "OVERFLOW_MARKER_ZH", match: zh[0] }
  const ellipsis = OVERFLOW_ELLIPSIS.exec(text)
  if (ellipsis) return { pattern: "OVERFLOW_ELLIPSIS", match: ellipsis[0] }
  return undefined
}

/** Recursively visit every string leaf. Paths are zod-style (`slides.1.components.0.items.2`). */
export function visitStringLeaves(
  value: unknown,
  path: string,
  visit: (path: string, text: string) => void,
): void {
  if (typeof value === "string") {
    visit(path, value)
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => visitStringLeaves(item, `${path}.${i}`, visit))
    return
  }
  if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      visitStringLeaves(child, path ? `${path}.${key}` : key, visit)
    }
  }
}
