import { ptToPx, pxToIn, pxToPt, SLIDE_W_IN } from "../../constants"
import { collapseWhitespaceRuns, preservesWhitespace } from "@/lib/svg-whitespace"
import { isBold, pairedEaFamily } from "../../render/fonts"
import { measureTextUnits } from "../../lib/svg-text-layout"
import { firstBaselineEm, lineHeightPx } from "./baseline"
import { svgColorToHex } from "./color"
import { elementOpacity } from "./style"

/** One styled run inside a text op (maps to a pptxgenjs TextProps entry). */
export interface TextRunData {
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  color?: string
  fontSize?: number
  /**
   * Points added after every character of this run (pptxgenjs
   * `charSpacing`, DrawingML `spc`). Only ever set on a one-character run:
   * the last character before a `<tspan dx>`, split off so the gap lands
   * after it and nowhere else. See `layOutSegments`.
   */
  charSpacing?: number
  /**
   * The run's own face, when its `<tspan>` names a `font-family` of its own:
   * a unit set in the body face after a figure in the heading serif. The
   * text's face otherwise. `eaFace` is the East Asian face that family pairs
   * with it, as on the text (`pairedEaFamily`).
   */
  fontFace?: string
  eaFace?: string
}

/**
 * A pptxgenjs text draw from an SVG `<text>`. Rendered via
 * `slide.addText(runs, { x, y, w, h, fontFace, fontSize, color, align, valign:"top", inset:0 })`.
 * Positions are inches, font sizes are points.
 */
export interface TextOp {
  kind: "text"
  runs: TextRunData[]
  x: number
  y: number
  w: number
  h: number
  fontFace?: string
  /**
   * The face the run's CJK takes when its `font-family` pairs one with a
   * Latin face that has none (`fonts.ts` `pairedEaFace`, memo's Song
   * headings: Times New Roman over SimSun). Absent on every other op, whose
   * runs take `eaFontFaceFor` of `fontFace` (`pptx-ea-fonts.ts`).
   */
  eaFace?: string
  fontSize: number
  color?: string
  transparency?: number
  /**
   * The outline of a text drawn as an outline only (`fill="none"` with a
   * `stroke`): the glyphs' edge in this colour and width, their fill left
   * fully transparent. ember's chapter number. Absent on every other op.
   */
  outline?: { color: string; size: number }
  align: "left" | "center" | "right"
  /**
   * Degrees clockwise, matching pptxgenjs `addText` `rotate`. Set by
   * `svg2pptx/dispatch.ts` when this leaf's CTM carries a rotation. Chart
   * y-titles no longer emit `rotate(-90 …)`, but this field stays for any
   * other rotated text. Absent on every unrotated text op, so the default
   * export path stays byte-identical.
   */
  rotate?: number
  /** Set by `svg2pptx/dispatch.ts` when this leaf lives under a `data-blk`-tagged `<g>` (wave-C S3, `elements === "auto"` only). */
  blockIndex?: number
  /**
   * A PowerPoint field the text stands for. Only `"slidenum"`, from the
   * footer's page number (`data-field="slidenum"`, `render/footer.tsx`):
   * the box is written like any other text, then its one run becomes a
   * slide-number field (`pptx-slide-number.ts`). Absent on every other op.
   */
  field?: "slidenum"
}

/**
 * Floor on a text box's width. Only ever reached by an anchor sitting on (or
 * outside) a canvas edge — a bleed/decor line, which has no room on one side
 * by definition. A shape needs `a:ext cx > 0` to be a legal shape at all
 * (`package-audit.ts`'s `invalid-shape-transform`), so `anchorTextBox` has to
 * be total: every anchor, on-canvas or not, gets a box. The line itself is
 * unaffected either way — `render.ts` exports text with `wrap:false`, so the
 * box neither clips nor re-wraps it.
 */
const MIN_BOX_W_IN = 0.05

/**
 * The anchor a text box was built around: the point `align` pins the line to
 * (its left edge, its center, or its right edge). Exact inverse of
 * `anchorTextBox` below, which makes that function idempotent — and lets
 * `svg2pptx/dispatch.ts` re-derive the box after it has flattened the
 * element's inherited transforms onto it.
 */
function anchorOf(op: TextOp): number {
  if (op.align === "right") return op.x + op.w
  if (op.align === "center") return op.x + op.w / 2
  return op.x
}

/**
 * Give a text op the box its anchor deserves *in the frame it now sits in*:
 * as much room as the slide can give on the side the line grows, with the
 * anchoring edge (or center) exactly on the anchor.
 *
 * Why this is a separate step rather than part of `textToOp`: the width above
 * is measured against the *canvas*, but a `<text>` element's own `x` is in
 * whatever local space its ancestor `<g transform>`s define. `dispatch.ts`
 * flattens those transforms by translating the finished op, which moves the
 * anchor correctly but leaves the width measured against the wrong origin —
 * and a group centered on its own content (`svg/components/cycle.tsx` puts
 * the ring's center at 0,0, so half its labels sit at a *negative* local x)
 * then produced `w <= 0` and a package-audit rejection of the whole export.
 * The same failure reached the dumbbell chart once before by a different
 * route (a mixed-sign series ran `vx()` off-canvas, see `chart-svg.tsx`'s
 * domain comment) and was patched there, component-side; this is the second
 * component to hit it, so the frame confusion is fixed here instead —
 * `dispatch.ts` calls this once the op is in canvas coordinates, which is the
 * only place that knows they are canvas coordinates.
 */
export function anchorTextBox(op: TextOp): TextOp {
  const anchor = anchorOf(op)
  if (op.align === "right") {
    const w = Math.max(MIN_BOX_W_IN, anchor)
    return { ...op, x: anchor - w, w }
  }
  if (op.align === "center") {
    const half = Math.max(MIN_BOX_W_IN / 2, Math.min(anchor, SLIDE_W_IN - anchor))
    return { ...op, x: anchor - half, w: 2 * half }
  }
  return { ...op, x: anchor, w: Math.max(MIN_BOX_W_IN, SLIDE_W_IN - anchor) }
}

function num(el: Element, name: string, fallback = 0): number {
  const v = el.getAttribute(name)
  if (v == null) return fallback
  return parseFloat(v) || fallback
}

/** font-style italic/oblique → italic（2026-07-12 导出审计抓漏：TextRunData
 * 与 render.ts 消费端一直就绪，此前从未解析该属性——全仓 23 处斜体导出
 * 后静默变正体）。 */
function isItalic(style: string | null): boolean {
  return style === "italic" || style === "oblique"
}

function firstFontFamily(family: string | null): string | undefined {
  if (!family) return undefined
  return family.split(",")[0].replace(/['"]/g, "").trim() || undefined
}

function anchorToAlign(anchor: string | null): "left" | "center" | "right" {
  if (anchor === "middle") return "center"
  if (anchor === "end") return "right"
  return "left"
}

/**
 * A `<tspan>`'s `x`, `y`, `dx` or `dy`, in px, or `undefined` when absent. A
 * list (`dx="4 2 6"`, one value per character) is refused rather than half
 * read: no producer writes one, and honoring only its first entry would
 * export a different line than the page paints.
 */
function tspanLength(el: Element, name: "x" | "y" | "dx" | "dy"): number | undefined {
  const raw = el.getAttribute(name)
  if (raw == null || raw.trim() === "") return undefined
  const parts = raw.trim().split(/[\s,]+/)
  const v = Number(parts[0])
  if (parts.length !== 1 || !Number.isFinite(v)) {
    throw new Error(`svg2pptx: <tspan ${name}="${raw}"> is not a single length; only one value per tspan is exported`)
  }
  return v
}

/** One run as the walk read it, before whitespace collapse and positioning. */
interface RawRun {
  run: TextRunData
  preserve: boolean
  dx: number
  dy: number
  /** An absolute `x`: this run starts a new text chunk there. */
  x?: number
  /** The chunk's own `text-anchor`, when the tspan sets one. */
  anchor?: Align
}

type Align = TextOp["align"]

function buildRawRuns(el: Element, baseBold: boolean, baseItalic: boolean, baseFace: string | undefined): RawRun[] {
  // `xml:space` is inherited and a child may override it. The `<text>` reads
  // whatever an ancestor folded onto it (`dispatch.ts`), and each direct
  // child reads its own declaration over that. `code.tsx` is the producer
  // that matters today — every code line preserves, because the indentation
  // is the author's content — but the rule is the rule, not that one case.
  const preserve = preservesWhitespace(el, false)
  // One walk for every shape, tspans or not. The no-tspan path used to trim
  // instead, which removed the two ends and left every interior run of blanks
  // untouched: 423 nodes across 217 corpus pages exported "A    ·    B" where
  // the page paints "A · B". Both consumers now read one character stream.
  const runs: RawRun[] = []
  el.childNodes.forEach((node) => {
    if (node.nodeType === 3) {
      const text = node.textContent ?? ""
      if (!text) return
      const run: TextRunData = { text }
      if (baseBold) run.bold = true
      if (baseItalic) run.italic = true
      runs.push({ run, preserve, dx: 0, dy: 0 })
      return
    }
    if (node.nodeType !== 1) return
    const child = node as Element
    if (child.tagName.toLowerCase() !== "tspan") return
    // An absolute y moves a chunk to another line entirely. No producer
    // writes one, and a `dy` says the same thing relatively.
    if (tspanLength(child, "y") !== undefined) {
      throw new Error("svg2pptx: <tspan y> is not exported; use dy or a separate <text>")
    }
    const run: TextRunData = { text: child.textContent ?? "" }
    // A tspan's own weight, style and family replace the text's, as they do
    // in SVG: a unit set regular after a bold figure stays regular.
    const weight = child.getAttribute("font-weight")
    if (weight !== null ? isBold(weight) : baseBold) run.bold = true
    const style = child.getAttribute("font-style")
    if (style !== null ? isItalic(style) : baseItalic) run.italic = true
    const family = child.getAttribute("font-family")
    const face = firstFontFamily(family)
    if (face && face !== baseFace) {
      run.fontFace = face
      const ea = pairedEaFamily(family)
      if (ea) run.eaFace = ea
    }
    const fill = child.getAttribute("fill")
    if (fill && fill !== "none") run.color = svgColorToHex(fill)
    const fs = child.getAttribute("font-size")
    if (fs) run.fontSize = pxToPt(parseFloat(fs))
    const raw: RawRun = {
      run,
      preserve: preservesWhitespace(child, preserve),
      dx: tspanLength(child, "dx") ?? 0,
      dy: tspanLength(child, "dy") ?? 0,
    }
    const x = tspanLength(child, "x")
    if (x !== undefined) raw.x = x
    const anchor = child.getAttribute("text-anchor")
    if (anchor) raw.anchor = anchorToAlign(anchor)
    runs.push(raw)
  })
  return runs
}

/** How far along a line of `width` an alignment's anchor sits. */
function alignShare(align: Align): number {
  return align === "center" ? 0.5 : align === "right" ? 1 : 0
}

/**
 * One stretch of a `<text>` that shares a baseline: the whole line, unless a
 * `<tspan dy>` moved the pen up or down partway.
 */
interface Segment {
  runs: TextRunData[]
  /** Where the pen starts, absolute px; `undefined` while the line's own anchor decides it. */
  penX?: number
  /** Baseline, absolute px. */
  y: number
}

/**
 * Turn each tspan's position into something PowerPoint draws where the page
 * does, keeping a line one editable paragraph wherever it can.
 *
 * `dx` moves the pen before the tspan's first character, which is the same
 * as widening the character before it. That character is split into its own
 * run carrying `charSpacing` (DrawingML `spc`, added after each character of
 * a run). PowerPoint then lays the line out with its own metrics and the gap
 * is exactly `dx` wherever the preceding text happens to end, with no width
 * estimate on this side, and a figure and its unit stay one editable line.
 * The alternative, a second box at a measured offset, would hang the unit's
 * position on `measureTextUnits` and leave it behind when someone retypes
 * the figure. Measured in PowerPoint against Chrome's render of the same
 * SVG: the unit after a 176 px "$154M" lands within 0.3 px.
 *
 * An absolute `x` starts a new chunk at that point. The emphasis pad
 * (`render/emphasis.ts`) sets one on every run of a marked line, each at the
 * pen position its own width model predicts. Inside a line, such an `x` is
 * read as the gap it leaves after the previous run's measured advance, and
 * that gap goes the way of a `dx` (zero for the pad's runs, give or take a
 * weight the pad measured differently). An `x` on the line's first glyph
 * fixes where the line starts.
 *
 * `dy` moves the pen for the tspan and everything after it. DrawingML's
 * in-line answer, a run `baseline` shift, is not faithful: PowerPoint draws a
 * shifted run as a superscript, at about two thirds of its size (measured: a
 * 24 px "[1]" raised 18 px came out 16 px wide instead of 24, and 5 px low).
 * So a `dy` starts a new stretch on its own baseline, which becomes its own
 * text box, placed after the preceding stretch's measured advance.
 */
function layOutSegments(
  raw: RawRun[],
  line: { x: number; y: number; align: Align; sizePx: number; fontFamily: string | undefined },
): Segment[] {
  const texts = collapseWhitespaceRuns(raw.map((entry) => ({ text: entry.run.text, preserve: entry.preserve })))
  const advance = (runs: readonly TextRunData[]) => advancePx(runs, line.sizePx, line.fontFamily)
  const segments: Segment[] = []
  raw.forEach((entry, i) => {
    const text = texts[i]!
    if (text.length === 0) return
    const run: TextRunData = { ...entry.run, text }
    const current = segments[segments.length - 1]
    if (!current) {
      const first: Segment = { runs: [run], y: line.y + entry.dy }
      if (entry.x !== undefined) {
        // A chunk anchored at its own x: where it starts depends on its width.
        const share = alignShare(entry.anchor ?? line.align)
        first.penX = entry.x + entry.dx - share * advanceOfChunk(raw, texts, i, advance)
      } else if (line.align === "left") {
        first.penX = line.x + entry.dx
      } else if (entry.dx !== 0) {
        // Where a leading shift lands under a middle or end anchor depends on
        // how the chunk's extent is counted. No producer writes one.
        throw new Error("svg2pptx: a tspan dx before the first glyph is only exported for start-anchored text")
      }
      segments.push(first)
      return
    }
    if (entry.x !== undefined && (entry.anchor ?? line.align) !== "left") {
      throw new Error("svg2pptx: a <tspan x> after the first glyph is only exported as a start-anchored chunk")
    }
    const pen = () => {
      if (current.penX === undefined) {
        throw new Error("svg2pptx: a <tspan x> or dy after text placed by a middle or end anchor is not exported")
      }
      return current.penX + advance(current.runs)
    }
    if (entry.dy !== 0) {
      const penX = entry.x !== undefined ? entry.x + entry.dx : pen() + entry.dx
      segments.push({ runs: [run], penX, y: current.y + entry.dy })
      return
    }
    const gap = entry.x !== undefined ? entry.x + entry.dx - pen() : entry.dx
    // DrawingML spacing is whole hundredths of a point. A gap that rounds to
    // none, like the float dust between the pad's own pen positions and
    // this side's re-measurement, leaves the run whole.
    const gapPt = Math.round(pxToPt(gap) * 100) / 100
    if (gapPt !== 0) widenLastCharacter(current.runs, gapPt)
    current.runs.push(run)
  })
  // A shift on a tspan with no glyph moves nothing, as in SVG. A text with no
  // glyph at all still yields one (empty) box, as before:
  // `cover-tone-adaptive-header.tsx` relies on an empty cell staying a box.
  if (segments.length === 0) segments.push({ runs: [], y: line.y })
  return segments
}

/**
 * The advance of the chunk that starts at raw run `start`: it and every run
 * after it up to the next absolute `x` or `dy`, the extent a chunk anchor
 * aligns. `dx` gaps inside it count.
 */
function advanceOfChunk(
  raw: readonly RawRun[],
  texts: readonly string[],
  start: number,
  advance: (runs: readonly TextRunData[]) => number,
): number {
  let width = 0
  for (let i = start; i < raw.length; i++) {
    if (i > start && (raw[i]!.x !== undefined || raw[i]!.dy !== 0)) break
    if (i > start) width += raw[i]!.dx
    width += advance([{ ...raw[i]!.run, text: texts[i]! }])
  }
  return width
}

/** A stretch's advance width in px, by the shared width model. */
function advancePx(runs: readonly TextRunData[], baseSizePx: number, fontFamily: string | undefined): number {
  return runs.reduce((sum, run) => {
    const sizePx = run.fontSize != null ? ptToPx(run.fontSize) : baseSizePx
    const glyphs = measureTextUnits(run.text, { fontFamily: run.fontFace ?? fontFamily, bold: run.bold === true }) * sizePx
    const spacing = ptToPx(run.charSpacing ?? 0) * Array.from(run.text).length
    return sum + glyphs + spacing
  }, 0)
}

/** Add `pt` of spacing after the last character laid so far. */
function widenLastCharacter(runs: TextRunData[], pt: number): void {
  const prev = runs[runs.length - 1]!
  const chars = Array.from(prev.text)
  if (chars.length > 1 && prev.charSpacing == null) {
    const last = chars.pop()!
    runs[runs.length - 1] = { ...prev, text: chars.join("") }
    runs.push({ ...prev, text: last, charSpacing: pt })
    return
  }
  // Already a lone character, or one carrying spacing from an earlier shift.
  runs[runs.length - 1] = { ...prev, charSpacing: (prev.charSpacing ?? 0) + pt }
}

/**
 * The size that sets a text op's line height, in px: the largest size any of
 * its runs is drawn at (a run without its own size draws at the op's). The
 * paragraph-end mark's size does not count: measured in PowerPoint, a box
 * whose only run is 24 px under a 48 px mark set a 24 px line. An op with no
 * runs is the mark alone.
 */
export function lineSizePx(op: Pick<TextOp, "fontSize" | "runs">): number {
  if (op.runs.length === 0) return ptToPx(op.fontSize)
  return ptToPx(Math.max(...op.runs.map((r) => r.fontSize ?? op.fontSize)))
}

/**
 * `yPx`/`xPx` are trusted as-is, no ceiling of their own (P0 hardening,
 * robustness deep-review D1 — evaluated and deliberately rejected here, not
 * overlooked): a text-stacking SVG component (bullets/comparison/etc, this
 * task's fix) that lets `y` run far enough off-canvas would eventually cross
 * pptxgenjs's own undocumented `getSmartParseNumber()` ≥100in heuristic —
 * the exact same trap `chart-svg.tsx`'s `MAX_CHART_GEOMETRY_PX` fences off
 * on the chart side. This module is *not* where that fence belongs, for the
 * same reason the chart fix put its own ceiling in the SVG renderer
 * (`chart-svg.tsx`) rather than in this converter layer: "the engine owns
 * geometry" (dumbbell adjudication) — `svg2pptx` is a faithful px→in/pt
 * transform used by every shape kind (`rect.ts`/`ellipse.ts`/`line.ts`/
 * `path.ts`/`image.ts` all share the same unclamped `pxToIn`), with no
 * per-callsite knowledge of what a "reasonable" coordinate looks like for
 * its caller. An opinionated ceiling in `pxToIn` itself would risk silently
 * mangling a deliberately-large-but-legitimate coordinate (a full-bleed
 * background, an intentional off-canvas bleed element) into a wrong value
 * instead of the loud rejection `package-audit`'s `invalid-shape-transform`
 * rule already provides when geometry genuinely breaks — this codebase's
 * "never silently pass" posture (Audit v2 spec §4.4) favors that loud
 * failure over a converter-level guess. The actual fix is upstream, at the
 * component that emits the coordinate: every text-stacking component this
 * task's family sweep found (bullets/comparison/architecture/
 * timeline-vertical) now caps its own rendered item count to its box, so
 * `y` never runs away in the first place — see each component's own doc
 * comment. `formatViolations`' dedup+truncation fix (same task,
 * `package-audit.ts`) is the safety net for the case a future component
 * misses this and the rejection fires anyway: the message stays readable
 * instead of a multi-MB dump, regardless of how many shapes overflow.
 *
 * `anchorTextBox` above does not overturn any of that. Everything this
 * paragraph refuses is a *judgment* about what coordinate a caller ought to
 * have sent — which this layer cannot make, and which stays the component's
 * to make. Which coordinate space the number it did send is written in is
 * not a judgment: this layer is the only one that knows, since it is the one
 * folding the transforms in.
 */
/**
 * The x a segment's box is anchored at under `align`. A line whose start the
 * SVG left to its own anchor keeps that anchor. A line whose pen start the
 * SVG fixed (an absolute `x`, a leading `dx`, a stretch after a `dy`) is
 * anchored so that, at the width model's advance, it starts there: the
 * start itself for a left box, the start plus half or all of the advance
 * for a centered or right one, which keeps the box's alignment for editing.
 */
function boxAnchorX(segment: Segment, elementX: number, align: Align, sizePx: number, fontFamily: string | undefined): number {
  if (segment.penX === undefined) return elementX
  const share = alignShare(align)
  return share === 0 ? segment.penX : segment.penX + share * advancePx(segment.runs, sizePx, fontFamily)
}

export function textToOps(el: Element): TextOp[] {
  const fieldAttr = el.getAttribute("data-field")
  if (fieldAttr !== null && fieldAttr !== "slidenum") {
    throw new Error(`svg2pptx: unknown text field "${fieldAttr}"`)
  }
  const fontSizePx = num(el, "font-size", 16)
  const align = anchorToAlign(el.getAttribute("text-anchor"))
  const fontFace = firstFontFamily(el.getAttribute("font-family"))
  const eaFace = pairedEaFamily(el.getAttribute("font-family"))
  const segments = layOutSegments(
    buildRawRuns(el, isBold(el.getAttribute("font-weight")), isItalic(el.getAttribute("font-style")), fontFace),
    { x: num(el, "x"), y: num(el, "y"), align, sizePx: fontSizePx, fontFamily: fontFace },
  )
  if (segments.length > 1 && align !== "left") {
    // Each stretch after a `dy` is its own box placed at its pen start, and
    // a middle or end anchor would place the first one by its width alone.
    // No producer writes one.
    throw new Error("svg2pptx: a tspan dy is only exported for start-anchored text")
  }
  const fontSize = pxToPt(fontSizePx)
  const fill = el.getAttribute("fill")
  // A text with no fill and a stroke is an outline: PowerPoint draws the
  // glyphs' edge as the run's line and keeps their fill, fully transparent,
  // in the same colour so an editor that drops the line still shows the word.
  const stroke = el.getAttribute("stroke")
  const outline = fill === "none" && stroke && stroke !== "none" ? { color: svgColorToHex(stroke), size: pxToPt(num(el, "stroke-width", 1) || 1) } : undefined
  const color = outline ? outline.color : fill && fill !== "none" ? svgColorToHex(fill) : undefined
  const opacity = elementOpacity(el)
  // letter-spacing 故意不映射（2026-07-10 全主题导出审计定案）：曾映射为
  // charSpacing（spc），但 LibreOffice 对 spc+CJK 的宽度计算与渲染不一致，
  // **裁掉每段文字的尾字符**（runway 6 处丢字实锤，A/B 剥离 spc 后全部
  // 复原）。丢字是内容事故、字距只是排印细节——导出端不发 spc，预览保留
  // letter-spacing。若未来确认真实 Office/WPS 无此 bug 可再评估。
  // 上面说的是整段字距。`<tspan dx>` 的 spc 只落在 dx 前的那一个字符上
  // （`widenLastCharacter`），不是 letter-spacing 的映射。
  return segments.map((segment) => {
    const linePx = lineSizePx({ fontSize, runs: segment.runs })
    // Box placement: trust the SVG's pre-laid-out text — give a wide-enough
    // box and let `align` anchor it, instead of measuring text width here.
    // `x` is this element's own (possibly local) x, so the box below is only
    // final for an untransformed element; `dispatch.ts` re-runs
    // `anchorTextBox` once the op is in canvas coordinates. The top sits
    // where PowerPoint puts this face's first baseline on the SVG's `y`
    // (`baseline.ts`).
    const segmentAlign = segments.length > 1 ? "left" : align
    const op: TextOp = anchorTextBox({
      kind: "text",
      runs: segment.runs,
      x: pxToIn(boxAnchorX(segment, num(el, "x"), segmentAlign, fontSizePx, fontFace)),
      y: pxToIn(segment.y - firstBaselineEm(fontFace) * linePx),
      w: 0,
      h: pxToIn(lineHeightPx(linePx)),
      fontSize,
      align: segmentAlign,
    })
    if (fontFace) op.fontFace = fontFace
    if (eaFace) op.eaFace = eaFace
    if (color) op.color = color
    if (outline) {
      op.outline = outline
      op.transparency = 100
    } else if (opacity < 1) op.transparency = Math.round((1 - opacity) * 100)
    if (fieldAttr === "slidenum") {
      if (segments.length !== 1 || segment.runs.length !== 1) {
        throw new Error("svg2pptx: a slide-number field must be one line of one run")
      }
      op.field = "slidenum"
    }
    return op
  })
}
