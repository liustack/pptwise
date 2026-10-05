import type React from "react"
import type { Component } from "@/ir"
import { kpiFigure } from "../../components/kpi"
import { ENGLISH_FIGURES, groupDigits, joinUnit, wholeValueDecimals, writtenFigure } from "../../lib/quantity-format"
import type { ComponentCtx } from "../../components/types"
import { blockTag, compositionTag, type CompositionProps } from "./shared"
import { fitFixed, paintLines } from "./type"
import {
  CONSOLE_SPEC,
  baselineIn,
  consoleInks,
  consoleSeriesInk,
  consoleText,
  fitMono,
  monoWidth,
  paintCard,
  paintIcon,
  paintMono,
  toneInk,
  type ConsoleInks,
} from "./console"

type Chart = Extract<Component, { type: "chart" }>
type KpiCards = Extract<Component, { type: "kpi_cards" }>
type KpiItem = KpiCards["items"][number]

/*
 * rail, console setting: a ranked bar chart in a panel with a column of
 * figure panels beside it. terminal's 2026-10 board, its incident window page
 * (p04): eight major outages' windows in minutes, coloured by their cause, and
 * beside them the share that was one change pushed everywhere.
 *
 * The chart is a panel. Its legend runs along the top, the marked series
 * first, each a 12px square and its name in the series' ink, and the value
 * axis's title and unit stand at the right in mono. Each category is a row: its
 * name at 15px, and when it is written 「名称 · 注」 ("Azure Front Door ·
 * 2025-10") its note under it in 12px mono; then its bar from a common start,
 * the longest 400px, in the mark for the marked series and in the chart
 * palette after its lead for the others, and its value after the bar in bold
 * mono. Rows stand 56px apart, closer for more categories down to 44px, or 32px
 * when no category has a note.
 *
 * Each figure is a panel: its icon and its label in mono on one line, the
 * figure in bold mono, and its note under it. The figure the author marks
 * (`**…**`) sits on the mark's tint inside an edge of it, in the mark at
 * 72px; the others at 52px, stepping down to fit. A figure with a tone takes
 * the tone's ink for its icon and label.
 *
 * Takes: a horizontal `bar` chart whose every category has one bar, then a
 * `kpi_cards` of one to three items with no delta, tag or source.
 *
 * Declines: any other shape, a category name, a note or a figure that does not
 * fit, and more rows than the panel holds.
 *
 * Reads: the console inks (`./console.tsx`), the chart palette, `fonts.body`,
 * `fonts.heading`, `fonts.mono`.
 */

const SIDE = { w: 368, gap: 24 } as const
const CHART = { pad: 24, legend: { top: 20, square: 12, size: 13, gap: 38, textGap: 8 }, first: 56, foot: 20, barX: 236, barMax: 400, barH: 26, pitch: 56, notedMin: 44, plainMin: 32 } as const
const NAME = { size: 15, offset: 21 } as const
const NOTE = { size: 12, offset: 39 } as const
const VALUE = { size: 15, gap: 10, offset: 27 } as const
const FIGURE = {
  pad: 24,
  gap: 16,
  icon: { top: 24, size: 22 },
  label: { top: 22, box: 24, size: 14, x: 32 },
  value: { top: 60, marked: 72, plain: 52, steps: [72, 60, 52, 44, 38] },
  note: { gap: 10, size: 15, lineHeight: 24, maxLines: 2 },
  foot: 32,
} as const

interface Row {
  name: string
  note: string | null
  value: number
  series: number
}

/** A category written 「名称 · 注」, split at its last middle dot. */
function splitCategory(text: string): { name: string; note: string | null } {
  const at = text.lastIndexOf(" · ")
  return at > 0 ? { name: text.slice(0, at).trim(), note: text.slice(at + 3).trim() || null } : { name: text.trim(), note: null }
}

/** One row per category, in the order the chart first names them, or `null` when a category has two bars. */
function rowsOf(chart: Chart): Row[] | null {
  const rows: Row[] = []
  const seen = new Set<string>()
  for (const [series, s] of chart.series.entries()) {
    for (const point of s.data) {
      const key = String(point.x)
      if (seen.has(key)) return null
      seen.add(key)
      rows.push({ ...splitCategory(key), value: point.y, series })
    }
  }
  return rows
}

interface FittedFigure {
  item: KpiItem
  marked: boolean
  label: ReturnType<typeof fitMono>
  value: string
  size: number
  note: ReturnType<typeof fitFixed>
  need: number
}

function fitFigure(item: KpiItem, w: number, ctx: ComponentCtx): FittedFigure | null {
  const { text, marked, unit } = kpiFigure(item.value, item.unit)
  const value = joinUnit(text, unit?.trim() || undefined)
  const inner = w - FIGURE.pad * 2
  const label = fitMono(item.label, { width: inner - FIGURE.label.x, size: FIGURE.label.size, lineHeight: FIGURE.label.box, maxLines: 1 })
  if (!label) return null
  const start = marked ? FIGURE.value.marked : FIGURE.value.plain
  const size = FIGURE.value.steps.find((s) => s <= start && monoWidth(value, s) <= inner)
  if (size === undefined) return null
  const note = item.note?.trim() ? fitFixed(item.note, { width: inner, size: FIGURE.note.size, lineHeight: FIGURE.note.lineHeight, maxLines: FIGURE.note.maxLines, fontFamily: ctx.fonts.body, bold: false }) : null
  if (item.note?.trim() && !note) return null
  const valueBox = Math.round(size * (80 / 72))
  const need = FIGURE.value.top + valueBox + (note ? FIGURE.note.gap + FIGURE.note.lineHeight * FIGURE.note.maxLines : 0) + FIGURE.foot
  return { item, marked, label, value, size, note, need }
}

function paintFigurePanel(f: FittedFigure, box: { x: number; y: number; w: number; h: number }, inks: ConsoleInks, ctx: CompositionProps["ctx"]): React.ReactElement {
  const ground = f.marked ? inks.tint : inks.surface
  const ink = f.marked ? inks.mark : (toneInk(inks, f.item.tone) ?? inks.muted)
  const valueInk = f.marked ? inks.mark : inks.text
  const valueBox = Math.round(f.size * (80 / 72))
  const x = box.x + FIGURE.pad
  return (
    <g data-figure-marked={f.marked ? "1" : undefined}>
      {paintCard(box, inks, f.marked)}
      {f.item.icon ? paintIcon(f.item.icon, x, box.y + FIGURE.icon.top, FIGURE.icon.size, f.marked ? inks.mark : (toneInk(inks, f.item.tone) ?? inks.mark), ground) : null}
      {paintMono(f.label!, {
        ctx,
        x: f.item.icon ? x + FIGURE.label.x : x,
        y: baselineIn(box.y + FIGURE.label.top, FIGURE.label.box, FIGURE.label.size),
        fill: consoleText(ink, ground, FIGURE.label.size),
        ground,
      })}
      <text
        x={x}
        y={baselineIn(box.y + FIGURE.value.top, valueBox, f.size)}
        fontFamily={ctx.fonts.mono}
        fontSize={f.size}
        fontWeight="700"
        fill={consoleText(valueInk, ground, f.size)}
        dominantBaseline="alphabetic"
        xmlSpace="preserve"
      >
        {f.value}
      </text>
      {f.note
        ? paintLines(f.note, {
            ctx,
            x,
            y: baselineIn(box.y + FIGURE.value.top + valueBox + FIGURE.note.gap, FIGURE.note.lineHeight, FIGURE.note.size),
            fill: consoleText(inks.body, ground, FIGURE.note.size),
            fontFamily: ctx.fonts.body,
            fontWeight: "400",
            bg: ground,
            attrs: { ...CONSOLE_SPEC },
          })
        : null}
    </g>
  )
}

/** Figure panels stacked down `column`, each as tall as its words, the last taking what is left. */
export function figureColumn(kpis: KpiCards, column: { x: number; y: number; w: number; h: number }, ctx: CompositionProps["ctx"]): React.ReactElement | null {
  if (kpis.items.length < 1 || kpis.items.length > 3) return null
  if (kpis.items.some((item) => item.delta || item.tag || item.source?.trim())) return null
  const fitted = kpis.items.map((item) => fitFigure(item, column.w, ctx))
  if (fitted.some((f) => f === null)) return null
  const figures = fitted as FittedFigure[]
  const total = figures.reduce((sum, f) => sum + f.need, 0) + FIGURE.gap * (figures.length - 1)
  if (total > column.h) return null
  const inks = consoleInks(ctx)
  let y = column.y
  return (
    <g {...blockTag(ctx, kpis)}>
      {figures.map((f, i) => {
        const last = i === figures.length - 1
        const h = last ? column.y + column.h - y : f.need
        const box = { x: column.x, y, w: column.w, h }
        y += h + FIGURE.gap
        return <g key={i}>{paintFigurePanel(f, box, inks, ctx)}</g>
      })}
    </g>
  )
}

export function railConsole({ components, ctx, rect }: CompositionProps): React.ReactElement | null {
  const [chart, kpis, ...rest] = components
  if (chart?.type !== "chart" || kpis?.type !== "kpi_cards" || rest.length > 0) return null
  if (chart.chart_type !== "bar" || chart.direction !== "horizontal") return null
  const rows = rowsOf(chart)
  if (!rows || rows.length === 0) return null
  const panel = { x: rect.x, y: rect.y, w: rect.w - SIDE.w - SIDE.gap, h: rect.h }
  const column = { x: rect.x + rect.w - SIDE.w, y: rect.y, w: SIDE.w, h: rect.h }
  const figures = figureColumn(kpis, column, ctx)
  if (!figures) return null
  const inks = consoleInks(ctx)
  const ground = inks.surface
  const noted = rows.some((r) => r.note)
  const pitch = Math.min(CHART.pitch, Math.floor((panel.h - CHART.first - CHART.foot) / rows.length))
  if (pitch < (noted ? CHART.notedMin : CHART.plainMin)) return null
  const barX = panel.x + CHART.barX
  const max = Math.max(...rows.map((r) => r.value))
  if (!(max > 0) || rows.some((r) => r.value < 0)) return null
  const marked = chart.series.findIndex((s) => s.emphasis === true)
  const order = [...chart.series.keys()].sort((a, b) => (a === marked ? -1 : b === marked ? 1 : a - b))
  let unmarked = 0
  const seriesInk = chart.series.map((_, i) => (i === marked ? inks.mark : consoleSeriesInk(ctx, unmarked++)))
  const style = ctx.figures ?? ENGLISH_FIGURES
  const decimals = wholeValueDecimals(rows.map((r) => r.value))
  const print = (v: number) => groupDigits(writtenFigure(v, decimals), style)
  const valueRoom = panel.x + panel.w - CHART.pad
  const nameW = CHART.barX - CHART.pad - 12
  const names = rows.map((r) => fitFixed(r.name, { width: nameW, size: NAME.size, lineHeight: 20, maxLines: 1, fontFamily: ctx.fonts.body, bold: false }))
  if (names.some((n) => n === null)) return null
  if (rows.some((r) => r.note && monoWidth(r.note, NOTE.size) > nameW)) return null
  if (rows.some((r) => barX + (CHART.barMax * r.value) / max + VALUE.gap + monoWidth(print(r.value), VALUE.size) > valueRoom)) return null
  const axis = [chart.axes?.x_title?.trim(), chart.axes?.x_unit?.trim()].filter(Boolean).join(" · ")
  const legendY = panel.y + CHART.legend.top
  let legendX = panel.x + CHART.pad
  const legend = chart.series.length > 1
    ? order.map((i) => {
        const x = legendX
        legendX += CHART.legend.square + CHART.legend.textGap + monoWidth(chart.series[i]!.name, CHART.legend.size) + CHART.legend.gap
        return { i, x }
      })
    : []
  return (
    <g {...compositionTag("rail")}>
      <g {...blockTag(ctx, chart)}>
        {paintCard(panel, inks, false)}
        {legend.map(({ i, x }) => (
          <g key={`legend-${i}`} data-legend={chart.series[i]!.name}>
            <rect x={x} y={legendY} width={CHART.legend.square} height={CHART.legend.square} fill={seriesInk[i]} />
            <text {...CONSOLE_SPEC} x={x + CHART.legend.square + CHART.legend.textGap} y={legendY + 11} fontFamily={ctx.fonts.body} fontSize={CHART.legend.size} fill={consoleText(seriesInk[i]!, ground, CHART.legend.size)} dominantBaseline="alphabetic">
              {chart.series[i]!.name}
            </text>
          </g>
        ))}
        {axis ? (
          <text {...CONSOLE_SPEC} x={panel.x + panel.w - CHART.pad} y={legendY + 11} textAnchor="end" fontFamily={ctx.fonts.mono} fontSize={CHART.legend.size} fill={consoleText(inks.muted, ground, CHART.legend.size)} dominantBaseline="alphabetic">
            {axis}
          </text>
        ) : null}
        {rows.map((row, i) => {
          const y = panel.y + CHART.first + i * pitch
          const ink = seriesInk[row.series]!
          const w = Math.max(3, (CHART.barMax * row.value) / max)
          const nameY = noted ? y + NAME.offset : y + VALUE.offset - 1
          return (
            <g key={i} data-bar-row={row.name}>
              {paintLines(names[i]!, {
                ctx,
                x: panel.x + CHART.pad,
                y: nameY,
                fill: consoleText(inks.text, ground, NAME.size),
                fontFamily: ctx.fonts.body,
                fontWeight: "400",
                bg: ground,
                attrs: { ...CONSOLE_SPEC },
                // The note under the name stands for the middle dot the author wrote between them.
                ...(row.note ? { lastAttrs: { "data-gloss-break": "·" } } : {}),
              })}
              {row.note ? (
                <text {...CONSOLE_SPEC} x={panel.x + CHART.pad} y={y + NOTE.offset} fontFamily={ctx.fonts.mono} fontSize={NOTE.size} fill={consoleText(inks.muted, ground, NOTE.size)} dominantBaseline="alphabetic">
                  {row.note}
                </text>
              ) : null}
              <rect x={barX} y={y + 8} width={w} height={CHART.barH} fill={ink} />
              <text x={barX + w + VALUE.gap} y={y + VALUE.offset} fontFamily={ctx.fonts.mono} fontSize={VALUE.size} fontWeight="700" fill={consoleText(ink, ground, VALUE.size)} dominantBaseline="alphabetic" {...CONSOLE_SPEC}>
                {print(row.value)}
              </text>
            </g>
          )
        })}
      </g>
      {figures}
    </g>
  )
}
