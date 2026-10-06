import type { ReactElement } from "react"
import type { Component } from "@/ir"
import { fitSvgLine, measureTextUnits } from "../lib/svg-text-layout"
import { accessibleInk, graphicInk } from "../render/ink"
import type { ComponentCtx, RenderDef, SvgComponent } from "./types"

type SketchComponent = Extract<Component, { type: "sketch" }>

/**
 * A schematic of how an effect is told apart, drawn with no figures: a
 * plot frame, a dashed line at the cutoff or the event with its name over
 * it, and the shapes the design reads.
 *
 * - discontinuity: two fitted lines, one each side of the cutoff, over a
 *   scatter of points, the second line stepped away from the first, and an
 *   arrow across the step with the effect's name beside it.
 * - difference_in_differences: the treated line and its control running
 *   side by side up to the event, the treated line then leaving the path it
 *   would have kept, which runs on dashed, each line named at its end.
 *
 * The geometry is the thesis 2026-10 board's (p14), written against a plot
 * 150px tall and stretched to whatever width it is handed; `direction`
 * mirrors it top to bottom. The ordinary renderer and the manuscript
 * setting both draw through `SketchDrawing`, each with its own inks and
 * label size.
 */

export interface SketchInks {
  /** The plot frame. */
  axis: string
  /** The dashed line at the cutoff or the event, and its name. */
  cut: string
  cutText: string
  /** The outcome's lines and the treated group. */
  lead: string
  leadText: string
  /** The scattered points and the control group. */
  quiet: string
  quietText: string
  /** The effect's arrow and name. */
  ink: string
  /** The axis titles. */
  muted: string
}

export interface SketchBox {
  /** The plot's left edge (the upright axis) and top. */
  x: number
  y: number
  w: number
  h: number
}

/** The board's plot height: every vertical offset below is written against it. */
const BASE_H = 150

const POINTS = 10
const POINT_R = 2.6

/**
 * The name over the dashed line, the axis titles and the effect sit this far
 * from what they label. The title under the axis stands its own size and 6px
 * below it: the board's 18px at 12px, and clear of the axis at any size.
 */
const LABEL_GAP = { over: 10, under: 6, side: 6, effect: 10 } as const

export function SketchDrawing({ sketch, box, inks, size, fontFamily }: { sketch: SketchComponent; box: SketchBox; inks: SketchInks; size: number; fontFamily: string }): ReactElement {
  const { x, y, w, h } = box
  const k = h / BASE_H
  const down = sketch.direction === "down"
  // A vertical offset on the board, mirrored when the outcome goes the other way.
  const at = (dy: number) => (down ? y + dy * k : y + h - dy * k)
  // A label's baseline drawn for an outcome going up, mirrored with the drawing for one going down.
  const mirrored = (baseline: number) => (down ? 2 * y + h - baseline + size * 0.8 : baseline)
  const text = (key: string, content: string, tx: number, ty: number, fill: string, anchor: "start" | "middle" | "end", bold = false) => (
    <text key={key} x={tx} y={ty} textAnchor={anchor === "start" ? undefined : anchor} fontFamily={fontFamily} fontSize={size} fontWeight={bold ? "700" : undefined} fill={fill} dominantBaseline="alphabetic">
      {content}
    </text>
  )
  const frame = (
    <g data-sketch-frame="">
      <line x1={x} y1={y + h} x2={x + w} y2={y + h} stroke={inks.axis} strokeWidth={1.2} />
      <line x1={x} y1={y} x2={x} y2={y + h} stroke={inks.axis} strokeWidth={1.2} />
      {text("x", `${sketch.x_title.trim()} →`, x + w, y + h + size + LABEL_GAP.under, inks.muted, "end")}
      {sketch.y_title ? text("y", sketch.y_title.trim(), x - LABEL_GAP.side, y + 8, inks.muted, "end") : null}
    </g>
  )
  if (sketch.kind === "discontinuity") {
    const cut = x + w / 2
    const left = { x1: x + 10, y1: at(30), x2: cut - 4, y2: at(52) }
    const right = { x1: cut + 4, y1: at(96), x2: x + w - 10, y2: at(118) }
    const slopeL = (left.y2 - left.y1) / (left.x2 - left.x1)
    const slopeR = (right.y2 - right.y1) / (right.x2 - right.x1)
    const jitter = (i: number) => ((i % 3) - 1) * 5 * k
    // The board's 22px pitch on its 488px plot: ten points spread over each half.
    const pitch = (w / 2 - 24) / POINTS
    const pts = Array.from({ length: POINTS }, (_, i) => {
      const lx = x + 22 + i * pitch
      const rx = cut + 14 + i * pitch
      return [
        { cx: lx, cy: left.y1 + (lx - left.x1) * slopeL + jitter(i) },
        { cx: rx, cy: right.y1 + (rx - right.x1) * slopeR + jitter(i) },
      ]
    })
      .flat()
      .filter((p) => p.cx > x + 4 && p.cx < x + w - 4 && Math.abs(p.cx - cut) > 6)
    const arrowX = cut + 30
    const from = at(54)
    const to = at(92)
    const head = to > from ? -1 : 1
    const effectY = (from + to) / 2 + size * 0.35
    return (
      <g data-sketch="discontinuity">
        {frame}
        {pts.map((p, i) => (
          <circle key={i} cx={p.cx} cy={p.cy} r={POINT_R} fill={inks.quiet} />
        ))}
        <line x1={left.x1} y1={left.y1} x2={left.x2} y2={left.y2} stroke={inks.lead} strokeWidth={2.6} />
        <line x1={right.x1} y1={right.y1} x2={right.x2} y2={right.y2} stroke={inks.lead} strokeWidth={2.6} />
        <line data-sketch-cut="" x1={cut} y1={y - 4} x2={cut} y2={y + h} stroke={inks.cut} strokeWidth={1.6} strokeDasharray="5 4" />
        {text("at", sketch.at.trim(), cut, y - LABEL_GAP.over, inks.cutText, "middle", true)}
        <line x1={arrowX} y1={from} x2={arrowX} y2={to + head * 6} stroke={inks.ink} strokeWidth={1.4} />
        <path d={`M ${arrowX - 4} ${to + head * 7} L ${arrowX} ${to} L ${arrowX + 4} ${to + head * 7} Z`} fill={inks.ink} />
        {sketch.effect ? text("effect", sketch.effect.trim(), arrowX + LABEL_GAP.effect, effectY, inks.ink, "start", true) : null}
      </g>
    )
  }
  const mid = x + w * 0.55
  const end = x + w - 10
  const [treated, control] = sketch.groups ?? ["", ""]
  // The control's name stands clear under its line (over it, going down),
  // where the line comes nearest: at the name's inner end.
  const controlW = measureTextUnits(control.trim(), { fontFamily, bold: true }) * size
  const nameLeft = Math.max(mid, x + w - 6 - controlW)
  const lineAt = at(52) + ((nameLeft - mid) / (end - mid)) * (at(82) - at(52))
  const controlBaseline = down ? lineAt - LABEL_GAP.side : lineAt + LABEL_GAP.side + size * 0.8
  return (
    <g data-sketch="difference_in_differences">
      {frame}
      <line data-sketch-cut="" x1={mid} y1={y - 4} x2={mid} y2={y + h} stroke={inks.cut} strokeWidth={1.6} strokeDasharray="5 4" />
      {text("at", sketch.at.trim(), mid, y - LABEL_GAP.over, inks.cutText, "middle", true)}
      <polyline points={`${x + 10},${at(22)} ${mid},${at(52)} ${end},${at(82)}`} fill="none" stroke={inks.quiet} strokeWidth={2.6} />
      <polyline data-sketch-counterfactual="" points={`${mid},${at(70)} ${end},${at(100)}`} fill="none" stroke={inks.lead} strokeWidth={1.6} strokeDasharray="4 4" />
      <polyline points={`${x + 10},${at(40)} ${mid},${at(70)} ${end},${at(120)}`} fill="none" stroke={inks.lead} strokeWidth={2.6} />
      {text("treated", treated.trim(), x + w - 6, mirrored(y + h - 126 * k), inks.leadText, "end", true)}
      {text("control", control.trim(), x + w - 6, controlBaseline, inks.quietText, "end", true)}
    </g>
  )
}

// ── The ordinary renderer ──

/** The ordinary sketch: 16px labels, a plot 150px tall under a band for the name over the dashed line. */
const ORDINARY = { size: 16, top: 30, bottom: 30, plotH: BASE_H, maxW: 760 } as const

function ordinaryInks(ctx: ComponentCtx): SketchInks {
  const ground = ctx.defaultBg ?? ctx.colors.bg
  const quiet = ctx.colors.chartPalette[3] ?? ctx.colors.muted
  return {
    axis: graphicInk(ctx.colors.muted, ground),
    cut: graphicInk(ctx.colors.accent, ground),
    cutText: accessibleInk(ctx.colors.accent, ground, ORDINARY.size),
    lead: graphicInk(ctx.colors.primary, ground),
    leadText: accessibleInk(ctx.colors.primary, ground, ORDINARY.size),
    quiet: graphicInk(quiet, ground),
    quietText: accessibleInk(quiet, ground, ORDINARY.size),
    ink: ctx.colors.text,
    muted: accessibleInk(ctx.colors.muted, ground, ORDINARY.size),
  }
}

export const sketch: SvgComponent<SketchComponent> = {
  measure() {
    return ORDINARY.top + ORDINARY.plotH + ORDINARY.bottom
  },
  render(component, box, ctx) {
    const yTitle = component.y_title?.trim()
    const yW = yTitle ? fitSvgLine(yTitle, { maxWidth: 200, fontSize: ORDINARY.size, minFontSize: ORDINARY.size, fontFamily: ctx.fonts.body }) : null
    const left = yW ? measureTextUnits(yW.text, { fontFamily: ctx.fonts.body }) * ORDINARY.size + LABEL_GAP.side + 4 : 4
    const w = Math.min(ORDINARY.maxW, box.w - left)
    return (
      <g data-component="sketch">
        <SketchDrawing sketch={component} box={{ x: box.x + left, y: box.y + ORDINARY.top, w, h: ORDINARY.plotH }} inks={ordinaryInks(ctx)} size={ORDINARY.size} fontFamily={ctx.fonts.body} />
      </g>
    )
  },
}

export const renderDef: RenderDef<SketchComponent> = { type: "sketch", measure: sketch.measure, render: sketch.render }
