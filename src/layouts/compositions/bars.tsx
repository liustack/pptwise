import type React from "react"
import type { Component } from "@/ir"
import { accessibleInk } from "../../render/ink"
import { unitCaption } from "./columns"
import { axisInk } from "./notice"
import {
  PLOT_TYPE,
  PlotText,
  MetaLine,
  anyMeet,
  changeText,
  chartTexts,
  forecastWords,
  insideRect,
  layoutLegend,
  markPaint,
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
} from "./plot"
import { blockTag, compositionTag, ruleInk, type Composition } from "./shared"

type Chart = Extract<Component, { type: "chart" }>

/*
 * bars: a horizontal bar chart set by hand as grouped rows. Each category is
 * a row: its name on the left, one bar per series stacked down the row, each
 * bar's value at its end, a hairline between rows and an axis line where the
 * bars start. No value axis. The marked series is the only one in the
 * primary colour, and a change the author asked for at one category is set
 * after the later bar in the primary colour, with that category's name set
 * bold. bulletin's 2026-10 share page (p06).
 *
 * Takes: one `chart`, alone, of type `bar` with `direction: "horizontal"`,
 * one to three series over two to six categories, every value zero or more,
 * and no `x_title`. Its `changes` each name an `at` category.
 *
 * Declines: anything else, a category name wider than the name column's
 * 220px at 18px, a legend and unit wider than the band, and rows that do not
 * fit the band's height at the board's bar thickness.
 *
 * Band: the board's plot is 680px wide. Rows take 26px per bar with 6px
 * between bars and 32px between rows: two series over four categories need
 * 360px under the 50px legend row.
 *
 * Reads: `primary` (the marked series, its values, a change), the chart
 * palette (series when none is marked), `text` (category names), `muted`
 * (other values, the legend, the unit), `border` or `muted` (hairlines),
 * `surface` (tints), `bg` or `defaultBg`, `fonts.body`.
 */

const MAX_SERIES = 3
const MIN_CATEGORIES = 2
const MAX_CATEGORIES = 6
const LEGEND_BASELINE = 18
/** The first row starts 50px into the band, its rule 12px above. */
const FIRST_ROW = 50
const BAR_H = 26
const BAR_GAP = 6
/** Air between one row's last bar and the next row's first. */
const ROW_AIR = 32
/** A category name's baseline within its row. */
const NAME_BASELINE = 34
const NAME_SIZE = 18
const NAME_COLUMN_MIN = 130
const NAME_COLUMN_MAX = 220
const NAME_GAP = 40
/** A value's distance from its bar's end, and its baseline within the bar. */
const VALUE_GAP = 10
const VALUE_BASELINE = 20
const VALUE_SIZE = 17
/** A change after its bar's value. */
const CHANGE_GAP = 14
/** The axis line starts this far above the first row. */
const AXIS_LEAD = 14

function barsShape(components: readonly Component[]): Chart | null {
  if (components.length !== 1) return null
  const chart = components[0]!
  if (chart.type !== "chart" || chart.chart_type !== "bar" || chart.direction !== "horizontal") return null
  if (chart.series.length < 1 || chart.series.length > MAX_SERIES) return null
  if (chart.axes?.x_title) return null
  for (const s of chart.series) for (const point of s.data) if (typeof point.x !== "string" || !(point.y >= 0)) return null
  if ((chart.changes ?? []).some((change) => change.at === undefined)) return null
  return chart
}

export const barsComposition: Composition = ({ components, ctx, rect }) => {
  const chart = barsShape(components)
  if (!chart) return null
  const names: string[] = []
  for (const s of chart.series) for (const point of s.data) if (!names.includes(point.x as string)) names.push(point.x as string)
  if (names.length < MIN_CATEGORIES || names.length > MAX_CATEGORIES) return null
  const { colors, fonts } = ctx
  const body = fonts.body
  const bg = ctx.defaultBg ?? colors.bg
  const chinese = writesChinese(chartTexts(chart))
  const marked = chart.series.findIndex((s) => s.emphasis === true)
  const right = rect.x + rect.w
  const forecast = forecastWords(chinese)
  const decimals = reportedDecimals(chart)
  const changes = chart.changes ?? []

  // The legend on the left of the top row, the unit right-aligned on the same baseline.
  const legendY = rect.y + LEGEND_BASELINE
  const entries: LegendEntry[] = chart.series.map((s, i) => ({ name: s.name, paint: { kind: "solid", fill: seriesInk(ctx, i, marked) } }))
  if (chart.series.some((s) => s.data.some((p) => p.status === "forecast"))) {
    const i = chart.series.findIndex((s) => s.data.some((p) => p.status === "forecast"))
    entries.push({ name: forecast.legend, paint: markPaint(ctx, seriesInk(ctx, i, marked), "forecast") })
  }
  const caption = unitCaption(chart, chinese)
  const captionW = caption ? textWidth(caption, PLOT_TYPE.meta, body) : 0
  const legend = layoutLegend(entries, rect.x, legendY, rect.w - (captionW ? captionW + 24 : 0), body)
  if (!legend) return null
  const boxes: InkBox[] = [legend.box]
  if (caption) boxes.push(textBox(right, legendY, captionW, PLOT_TYPE.meta, "end"))

  // The name column, as wide as the widest name needs.
  const changedAt = new Set(changes.map((c) => c.at!))
  const nameW = Math.max(...names.map((n) => textWidth(n, NAME_SIZE, body, changedAt.has(n))))
  const x0 = rect.x + Math.max(NAME_COLUMN_MIN, Math.ceil(nameW + NAME_GAP))
  if (nameW > NAME_COLUMN_MAX) return null

  const count = chart.series.length
  const group = count * BAR_H + (count - 1) * BAR_GAP
  const pitch = group + ROW_AIR
  const firstRow = rect.y + FIRST_ROW
  const lastFoot = firstRow + names.length * pitch - ROW_AIR / 2 + 4
  if (lastFoot > rect.y + rect.h) return null

  // Scale: the longest bar, its value and any change after it end at the band's right edge.
  const tails = names.map((name) =>
    chart.series.map((s, si) => {
      const point = s.data.find((p) => p.x === name)
      if (!point) return null
      const text = plotNumber(point.y, chinese, pointDecimals(point, decimals)) + (point.status === "forecast" ? forecast.suffix : "")
      const bold = si === marked
      const change = changes.find((c) => c.at === name && c.to === s.name)
      const changeLabel = change ? changeLabelFor(chart, change, chinese) : null
      const tail =
        VALUE_GAP +
        textWidth(text, VALUE_SIZE, body, bold) +
        (changeLabel ? CHANGE_GAP + textWidth(changeLabel, VALUE_SIZE, body, true) : 0)
      return { point, text, bold, changeLabel, tail, series: si }
    }),
  )
  let scale = Infinity
  for (const row of tails) for (const cell of row) if (cell && cell.point.y > 0) scale = Math.min(scale, (right - x0 - cell.tail) / cell.point.y)
  if (!Number.isFinite(scale) || scale <= 0) return null

  const nodes: React.ReactNode[] = []
  const nameInk = accessibleInk(colors.text, bg, NAME_SIZE)
  const rule = ruleInk(ctx)
  names.forEach((name, ri) => {
    const top = firstRow + ri * pitch
    if (ri > 0) nodes.push(<line key={`rule-${ri}`} x1={rect.x} y1={top - ROW_AIR / 2 + 4} x2={right} y2={top - ROW_AIR / 2 + 4} stroke={rule} strokeWidth={1} />)
    const strongName = changedAt.has(name)
    const nameWidth = textWidth(name, NAME_SIZE, body, strongName)
    boxes.push(textBox(rect.x, top + NAME_BASELINE, nameWidth, NAME_SIZE))
    nodes.push(<PlotText key={`name-${ri}`} text={name} x={rect.x} y={top + NAME_BASELINE} size={NAME_SIZE} fill={nameInk} ctx={ctx} bold={strongName} anchor="start" />)
    tails[ri]!.forEach((cell, k) => {
      if (!cell) return
      const y = top + 6 + k * (BAR_H + BAR_GAP)
      const w = Math.max(1, cell.point.y * scale)
      const color = seriesInk(ctx, cell.series, marked)
      nodes.push(
        <g key={`bar-${ri}-${k}`} data-plot-mark="1">
          {paintMark(markPaint(ctx, color, cell.point.status), { x: x0, y, w, h: BAR_H })}
        </g>,
      )
      const isMarked = cell.series === marked
      const valueInk = accessibleInk(isMarked ? colors.primary : colors.muted, bg, VALUE_SIZE)
      const vx = x0 + w + VALUE_GAP
      const valueW = textWidth(cell.text, VALUE_SIZE, body, cell.bold)
      boxes.push(textBox(vx, y + VALUE_BASELINE, valueW, VALUE_SIZE))
      nodes.push(<PlotText key={`value-${ri}-${k}`} text={cell.text} x={vx} y={y + VALUE_BASELINE} size={VALUE_SIZE} fill={valueInk} ctx={ctx} bold={cell.bold} anchor="start" />)
      if (cell.changeLabel) {
        const cx = vx + valueW + CHANGE_GAP
        const strong = isMarked && marked >= 0
        const ink = accessibleInk(strong ? colors.primary : colors.muted, bg, VALUE_SIZE)
        boxes.push(textBox(cx, y + VALUE_BASELINE, textWidth(cell.changeLabel, VALUE_SIZE, body, true), VALUE_SIZE))
        nodes.push(
          <g key={`change-${ri}`} data-plot-change="">
            <PlotText text={cell.changeLabel} x={cx} y={y + VALUE_BASELINE} size={VALUE_SIZE} fill={ink} ctx={ctx} bold anchor="start" />
          </g>,
        )
      }
    })
  })
  if (anyMeet(boxes, 3) || !insideRect(boxes, rect)) return null

  return (
    <g {...compositionTag("bars")} {...blockTag(ctx, chart)}>
      {paintLegend(legend, legendY, ctx)}
      {caption && <MetaLine text={caption} x={right} y={legendY} ctx={ctx} anchor="end" />}
      {nodes}
      <line x1={x0} y1={firstRow - AXIS_LEAD} x2={x0} y2={lastFoot} stroke={axisInk(ctx)} strokeWidth={1} />
    </g>
  )
}

function changeLabelFor(chart: Chart, change: NonNullable<Chart["changes"]>[number], chinese: boolean): string | null {
  const from = chart.series.find((s) => s.name === change.from)?.data.find((p) => p.x === change.at)
  const to = chart.series.find((s) => s.name === change.to)?.data.find((p) => p.x === change.at)
  if (!from || !to) return null
  return changeText(from.y, to.y, chart.axes?.y_unit, chinese)
}
