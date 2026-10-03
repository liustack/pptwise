import type React from "react"
import type { Component } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import { mostlyChinese } from "../../lib/text-script"
import { barsPanel } from "./bars-panel"
import { columnsPanel } from "./columns-panel"
import { PANEL, fitFigurePanel, paintFigurePanel, panelFigureItem, type FigurePanel, type Place } from "./panel"
import { shiftsPanel } from "./shifts"
import { compositionTag, blockTag, type CompositionProps } from "./shared"

type Chart = Extract<Component, { type: "chart" }>
type KpiCards = Extract<Component, { type: "kpi_cards" }>

/*
 * rail in the panel setting: a chart in its panel beside a column of figure
 * panels, the author's figures (`kpi_cards`) one panel each. The column
 * stands on the side the author wrote it: a chart followed by its figures
 * puts them on the right, figures followed by a chart on the left. ledger's
 * 2026-10 guidance (p05, figures left), lease (p09) and supplier (p11)
 * pages.
 *
 * Each figure panel is named by its item's label and sets the figure at the
 * largest size its panel holds, an arrow after it for its `delta`, and its
 * unit and note under it (`fitFigurePanel`). A figure the author marked
 * (`**…**`) takes the mark for its panel's edge, its name and itself.
 *
 * The chart is any chart the panel setting draws: columns, a stack, a combo,
 * horizontal bars or a dumbbell (`chartPanel`).
 *
 * Takes: `[chart, kpi_cards]` or `[kpi_cards, chart]`, one to three items.
 *
 * Declines: a chart the panel setting does not draw in the space left, or a
 * figure its panel cannot hold whole.
 */

/** The figure column's width on the board: 376px on the right, 360px on the left. */
const COLUMN_RIGHT = 376
const COLUMN_LEFT = 360
const GAP = PANEL.gap
const MAX_ITEMS = 3

/** Draws a chart in a panel at `place`, with whichever panel form takes it, or `null`. */
export function chartPanel(chart: Chart, place: Place, ctx: ComponentCtx): React.ReactElement | null {
  return shiftsPanel(chart, place, ctx) ?? columnsPanel(chart, place, ctx) ?? barsPanel(chart, place, ctx)
}

/** A column of figure panels filling `place`, or `null` when one does not fit. */
export function figureColumn(kpis: KpiCards, place: Place, ctx: ComponentCtx): React.ReactElement | null {
  const n = kpis.items.length
  const h = (place.h - GAP * (n - 1)) / n
  const chinese = ctx.figures?.chinese ?? mostlyChinese(kpis.items.map((item) => item.label))
  const panels: { layout: FigurePanel; place: Place }[] = []
  for (const [i, item] of kpis.items.entries()) {
    const at = { x: place.x, y: place.y + i * (h + GAP), w: place.w, h }
    const layout = fitFigurePanel(item, at, ctx, chinese)
    if (!layout) return null
    panels.push({ layout, place: at })
  }
  return <g {...blockTag(ctx, kpis)}>{panels.map(({ layout, place: at }, i) => paintFigurePanel(layout, at, ctx, `figure-${i}`))}</g>
}

export function railPanel({ components, ctx, rect }: CompositionProps): React.ReactElement | null {
  if (components.length !== 2) return null
  const [a, b] = components as [Component, Component]
  const chartFirst = a.type === "chart" && b.type === "kpi_cards"
  const figuresFirst = a.type === "kpi_cards" && b.type === "chart"
  if (!chartFirst && !figuresFirst) return null
  const chart = (chartFirst ? a : b) as Chart
  const kpis = (chartFirst ? b : a) as KpiCards
  if (kpis.items.length < 1 || kpis.items.length > MAX_ITEMS || !kpis.items.every(panelFigureItem)) return null
  const columnW = chartFirst ? COLUMN_RIGHT : COLUMN_LEFT
  const chartW = rect.w - columnW - GAP
  const chartPlace = { x: chartFirst ? rect.x : rect.x + columnW + GAP, y: rect.y, w: chartW, h: rect.h }
  const columnPlace = { x: chartFirst ? rect.x + chartW + GAP : rect.x, y: rect.y, w: columnW, h: rect.h }
  const drawnChart = chartPanel(chart, chartPlace, ctx)
  if (!drawnChart) return null
  const drawnFigures = figureColumn(kpis, columnPlace, ctx)
  if (!drawnFigures) return null
  return (
    <g {...compositionTag("rail")}>
      {drawnChart}
      {drawnFigures}
    </g>
  )
}
