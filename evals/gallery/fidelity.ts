/**
 * Corpus-level content-fidelity scan.
 *
 * The rule a face lives by: it renders authored content completely, or it
 * declines the page. It never takes part of a component and drops the rest,
 * and it never conscripts `slide.heading` / `slide.subheading` to stand in
 * for content an author wrote into a component.
 *
 * This module states that rule in a form a machine can re-check on every
 * commit. For one rendered page it collects every text an author wrote into
 * a component, then asks of each one:
 *
 *   1. does it appear in the page's rendered text, or
 *   2. does an element carrying `data-truncated` render a fragment of it
 *      (the cut is on the slide, an ellipsis a reader can see), or
 *   3. does the page carry `data-dropped` (the loss is declared, and
 *      `checkContentDropGate` refuses to export the deck)?
 *
 * Anything else is content that left the author's hands and reached nobody,
 * with no trace on the page and no error anywhere. That is the failure this
 * scan exists to make impossible to reintroduce.
 *
 * The comparison deliberately normalizes hard (case, whitespace, the marks
 * a fit chain adds): a face is free to uppercase a label, wrap a sentence
 * over three lines, or set a quote one glyph per column. What it is not free
 * to do is lose the words.
 */

import type { Component, PptxIR, Slide } from "@/ir"
import type { LayoutDefinition } from "@/layouts/registry"
import { stripEmphasis } from "@/render/emphasis"
import { resolveEffectiveFace } from "@/render/layout-selection"
import { getPlatform } from "@/platform/registry"

/**
 * Component keys whose string value is machinery, not prose: a discriminator,
 * an asset handle, an icon name, a node id an edge points at, the lookup key
 * a table cell is stored under, or alt text (which reaches the page as an
 * accessibility attribute, never as painted glyphs).
 *
 * Everything not named here is treated as authored text and must reach the
 * page. Adding a key is a decision to stop checking it, so each one carries
 * its reason.
 */
const NON_TEXT_KEYS = new Set([
  // Fixed-vocabulary switches. Every one of these is a `z.enum` (or the
  // `z.literal` discriminator) in `src/ir/components/*.ts`: the author picks
  // one of a handful of words and the renderer answers with an arrow, a tint,
  // a crop, or a shape. The word itself is never meant to reach the page.
  "type",
  "kind",
  "tone",
  "style",
  "variant",
  "layout",
  "direction",
  "emphasis",
  "align",
  "delta",
  "fit",
  "intensity",
  "position",
  "elements",
  "transition",
  "image_side",
  "device",
  "chart_type",
  // Handles and pointers, not prose.
  "asset_id", // asset handle
  "icon", // icon name from a fixed set
  "alt", // accessibility attribute, carried as aria-label, never painted
  "url", // link target
  "ref", // citation ref, painted only where a face opts in
  "from", // flowchart edge endpoint: a node id
  "to", // flowchart edge endpoint: a node id
  "key", // data_table column key: the cell lookup, not the header text
  "id", // any identity field
  "language", // code highlighter switch, not a line of the listing
])

export interface AuthoredText {
  /** Where in the slide's components this string was written. */
  readonly path: string
  /** The author's text, emphasis markers stripped. */
  readonly text: string
}

function walk(value: unknown, path: string, out: AuthoredText[]): void {
  if (typeof value === "string") {
    const text = stripEmphasis(value).trim()
    if (text.length > 0) out.push({ path, text })
    return
  }
  if (Array.isArray(value)) {
    value.forEach((entry, i) => walk(entry, `${path}[${i}]`, out))
    return
  }
  if (value !== null && typeof value === "object") {
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (NON_TEXT_KEYS.has(key)) continue
      walk(entry, `${path}.${key}`, out)
    }
  }
}

/** Every authored string in one slide's components, with its IR path. */
export function authoredTexts(slide: Slide): AuthoredText[] {
  const out: AuthoredText[] = []
  slide.components.forEach((component: Component, i) => {
    walk(component, `components[${i}](${component.type})`, out)
  })
  return out
}

/**
 * Fold away every difference a face is allowed to introduce: letter case,
 * any whitespace (a wrap turns one space into a line break), the ellipsis a
 * fit chain appends, the quotation furniture a quote face paints around the
 * words it was given, and CJK punctuation — classical vertical setting
 * carries a comma as the break between columns rather than as a glyph, which
 * is typography, not a lost word.
 */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/\u2026/g, "")
    .replace(/[\u201c\u201d\u2018\u2019"']/g, "")
    .replace(/[\uff0c\u3002\uff1b\u3001\uff01\uff1f\uff1a]/g, "")
}

export interface PageFidelity {
  /** Authored texts with no trace on the page. */
  readonly missing: readonly AuthoredText[]
  readonly authored: number
}

function elementText(el: Element): string {
  return el.textContent ?? ""
}

/**
 * Checks one rendered page against the texts its slide authored.
 *
 * `svg` must be the real render-chain output for `slide` — a page rendered
 * any other way proves nothing about what ships.
 */
export function checkPageFidelity(svg: string, slide: Slide): PageFidelity {
  const Parser = getPlatform().domParser ?? globalThis.DOMParser
  if (!Parser) throw new Error("DOMParser unavailable")
  const root = new Parser().parseFromString(svg, "image/svg+xml").documentElement

  const painted = normalize(
    Array.from(root.querySelectorAll("text"))
      .map(elementText)
      .join(""),
  )
  const truncatedFragments = Array.from(root.querySelectorAll("[data-truncated]"))
    .map((el) => normalize(elementText(el)))
    .filter((fragment) => fragment.length >= 2)
  const declaredDrop = root.querySelector("[data-dropped]") !== null

  const missing = authoredTexts(slide).filter(({ text }) => {
    const needle = normalize(text)
    if (needle.length === 0) return false
    if (painted.includes(needle)) return false
    if (declaredDrop) return false
    return !truncatedFragments.some((fragment) => needle.includes(fragment))
  })
  return { missing, authored: authoredTexts(slide).length }
}

/** The slide a gallery job points at. */
export function jobSlide(ir: PptxIR, slideIndex: number): Slide {
  const slide = ir.slides[slideIndex]
  if (!slide) throw new Error(`slide ${slideIndex} missing`)
  return slide
}

/**
 * Which pages this scan speaks for.
 *
 * A face whose every slot names the component types it takes has decided to
 * read those components field by field — it is the face, not a shared
 * renderer, that chose what to paint and what to leave out. Those are the
 * faces this rule is about, and they are identifiable from the registry
 * rather than from a hand-kept list that would rot: no slot accepting
 * `"any"`.
 *
 * A face with an `"any"` slot hands its components to `SvgContent`, whose own
 * losses run through a different, already-instrumented mechanism — the
 * density gate, `data-dropped`, `deck-audit`, and an export that refuses to
 * ship the deck. Those losses are worth fixing too, and several are real
 * (chart legends, image-grid captions, `numbered_cards.sub`); they are a
 * different rule with a different fix, and folding them in here would trade
 * a check that is green and enforceable for a backlog that is neither.
 */
export function scanned(layout: LayoutDefinition | undefined): boolean {
  if (!layout) return false
  return !layout.slots.some((slot) => slot.accepts === "any")
}

/** The face a page actually renders through, or undefined when unresolved. */
export function faceOf(ir: PptxIR, slide: Slide): LayoutDefinition | undefined {
  return resolveEffectiveFace(ir, slide).layout
}

/**
 * Faces whose absorption of one field is the page's declared semantic.
 *
 * The bar is deliberately high, and it is not "we have not got to this one
 * yet". An entry states which face, which single field path, and why that
 * loss is what the page means rather than what the page failed at — and it
 * must leave a narrower loss of the same shape still detectable, so the
 * exemption cannot quietly grow into a licence.
 *
 * The table is empty. Every entry it used to carry — statement's cited
 * source, the two point faces' quote text, image-annotate's grids and
 * compares — was a defect wearing a reason, and each is now fixed rather
 * than excused. Adding an entry is a design decision, not a way past a red
 * scan: a face that cannot hold what it was given renders it anyway,
 * declines the page, or marks the loss.
 */
export interface FidelityExemption {
  /** Face id the exemption applies to. */
  readonly face: string
  /** Substring of the authored text's IR path, e.g. `"(citation).sources"`. */
  readonly path: string
  readonly reason: string
}

export const FIDELITY_EXEMPTIONS: readonly FidelityExemption[] = []

/** True when this face is already known to drop this path. */
export function exempt(faceId: string | undefined, path: string): boolean {
  if (!faceId) return false
  return FIDELITY_EXEMPTIONS.some((entry) => entry.face === faceId && path.includes(entry.path))
}
