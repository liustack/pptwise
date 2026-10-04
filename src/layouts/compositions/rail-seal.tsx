import type React from "react"
import type { Component } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import type { ContentRect } from "../../render/layout"
import { kpiValueText } from "../../components/kpi"
import { joinUnit } from "../../lib/quantity-format"
import { SvgContent } from "../../render/svg-content"
import { bodySlotDropsContent } from "../../render/step-aside"
import { plainFigure } from "./figure"
import { columnsSeal, trendSeal } from "./plot-seal"
import { SEAL_TYPE, sealInks, sealSmall, sealText } from "./seal"
import { blockTag, compositionTag, ruleInk, type CompositionProps } from "./shared"
import { centredBaseline, fitFixed, paintLines } from "./type"

type Chart = Extract<Component, { type: "chart" }>
type KpiCards = Extract<Component, { type: "kpi_cards" }>

/*
 * rail in the seal setting: a chart with the author's figures in a column
 * beside it, vermilion's 2026-10 fiscal and growth pages (p05, p09). The
 * column stands right of a hairline: each figure's label at 15px, the figure
 * bold at 44px, the one the author marks (`**…**`) in the mark, and its note
 * at 15px in up to two lines, a hairline between figures. The chart keeps the
 * left of the band, drawn by hand when it is grouped bars (`columnsSeal`) or a
 * trend (`trendSeal`), and by the ordinary chart otherwise.
 *
 * Takes: `[chart, kpi_cards]` with one to three figures, each a plain figure
 * (no delta, icon, source or tag). The seal setting only.
 *
 * Declines: a label past one line of the column, a figure wider than the
 * column at 32px, a note past two lines, and a column taller than the band.
 */

const COLUMN_W = 340
const DIVIDER_GAP = 32
const PLOT_GAP = 48
const FIRST = 6
const MAX_PITCH = 180
const LABEL = { size: SEAL_TYPE.label, lineHeight: 22 }
const FIGURE_SIZES = [44, 38, 32] as const
const FIGURE = { top: 26, box: 54 }
const NOTE = { size: SEAL_TYPE.label, lineHeight: 22, top: 84, maxLines: 2 }
const DIVIDER_FOOT = 30

function railShape(components: readonly Component[]): { chart: Chart; kpis: KpiCards } | null {
  const [chart, kpis, ...rest] = components
  if (chart?.type !== "chart" || kpis?.type !== "kpi_cards" || rest.length > 0) return null
  if (kpis.items.length < 1 || kpis.items.length > 3 || !kpis.items.every(plainFigure)) return null
  if (chart.direction === "horizontal") return null
  return { chart, kpis }
}

/**
 * The plot beside the column: by hand where a seal plot takes the chart, the
 * ordinary chart otherwise, or `null` when the ordinary chart would drop
 * content in the narrower band.
 */
function drawPlot(chart: Chart, band: ContentRect, ctx: ComponentCtx): React.ReactElement | null {
  const byHand = columnsSeal(chart, band, ctx) ?? trendSeal(chart, band, ctx)
  if (byHand) return byHand
  if (bodySlotDropsContent([chart], band, ctx)) return null
  return <SvgContent components={[chart]} rect={band} ctx={ctx} />
}

export function railSeal({ components, ctx, rect }: CompositionProps): React.ReactElement | null {
  const shape = railShape(components)
  if (!shape) return null
  const { chart, kpis } = shape
  const body = ctx.fonts.body
  const n = kpis.items.length
  const pitch = Math.min(MAX_PITCH, Math.floor((rect.h - FIRST - 8) / n))
  const columnX = rect.x + rect.w - COLUMN_W
  const dividerX = columnX - DIVIDER_GAP
  const plotRect = { x: rect.x, y: rect.y, w: dividerX - PLOT_GAP - rect.x, h: rect.h }
  const blocks = []
  for (const item of kpis.items) {
    const { text, marked } = kpiValueText(item.value)
    const figure = joinUnit(text.trim(), item.unit?.trim() || undefined, " ")
    const label = fitFixed(item.label, { width: COLUMN_W, size: LABEL.size, lineHeight: LABEL.lineHeight, maxLines: 1, fontFamily: body, bold: false })
    const size = FIGURE_SIZES.find((s) => fitFixed(figure, { width: COLUMN_W, size: s, lineHeight: s + 10, maxLines: 1, fontFamily: ctx.fonts.heading, bold: true }) !== null)
    const note = item.note?.trim()
      ? fitFixed(item.note, { width: COLUMN_W, size: NOTE.size, lineHeight: NOTE.lineHeight, maxLines: NOTE.maxLines, fontFamily: body, bold: false })
      : undefined
    if (!label || size === undefined || note === null) return null
    const valueLayout = fitFixed(figure, { width: COLUMN_W, size, lineHeight: FIGURE.box, maxLines: 1, fontFamily: ctx.fonts.heading, bold: true })!
    const depth = note ? NOTE.top + note.lines.length * NOTE.lineHeight : FIGURE.top + FIGURE.box
    if (depth > pitch - 12) return null
    blocks.push({ item, label, value: valueLayout, size, marked, note })
  }
  const plot = drawPlot(chart, plotRect, ctx)
  if (!plot) return null
  const inks = sealInks(ctx)
  const rule = ruleInk(ctx)
  const top = rect.y + FIRST
  return (
    <g {...compositionTag("rail")}>
      <g {...blockTag(ctx, chart)}>{plot}</g>
      <g {...blockTag(ctx, kpis)}>
        <rect x={dividerX} y={top} width={1} height={pitch * n - DIVIDER_FOOT} fill={rule} />
        {blocks.map((b, i) => {
          const y = top + i * pitch
          return (
            <g key={i} data-figure-marked={b.marked ? "1" : undefined}>
              {i > 0 && <rect x={columnX} y={y - 18} width={COLUMN_W} height={1} fill={rule} />}
              {paintLines(b.label, {
                ctx,
                x: columnX,
                y: centredBaseline(y, LABEL.lineHeight, LABEL.size),
                fill: sealText(inks.muted, inks.ground, LABEL.size),
                fontFamily: body,
                fontWeight: "400",
                attrs: sealSmall(LABEL.size),
              })}
              {paintLines(b.value, {
                ctx,
                x: columnX,
                y: centredBaseline(y + FIGURE.top, FIGURE.box, b.size),
                fill: sealText(b.marked ? inks.mark : inks.ink, inks.ground, b.size),
                fontFamily: ctx.fonts.heading,
                fontWeight: "700",
              })}
              {b.note &&
                paintLines(b.note, {
                  ctx,
                  x: columnX,
                  y: centredBaseline(y + NOTE.top, NOTE.lineHeight, NOTE.size),
                  fill: sealText(inks.ink, inks.ground, NOTE.size),
                  fontFamily: body,
                  fontWeight: "400",
                  attrs: sealSmall(NOTE.size),
                })}
            </g>
          )
        })}
      </g>
    </g>
  )
}
