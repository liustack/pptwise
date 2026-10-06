import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  FigCaption,
  commentOf,
  decimalsIn,
  fitFigCaption,
  fixedValue,
  paintPeriodicalLine,
  periodicalInks,
  periodicalMark,
  periodicalText,
  periodicalWidth,
  placeClaim,
  withUnitText,
} from "./periodical"
import { cutRule, inkBox, type InkBox } from "./manuscript"

type Chart = Extract<Component, { type: "chart" }>

/*
 * chronicle: years of a reading on one line, journal's 2026-10 board (p03).
 * The claim over the page; under it a line for each series across a plot of
 * a few hairlines, its ticks named with their unit at the left, every year
 * under the axis. The series the page leads with is drawn in the type's ink
 * and the others in the linen grey. Each line is dotted at its two ends, its
 * first value set beside the first dot and its name, last value and unit
 * after the last; a point the author noted (`note`) is ringed in the accent
 * and its note set in the accent under it, or over it when it is no low.
 * Under the plot, the figure's number and title and the editor's comment.
 *
 * Takes, in the periodical setting: a titled `line` chart of one to three
 * series over three to fifteen categories, then optionally a `callout` with
 * words alone, the comment.
 *
 * Declines: a chart with markers, gaps, bands, a tag or axis titles, a
 * negative value, a caption, comment or end label past its room, and a first
 * value that would stand on a tick's name.
 *
 * Reads: the periodical inks (`./periodical.tsx`), the number the face hands
 * down (`ctx.exhibitLabels`).
 */

const PLOT = { left: 66, right: 996, top: 130, bottom: 450 } as const
const TICK = { size: 12, gap: 12, dy: 4, below: 22 } as const
const LINE = { stroke: 2.6, dot: 4.5, lit: { r: 4, stroke: 1.6 } } as const
const FIRST = { size: 14, gap: 10, dy: 4 } as const
const LAST = { size: 15, gap: 12, dy: 5 } as const
const NOTE = { size: 12, below: 22, above: 12 } as const
const CAPTION = { top: 496 } as const
const STEPS = [0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000] as const

/** A zero-based value axis of at most three intervals over `max`: its top and step. */
export function zeroAxis(max: number, intervals = 3): { top: number; step: number } | null {
  for (const step of STEPS) {
    const n = Math.ceil(max / step - 1e-9)
    if (n <= intervals && n * step > max) return { top: n * step, step }
  }
  return null
}

export const chronicleComposition: Composition = ({ components, ctx, rect, setting, claim }) => {
  if (setting !== "periodical") return null
  const [chart, callout, ...rest] = components
  if (chart?.type !== "chart" || rest.length > 0) return null
  const comment = callout ? commentOf(callout) : null
  if (callout && !comment) return null
  const c = chart as Chart
  if (c.chart_type !== "line" || !c.title?.trim() || c.markers || c.gaps || c.bands || c.tag || c.axes?.x_title || c.axes?.y_title) return null
  if (c.series.length < 1 || c.series.length > 3 || c.series.some((s) => s.tone)) return null
  const xs = c.series[0]!.data.map((d) => String(d.x))
  if (xs.length < 3 || xs.length > 15 || c.series.some((s) => s.data.length !== xs.length || s.data.some((d, i) => String(d.x) !== xs[i] || d.y < 0))) return null
  const label = ctx.exhibitLabels?.get(c)
  if (!label || rect.w < PLOT.right || rect.h < CAPTION.top + 44) return null
  const caption = fitFigCaption(label, c.title, comment, rect.w, ctx)
  if (!caption) return null
  const values = c.series.flatMap((s) => s.data.map((d) => d.y))
  const axis = zeroAxis(Math.max(...values))
  if (!axis) return null
  const unit = c.axes?.y_unit
  const decimals = decimalsIn(values)
  const tickDecimals = decimalsIn([axis.step])
  const inks = periodicalInks(ctx)
  const ground = inks.ground
  const leadIndex = Math.max(0, c.series.findIndex((s) => s.emphasis))
  const X0 = rect.x + PLOT.left
  const X1 = rect.x + PLOT.right
  const Y0 = rect.y + PLOT.top
  const Y1 = rect.y + PLOT.bottom
  const n = xs.length
  const cx = (i: number) => X0 + (i / (n - 1)) * (X1 - X0)
  const cy = (v: number) => Y1 - (v / axis.top) * (Y1 - Y0)
  const ticks: number[] = []
  for (let v = 0; v <= axis.top + 1e-9; v += axis.step) ticks.push(Number(v.toFixed(6)))
  const muted = periodicalText(inks.muted, ground, TICK.size)
  const tickText = (v: number) => withUnitText(fixedValue(v, tickDecimals), unit)
  const boxes: InkBox[] = []
  const tickBoxes = ticks.map((v) => inkBox(tickText(v), X0 - TICK.gap, cy(v) + TICK.dy, TICK.size, ctx, { anchor: "end" }))
  const series = c.series.map((s, si) => {
    const color = si === leadIndex ? inks.lead : inks.taupe
    const first = s.data[0]!
    const last = s.data[n - 1]!
    const firstText = fixedValue(first.y, decimals)
    const lastText = `${s.name.trim()} ${withUnitText(fixedValue(last.y, decimals), unit)}`
    const firstBox = inkBox(firstText, cx(0) - FIRST.gap, cy(first.y) + FIRST.dy, FIRST.size, ctx, { anchor: "end", bold: true })
    const lastBox = inkBox(lastText, cx(n - 1) + LAST.gap, cy(last.y) + LAST.dy, LAST.size, ctx, { bold: true })
    return { s, si, color, firstText, lastText, firstBox, lastBox }
  })
  // A first value standing on a tick's name, or two ends on each other, cannot be read.
  const overlaps = (a: InkBox, b: InkBox) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1
  if (series.some((a) => tickBoxes.some((t) => overlaps(a.firstBox, t)))) return null
  if (series.some((a, i) => series.some((b, j) => j > i && (overlaps(a.firstBox, b.firstBox) || overlaps(a.lastBox, b.lastBox))))) return null
  if (series.some((a) => a.lastBox.x1 > rect.x + rect.w)) return null
  const notes = c.series.flatMap((s, si) =>
    s.data.flatMap((d, i) => {
      const words = d.note?.trim()
      if (!words) return []
      const prev = s.data[i - 1]?.y
      const next = s.data[i + 1]?.y
      const low = (prev === undefined || prev > d.y) && (next === undefined || next > d.y)
      const baseline = low ? cy(d.y) + NOTE.below : cy(d.y) - NOTE.above
      return [{ si, i, words, baseline, x: cx(i), y: cy(d.y) }]
    }),
  )
  for (const note of notes) {
    const w = periodicalWidth(note.words, NOTE.size, ctx, { bold: true })
    if (note.x - w / 2 < rect.x || note.x + w / 2 > rect.x + rect.w) return null
    boxes.push(inkBox(note.words, note.x, note.baseline, NOTE.size, ctx, { anchor: "middle", bold: true }))
  }
  const head = placeClaim(claim, { x: rect.x, w: rect.w })
  if (head === false) return null
  return (
    <g {...compositionTag("chronicle")}>
      {head}
      <g {...blockTag(ctx, c)}>
        {ticks.map((v) => (
          <g key={`t-${v}`}>
            {cutRule("horizontal", cy(v), X0, X1, boxes).map(([a, b], k) => (
              <rect key={k} x={a} y={cy(v) - 0.5} width={b - a} height={1} fill={inks.line} />
            ))}
            {paintPeriodicalLine(tickText(v), { ctx, x: X0 - TICK.gap, baseline: cy(v) + TICK.dy, size: TICK.size, anchor: "end", fill: muted })}
          </g>
        ))}
        {xs.map((x, i) => paintPeriodicalLine(x, { ctx, key: `x-${i}`, x: cx(i), baseline: Y1 + TICK.below, size: TICK.size, anchor: "middle", fill: muted }))}
        {series.map(({ s, si, color }) => (
          <g key={`s-${si}`} data-periodical-series={s.name} {...(si === leadIndex && c.series.length > 1 ? { "data-periodical-lead": "series" } : {})}>
            <polyline points={s.data.map((d, i) => `${cx(i)},${cy(d.y)}`).join(" ")} fill="none" stroke={periodicalMark(color, ground)} strokeWidth={LINE.stroke} />
            <circle cx={cx(0)} cy={cy(s.data[0]!.y)} r={LINE.dot} fill={periodicalMark(color, ground)} />
            <circle cx={cx(n - 1)} cy={cy(s.data[n - 1]!.y)} r={LINE.dot} fill={periodicalMark(color, ground)} />
          </g>
        ))}
        {series.map(({ s, si, color, firstText, lastText }) => (
          <g key={`l-${si}`}>
            {paintPeriodicalLine(firstText, { ctx, x: cx(0) - FIRST.gap, baseline: cy(s.data[0]!.y) + FIRST.dy, size: FIRST.size, anchor: "end", bold: true, serif: false, fill: periodicalText(color, ground, FIRST.size) })}
            {paintPeriodicalLine(lastText, { ctx, x: cx(n - 1) + LAST.gap, baseline: cy(s.data[n - 1]!.y) + LAST.dy, size: LAST.size, bold: true, fill: periodicalText(color, ground, LAST.size) })}
          </g>
        ))}
        {notes.map((note) => (
          <g key={`n-${note.si}-${note.i}`} data-periodical-note={note.words}>
            <circle cx={note.x} cy={note.y} r={LINE.lit.r} fill="none" stroke={periodicalMark(inks.brick, ground)} strokeWidth={LINE.lit.stroke} />
            {paintPeriodicalLine(note.words, { ctx, x: note.x, baseline: note.baseline, size: NOTE.size, anchor: "middle", bold: true, fill: periodicalText(inks.brick, ground, NOTE.size) })}
          </g>
        ))}
        <FigCaption caption={caption} x={rect.x} top={rect.y + CAPTION.top} ctx={ctx} />
      </g>
    </g>
  )
}
