import type React from "react"
import type { Component } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import { changeText } from "../../lib/change-figure"
import { isPercentUnit, joinUnit } from "../../lib/quantity-format"
import { measureTextUnits } from "../../lib/svg-text-layout"
import { accessibleInk } from "../../render/ink"
import { SmallText, deltaGlyph, fitPanelBar, paintPanel, panelInks, panelSeriesInk, panelText, type Place } from "./panel"
import { blockTag } from "./shared"
import { anyMeet, boxesMeet, chartFigures, niceCeil, plotNumber, pointDecimals, reportedDecimals, textBox, type InkBox } from "./plot"

type Chart = Extract<Component, { type: "chart" }>
type Series = Chart["series"][number]

/*
 * The column charts of the panel setting: upright bars, stacked columns and
 * a bar-and-line combo, each in a panel with no value axis. ledger's
 * 2026-10 board draws three (p04, p06, p11).
 *
 * - The panel's name is the one series' name, or the value axis title
 *   (`axes.y_title`) when there are several, and its unit stands on the right
 *   of the title bar: the left axis's, and for a combo the right axis's after
 *   it ("亿美元 · %").
 * - Several series get a legend under the title bar, listed from the top of
 *   the stack down so it reads in the order the columns do. The marked
 *   series (`emphasis`) takes the mark (ledger's amber), the others the chart
 *   palette after its lead, nearest the top first.
 * - A lone series is in the first receding colour, and the bar the author
 *   marked (`data[].emphasis`) in the mark with its figure bold.
 * - Every column carries its figure: a stack its total, a bar its value.
 *   Categories sit under one baseline in the muted ink.
 * - A change the author asked for (`changes`, from one category to another)
 *   is a bracket over the two columns, its figure after an arrow: in the mark
 *   when nothing on the chart is a single marked bar, since the change is
 *   what the page says (as swiss settled), and in the direction's colour
 *   (ledger's green or red) when a bar is marked, so the bracket and the bar
 *   do not read as one mark. The column the change ends on prints its total
 *   bold.
 * - A combo is one bar series and one line read against the right axis. The
 *   line is in the mark when the author marked it, its dots small and its two
 *   ends larger, with the first and last values over them.
 */

const MAX_CATEGORIES = 12
const PAD = 26
/** The legend's top, 40px into the panel. Entries step their name's width plus 46px. */
const LEGEND = { top: 40, swatch: 12, gap: 6, after: 28, size: 14 } as const
/** The baseline stands this far above the panel's foot, categories 22px under it. */
const BASE_FOOT = 48
const CATEGORY = { drop: 22, size: 14 } as const
/** The highest mark stops this far under the panel's top. */
const PLOT_TOP = 76
/** Room a bracket needs over the columns, and a figure over a bar. */
const BRACKET_ROOM = 60
const LABEL_ROOM = 30
const STACK = { share: 0.58, max: 64, totalSize: 15, lift: 10 } as const
const BAR = { share: 0.67, max: 58, valueSize: 14, lift: 8 } as const
const BRACKET = { leg: 28, rise: 40, labelLift: 8, size: 16, stroke: 1.5 } as const
const LINE = { width: 3, dot: 4, endDot: 6, firstSize: 20, lastSize: 24, lift: 14, plate: 4 } as const
/** How high a combo's bars and line reach: the bars' nice ceiling and the line's 100% (or ceiling). */
const COMBO = { bars: 0.94, line: 0.98 } as const

interface Column {
  name: string
  /** Each series' value here, in series order, null where it has none. */
  values: (number | null)[]
  total: number
}

/** Whether a chart is one of the column charts this panel draws. */
export function columnsChart(chart: Component): chart is Chart {
  if (chart.type !== "chart" || chart.direction === "horizontal") return false
  if (chart.axes?.x_title) return false
  if (!chart.series.every((s) => s.data.every((point) => typeof point.x === "string" && point.y >= 0 && point.status === undefined))) return false
  if (chart.chart_type === "bar") return chart.series.length === 1
  if (chart.chart_type === "stacked") return chart.series.length >= 2 && chart.series.length <= 4
  if (chart.chart_type === "combo") {
    const lines = chart.series.filter((s) => s.plot === "line")
    const bars = chart.series.filter((s) => s.plot !== "line")
    return lines.length === 1 && bars.length === 1 && bars[0]!.axis !== "right"
  }
  return false
}

function columnsOf(chart: Chart, series: readonly Series[]): Column[] {
  const names: string[] = []
  for (const s of chart.series) for (const point of s.data) if (!names.includes(point.x as string)) names.push(point.x as string)
  return names.map((name) => {
    const values = series.map((s) => s.data.find((p) => p.x === name)?.y ?? null)
    return { name, values, total: values.reduce<number>((sum, v) => sum + (v ?? 0), 0) }
  })
}

/** The panel's name and unit. */
function panelLabels(chart: Chart): { name: string | undefined; unit: string | undefined } {
  const lone = chart.series.length === 1 ? chart.series[0]!.name : undefined
  const name = lone ?? chart.axes?.y_title
  const units = chart.chart_type === "combo" ? [chart.axes?.y_unit, chart.axes?.y2_unit] : [chart.axes?.y_unit]
  const unit = units.map((u) => u?.trim()).filter((u): u is string => Boolean(u)).join(" · ")
  return { name: name?.trim(), unit: unit || undefined }
}

/** Draws a column chart as a panel at `place`, or `null` when it cannot. */
export function columnsPanel(chart: Chart, place: Place, ctx: ComponentCtx): React.ReactElement | null {
  if (!columnsChart(chart)) return null
  const combo = chart.chart_type === "combo"
  const stacked = chart.chart_type === "stacked"
  const barSeries = combo ? chart.series.filter((s) => s.plot !== "line") : chart.series
  const lineSeries = combo ? chart.series.find((s) => s.plot === "line")! : null
  const columns = columnsOf(chart, barSeries)
  if (columns.length < 2 || columns.length > MAX_CATEGORIES) return null
  const { name, unit } = panelLabels(chart)
  const bar = fitPanelBar(name, unit, place.w, ctx)
  if (!bar) return null

  const inks = panelInks(ctx)
  const body = ctx.fonts.body
  const figures = chartFigures(chart, ctx)
  const decimals = reportedDecimals(chart)
  const markedSeries = chart.series.findIndex((s) => s.emphasis === true)
  const markedPoint = chart.series.some((s) => s.data.some((p) => p.emphasis === true))
  const left = place.x + PAD
  const right = place.x + place.w - PAD
  const slot = (right - left) / columns.length
  const base = place.y + place.h - BASE_FOOT
  const changes = (chart.changes ?? []).filter((c) => c.at === undefined)
  if ((chart.changes ?? []).length !== changes.length) return null
  const room = changes.length > 0 ? BRACKET_ROOM : LABEL_ROOM
  const height = base - (place.y + PLOT_TOP) - room
  if (height < 120) return null
  const cx = (i: number) => left + slot * (i + 0.5)
  const nodes: React.ReactNode[] = []
  const boxes: InkBox[] = []

  // Series colours: the marked one in the mark, the others stepping back
  // through the palette from the top of the stack down.
  const unmarked = barSeries.map((_s, i) => i).filter((i) => chart.series.indexOf(barSeries[i]!) !== markedSeries)
  const tierOf = new Map(unmarked.slice().reverse().map((i, k) => [i, k]))
  const seriesInk = (i: number) => (chart.series.indexOf(barSeries[i]!) === markedSeries ? inks.mark : panelSeriesInk(ctx, tierOf.get(i) ?? 0))

  // Legend: several series, or a combo's bar and line.
  const legendTop = place.y + LEGEND.top
  const legendBaseline = legendTop + LEGEND.swatch - 1
  if (barSeries.length > 1 || combo) {
    let lx = left
    const order = stacked ? barSeries.map((_s, i) => i).reverse() : barSeries.map((_s, i) => i)
    const entries: { name: string; ink: string; line: boolean; marked: boolean }[] = order.map((i) => ({
      name: barSeries[i]!.name,
      ink: seriesInk(i),
      line: false,
      marked: chart.series.indexOf(barSeries[i]!) === markedSeries,
    }))
    if (lineSeries) {
      const marked = lineSeries.emphasis === true
      entries.push({ name: lineSeries.name, ink: marked ? inks.mark : panelSeriesInk(ctx, unmarked.length), line: true, marked })
    }
    for (const [k, entry] of entries.entries()) {
      const textX = lx + (entry.line ? 32 : LEGEND.swatch + LEGEND.gap)
      const w = measureTextUnits(entry.name, { fontFamily: body }) * LEGEND.size
      nodes.push(
        <g key={`legend-${k}`}>
          {entry.line ? (
            <rect x={lx} y={legendTop + LEGEND.swatch / 2 - LINE.width / 2} width={24} height={LINE.width} fill={entry.ink} />
          ) : (
            <rect x={lx} y={legendTop} width={LEGEND.swatch} height={LEGEND.swatch} fill={entry.ink} />
          )}
          <SmallText
            text={entry.name}
            x={textX}
            y={legendBaseline}
            size={LEGEND.size}
            fill={panelText(entry.marked ? inks.mark : ctx.colors.muted, inks.surface, LEGEND.size)}
            ctx={ctx}
          />
        </g>,
      )
      boxes.push(textBox(textX, legendBaseline, w, LEGEND.size))
      lx = textX + w + LEGEND.after
    }
    if (lx - LEGEND.after > right) return null
  }

  // The bars' scale.
  const barMax = Math.max(...columns.map((c) => (stacked ? c.total : Math.max(...c.values.map((v) => v ?? 0)))))
  if (!(barMax > 0)) return null
  const barScale = combo ? (height * COMBO.bars) / niceCeil(barMax) : height / barMax
  const barW = stacked ? Math.min(STACK.max, slot * STACK.share) : Math.min(BAR.max, slot * BAR.share)
  if (barW < 16) return null
  const changeEnds = new Set(changes.map((c) => c.to))
  const tops: number[] = []
  const barBoxes: InkBox[] = []
  for (const [i, column] of columns.entries()) {
    let y = base
    const x = cx(i) - barW / 2
    for (const [s, v] of column.values.entries()) {
      if (v == null || v <= 0) continue
      const h = v * barScale
      const point = barSeries[s]!.data.find((p) => p.x === column.name)!
      const ink = !stacked && markedPoint ? (point.emphasis ? inks.mark : panelSeriesInk(ctx, 0)) : seriesInk(s)
      nodes.push(<rect key={`bar-${i}-${s}`} x={x} y={y - h} width={barW} height={stacked ? Math.max(0, h - 1) : h} fill={ink} />)
      barBoxes.push({ x0: x, y0: y - h, x1: x + barW, y1: y })
      y -= h
    }
    tops.push(y)
    // The column's figure.
    const lone = column.values.find((v) => v != null) ?? 0
    const point = barSeries[0]!.data.find((p) => p.x === column.name)
    const markedHere = !stacked && point?.emphasis === true
    const text = stacked
      ? plotNumber(column.total, figures, Math.max(...barSeries.map((s) => pointDecimals(s.data.find((p) => p.x === column.name) ?? { x: "", y: 0 }, decimals))))
      : plotNumber(lone, figures, decimals)
    const size = stacked ? STACK.totalSize : BAR.valueSize
    const bold = markedHere || (stacked && changeEnds.has(column.name))
    const ink = markedHere ? inks.mark : stacked ? ctx.colors.text : ctx.colors.muted
    const ty = y - (stacked ? STACK.lift : BAR.lift)
    nodes.push(<SmallText key={`value-${i}`} text={text} x={cx(i)} y={ty} size={size} fill={panelText(ink, inks.surface, size)} ctx={ctx} anchor="middle" bold={bold} />)
    boxes.push(textBox(cx(i), ty, measureTextUnits(text, { fontFamily: body, bold }) * size, size, "middle"))
    nodes.push(
      <SmallText key={`cat-${i}`} text={column.name} x={cx(i)} y={base + CATEGORY.drop} size={CATEGORY.size} fill={panelText(ctx.colors.muted, inks.surface, CATEGORY.size)} ctx={ctx} anchor="middle" />,
    )
    boxes.push(textBox(cx(i), base + CATEGORY.drop, measureTextUnits(column.name, { fontFamily: body }) * CATEGORY.size, CATEGORY.size, "middle"))
  }
  nodes.unshift(<rect key="base" x={left} y={base} width={right - left} height={1} fill={inks.edge} />)

  // The line of a combo, on its own scale.
  if (lineSeries) {
    const marked = lineSeries.emphasis === true
    const ink = marked ? inks.mark : panelSeriesInk(ctx, unmarked.length)
    const values = columns.map((c) => lineSeries.data.find((p) => p.x === c.name)?.y ?? null)
    const kept = values.filter((v): v is number => v != null)
    if (kept.length < 2) return null
    const ceiling = isPercentUnit(lineSeries.axis === "right" ? chart.axes?.y2_unit : chart.axes?.y_unit) && Math.max(...kept) <= 100 ? 100 : niceCeil(Math.max(...kept))
    const lineScale = (height * COMBO.line) / ceiling
    const points = values.flatMap((v, i) => (v == null ? [] : [{ x: cx(i), y: base - v * lineScale, v }]))
    nodes.push(
      <polyline key="line" points={points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")} fill="none" stroke={ink} strokeWidth={LINE.width} strokeLinejoin="round" />,
    )
    const unitR = lineSeries.axis === "right" ? chart.axes?.y2_unit : chart.axes?.y_unit
    const lineDecimals = Math.max(0, ...lineSeries.data.map((p) => pointDecimals(p, 0)))
    for (const [k, p] of points.entries()) {
      const end = k === 0 || k === points.length - 1
      nodes.push(<circle key={`dot-${k}`} cx={p.x} cy={p.y} r={end ? LINE.endDot : LINE.dot} fill={ink} />)
      if (!end) continue
      const size = k === 0 ? LINE.firstSize : LINE.lastSize
      const text = joinUnit(plotNumber(p.v, figures, lineDecimals), unitR?.trim() || undefined, " ")
      const box = textBox(p.x, p.y - LINE.lift, measureTextUnits(text, { fontFamily: body, bold: true }) * size, size, "middle")
      // A label that lands on a taller bar stands on a plate of the panel's
      // own fill, so the mark keeps its contrast instead of sitting on the bar.
      if (barBoxes.some((bar) => boxesMeet(bar, box, 0))) {
        nodes.push(
          <rect key={`dot-plate-${k}`} data-label-plate="" x={box.x0 - LINE.plate} y={box.y0 - LINE.plate / 2} width={box.x1 - box.x0 + LINE.plate * 2} height={box.y1 - box.y0 + LINE.plate} fill={inks.surface} />,
        )
      }
      nodes.push(<SmallText key={`dot-label-${k}`} text={text} x={p.x} y={p.y - LINE.lift} size={size} fill={accessibleInk(ink, inks.surface, size)} ctx={ctx} anchor="middle" bold />)
      boxes.push(box)
    }
  }

  // Brackets over the columns a change runs between.
  for (const [k, change] of changes.entries()) {
    const a = columns.findIndex((c) => c.name === change.from)
    const b = columns.findIndex((c) => c.name === change.to)
    if (a < 0 || b < 0) return null
    const from = stacked ? columns[a]!.total : (columns[a]!.values[0] ?? 0)
    const to = stacked ? columns[b]!.total : (columns[b]!.values[0] ?? 0)
    if (!(from > 0)) return null
    const figure = changeText(from, to, chart.axes?.y_unit, figures.chinese).replace(/^[+−]/u, "")
    const direction = to >= from ? "up" : "down"
    const text = `${deltaGlyph(direction)} ${figure}`
    const ink = markedPoint ? (direction === "up" ? inks.up : inks.down) : inks.mark
    const t1 = tops[a]!
    const t2 = tops[b]!
    const yb = Math.min(t1, t2) - BRACKET.rise - k * 36
    const x1 = cx(a)
    const x2 = cx(b)
    nodes.push(
      <g key={`bracket-${k}`} data-change-bracket="">
        <path d={`M${x1.toFixed(1)} ${(t1 - BRACKET.leg).toFixed(1)} V${yb.toFixed(1)} H${x2.toFixed(1)} V${(t2 - BRACKET.leg).toFixed(1)}`} fill="none" stroke={ink} strokeWidth={BRACKET.stroke} />
        <SmallText text={text} x={(x1 + x2) / 2} y={yb - BRACKET.labelLift} size={BRACKET.size} fill={accessibleInk(ink, inks.surface, BRACKET.size)} ctx={ctx} anchor="middle" bold />
      </g>,
    )
    boxes.push(textBox((x1 + x2) / 2, yb - BRACKET.labelLift, measureTextUnits(text, { fontFamily: body, bold: true }) * BRACKET.size, BRACKET.size, "middle"))
  }

  if (anyMeet(boxes, 2)) return null
  if (boxes.some((box) => box.y0 < place.y + 38 || box.y1 > place.y + place.h - 4 || box.x0 < place.x + 4 || box.x1 > place.x + place.w - 4)) return null

  return (
    <g data-chart-panel="columns">
      {paintPanel(place, ctx, { bar })}
      <g {...blockTag(ctx, chart)}>{nodes}</g>
    </g>
  )
}
