import type React from "react"
import type { Component } from "@/ir"
import { accessibleInk } from "../../render/ink"
import { statusWords } from "../../render/mark-status"
import { axisInk } from "./notice"
import {
  PLOT_TYPE,
  PlotText,
  MetaLine,
  anyMeet,
  boxesMeet,
  changeText,
  chartTexts,
  forecastWords,
  insideRect,
  layoutLegend,
  markPaint,
  niceCeil,
  paintLegend,
  paintMark,
  plotNumber,
  pointDecimals,
  reportedDecimals,
  seriesInk,
  textBox,
  textWidth,
  writesChinese,
  type InkBox,
  type LegendEntry,
  type MarkPaint,
} from "./plot"
import { blockTag, compositionTag, type Composition } from "./shared"

type Chart = Extract<Component, { type: "chart" }>
type Point = Chart["series"][number]["data"][number]

/*
 * columns: an upright bar chart set by hand with no value axis. The legend
 * runs along the top left with the unit under it, every bar carries its value,
 * the categories sit under one baseline, and the marked series is the only one
 * in the primary colour. A forecast bar is hatched and its value says so, a
 * target bar is a dashed outline over a pale tint, and a change the author
 * asked for is set as a bracket over the two columns it runs between. The
 * first two chart pages of bulletin's 2026-10 board (p03, p09).
 *
 * Takes: one `chart`, alone, of type `bar` (upright) or `stacked`, with one to
 * three series (two to four stacked) over two to six categories, every value
 * zero or more, and no `x_title`.
 *
 * Declines: a horizontal bar, any other chart type, a negative value, a
 * numeric x axis, an x axis title, a category name past one line of its
 * column at 17px, a legend wider than the band, and a plot whose labels,
 * brackets and legend cannot be set apart in the band's height even with the
 * bars drawn at half the board's height.
 *
 * Band: the board's plot is 680px wide and 444px tall. The legend and unit
 * take the top 56px, the categories the bottom 52px, and the bars the rest:
 * 300px for the board's tallest scale, 290px when brackets need room above.
 *
 * Reads: `primary` (the marked series, its values, a bracket that ends on
 * it), the chart palette (series when none is marked), `text` (single-bar
 * values, categories), `muted` (values of receded bars, the legend, the unit,
 * other brackets), `surface` (tints), `bg` or `defaultBg`, `fonts.body`.
 */

const MAX_SERIES = 3
const MAX_STACKED_SERIES = 4
const MIN_CATEGORIES = 2
const MAX_CATEGORIES = 6

/** Baselines from the band's top: the legend, then the unit under it. */
const LEGEND_BASELINE = 18
const UNIT_BASELINE = 50
/** The baseline sits this far above the band's foot, the category names 30px under it. */
const BASE_FROM_FOOT = 52
const CATEGORY_DROP = 30
/** The board's bar heights for a scale's top value. */
const BOARD_H = 300
const BOARD_H_BRACKETS = 290
const MIN_H = 150
/** A lone bar's width and share of its column, then grouped bars' width, share and gap. */
const LONE_BAR_W = 104
const LONE_BAR_SHARE = 0.62
const GROUP_BAR_W = 76
const GROUP_SHARE = 0.7
const GROUP_GAP = 8
/** A value's baseline above its bar. */
const VALUE_LIFT = 12
/** A bracket's legs start this far above the higher of its bars, and it crosses 56px over the higher bar. */
const BRACKET_LEG_GAP = 36
const BRACKET_RISE = 56
const BRACKET_LABEL_LIFT = 10
/** The space a second bracket stacks above an earlier one it would cross. */
const BRACKET_STEP = 40

/** A value waiting to be set over its bar, once every bar is known. */
interface ValueLabel {
  key: string
  cx: number
  /** Baseline of the figure. */
  y: number
  figure: string
  /** The forecast words after the figure, or empty. */
  suffix: string
  size: number
  bold: boolean
  ink: string
  /** Index of the label's own bar in the marks. */
  own: number
}

interface Bar {
  series: number
  point: Point
  /** Bottom and top in value units. */
  from: number
  to: number
}

interface Column {
  name: string
  bars: Bar[]
  /** The column's total: a stack's sum, or the lone bar's value. */
  total: number
}

function columnsShape(components: readonly Component[]): Chart | null {
  if (components.length !== 1) return null
  const chart = components[0]!
  if (chart.type !== "chart") return null
  if (chart.chart_type === "bar") {
    if (chart.direction === "horizontal") return null
    if (chart.series.length < 1 || chart.series.length > MAX_SERIES) return null
  } else if (chart.chart_type === "stacked") {
    if (chart.series.length < 2 || chart.series.length > MAX_STACKED_SERIES) return null
  } else return null
  if (chart.axes?.x_title) return null
  for (const s of chart.series) for (const point of s.data) if (typeof point.x !== "string" || !(point.y >= 0)) return null
  return chart
}

/** The chart's columns in the order the chart draws its categories: first seen across the series. */
function columnsOf(chart: Chart): Column[] {
  const names: string[] = []
  for (const s of chart.series) for (const point of s.data) if (!names.includes(point.x as string)) names.push(point.x as string)
  const stacked = chart.chart_type === "stacked"
  return names.map((name) => {
    const bars: Bar[] = []
    let running = 0
    chart.series.forEach((s, series) => {
      const point = s.data.find((p) => p.x === name)
      if (!point) return
      if (stacked) {
        bars.push({ series, point, from: running, to: running + point.y })
        running += point.y
      } else bars.push({ series, point, from: 0, to: point.y })
    })
    return { name, bars, total: stacked ? running : (bars[0]?.to ?? 0) }
  })
}

/** Legend entries: one per series, plus a forecast or target swatch when only some of a series' points carry one. */
function legendEntries(chart: Chart, ctx: Parameters<Composition>[0]["ctx"], marked: number, chinese: boolean): LegendEntry[] {
  const entries: LegendEntry[] = []
  let partialForecast: string | null = null
  let partialTarget: string | null = null
  chart.series.forEach((s, i) => {
    const color = seriesInk(ctx, i, marked)
    const statuses = new Set(s.data.map((p) => p.status ?? "reported"))
    const only = statuses.size === 1 ? [...statuses][0] : null
    const paint: MarkPaint =
      only === "forecast" || only === "target" ? markPaint(ctx, color, only) : { kind: "solid", fill: color }
    entries.push({ name: s.name, paint })
    if (only === null) {
      if (statuses.has("forecast")) partialForecast ??= color
      if (statuses.has("target")) partialTarget ??= color
    }
  })
  if (partialForecast) entries.push({ name: forecastWords(chinese).legend, paint: markPaint(ctx, partialForecast, "forecast") })
  if (partialTarget) entries.push({ name: statusWords(chinese).target, paint: markPaint(ctx, partialTarget, "target") })
  return entries
}

/** The unit line: the axis title and the unit, as the author wrote them. */
export function unitCaption(chart: Chart, chinese: boolean): string {
  const parts = [chart.axes?.y_title?.trim(), chart.axes?.y_unit?.trim()].filter((p): p is string => Boolean(p))
  return parts.join(chinese ? "，" : ", ")
}

interface Placed {
  nodes: React.ReactNode[]
  boxes: InkBox[]
}

export const columnsComposition: Composition = ({ components, ctx, rect }) => {
  const chart = columnsShape(components)
  if (!chart) return null
  const columns = columnsOf(chart)
  if (columns.length < MIN_CATEGORIES || columns.length > MAX_CATEGORIES) return null
  const { colors, fonts } = ctx
  const body = fonts.body
  const bg = ctx.defaultBg ?? colors.bg
  const chinese = writesChinese(chartTexts(chart))
  const marked = chart.series.findIndex((s) => s.emphasis === true)
  const stacked = chart.chart_type === "stacked"
  const lone = stacked || columns.every((c) => c.bars.length <= 1)

  const slot = rect.w / columns.length
  const fullest = Math.max(1, ...columns.map((c) => (stacked ? 1 : c.bars.length)))
  const barW = lone ? Math.min(LONE_BAR_W, slot * LONE_BAR_SHARE) : Math.min(GROUP_BAR_W, (slot * GROUP_SHARE - GROUP_GAP * (fullest - 1)) / fullest)
  if (barW < 16) return null

  const base = rect.y + rect.h - BASE_FROM_FOOT
  const categoryY = base + CATEGORY_DROP
  const legendY = rect.y + LEGEND_BASELINE
  const unitY = rect.y + UNIT_BASELINE
  const legend = layoutLegend(legendEntries(chart, ctx, marked, chinese), rect.x, legendY, rect.w, body)
  if (!legend) return null
  const caption = unitCaption(chart, chinese)
  const frameBoxes: InkBox[] = [legend.box]
  if (caption) frameBoxes.push(textBox(rect.x, unitY, textWidth(caption, PLOT_TYPE.meta, body), PLOT_TYPE.meta))

  const categoryInk = accessibleInk(colors.text, bg, PLOT_TYPE.category)
  const categoryBoxes: InkBox[] = []
  for (const [i, column] of columns.entries()) {
    const width = textWidth(column.name, PLOT_TYPE.category, body)
    if (width > slot - 8) return null
    categoryBoxes.push(textBox(rect.x + slot * (i + 0.5), categoryY, width, PLOT_TYPE.category, "middle"))
  }

  const forecast = forecastWords(chinese)
  const decimals = reportedDecimals(chart)
  const vmax = niceCeil(Math.max(...columns.map((c) => c.total)))
  const changes = chart.changes ?? []
  let height = changes.length > 0 ? BOARD_H_BRACKETS : BOARD_H

  /** Every bar's x, by column and position in it. */
  const barX = (column: number, k: number, count: number) => {
    const center = rect.x + slot * (column + 0.5)
    if (stacked || count <= 1) return center - barW / 2
    const group = count * barW + (count - 1) * GROUP_GAP
    return center - group / 2 + k * (barW + GROUP_GAP)
  }

  const attempt = (h: number): Placed | null => {
    const y = (v: number) => base - (v / vmax) * h
    const nodes: React.ReactNode[] = []
    const boxes: InkBox[] = []
    const marks: InkBox[] = []
    const valueLabels: ValueLabel[] = []
    columns.forEach((column, ci) => {
      column.bars.forEach((bar, k) => {
        const x = barX(ci, k, column.bars.length)
        const top = y(bar.to)
        const color = seriesInk(ctx, bar.series, marked)
        const paint = markPaint(ctx, color, bar.point.status)
        nodes.push(
          <g key={`bar-${ci}-${k}`} data-plot-mark="1">
            {paintMark(paint, { x, y: top, w: barW, h: Math.max(1, y(bar.from) - top) })}
          </g>,
        )
        marks.push({ x0: x, y0: top, x1: x + barW, y1: base })
        if (stacked) return
        // A value over each bar of an unstacked chart.
        const isMarked = bar.series === marked
        const size = lone ? PLOT_TYPE.lead : PLOT_TYPE.value
        const bold = lone || isMarked
        const ink = accessibleInk(isMarked ? colors.primary : lone ? colors.text : colors.muted, bg, size)
        valueLabels.push({
          key: `value-${ci}-${k}`,
          cx: x + barW / 2,
          y: top - VALUE_LIFT,
          figure: plotNumber(bar.point.y, chinese, pointDecimals(bar.point, decimals)),
          suffix: bar.point.status === "forecast" ? forecast.suffix : "",
          size,
          bold,
          ink,
          own: marks.length - 1,
        })
      })
      if (stacked && column.bars.length > 0) {
        // A stack carries its total over the column.
        const top = y(column.total)
        const isMarked = column.bars.some((bar) => bar.series === marked)
        const lonePoint = column.bars.length === 1 ? column.bars[0]!.point : null
        const text = plotNumber(column.total, chinese, Math.max(...column.bars.map((b) => pointDecimals(b.point, decimals)))) +
          (lonePoint?.status === "forecast" ? forecast.suffix : "")
        const ink = accessibleInk(isMarked ? colors.primary : colors.text, bg, PLOT_TYPE.lead)
        const cx = rect.x + slot * (ci + 0.5)
        const width = textWidth(text, PLOT_TYPE.lead, body, true)
        boxes.push(textBox(cx, top - VALUE_LIFT, width, PLOT_TYPE.lead, "middle"))
        nodes.push(<PlotText key={`total-${ci}`} text={text} x={cx} y={top - VALUE_LIFT} size={PLOT_TYPE.lead} fill={ink} ctx={ctx} bold />)
      }
    })

    // A value wider than its bar slides off a taller neighbour it would sit
    // on, the way the board sets "169（预测）" beside the bar before it. A
    // label that cannot slide clear inside the band sets its forecast words
    // on a line of their own over the figure.
    for (const label of valueLabels) {
      const one = label.figure + label.suffix
      const width = textWidth(one, label.size, body, label.bold)
      let at = label.cx
      for (const [m, mark] of marks.entries()) {
        if (m === label.own) continue
        const box = textBox(at, label.y, width, label.size, "middle")
        if (!boxesMeet(box, mark, 2)) continue
        at = mark.x0 < label.cx ? at + (mark.x1 + 3 - box.x0) : at - (box.x1 + 3 - mark.x0)
      }
      const slid = textBox(at, label.y, width, label.size, "middle")
      if (!label.suffix || insideRect([slid], rect)) {
        boxes.push(slid)
        nodes.push(<PlotText key={label.key} text={one} x={at} y={label.y} size={label.size} fill={label.ink} ctx={ctx} bold={label.bold} />)
        continue
      }
      const suffix = label.suffix.trim()
      const upper = label.y - label.size - 6
      boxes.push(textBox(label.cx, label.y, textWidth(label.figure, label.size, body, label.bold), label.size, "middle"))
      boxes.push(textBox(label.cx, upper, textWidth(suffix, label.size, body, label.bold), label.size, "middle"))
      nodes.push(
        <g key={label.key}>
          <PlotText text={suffix} x={label.cx} y={upper} size={label.size} fill={label.ink} ctx={ctx} bold={label.bold} />
          <PlotText text={label.figure} x={label.cx} y={label.y} size={label.size} fill={label.ink} ctx={ctx} bold={label.bold} />
        </g>,
      )
    }

    // Brackets, lowest first, each lifted over any earlier one it would cross.
    const placedBrackets: { x0: number; x1: number; y: number }[] = []
    for (const [n, change] of changes.entries()) {
      const ends = bracketEnds(change, columns, chart, barX, barW, y)
      if (!ends) return null
      const [a, b] = ends
      let crossY = Math.min(a.top, b.top) - BRACKET_RISE
      for (const earlier of placedBrackets) {
        if (a.x < earlier.x1 && earlier.x0 < b.x && crossY > earlier.y - BRACKET_STEP) crossY = earlier.y - BRACKET_STEP
      }
      placedBrackets.push({ x0: a.x, x1: b.x, y: crossY })
      const strong = b.series === marked && marked >= 0
      const stroke = strong ? colors.primary : axisInk(ctx)
      const text = changeText(a.value, b.value, chart.axes?.y_unit, chinese)
      const ink = accessibleInk(strong ? colors.primary : colors.muted, bg, PLOT_TYPE.lead)
      const cx = (a.x + b.x) / 2
      const labelY = crossY - BRACKET_LABEL_LIFT
      boxes.push(textBox(cx, labelY, textWidth(text, PLOT_TYPE.lead, body, strong), PLOT_TYPE.lead, "middle"))
      nodes.push(
        <g key={`change-${n}`} data-plot-change="">
          <path
            d={`M ${a.x} ${a.top - BRACKET_LEG_GAP} V ${crossY} H ${b.x} V ${b.top - BRACKET_LEG_GAP}`}
            fill="none"
            stroke={stroke}
            strokeWidth={strong ? 2 : 1}
          />
          <PlotText text={text} x={cx} y={labelY} size={PLOT_TYPE.lead} fill={ink} ctx={ctx} bold={strong} />
        </g>,
      )
    }

    const all = [...frameBoxes, ...boxes, ...categoryBoxes]
    if (anyMeet(all, 4)) return null
    if (boxes.some((box) => marks.some((mark) => boxesMeet(box, mark, 2)))) return null
    if (!insideRect(all, rect)) return null
    return { nodes, boxes: all }
  }

  let placed: Placed | null = null
  while (height >= MIN_H) {
    placed = attempt(height)
    if (placed) break
    height = Math.floor(height * 0.9)
  }
  if (!placed) return null

  return (
    <g {...compositionTag("columns")} {...blockTag(ctx, chart)}>
      {paintLegend(legend, legendY, ctx)}
      {caption && <MetaLine text={caption} x={rect.x} y={unitY} ctx={ctx} />}
      <line x1={rect.x} y1={base} x2={rect.x + rect.w} y2={base} stroke={axisInk(ctx)} strokeWidth={1} />
      {placed.nodes}
      {columns.map((column, i) => (
        <PlotText
          key={`category-${i}`}
          text={column.name}
          x={rect.x + slot * (i + 0.5)}
          y={categoryY}
          size={PLOT_TYPE.category}
          fill={categoryInk}
          ctx={ctx}
        />
      ))}
    </g>
  )
}

interface BracketEnd {
  x: number
  top: number
  value: number
  series: number
}

/**
 * Where a change's bracket stands: over the two columns it runs between, or
 * over the two bars of one column it compares. `null` when the chart does
 * not draw what the change names. validate refuses those first.
 */
function bracketEnds(
  change: NonNullable<Chart["changes"]>[number],
  columns: readonly Column[],
  chart: Chart,
  barX: (column: number, k: number, count: number) => number,
  barW: number,
  y: (v: number) => number,
): [BracketEnd, BracketEnd] | null {
  if (change.at === undefined) {
    const ends = [change.from, change.to].map((name) => {
      const ci = columns.findIndex((c) => c.name === name)
      if (ci < 0) return null
      const column = columns[ci]!
      const lead = column.bars[column.bars.length - 1]
      if (!lead) return null
      const x = barX(ci, 0, chart.chart_type === "stacked" ? 1 : column.bars.length) + barW / 2
      return { x, top: y(column.total), value: column.total, series: lead.series }
    })
    if (!ends[0] || !ends[1]) return null
    return [ends[0], ends[1]]
  }
  const ci = columns.findIndex((c) => c.name === change.at)
  if (ci < 0) return null
  const column = columns[ci]!
  const ends = [change.from, change.to].map((name) => {
    const series = chart.series.findIndex((s) => s.name === name)
    const k = column.bars.findIndex((bar) => bar.series === series)
    if (k < 0) return null
    const bar = column.bars[k]!
    return { x: barX(ci, k, column.bars.length) + barW / 2, top: y(bar.to), value: bar.to, series }
  })
  if (!ends[0] || !ends[1]) return null
  return [ends[0], ends[1]]
}
