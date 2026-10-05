import type React from "react"
import type { Component } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import { kpiFigure } from "../../components/kpi"
import { writtenDecimals } from "../../lib/quantity-format"
import {
  dossierInks,
  dossierMeta,
  dossierText,
  dossierWidth,
  fitDossier,
  paintDossierLine,
  signed,
  type DossierInks,
} from "./dossier"
import { blockTag, compositionTag, type Composition } from "./shared"

type Chart = Extract<Component, { type: "chart" }>
type KpiCards = Extract<Component, { type: "kpi_cards" }>

/*
 * controlled: each trial's result against its control, clinic's 2026-10
 * board (the Chinese-population page, p05). One row a trial: its name, the
 * drug and its size and length at the left (the category's name written
 * "name · drug · detail"), the drug group's change as a solid bar in the
 * mark and the control's as an outline in the ghost ink under it, both
 * running from one axis, each with its figure at its end, and at the right
 * how much more the drug did than the control, large in the mark, its unit
 * under it.
 *
 * The drug group is the series the author marks (`emphasis`), the control
 * the other one. A control that moved the other way from the drug (a
 * placebo group that gained while the drug group lost) is a tick on the axis
 * with its figure beside it, not a bar running backwards. Bars run by size
 * from the axis, each figure signed as the author wrote it, a control's at
 * the decimals of the drug's beside it (+0.30% beside −14.01%).
 *
 * The figures in the right column are the author's own: one `kpi_cards` item
 * a row, in the rows' order, each item's label the row's name, its unit set
 * under it, and the note every item shares the column's header (「较安慰剂
 * 多减」). The headers over the names and over the bars are the chart's
 * `y_title` and `x_title`, the legend the series' names.
 *
 * Takes, in the dossier setting: a horizontal `bar` chart of two to four
 * categories and two series, one marked, then one `kpi_cards` with an item
 * per category.
 *
 * Declines: a chart with a tag, changes, bands or point marks, items that do
 * not match the rows, a name past its column, a bar label past the right
 * column, and rows taller than the band.
 *
 * Reads: the dossier inks (`./dossier.tsx`), the body and heading faces.
 */

const HEADER = { size: 12, lineHeight: 20 } as const
const ROWS = { top: 36, pitch: 100 } as const
const NAMES = { w: 330 } as const
const NAME = { top: 8, size: 19, lineHeight: 26 } as const
const DRUG = { top: 38, size: 15, lineHeight: 22 } as const
const DETAIL = { top: 62, size: 13, lineHeight: 20 } as const
const AXIS_X = 356
const BAR = { top: 14, h: 30, r: 3, label: { gap: 10, size: 17, baseline: 36 } } as const
const CONTROL = { top: 52, h: 18, r: 3, label: { gap: 10, size: 14, baseline: 66 } } as const
const FIGURE = { w: 180, top: 10, size: 40, lineHeight: 48, unit: { top: 58, size: 13, lineHeight: 20 } } as const
/** Room left past the longest bar for its figure. */
const BAR_TRAIL = 161
const LEGEND = { swatch: 10, gap: 6, step: 18 } as const

interface Row {
  name: string
  drug: string
  detail: string
  value: number
  control: number
  figure: string
  unit: string
}

function rowsOf(chart: Chart, kpis: KpiCards): { rows: Row[]; header: string } | null {
  if (chart.chart_type !== "bar" || chart.direction !== "horizontal" || chart.series.length !== 2) return null
  if (chart.tag || chart.changes?.length || chart.bands?.length || chart.series.some((s) => s.tone || s.data.some((p) => p.emphasis || p.status))) return null
  const markedAt = chart.series.findIndex((s) => s.emphasis === true)
  if (markedAt < 0) return null
  const drug = chart.series[markedAt]!
  const control = chart.series[1 - markedAt]!
  if (drug.data.length < 2 || drug.data.length > 4 || control.data.length !== drug.data.length) return null
  if (kpis.items.length !== drug.data.length) return null
  if (kpis.items.some((item) => item.icon || item.tag || item.delta || item.source?.trim() || item.tone)) return null
  const notes = [...new Set(kpis.items.map((item) => item.note?.trim() ?? ""))]
  if (notes.length !== 1) return null
  const rows: Row[] = []
  for (const [i, point] of drug.data.entries()) {
    const other = control.data[i]!
    if (String(other.x) !== String(point.x)) return null
    const [name, drugName = "", ...detail] = String(point.x).split(" · ").map((part) => part.trim())
    const item = kpis.items[i]!
    if (item.label.trim() !== name) return null
    const { text, unit } = kpiFigure(item.value, item.unit)
    rows.push({ name: name!, drug: drugName, detail: detail.join(" · "), value: point.y, control: other.y, figure: text, unit: unit?.trim() ?? "" })
  }
  return { rows, header: notes[0]! }
}

export const controlledComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "dossier") return null
  const [chart, kpis, ...rest] = components
  if (chart?.type !== "chart" || kpis?.type !== "kpi_cards" || rest.length > 0) return null
  const shape = rowsOf(chart as Chart, kpis as KpiCards)
  if (!shape) return null
  const { rows, header } = shape
  if (ROWS.top + rows.length * ROWS.pitch > rect.h) return null
  const c = chart as Chart
  const markedAt = c.series.findIndex((s) => s.emphasis === true)
  const inks = dossierInks(ctx)
  const unit = c.axes?.x_unit?.trim() || c.axes?.y_unit?.trim() || ""
  const axisX = rect.x + AXIS_X
  const right = rect.x + rect.w
  const figureX = right - FIGURE.w
  const maxAbs = Math.max(...rows.flatMap((r) => [Math.abs(r.value), Math.abs(r.control)]))
  if (!(maxAbs > 0)) return null
  const k = (figureX - axisX - BAR_TRAIL) / maxAbs
  const names = rows.map((r) => ({
    name: fitDossier(r.name, { width: NAMES.w, size: NAME.size, lineHeight: NAME.lineHeight, maxLines: 1, bold: true }, ctx),
    drug: r.drug ? fitDossier(r.drug, { width: NAMES.w, size: DRUG.size, lineHeight: DRUG.lineHeight, maxLines: 1 }, ctx) : null,
    detail: r.detail ? fitDossier(r.detail, { width: NAMES.w, size: DETAIL.size, lineHeight: DETAIL.lineHeight, maxLines: 1 }, ctx) : null,
  }))
  if (names.some((n, i) => !n.name || (rows[i]!.drug && !n.drug) || (rows[i]!.detail && !n.detail))) return null
  const labels = rows.map((r) => {
    const decimals = writtenDecimals(r.value)
    return { value: signed(r.value, decimals, unit), control: signed(r.control, Math.max(decimals, writtenDecimals(r.control)), unit) }
  })
  for (const [i, r] of rows.entries()) {
    if (axisX + Math.abs(r.value) * k + BAR.label.gap + dossierWidth(labels[i]!.value, BAR.label.size, ctx, true) > figureX) return null
    if (dossierWidth(r.figure, FIGURE.size, ctx, true) > FIGURE.w) return null
  }
  const top = rect.y + ROWS.top
  const axisTop = rect.y + 24
  const axisBottom = top + rows.length * ROWS.pitch - 12
  const meta = dossierMeta(inks.muted, inks.ground)
  const legend = legendParts(c, markedAt, ctx)
  return (
    <g {...compositionTag("controlled")}>
      <g {...blockTag(ctx, c)}>
        {c.axes?.y_title?.trim() ? paintDossierLine(c.axes.y_title.trim(), { ctx, x: rect.x, top: rect.y, lineHeight: HEADER.lineHeight, size: HEADER.size, fill: meta }) : null}
        {paintLegend(legend, axisX, rect.y, inks, ctx)}
        {rows.map((r, i) => {
          const y = top + i * ROWS.pitch
          const n = names[i]!
          const valueW = Math.abs(r.value) * k
          const backwards = Math.sign(r.control) !== Math.sign(r.value) || r.control === 0
          const controlW = Math.abs(r.control) * k
          return (
            <g key={i} data-dossier-trial="">
              {i < rows.length - 1 ? <rect x={rect.x} y={y + ROWS.pitch - 2} width={rect.w} height={1} fill={inks.line} /> : null}
              {/* The category's parts stand on lines of their own, the " · " between them the break (`data-gloss-break`). */}
              {paintDossierLine(r.name, { ctx, x: rect.x, top: y + NAME.top, lineHeight: NAME.lineHeight, size: NAME.size, bold: true, fill: dossierText(inks.ink, inks.ground, NAME.size), ...(n.drug ? { attrs: { "data-gloss-break": " · " } } : {}) })}
              {n.drug ? paintDossierLine(r.drug, { ctx, x: rect.x, top: y + DRUG.top, lineHeight: DRUG.lineHeight, size: DRUG.size, fill: dossierText(inks.ink, inks.ground, DRUG.size), ...(n.detail ? { attrs: { "data-gloss-break": " · " } } : {}) }) : null}
              {n.detail ? paintDossierLine(r.detail, { ctx, x: rect.x, top: y + DETAIL.top, lineHeight: DETAIL.lineHeight, size: DETAIL.size, fill: meta }) : null}
              <rect data-dossier-bar="drug" x={axisX} y={y + BAR.top} width={valueW} height={BAR.h} rx={BAR.r} fill={inks.mark} />
              {paintDossierLine(labels[i]!.value, {
                ctx,
                x: axisX + valueW + BAR.label.gap,
                top: 0,
                lineHeight: 0,
                baseline: y + BAR.label.baseline,
                size: BAR.label.size,
                bold: true,
                fill: dossierText(inks.mark, inks.ground, BAR.label.size),
              })}
              {backwards ? (
                <rect data-dossier-bar="control-tick" x={axisX - 1} y={y + CONTROL.top} width={2} height={CONTROL.h} fill={inks.ghost} />
              ) : (
                <rect
                  data-dossier-bar="control"
                  x={axisX + 0.75}
                  y={y + CONTROL.top + 0.75}
                  width={Math.max(0, controlW - 1.5)}
                  height={CONTROL.h - 1.5}
                  rx={CONTROL.r}
                  fill="none"
                  stroke={inks.ghost}
                  strokeWidth={1.5}
                />
              )}
              {paintDossierLine(labels[i]!.control, {
                ctx,
                x: axisX + (backwards ? 0 : controlW) + CONTROL.label.gap,
                top: 0,
                lineHeight: 0,
                baseline: y + CONTROL.label.baseline,
                size: CONTROL.label.size,
                fill: dossierText(inks.muted, inks.ground, CONTROL.label.size),
              })}
            </g>
          )
        })}
        <rect x={axisX - 0.75} y={axisTop} width={1.5} height={axisBottom - axisTop} fill={inks.ink} />
      </g>
      <g {...blockTag(ctx, kpis)} data-dossier-figures="">
        {header ? paintDossierLine(header, { ctx, x: right, top: rect.y, lineHeight: HEADER.lineHeight, size: HEADER.size, anchor: "end", fill: meta }) : null}
        {rows.map((r, i) => {
          const y = top + i * ROWS.pitch
          return (
            <g key={i}>
              {paintDossierLine(r.figure, { ctx, x: right, top: y + FIGURE.top, lineHeight: FIGURE.lineHeight, size: FIGURE.size, bold: true, anchor: "end", fill: dossierText(inks.mark, inks.ground, FIGURE.size) })}
              {r.unit ? paintDossierLine(r.unit, { ctx, x: right, top: y + FIGURE.unit.top, lineHeight: FIGURE.unit.lineHeight, size: FIGURE.unit.size, anchor: "end", fill: meta }) : null}
            </g>
          )
        })}
      </g>
    </g>
  )
}

interface LegendParts {
  title: string
  drug: string
  control: string
}

function legendParts(chart: Chart, markedAt: number, _ctx: ComponentCtx): LegendParts {
  return { title: chart.axes?.x_title?.trim() ?? "", drug: chart.series[markedAt]!.name, control: chart.series[1 - markedAt]!.name }
}

/** The bars' header: what they measure, then a solid swatch for the drug group and an outline for the control. */
function paintLegend(legend: LegendParts, x: number, top: number, inks: DossierInks, ctx: ComponentCtx): React.ReactElement {
  const meta = dossierMeta(inks.muted, inks.ground)
  const swatchTop = top + (HEADER.lineHeight - LEGEND.swatch) / 2
  let at = x
  const parts: React.ReactNode[] = []
  if (legend.title) {
    parts.push(paintDossierLine(legend.title, { ctx, x: at, top, lineHeight: HEADER.lineHeight, size: HEADER.size, fill: meta, key: "t" }))
    at += dossierWidth(legend.title, HEADER.size, ctx) + LEGEND.step
  }
  parts.push(<rect key="ds" x={at} y={swatchTop} width={LEGEND.swatch} height={LEGEND.swatch} fill={inks.mark} />)
  at += LEGEND.swatch + LEGEND.gap
  parts.push(paintDossierLine(legend.drug, { ctx, x: at, top, lineHeight: HEADER.lineHeight, size: HEADER.size, fill: meta, key: "d" }))
  at += dossierWidth(legend.drug, HEADER.size, ctx) + LEGEND.step
  parts.push(<rect key="cs" x={at + 0.75} y={swatchTop + 0.75} width={LEGEND.swatch - 1.5} height={LEGEND.swatch - 1.5} fill="none" stroke={inks.ghost} strokeWidth={1.5} />)
  at += LEGEND.swatch + LEGEND.gap
  parts.push(paintDossierLine(legend.control, { ctx, x: at, top, lineHeight: HEADER.lineHeight, size: HEADER.size, fill: meta, key: "c" }))
  return <g data-dossier-legend="">{parts}</g>
}
