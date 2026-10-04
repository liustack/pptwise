import type React from "react"
import type { Component } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import { measureTextUnits } from "../../lib/svg-text-layout"
import { accessibleInk } from "../../render/ink"
import { SmallText, fitPanelBar, paintPanel, panelInks, panelOutlineInk, panelSeriesInk, panelText, type Place } from "./panel"
import { chartFigures, plotNumber, reportedDecimals, valueDecimals } from "./plot"
import { blockTag, compositionTag, type Composition } from "./shared"

type Chart = Extract<Component, { type: "chart" }>

/*
 * shifts: a dumbbell chart in a panel, each row a move from the first value
 * to the last on a shared value scale. The first value is a hollow ring, the
 * last a filled dot joined to it by a line, both with their figures over
 * them. A row that rose takes the mark (ledger's amber), a row that fell
 * steps back to the quiet palette colour, since on this page the story is
 * the rises. Dotted gridlines and their ticks stand under the rows. ledger's
 * 2026-10 guidance page (p05).
 *
 * The panel's name is the values' title and the move it shows, "2026 年指引：
 * 年内首次 → 7 月最新" (`axes.x_title`, then the two series' names), and the
 * unit (`axes.x_unit` or `axes.y_unit`) stands on the right of the title
 * bar. A category written with a parenthesis, 「微软（租赁改口径，投资不
 * 变）」, sets its name and, under it in small type, what the parenthesis says.
 *
 * The panel setting only.
 *
 * Takes: one `chart` of type `dumbbell` with two series over two to six
 * categories, every value at or above zero and no `y_title`.
 *
 * Declines: a name past its column, the two figures of a row that cannot be
 * set apart, or a title bar that does not fit on one line.
 *
 * Reads: the emphasis ink (rises), the chart palette after its lead (falls,
 * rings), `surface`, `border`, `text`, `muted`, `fonts.body`.
 */

const MAX_ROWS = 6
/** Names stand 26px into the panel. The plot starts at least 160px in and stops 36px short of the right edge. */
const NAME_X = 26
const PLOT_LEFT_MIN = 160
const PLOT_RIGHT = 36
const NAME_SIZE = 18
const NOTE_SIZE = 13
/** The gridlines run from 58px into the panel to 38px above its foot, ticks under them. */
const GRID_TOP = 58
const GRID_FOOT = 38
const TICK_SIZE = 13
const TICK_DROP = 20
/** The first row sits 40px under the gridlines' top, rows 96px apart at most. */
const FIRST_ROW = 40
const ROW_PITCH = 96
/** Room kept between the last row and the gridlines' foot for the ticks. */
const LAST_ROW_FOOT = 72
const FROM = { r: 7, stroke: 2, labelSize: 14 }
const TO = { r: 8, labelSize: 16 }
const LINE_W = 3
/** A row's figures sit this far over its dots. */
const LABEL_LIFT = 16
/** The domain reaches this share of the span past the largest value, for its figure. */
const HEADROOM = 0.17

interface Row {
  name: string
  note: string | null
  from: number
  to: number
}

/** Whether a chart is one this panel draws. */
export function shiftsChart(chart: Component): chart is Chart {
  if (chart.type !== "chart" || chart.chart_type !== "dumbbell") return false
  if (chart.series.length !== 2 || chart.axes?.y_title) return false
  return chart.series.every((s) => s.data.every((point) => point.y >= 0))
}

/** "微软（租赁改口径，投资不变）" → the name and what its parenthesis says. */
export function splitParenthetical(text: string): { name: string; note: string | null } {
  const match = /^(.+?)\s*[（(]([^（）()]+)[）)]\s*$/u.exec(text.trim())
  return match ? { name: match[1]!.trim(), note: match[2]!.trim() } : { name: text.trim(), note: null }
}

function niceStep(span: number): number {
  const raw = span / 3
  const power = 10 ** Math.floor(Math.log10(raw))
  for (const step of [1, 2, 2.5, 5, 10]) if (step * power >= raw) return step * power
  return 10 * power
}

/** The panel's name: the values' title, then the move from the first series to the last. */
export function shiftsTitle(chart: Chart, chinese: boolean): string {
  const move = `${chart.series[0]!.name.trim()} → ${chart.series[1]!.name.trim()}`
  const title = chart.axes?.x_title?.trim()
  return title ? `${title}${chinese ? "：" : ": "}${move}` : move
}

/** Draws a dumbbell chart as a panel at `place`, or `null` when it cannot. */
export function shiftsPanel(chart: Chart, place: Place, ctx: ComponentCtx): React.ReactElement | null {
  if (!shiftsChart(chart)) return null
  const [first, last] = chart.series as [Chart["series"][number], Chart["series"][number]]
  const rows: Row[] = first.data.flatMap((point) => {
    const end = last.data.find((p) => p.x === point.x)
    if (!end) return []
    const { name, note } = splitParenthetical(String(point.x))
    return [{ name, note, from: point.y, to: end.y }]
  })
  if (rows.length < 2 || rows.length > MAX_ROWS || rows.length !== first.data.length || rows.length !== last.data.length) return null
  const figures = chartFigures(chart, ctx)
  const unit = (chart.axes?.x_unit ?? chart.axes?.y_unit)?.trim()
  const bar = fitPanelBar(shiftsTitle(chart, figures.chinese), unit, place.w, ctx)
  if (!bar) return null

  const body = ctx.fonts.body
  const nameW = Math.max(...rows.map((row) => measureTextUnits(row.name, { fontFamily: body, bold: true }) * NAME_SIZE))
  const noteW = Math.max(0, ...rows.map((row) => (row.note ? measureTextUnits(row.note, { fontFamily: body }) * NOTE_SIZE : 0)))
  const plotX = place.x + Math.max(PLOT_LEFT_MIN, Math.ceil(NAME_X + Math.max(nameW, noteW) + 24))
  const plotRight = place.x + place.w - PLOT_RIGHT
  if (plotRight - plotX < 200) return null

  const values = rows.flatMap((row) => [row.from, row.to])
  const min = Math.min(...values)
  const max = Math.max(...values)
  const step = niceStep(Math.max(1e-9, max - min))
  const lo = Math.floor(min / step) * step
  const hi = max + (max - lo) * HEADROOM
  const vx = (v: number) => plotX + ((v - lo) / (hi - lo)) * (plotRight - plotX)
  const ticks: number[] = []
  for (let t = lo; t <= hi + 1e-9; t += step) ticks.push(Number(t.toPrecision(12)))

  const gridTop = place.y + GRID_TOP
  const gridBottom = place.y + place.h - GRID_FOOT
  const firstRow = gridTop + FIRST_ROW
  const pitch = rows.length > 1 ? Math.min(ROW_PITCH, (gridBottom - LAST_ROW_FOOT - firstRow) / (rows.length - 1)) : 0
  if (pitch < 56) return null

  const inks = panelInks(ctx)
  const fall = panelSeriesInk(ctx, 0)
  const ring = panelOutlineInk(ctx)
  const decimals = reportedDecimals(chart)
  const nodes: React.ReactNode[] = []
  const muted = panelText(ctx.colors.muted, inks.surface, TICK_SIZE)
  for (const tick of ticks) {
    const x = vx(tick)
    nodes.push(
      <g key={`tick-${tick}`}>
        <line x1={x} y1={gridTop} x2={x} y2={gridBottom} stroke={inks.edge} strokeWidth={1} strokeDasharray="2 4" />
        <SmallText text={plotNumber(tick, figures)} x={x} y={gridBottom + TICK_DROP} size={TICK_SIZE} fill={muted} ctx={ctx} anchor="middle" />
      </g>,
    )
  }
  for (const [i, row] of rows.entries()) {
    const y = firstRow + i * pitch
    const rose = row.to >= row.from
    const ink = rose ? inks.mark : ring
    const xa = vx(row.from)
    const xb = vx(row.to)
    const fromText = plotNumber(row.from, figures, valueDecimals(row.from, decimals))
    const toText = plotNumber(row.to, figures, valueDecimals(row.to, decimals))
    const fromW = measureTextUnits(fromText, { fontFamily: body }) * FROM.labelSize
    const toW = measureTextUnits(toText, { fontFamily: body, bold: true }) * TO.labelSize
    // The two figures stand centred over their dots, or pushed outward when
    // the dots sit too close for both.
    const apart = Math.abs(xb - xa) >= fromW / 2 + toW / 2 + 8
    const outward = xb >= xa
    const fromAnchor = apart ? "middle" : outward ? "end" : "start"
    const toAnchor = apart ? "middle" : outward ? "start" : "end"
    nodes.push(
      <g key={`row-${i}`} data-shift-row={i + 1}>
        <SmallText text={row.name} x={place.x + NAME_X} y={y + 6} size={NAME_SIZE} fill={panelText(ctx.colors.text, inks.surface, NAME_SIZE)} ctx={ctx} bold />
        {row.note && <SmallText text={row.note} x={place.x + NAME_X} y={y + 28} size={NOTE_SIZE} fill={panelText(ctx.colors.muted, inks.surface, NOTE_SIZE)} ctx={ctx} />}
        <line x1={xa} y1={y} x2={xb} y2={y} stroke={rose ? inks.mark : fall} strokeWidth={LINE_W} />
        <circle cx={xa} cy={y} r={FROM.r} fill={inks.surface} stroke={ring} strokeWidth={FROM.stroke} />
        <circle cx={xb} cy={y} r={TO.r} fill={ink} />
        <SmallText text={fromText} x={xa} y={y - LABEL_LIFT} size={FROM.labelSize} fill={panelText(ctx.colors.muted, inks.surface, FROM.labelSize)} ctx={ctx} anchor={fromAnchor} />
        <SmallText text={toText} x={xb} y={y - LABEL_LIFT} size={TO.labelSize} fill={accessibleInk(ink, inks.surface, TO.labelSize)} ctx={ctx} anchor={toAnchor} bold />
      </g>,
    )
  }

  return (
    <g data-chart-panel="shifts">
      {paintPanel(place, ctx, { bar })}
      <g {...blockTag(ctx, chart)}>{nodes}</g>
    </g>
  )
}

/** The composition: a dumbbell chart alone on the page, in a panel across the band. */
export const shiftsComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "panel" || components.length !== 1) return null
  const chart = components[0]!
  if (!shiftsChart(chart)) return null
  const drawn = shiftsPanel(chart, rect, ctx)
  return drawn ? <g {...compositionTag("shifts")}>{drawn}</g> : null
}
