import type React from "react"
import type { Component } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import { measureTextUnits } from "../../lib/svg-text-layout"
import { accessibleInk, readableOn } from "../../render/ink"
import { SmallText, fitPanelBar, paintPanel, panelInks, panelSeriesInk, panelText, type Place } from "./panel"
import { chartFigures, plotNumber, reportedDecimals } from "./plot"
import { blockTag } from "./shared"

type Chart = Extract<Component, { type: "chart" }>

/*
 * The horizontal bars of the panel setting: one series laid across, each
 * category a row. ledger's 2026-10 board draws two forms.
 *
 * - Rows (p09): the category's name on the left at 18px, the bar, and its
 *   value after the bar at 18px. The bar the author marked
 *   (`data[].emphasis`) takes the mark (ledger's amber), its name and value
 *   bold in it, and the others the first receding palette colour.
 * - Comparison (p03, the fact page's panel): two or three bars, each under
 *   its name at 15px, the value set inside the bar's end so the bar reads as
 *   the figure. The fact face draws this form beside its figure.
 *
 * The panel's name is the series' name, and its unit (`axes.x_unit`, or
 * `axes.y_unit`) stands on the right of the title bar.
 */

const MAX_ROWS = 8
const ROWS = { pad: 24, firstTop: 68, pitch: 82, barTop: 4, barH: 34, nameBaseline: 26, valueBaseline: 28, size: 18, nameColumn: 112, valueGap: 12, foot: 16, longest: 0.88 } as const
const COMPARE = { pad: 22, firstTop: 88, pitch: 120, labelLift: 14, labelSize: 15, barH: 44, valueInset: 10, valueBaseline: 29, valueSize: 18, maxShare: 0.92 } as const

/** Whether a chart is one series of horizontal bars, every value at or above zero. */
export function barsChart(chart: Component): chart is Chart {
  if (chart.type !== "chart" || chart.chart_type !== "bar" || chart.direction !== "horizontal") return false
  if (chart.series.length !== 1 || chart.axes?.x_title || (chart.changes ?? []).length > 0) return false
  return chart.series[0]!.data.every((point) => typeof point.x === "string" && point.y >= 0 && point.status === undefined)
}

function unitOf(chart: Chart): string | undefined {
  return (chart.axes?.x_unit ?? chart.axes?.y_unit)?.trim() || undefined
}

/** Draws horizontal bars as a panel of rows at `place`, or `null` when they do not fit. */
export function barsPanel(chart: Chart, place: Place, ctx: ComponentCtx): React.ReactElement | null {
  if (!barsChart(chart)) return null
  const data = chart.series[0]!.data
  if (data.length < 2 || data.length > MAX_ROWS) return null
  const bar = fitPanelBar(chart.series[0]!.name, unitOf(chart), place.w, ctx)
  if (!bar) return null
  const inks = panelInks(ctx)
  const body = ctx.fonts.body
  const figures = chartFigures(chart, ctx)
  const decimals = reportedDecimals(chart)
  const values = data.map((point) => plotNumber(point.y, figures, decimals))
  const nameW = Math.max(...data.map((point) => measureTextUnits(String(point.x), { fontFamily: body, bold: point.emphasis === true }) * ROWS.size))
  const valueW = Math.max(...values.map((text, i) => measureTextUnits(text, { fontFamily: body, bold: data[i]!.emphasis === true }) * ROWS.size))
  const barX = place.x + ROWS.pad + Math.max(ROWS.nameColumn, nameW + ROWS.pad)
  const room = place.x + place.w - ROWS.pad - valueW - ROWS.valueGap - barX
  const max = Math.max(...data.map((point) => point.y))
  if (room < 160 || !(max > 0)) return null
  const pitch = Math.min(ROWS.pitch, (place.h - ROWS.firstTop - ROWS.foot) / data.length)
  if (pitch < ROWS.barH + 12) return null
  const quiet = panelSeriesInk(ctx, 0)
  const nodes = data.map((point, i) => {
    const top = place.y + ROWS.firstTop + i * pitch
    const marked = point.emphasis === true
    const w = (point.y / max) * room * ROWS.longest
    const ink = marked ? inks.mark : quiet
    const textInk = panelText(marked ? inks.mark : ctx.colors.text, inks.surface, ROWS.size)
    return (
      <g key={i} data-bar-row={i + 1}>
        <SmallText text={String(point.x)} x={place.x + ROWS.pad} y={top + ROWS.nameBaseline} size={ROWS.size} fill={textInk} ctx={ctx} bold={marked} />
        <rect x={barX} y={top + ROWS.barTop} width={w} height={ROWS.barH} fill={ink} />
        <SmallText text={values[i]!} x={barX + w + ROWS.valueGap} y={top + ROWS.valueBaseline} size={ROWS.size} fill={textInk} ctx={ctx} bold={marked} />
      </g>
    )
  })
  return (
    <g data-chart-panel="bars">
      {paintPanel(place, ctx, { bar })}
      <g {...blockTag(ctx, chart)}>{nodes}</g>
    </g>
  )
}

/**
 * Draws two or three bars to compare as a panel at `place`, each under its
 * name with its value inside the bar's end, and returns the y under the last
 * bar where a line about the comparison may follow. `null` when they do not
 * fit.
 */
export function compareBarsPanel(
  chart: Chart,
  place: Place,
  ctx: ComponentCtx,
): { drawn: React.ReactElement; below: number } | null {
  if (!barsChart(chart)) return null
  const data = chart.series[0]!.data
  if (data.length < 2 || data.length > 3) return null
  const bar = fitPanelBar(chart.series[0]!.name, unitOf(chart), place.w, ctx)
  if (!bar) return null
  const inks = panelInks(ctx)
  const body = ctx.fonts.body
  const figures = chartFigures(chart, ctx)
  const decimals = reportedDecimals(chart)
  const max = Math.max(...data.map((point) => point.y))
  if (!(max > 0)) return null
  const left = place.x + COMPARE.pad
  const room = (place.w - COMPARE.pad * 2) * COMPARE.maxShare
  const quiet = panelSeriesInk(ctx, 0)
  const nodes: React.ReactNode[] = []
  let below = place.y
  for (const [i, point] of data.entries()) {
    const top = place.y + COMPARE.firstTop + i * COMPARE.pitch
    const marked = point.emphasis === true
    const w = (point.y / max) * room
    const fill = marked ? inks.mark : quiet
    const text = plotNumber(point.y, figures, decimals)
    const textW = measureTextUnits(text, { fontFamily: body, bold: true }) * COMPARE.valueSize
    if (textW + COMPARE.valueInset * 2 > w) return null
    const label = String(point.x)
    if (measureTextUnits(label, { fontFamily: body }) * COMPARE.labelSize > place.w - COMPARE.pad * 2) return null
    nodes.push(
      <g key={i} data-compare-bar={i + 1}>
        <SmallText text={label} x={left} y={top - COMPARE.labelLift} size={COMPARE.labelSize} fill={panelText(ctx.colors.muted, inks.surface, COMPARE.labelSize)} ctx={ctx} />
        <rect x={left} y={top} width={w} height={COMPARE.barH} fill={fill} />
        <SmallText
          text={text}
          x={left + w - COMPARE.valueInset}
          y={top + COMPARE.valueBaseline}
          size={COMPARE.valueSize}
          fill={accessibleInk(readableOn(fill), fill, COMPARE.valueSize)}
          ctx={ctx}
          anchor="end"
          bold
        />
      </g>,
    )
    below = top + COMPARE.barH
  }
  return {
    drawn: (
      <g data-chart-panel="compare">
        {paintPanel(place, ctx, { bar })}
        <g {...blockTag(ctx, chart)}>{nodes}</g>
      </g>
    ),
    below,
  }
}
