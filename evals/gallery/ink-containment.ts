/**
 * Corpus-level geometry scan: a component paints inside the box it accepted.
 *
 * The fidelity scan (`fidelity.ts`) states the content half of the same rule —
 * a face renders what it was given or declines. This module states the
 * geometry half. A component that draws taller than the box the layout handed
 * it has not been given too little room; it has taken room that belongs to
 * whatever the face placed below, and the page it wrecks is not the
 * component's own.
 *
 * That is not hypothetical. `chart.render` used to compute its body height as
 * `max(its own minimum, what it was allocated)`: handed a 208px band, a
 * cartesian chart drew its 316px anyway and painted through the sentence and
 * the footnote underneath. Sixteen pages of this corpus were doing it, and
 * nothing failed — the existing `auditDeck` overflow check reported eight
 * findings on the worst of them, into a gallery column no gate reads.
 *
 * ## What is measured against what
 *
 * Two declarations, two different jobs, and the check uses each for the one
 * it can actually do:
 *
 *  - **Horizontally, against the component's own `data-audit-box`.** The box
 *    carries `x` and `w`, and it is the allocator's statement of the width
 *    this component may use — including the cases where a face deliberately
 *    grants more width than the content rect (`content-stacked-poster.tsx`
 *    scales a lone chart or image up to `HERO_SCALE_MAX` and centers it, so
 *    the hero bleeds into the page margin by design and *says so* in the box
 *    it declares). A declared bleed is a decision; ink past the declaration
 *    is not.
 *  - **Vertically, against the enclosing `data-audit-rect`.** A
 *    `data-audit-box` has no height — the layout stacks by measured height
 *    and only the region rect knows where the content area ends. The rect
 *    bottom is the line a component may not cross, because everything below
 *    it belongs to the face.
 *
 * ## Tolerances
 *
 * Text is measured with `measureTextUnits`, the same estimator the layout
 * fits with, so a glyph's real ink and its advance-width estimate disagree by
 * a per-glyph error that accumulates along a line. `svg-audit.ts` has carried
 * 6px for exactly this comparison since it was written, and this scan uses
 * the same number horizontally.
 *
 * Vertical overflow is not an accumulation of anything — a box that ends too
 * low ends too low — so it is judged tightly. The corpus at 2px reports
 * nothing but real defects.
 */

import { getPlatform } from "@/platform/registry"
import { __pathBoundingBox } from "@/audit/deck-audit"
import { labelLinePitch } from "@/components/label-collision"
import {
  IDENTITY_MATRIX,
  boxesIntersect,
  multiplyMatrices,
  parseSvgTransform,
  textInkBox,
  transformBox,
  unionBoxes,
  type DepthBox,
  type SvgMatrix,
} from "@/render/depth-contract/geometry"

/** Horizontal slack, shared with `svg-audit.ts`'s own h-overflow check. */
export const H_TOLERANCE = 6
/** Vertical slack. A baseline that sits too low is not accumulated error. */
export const V_TOLERANCE = 2

export interface InkFinding {
  /** The offending `data-audit-box` declaration, verbatim. */
  readonly box: string
  /** Which edge was crossed. */
  readonly side: "left" | "right" | "top" | "bottom"
  /** How far past it, in px. */
  readonly px: number
  readonly message: string
}

function num(el: Element, attr: string, fallback = 0): number {
  const raw = el.getAttribute(attr)
  return raw == null ? fallback : Number(raw)
}

/**
 * The ink box of one painted leaf in its own local coordinates, or null for
 * an element that paints nothing (a `<g>`, a `<defs>`, an empty `<text>`).
 *
 * Stroke width is deliberately ignored. A 1px stroke centered on a path edge
 * puts half a pixel outside every shape on the page, which is below every
 * tolerance here and would only add noise.
 */
export function leafInkBox(el: Element): DepthBox | null {
  const tag = el.tagName.toLowerCase()
  if (tag === "rect" || tag === "image") {
    return { x: num(el, "x"), y: num(el, "y"), w: num(el, "width"), h: num(el, "height") }
  }
  if (tag === "circle") {
    const r = num(el, "r")
    return { x: num(el, "cx") - r, y: num(el, "cy") - r, w: 2 * r, h: 2 * r }
  }
  if (tag === "ellipse") {
    const rx = num(el, "rx")
    const ry = num(el, "ry")
    return { x: num(el, "cx") - rx, y: num(el, "cy") - ry, w: 2 * rx, h: 2 * ry }
  }
  if (tag === "line") {
    const x1 = num(el, "x1")
    const y1 = num(el, "y1")
    const x2 = num(el, "x2")
    const y2 = num(el, "y2")
    return { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) }
  }
  if (tag === "polyline" || tag === "polygon") {
    const nums = (el.getAttribute("points") ?? "").trim().split(/[\s,]+/).map(Number).filter(Number.isFinite)
    if (nums.length < 2) return null
    const xs: number[] = []
    const ys: number[] = []
    for (let i = 0; i + 1 < nums.length; i += 2) {
      xs.push(nums[i]!)
      ys.push(nums[i + 1]!)
    }
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }
  }
  if (tag === "path") return __pathBoundingBox(el.getAttribute("d") ?? "")
  if (tag === "text") {
    const content = (el.textContent ?? "").trim()
    if (content === "") return null
    return textInkBox({
      content,
      x: num(el, "x"),
      y: num(el, "y"),
      fontSize: num(el, "font-size", 16),
      fontFamily: el.getAttribute("font-family") ?? "",
      fontWeight: el.getAttribute("font-weight"),
      textAnchor: el.getAttribute("text-anchor") ?? "start",
    })
  }
  return null
}

function parseSvg(markup: string): Element {
  const Parser = getPlatform().domParser ?? globalThis.DOMParser
  if (!Parser) {
    throw new Error('DOMParser unavailable — call installNodePlatform() from "@liustack/pptwise/node" first')
  }
  return new Parser().parseFromString(markup, "image/svg+xml").documentElement as unknown as Element
}

interface Region {
  readonly rect: DepthBox
}

interface BoxScope {
  readonly declaration: string
  readonly x: number
  readonly w: number
  readonly region: Region | null
  readonly ink: DepthBox[]
}

/** Every component box on one page whose painted ink escapes its declaration. */
export function collectInkFindings(markup: string): InkFinding[] {
  const findings: InkFinding[] = []

  const visit = (el: Element, matrix: SvgMatrix, region: Region | null, scope: BoxScope | null): void => {
    const here = multiplyMatrices(matrix, parseSvgTransform(el.getAttribute("transform")))

    const rectAttr = el.getAttribute("data-audit-rect")
    if (rectAttr) {
      const [x, y, w, h] = rectAttr.split(",").map(Number)
      region = { rect: { x: x!, y: y!, w: w!, h: h! } }
    }

    const boxAttr = el.getAttribute("data-audit-box")
    let opened: BoxScope | null = null
    if (boxAttr) {
      const [x, , w] = boxAttr.split(",").map(Number)
      opened = { declaration: boxAttr, x: x!, w: w!, region, ink: [] }
      scope = opened
    }

    const leaf = leafInkBox(el)
    if (leaf && scope) scope.ink.push(transformBox(leaf, here))

    for (const child of Array.from(el.children)) visit(child as Element, here, region, scope)

    if (opened) {
      const ink = unionBoxes(opened.ink)
      if (!ink) return
      const report = (side: InkFinding["side"], px: number, limit: string) => {
        findings.push({
          box: opened!.declaration,
          side,
          px,
          message: `a component's ink runs ${px.toFixed(0)}px past the ${side} edge of ${limit} (box ${opened!.declaration}) — it must draw inside the box it accepted, or decline and declare`,
        })
      }
      const left = opened.x - ink.x
      const right = ink.x + ink.w - (opened.x + opened.w)
      if (left > H_TOLERANCE) report("left", left, "its own declared box")
      if (right > H_TOLERANCE) report("right", right, "its own declared box")
      if (opened.region) {
        const { rect } = opened.region
        const top = rect.y - ink.y
        const bottom = ink.y + ink.h - (rect.y + rect.h)
        if (top > V_TOLERANCE) report("top", top, "the content rect")
        if (bottom > V_TOLERANCE) report("bottom", bottom, "the content rect")
      }
    }
  }

  visit(parseSvg(markup), IDENTITY_MATRIX, null, null)
  return findings
}

export interface LabelFinding {
  readonly message: string
}

/**
 * Data labels that have not been kept clear of each other, or of the marks
 * they name.
 *
 * The second half is the one that matters and the one no existing check made.
 * `l1.ts`'s `label-collision` compares label ink to label ink, which two
 * numbers a line apart pass while sitting squarely on a line and inside an
 * endpoint ring — the state every line-chart page in this corpus was in (81
 * label-on-mark intersections across 27 pages) while the pairwise nudger
 * reported itself satisfied. A label belongs beside the data, not on it.
 */
export function collectLabelFindings(markup: string): LabelFinding[] {
  const labels: { box: DepthBox; text: string; size: number }[] = []
  const marks: DepthBox[] = []

  const visit = (el: Element, matrix: SvgMatrix): void => {
    const here = multiplyMatrices(matrix, parseSvgTransform(el.getAttribute("transform")))
    const leaf = leafInkBox(el)
    if (leaf) {
      const box = transformBox(leaf, here)
      if (el.getAttribute("data-value-label") === "1") {
        labels.push({ box, text: (el.textContent ?? "").trim().slice(0, 24), size: num(el, "font-size", 16) })
      } else if (el.hasAttribute("data-plot-mark")) {
        marks.push(box)
      }
    }
    for (const child of Array.from(el.children)) visit(child as Element, here)
  }
  visit(parseSvg(markup), IDENTITY_MATRIX)

  const findings: LabelFinding[] = []
  for (let i = 0; i < labels.length; i++) {
    const a = labels[i]!
    for (let j = i + 1; j < labels.length; j++) {
      const b = labels[j]!
      const sharesWidth = a.box.x < b.box.x + b.box.w && a.box.x + a.box.w > b.box.x
      if (!sharesWidth) continue
      const centres = Math.abs(a.box.y + a.box.h / 2 - (b.box.y + b.box.h / 2))
      if (centres < labelLinePitch(Math.max(a.size, b.size)) - 1e-6) {
        findings.push({
          message: `data labels "${a.text}" and "${b.text}" share horizontal room and sit closer than one text line apart`,
        })
      }
    }
    for (const mark of marks) {
      if (boxesIntersect(a.box, mark)) {
        findings.push({ message: `data label "${a.text}" sits on a data mark` })
        break
      }
    }
  }
  return findings
}
