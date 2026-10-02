import { measureMonoTextUnits, measureTextUnits } from "../lib/svg-text-layout"
import { getPlatform } from "../platform/registry"
import { isBold, isMonoFontFamily } from "../render/fonts"

export interface OverflowIssue {
  kind: "h-overflow" | "v-overflow" | "page-overflow"
  text: string
  detail: string
}

const TOL = 6
const PAGE = { w: 1280, h: 720 }

interface Box { x: number; y: number; w: number }
interface Rect extends Box { h: number }

// This renderer only ever emits `translate(dx,dy)`, `scale(s)`, or the two
// composed as `translate(dx,dy) scale(s)` (uniform scale, e.g. bento-card
// content scale-to-fit or icon scale) — never rotation or non-uniform scale,
// so a single scalar is enough.
//
// Exported (W6 task 1) so `deck-audit.ts`'s new contrast/overlap walkers —
// which need this exact same transform accumulation over the exact same
// markup, just for different attributes — reuse it instead of a third
// copy-paste (a second already exists in `browser-audit.ts`, for the
// documented reason that its function body must serialize standalone via
// `.toString()`; `deck-audit.ts` has no such constraint, so importing is the
// right call there). Pure, zero behavior change for every existing caller.
export function parseTransform(el: Element): { dx: number; dy: number; scale: number } {
  const t = el.getAttribute("transform") ?? ""
  const tm = /translate\(\s*(-?[\d.]+)[\s,]+(-?[\d.]+)\s*\)/.exec(t)
  const sm = /scale\(\s*(-?[\d.]+)/.exec(t)
  return {
    dx: tm ? Number(tm[1]) : 0,
    dy: tm ? Number(tm[2]) : 0,
    scale: sm ? Number(sm[1]) : 1,
  }
}

/** Exported alongside `parseTransform` — see that function's doc comment. */
export function parseNums(attr: string | null): number[] {
  return (attr ?? "").split(",").map(Number)
}

function runUnits(text: string, fontFamily: string, fontWeight: string | null): number {
  return isMonoFontFamily(fontFamily)
    ? measureMonoTextUnits(text)
    : measureTextUnits(text, { bold: isBold(fontWeight), fontFamily })
}

export interface TextRun {
  text: string
  fontSize: number
  dx: number
  fontWeight: string | null
}

/**
 * One `<text>` line as the runs it is painted in, sizes in page px.
 *
 * A `<tspan>` that sets its own `font-size` or `dx` is its own run: a hero
 * figure's unit (brief's stat-hero sets "10.2" at 310px and "万席" at 81px in
 * one `<text>`, which the exporter keeps as two runs of one text box) is
 * drawn at its own size, after its own lead-in gap. A line with no such run
 * is one run of `content` at `fontSize`.
 */
export function textRuns(el: Element, content: string, fontSize: number, scale: number): TextRun[] {
  const fontWeight = el.getAttribute("font-weight")
  const sizedRun = (node: Element) =>
    node.tagName.toLowerCase() === "tspan" && (node.hasAttribute("font-size") || node.hasAttribute("dx"))
  if (!Array.from(el.children).some(sizedRun)) return [{ text: content, fontSize, dx: 0, fontWeight }]

  const runs: TextRun[] = []
  el.childNodes.forEach((node) => {
    if (node.nodeType === 3) {
      runs.push({ text: node.textContent ?? "", fontSize, dx: 0, fontWeight })
      return
    }
    if (node.nodeType !== 1) return
    const child = node as Element
    const ownSize = Number(child.getAttribute("font-size"))
    const ownDx = Number(child.getAttribute("dx"))
    runs.push({
      text: child.textContent ?? "",
      fontSize: Number.isFinite(ownSize) && ownSize > 0 ? ownSize * scale : fontSize,
      dx: Number.isFinite(ownDx) ? ownDx * scale : 0,
      fontWeight: child.getAttribute("font-weight") ?? fontWeight,
    })
  })
  // `content` is the trimmed line, so the runs lose the same outer blanks.
  runs[0]!.text = runs[0]!.text.trimStart()
  runs[runs.length - 1]!.text = runs[runs.length - 1]!.text.trimEnd()
  return runs
}

/**
 * Rendered width of one `<text>` line, in page px: each run at the size it
 * is drawn at, plus its lead-in gap. Read at the outer size, stat-hero's
 * two CJK unit glyphs alone were charged 620px and the line was reported
 * spanning x=[96,1381] on a page it never leaves.
 */
export function textLineWidth(el: Element, content: string, fontSize: number, scale: number): number {
  const fontFamily = el.getAttribute("font-family") ?? ""
  return textRuns(el, content, fontSize, scale).reduce(
    (sum, run) => sum + run.dx + runUnits(run.text, fontFamily, run.fontWeight) * run.fontSize,
    0,
  )
}

function parseMarkup(markup: string): Document {
  const Parser = getPlatform().domParser ?? globalThis.DOMParser
  if (!Parser) {
    throw new Error(
      'DOMParser unavailable — in Node, call installNodePlatform() from "@liustack/pptwise/node" first (the pptwise CLI does this automatically)'
    )
  }
  return new Parser().parseFromString(markup, "image/svg+xml")
}

export function auditSvgMarkup(markup: string): OverflowIssue[] {
  const doc = parseMarkup(markup)
  const root = doc.documentElement
  const issues: OverflowIssue[] = []

  const visit = (
    el: Element,
    ox: number,
    oy: number,
    os: number,
    box: Box | null,
    rect: Rect | null,
  ) => {
    const { dx, dy, scale } = parseTransform(el)
    // Compose (ox,oy,os) — "absolute = (ox,oy) + os * local" — with this
    // element's own translate/scale, in the SVG-transform-list order
    // (translate applied to local coordinates, then the accumulated parent
    // transform), so any component scaled to fit (bento cards) still gets
    // correctly-scaled text metrics rather than false-positive overflow.
    const ax = ox + os * dx
    const ay = oy + os * dy
    const as = os * scale

    // A declaration is stated in the same frame as the ink beneath the
    // element that carries it, so it is composed with the accumulated
    // transform exactly like the `<text>` coordinates below. Read literally,
    // a box declared inside a scaled or translated subtree was compared
    // against text coordinates that had already been carried to the page.
    const boxAttr = el.getAttribute("data-audit-box")
    if (boxAttr) {
      const [x, y, w] = parseNums(boxAttr)
      box = { x: ax + as * x, y: ay + as * y, w: as * w }
    }
    const rectAttr = el.getAttribute("data-audit-rect")
    if (rectAttr) {
      const [x, y, w, h] = parseNums(rectAttr)
      rect = { x: ax + as * x, y: ay + as * y, w: as * w, h: as * h }
    }

    if (el.tagName.toLowerCase() === "text") {
      const content = (el.textContent ?? "").trim()
      if (content) {
        const fontSize = Number(el.getAttribute("font-size") ?? 16) * as
        const tx = ax + Number(el.getAttribute("x") ?? 0) * as
        const ty = ay + Number(el.getAttribute("y") ?? 0) * as
        // Mono-face branch (borrow-wave Task 3 fix round, 2026-07-21 — see
        // `isMonoFontFamily`'s derivation comment in fonts.ts) stays exact
        // and weight-blind: `measureMonoTextUnits` takes no weight
        // parameter because Consolas's own hmtx table shows bold/regular
        // advance widths equal to 4 decimal places (bold-data-pack.md S2),
        // and the mono role never declares bold in this codebase anyway
        // (root-cause.md S5). Every proportional role (bold-metrics fix,
        // 2026-07-24) now reads the real `font-weight` this element
        // rendered with, via the same `isBold()` threshold svg2pptx/text.ts
        // uses to decide OOXML's `b="1"` — so this auditor can never
        // disagree with what the exporter actually ships. Before this fix,
        // both the renderer and this auditor shared the same unweighted
        // `measureTextUnits` call, so the two were structurally unable to
        // disagree even when a real exported font rendered bold — the
        // "estimator/audit shared-blindness" gap root-cause.md S4.2 named
        // as the mechanism that let the reported cover-overflow defect
        // audit clean (0 findings) while visibly overflowing in PowerPoint.
        const width = textLineWidth(el, content, fontSize, as)
        const anchor = el.getAttribute("text-anchor") ?? "start"
        const left = anchor === "end" ? tx - width : anchor === "middle" ? tx - width / 2 : tx
        const right = left + width
        const label = content.slice(0, 24)

        if (box && (right > box.x + box.w + TOL || left < box.x - TOL)) {
          issues.push({
            kind: "h-overflow",
            text: label,
            detail: `text [${left.toFixed(0)},${right.toFixed(0)}] exceeds box x=${box.x} w=${box.w}`,
          })
        }
        if (rect && ty + fontSize * 0.25 > rect.y + rect.h + TOL) {
          issues.push({
            kind: "v-overflow",
            text: label,
            detail: `baseline ${ty.toFixed(0)} below rect bottom ${rect.y + rect.h}`,
          })
        }
        // data-bleed：显式声明的出血排印（时尚杂志出血大号语法，2026-07-10）
        // 不算 page-overflow——审计语义是抓「意外」溢出，声明过的溢出是设计。
        if (
          !el.hasAttribute("data-bleed") &&
          (right > PAGE.w + TOL || left < -TOL || ty > PAGE.h + TOL || ty < -TOL)
        ) {
          issues.push({
            kind: "page-overflow",
            text: label,
            detail: `text [${left.toFixed(0)},${right.toFixed(0)}] y=${ty.toFixed(0)} outside 1280x720`,
          })
        }
      }
    }

    for (const child of Array.from(el.children)) visit(child, ax, ay, as, box, rect)
  }

  visit(root, 0, 0, 1, null, null)
  return issues
}

export interface RunMisfit {
  kind: "run-collision" | "short-pad"
  /** The run that collides or that the pad fails to cover. */
  text: string
  detail: string
}

/** How far a run may reach past the next run's start, or past its pad, before it counts. */
const RUN_TOL = 2

/** A pad is a marker quad, `M x y L x y L x y L x y Z`. Its rightmost corner, or null for any other path. */
function padRight(d: string | null): number | null {
  if (!d || !/^[\sMLZ\d.,-]+$/i.test(d)) return null
  const nums = Array.from(d.matchAll(/-?\d+(?:\.\d+)?/g), (m) => Number(m[0]))
  if (nums.length < 2 || nums.length % 2 !== 0) return null
  let right = Number.NEGATIVE_INFINITY
  for (let i = 0; i < nums.length; i += 2) right = Math.max(right, nums[i]!)
  return right
}

/**
 * A line whose runs are placed one by one, as each run's painted glyphs see
 * them.
 *
 * Under a pad or underline stroke every run of a marked line carries its own
 * `x`, worked out by the renderer from its own measurement of the runs
 * before it. Every other check here reads a line as one run flowing from the
 * line's `x`, so a renderer that measured a bold run at regular weight placed
 * the next run on top of it, and drew the pad short of it, and nothing said
 * so. This reads each run at the weight it is actually painted in (its own
 * `font-weight`, else the line's) with the same width model as the overflow
 * check above, and reports a run that reaches past the start of the next, or
 * a marked run (`data-emphasis-pad-fill`) whose pad stops short of its end.
 *
 * A run with no `x` of its own flows after the run before it, wherever that
 * ends, so it cannot collide and is left alone.
 */
export function findRunMisfits(markup: string): RunMisfit[] {
  const doc = parseMarkup(markup)
  const issues: RunMisfit[] = []
  for (const text of Array.from(doc.getElementsByTagName("text"))) {
    const placed = Array.from(text.children).filter(
      (child) => child.tagName.toLowerCase() === "tspan" && child.hasAttribute("x"),
    )
    if (placed.length === 0) continue
    const fontFamily = text.getAttribute("font-family") ?? ""
    const lineSize = Number(text.getAttribute("font-size") ?? 16)
    const lineWeight = text.getAttribute("font-weight")
    const spacing = Number(text.getAttribute("letter-spacing"))
    const tracking = Number.isFinite(spacing) ? spacing : 0
    const runs = placed.map((tspan) => {
      const content = tspan.textContent ?? ""
      const ownSize = Number(tspan.getAttribute("font-size"))
      const size = Number.isFinite(ownSize) && ownSize > 0 ? ownSize : lineSize
      const chars = Array.from(content).length
      const width =
        runUnits(content, fontFamily, tspan.getAttribute("font-weight") ?? lineWeight) * size +
        Math.max(0, chars - 1) * tracking
      return { content, x: Number(tspan.getAttribute("x")), width, marked: tspan.hasAttribute("data-emphasis-pad-fill") }
    })
    for (let i = 0; i + 1 < runs.length; i++) {
      const run = runs[i]!
      const next = runs[i + 1]!
      if (!run.content.trim()) continue
      const end = run.x + run.width
      if (end > next.x + RUN_TOL) {
        issues.push({
          kind: "run-collision",
          text: run.content.trim().slice(0, 24),
          detail: `run ends at x=${end.toFixed(1)}, ${(end - next.x).toFixed(1)}px past the start of "${next.content.trim().slice(0, 24)}" at x=${next.x.toFixed(1)}`,
        })
      }
    }
    // The renderer puts a line's pads just before its `<text>`, one per
    // marked run, in run order.
    const pads: Element[] = []
    for (let sibling = text.previousElementSibling; sibling?.hasAttribute("data-emphasis-pad"); sibling = sibling.previousElementSibling) {
      pads.unshift(sibling)
    }
    const marked = runs.filter((run) => run.marked)
    if (pads.length !== marked.length) continue
    marked.forEach((run, i) => {
      const right = padRight(pads[i]!.getAttribute("d"))
      const end = run.x + run.width
      if (right !== null && right + RUN_TOL < end) {
        issues.push({
          kind: "short-pad",
          text: run.content.trim().slice(0, 24),
          detail: `highlight ends at x=${right.toFixed(1)}, ${(end - right).toFixed(1)}px short of the run's end at x=${end.toFixed(1)}`,
        })
      }
    })
  }
  return issues
}
