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
import { collapseWhitespaceRuns, preservesWhitespace } from "@/lib/svg-whitespace"
import {
  IDENTITY_MATRIX,
  boxesIntersect,
  multiplyMatrices,
  parseSvgTransform,
  TEXT_INK_ASCENT,
  TEXT_INK_DESCENT,
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
 * Type/style facts a `<text>` inherits from the elements above it.
 *
 * SVG text properties cascade, and this repo's own renderers rely on that:
 * `image-compare.tsx` sets `letter-spacing` on the `<text>` and the family on
 * an ancestor `<g>`. A scanner that reads only the `<text>`'s own attributes
 * measures a different string than the browser draws, which is how a real
 * component overflowed its box by 41px while this file returned no findings.
 */
export interface TextStyle {
  readonly fontFamily: string
  readonly fontSize: number
  readonly fontWeight: string | null
  readonly letterSpacing: number
  readonly textAnchor: string
  /**
   * `xml:space="preserve"`, inherited like every other type property here.
   * The corpus has 173 of these — every line `code.tsx` paints, where the
   * indentation is the author's content and collapsing it measured the line
   * up to 105px narrower than the page draws it.
   */
  readonly preserveWhitespace: boolean
}

export const ROOT_TEXT_STYLE: TextStyle = {
  fontFamily: "",
  fontSize: 16,
  fontWeight: null,
  letterSpacing: 0,
  textAnchor: "start",
  preserveWhitespace: false,
}

/** The style an element declares, over whatever it inherited. */
export function inheritTextStyle(el: Element, parent: TextStyle): TextStyle {
  const raw = (attr: string) => el.getAttribute(attr)
  const size = raw("font-size")
  const spacing = raw("letter-spacing")
  return {
    fontFamily: raw("font-family") ?? parent.fontFamily,
    fontSize: size == null || !Number.isFinite(Number(size)) ? parent.fontSize : Number(size),
    fontWeight: raw("font-weight") ?? parent.fontWeight,
    letterSpacing: spacing == null || !Number.isFinite(Number(spacing)) ? parent.letterSpacing : Number(spacing),
    textAnchor: raw("text-anchor") ?? parent.textAnchor,
    preserveWhitespace: preservesWhitespace(el, parent.preserveWhitespace),
  }
}

/**
 * The advance one run of glyphs adds to the line it sits on, its own tracking
 * included.
 *
 * `letter-spacing` is an absolute px advance added after each glyph, so it
 * neither scales with the font size nor appears in `measureTextUnits`, which
 * reports advance widths alone. `fitSvgLine` budgets for it when it fits a
 * line; a scanner that does not is measuring a narrower string than the one
 * on the page.
 */
export function runAdvance(content: string, style: TextStyle): number {
  if (content === "") return 0
  const glyphs = textInkBox({
    content,
    x: 0,
    y: 0,
    fontSize: style.fontSize,
    fontFamily: style.fontFamily,
    fontWeight: style.fontWeight,
    textAnchor: "start",
  }).w
  return glyphs + Array.from(content).length * style.letterSpacing
}

/** One stretch of glyphs sharing a style, in document order. */
interface TextSegment {
  readonly text: string
  readonly style: TextStyle
  /** Set only when the `<tspan>` that owns this run declared its own start. */
  readonly x?: number
  readonly y?: number
  /** Relative shift of the current text position, applied before the run. */
  readonly dx: number
  readonly dy: number
}

/**
 * A single-valued `dx`/`dy`, or 0.
 *
 * SVG lets both take a list, one entry per glyph. Nothing in this renderer
 * emits a list — `citation.tsx`'s separator dots, the only live producer,
 * writes one number — and a per-glyph kerning model is a text engine, not a
 * bounds check. A list is read as no shift rather than guessed at.
 */
function relativeShift(el: Element, attr: string): number {
  const raw = el.getAttribute(attr)
  if (raw == null) return 0
  const value = Number(raw.trim())
  return Number.isFinite(value) ? value : 0
}

/** Flatten a `<text>` into its runs, keeping document order and every space. */
function collectSegments(node: Element, style: TextStyle, out: TextSegment[]): void {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === 3) {
      const text = child.textContent ?? ""
      if (text !== "") out.push({ text, style, dx: 0, dy: 0 })
      continue
    }
    if (child.nodeType !== 1) continue
    const el = child as Element
    if (el.tagName.toLowerCase() !== "tspan") continue
    const own = inheritTextStyle(el, style)
    const rawX = el.getAttribute("x")
    const rawY = el.getAttribute("y")
    const x = rawX != null && Number.isFinite(Number(rawX)) ? Number(rawX) : undefined
    const y = rawY != null && Number.isFinite(Number(rawY)) ? Number(rawY) : undefined
    const before = out.length
    collectSegments(el, own, out)
    if (out.length > before) {
      out[before] = {
        ...out[before]!,
        ...(x !== undefined ? { x } : {}),
        ...(y !== undefined ? { y } : {}),
        dx: relativeShift(el, "dx"),
        dy: relativeShift(el, "dy"),
      }
    }
  }
}

/**
 * Every ink box a `<text>` paints, one per run.
 *
 * Three positions are in play and the walker keeps all three straight:
 *
 *  - **The current text position** advances glyph by glyph across the whole
 *    element. A `<tspan>` that gives only `y` starts a new chunk there but
 *    keeps this x, so it resumes where the last glyph left off — not where
 *    the previous chunk *began*, which is a different number the moment
 *    anything was drawn.
 *  - **`dx`/`dy`** shift that position before their own run, without
 *    starting a chunk: they are relative adjustments, and SVG only breaks a
 *    chunk on an absolute one.
 *  - **A chunk** is what `text-anchor` applies to, once, over the total
 *    advance from its start. Anchoring each `<tspan>` separately stacks every
 *    run of an end-anchored line at the same edge. `renderEmphasisTspans`
 *    emits exactly that shape, and `svg2pptx/text.ts` already treats those
 *    nodes as one segment.
 *
 * One box comes back per run rather than one per chunk, so a `dy`-shifted
 * run carries its own vertical extent instead of being averaged into its
 * neighbours. Every consumer here unions them, so a chunk still measures as
 * one thing.
 *
 * Whitespace is resolved before any of this, over the whole element's
 * character stream — see `collapseWhitespaceRuns`.
 *
 * This is not a text engine: no bidi, no per-glyph `dx`/`dy` lists, no
 * `textLength`. Neither appears in this renderer's output.
 */
export function textInkBoxes(el: Element, inherited: TextStyle): DepthBox[] {
  const style = inheritTextStyle(el, inherited)
  const collected: TextSegment[] = []
  collectSegments(el, style, collected)
  if (collected.length === 0) return []

  // Whitespace first, over the whole element's character stream, because that
  // is the order the spec lays down and the order the difference shows up in:
  // two spaces either side of a tspan boundary are one space on the page, and
  // a space that survives inside the text still advances the cursor even when
  // the next run starts a chunk of its own. Positions are applied to what
  // comes out of here, never to the source.
  const painted = collapseWhitespaceRuns(
    collected.map((segment) => ({ text: segment.text, preserve: segment.style.preserveWhitespace })),
  )
  const segments: TextSegment[] = []
  // A run that collapsed to nothing hands its own position and shift to
  // whichever run comes next, so an empty positioned tspan cannot quietly
  // merge the run after it into the chunk before it.
  let carried: Pick<TextSegment, "x" | "y" | "dx" | "dy"> | null = null
  for (const [index, text] of painted.entries()) {
    const segment = collected[index]!
    const position: Pick<TextSegment, "x" | "y" | "dx" | "dy"> = {
      x: carried?.x ?? segment.x,
      y: carried?.y ?? segment.y,
      dx: (carried?.dx ?? 0) + segment.dx,
      dy: (carried?.dy ?? 0) + segment.dy,
    }
    if (text === "") {
      carried = position
      continue
    }
    carried = null
    segments.push({ ...segment, ...position, text })
  }
  if (segments.length === 0) return []

  const chunks: { segments: TextSegment[]; x?: number; y?: number }[] = []
  for (const segment of segments) {
    const previous = chunks[chunks.length - 1]
    if (!previous || segment.x !== undefined || segment.y !== undefined) {
      chunks.push({ segments: [segment], x: segment.x, y: segment.y })
      continue
    }
    previous.segments.push(segment)
  }

  const boxes: DepthBox[] = []
  // The current text position, carried across chunks: an absolute `x` or `y`
  // replaces its own axis and the other one continues from here.
  let cursorX = num(el, "x")
  let cursorY = num(el, "y")
  for (const chunk of chunks) {
    const runs = chunk.segments
    const startX = chunk.x ?? cursorX
    const startY = chunk.y ?? cursorY
    cursorX = startX
    cursorY = startY

    const placed: { x: number; y: number; ink: number; fontSize: number }[] = []
    for (const [index, run] of runs.entries()) {
      cursorX += run.dx
      cursorY += run.dy
      const advance = runAdvance(run.text, run.style)
      // Every glyph pays its own tracking; the chunk's last glyph keeps no
      // trailing gap in its ink, though the cursor still moves by it.
      const ink = index === runs.length - 1 ? Math.max(0, advance - run.style.letterSpacing) : advance
      placed.push({ x: cursorX, y: cursorY, ink, fontSize: run.style.fontSize })
      cursorX += advance
    }

    const total = Math.max(0, cursorX - startX - runs[runs.length - 1]!.style.letterSpacing)
    const anchor = runs[0]!.style.textAnchor
    const shift = anchor === "end" ? -total : anchor === "middle" ? -total / 2 : 0
    for (const run of placed) {
      boxes.push({
        x: run.x + shift,
        y: run.y - run.fontSize * TEXT_INK_ASCENT,
        w: run.ink,
        h: run.fontSize * (TEXT_INK_ASCENT + TEXT_INK_DESCENT),
      })
    }
  }
  return boxes
}

/**
 * The ink boxes of one painted leaf in its own local coordinates. Empty for
 * an element that paints nothing (a `<g>`, a `<defs>`, an empty `<text>`).
 *
 * Stroke width is deliberately ignored. A 1px stroke centered on a path edge
 * puts half a pixel outside every shape on the page, which is below every
 * tolerance here and would only add noise.
 */
export function leafInkBoxes(el: Element, inherited: TextStyle = ROOT_TEXT_STYLE): DepthBox[] {
  const tag = el.tagName.toLowerCase()
  const one = (box: DepthBox | null) => (box ? [box] : [])
  if (tag === "rect" || tag === "image") {
    return one({ x: num(el, "x"), y: num(el, "y"), w: num(el, "width"), h: num(el, "height") })
  }
  if (tag === "circle") {
    const r = num(el, "r")
    return one({ x: num(el, "cx") - r, y: num(el, "cy") - r, w: 2 * r, h: 2 * r })
  }
  if (tag === "ellipse") {
    const rx = num(el, "rx")
    const ry = num(el, "ry")
    return one({ x: num(el, "cx") - rx, y: num(el, "cy") - ry, w: 2 * rx, h: 2 * ry })
  }
  if (tag === "line") {
    const x1 = num(el, "x1")
    const y1 = num(el, "y1")
    const x2 = num(el, "x2")
    const y2 = num(el, "y2")
    return one({ x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) })
  }
  if (tag === "polyline" || tag === "polygon") {
    const nums = (el.getAttribute("points") ?? "").trim().split(/[\s,]+/).map(Number).filter(Number.isFinite)
    if (nums.length < 2) return []
    const xs: number[] = []
    const ys: number[] = []
    for (let i = 0; i + 1 < nums.length; i += 2) {
      xs.push(nums[i]!)
      ys.push(nums[i + 1]!)
    }
    return one({ x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) })
  }
  if (tag === "path") return one(__pathBoundingBox(el.getAttribute("d") ?? ""))
  if (tag === "text") return textInkBoxes(el, inherited)
  return []
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

/**
 * Every component box on one page whose painted ink escapes its declaration.
 *
 * Ink lands in **every** open box scope, not only the innermost. A nested
 * `data-audit-box` is a subdivision of the box around it — `matrix`,
 * `icon_cards`, `row_cards`, `sankey` and `flowchart` all declare one per
 * cell — and a child that draws outside the outer component is still the
 * outer component drawing outside itself. Charging the ink only to the
 * innermost scope let an inner box vouch for its own escape with its own
 * declaration and left the outer one measuring nothing at all.
 */
export function collectInkFindings(markup: string): InkFinding[] {
  const findings: InkFinding[] = []

  const visit = (
    el: Element,
    matrix: SvgMatrix,
    region: Region | null,
    scopes: readonly BoxScope[],
    style: TextStyle,
  ): void => {
    const here = multiplyMatrices(matrix, parseSvgTransform(el.getAttribute("transform")))
    const inherited = inheritTextStyle(el, style)

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
      scopes = [...scopes, opened]
    }

    for (const leaf of leafInkBoxes(el, inherited)) {
      const painted = transformBox(leaf, here)
      for (const scope of scopes) scope.ink.push(painted)
    }

    for (const child of Array.from(el.children)) visit(child as Element, here, region, scopes, inherited)

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

  visit(parseSvg(markup), IDENTITY_MATRIX, null, [], ROOT_TEXT_STYLE)
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

  const visit = (el: Element, matrix: SvgMatrix, style: TextStyle): void => {
    const here = multiplyMatrices(matrix, parseSvgTransform(el.getAttribute("transform")))
    const inherited = inheritTextStyle(el, style)
    const boxes = leafInkBoxes(el, inherited)
    if (boxes.length > 0) {
      const box = transformBox(unionBoxes(boxes)!, here)
      if (el.getAttribute("data-value-label") === "1") {
        labels.push({ box, text: (el.textContent ?? "").trim().slice(0, 24), size: inherited.fontSize })
      } else if (el.hasAttribute("data-plot-mark")) {
        marks.push(box)
      }
    }
    for (const child of Array.from(el.children)) visit(child as Element, here, inherited)
  }
  visit(parseSvg(markup), IDENTITY_MATRIX, ROOT_TEXT_STYLE)

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
