import type React from "react"
import type { Component } from "@/ir"
import { kpiFigure } from "../../components/kpi"
import { joinUnit, writtenDecimals } from "../../lib/quantity-format"
import {
  chipInk,
  chipWidth,
  dossierBaseline,
  dossierInks,
  dossierMeta,
  dossierSeries,
  dossierText,
  dossierWidth,
  fitDossier,
  paintChip,
  paintDossierLine,
  DOSSIER_SPEC,
} from "./dossier"
import { blockTag, compositionTag, type Composition } from "./shared"

type KpiCards = Extract<Component, { type: "kpi_cards" }>
type Chart = Extract<Component, { type: "chart" }>
type DataTable = Extract<Component, { type: "data_table" }>

/*
 * duel: two options head to head in one trial, clinic's 2026-10 board (the
 * head-to-head page, p06). At the left each option's headline figure large
 * in its own ink over a bar of its size, its name over it and its note under
 * it. At the right the trial's other measure as grouped columns, its title
 * bold over them with the chart's tag beside it (「企业口径」, outlined in
 * its evidence kind's ink) and the legend at the right. Along the foot of the
 * right column a row of small figures, each 「a vs b」 in the two options'
 * inks under its measure's name.
 *
 * The options' inks are the series inks in order (`dossierSeries`), the
 * first the mark. The figures at the left are a `kpi_cards` of two items
 * named as the chart's two series are, the small figures a `data_table`
 * whose two value columns are named that way too.
 *
 * Takes, in the dossier setting: `kpi_cards` of two items, an upright `bar`
 * chart of two series and two to five categories, a `data_table` of one to
 * three rows and three columns, in that order.
 *
 * Declines: names that do not match, a figure that is not a number, a chart
 * with changes, bands, tones or marks, a table with a title, tags, icons or
 * marked rows, and anything past its column.
 *
 * Reads: the dossier inks and series inks (`./dossier.tsx`), the page's tag
 * band (`tagBand`), the body and heading faces.
 */

const LEFT = { w: 440 } as const
const FIG = { top: 50, pitch: 160, name: { size: 17, lineHeight: 24 }, value: { top: 26, size: 64, lineHeight: 76 }, bar: { top: 110, h: 14, r: 2 }, note: { top: 128, size: 13, lineHeight: 20 } } as const
const RIGHT = { x: 496 } as const
const HEAD = { top: 4, size: 16, lineHeight: 24, chipAt: 140, chipGap: 16 } as const
const LEGEND = { top: 28, swatch: 12, gap: 6, step: 26, size: 12 } as const
const PLOT = { inset: 30, top: 54, h: 250, bar: 52, pair: 6, value: { size: 14, gap: 8 }, label: { size: 14, drop: 24 }, axisLead: 10 } as const
const STATS = { top: 362, w: 210, pitch: 224, label: { top: 10, size: 13, lineHeight: 20 }, value: { top: 32, size: 24, lineHeight: 34 }, vs: 15 } as const

/** A headline figure's number, its sign read whether written "-" or "−", or `null` when it is not one. */
function numberOf(text: string): number | null {
  const m = /^\s*([+\-−]?)\s*([\d,]*\.?\d+)/u.exec(text)
  if (!m) return null
  const v = Number(m[2]!.replace(/,/g, ""))
  return m[1] === "-" || m[1] === "−" ? -v : v
}

export const duelComposition: Composition = ({ components, ctx, rect, setting, tagBand = 0 }) => {
  if (setting !== "dossier") return null
  const [kpis, chart, table, ...rest] = components
  if (kpis?.type !== "kpi_cards" || chart?.type !== "chart" || table?.type !== "data_table" || rest.length > 0) return null
  const k = kpis as KpiCards
  const c = chart as Chart
  const t = table as DataTable
  if (k.items.length !== 2 || c.chart_type !== "bar" || c.direction === "horizontal" || c.series.length !== 2) return null
  if (c.changes?.length || c.bands?.length || c.series.some((s) => s.emphasis || s.tone || s.data.some((p) => p.emphasis || p.status))) return null
  const names = c.series.map((s) => s.name.trim())
  if (k.items.some((item, i) => item.label.trim() !== names[i] || item.icon || item.tag || item.delta || item.source?.trim() || item.tone)) return null
  const categories = c.series[0]!.data.map((p) => String(p.x))
  if (categories.length < 2 || categories.length > 5 || c.series[1]!.data.map((p) => String(p.x)).join("\u0000") !== categories.join("\u0000")) return null
  if (t.title?.trim() || t.source?.trim() || t.columns.length !== 3 || t.rows.length < 1 || t.rows.length > 3) return null
  if (t.rows.some((row) => row.tag || row.icon || row.emphasis)) return null
  if (t.columns[1]!.label.trim() !== names[0] || t.columns[2]!.label.trim() !== names[1]) return null
  if (FIG.top < tagBand) return null

  const inks = dossierInks(ctx)
  const series = dossierSeries(ctx)
  const ink = (i: number) => series[i % series.length]!
  const meta = dossierMeta(inks.muted, inks.ground)
  const figures = k.items.map((item) => {
    const { text, unit } = kpiFigure(item.value, item.unit)
    return { text: joinUnit(text, unit?.trim() || undefined), n: numberOf(text) }
  })
  if (figures.some((f) => f.n === null)) return null
  const maxFig = Math.max(...figures.map((f) => Math.abs(f.n!)))
  if (!(maxFig > 0)) return null
  if (figures.some((f) => dossierWidth(f.text, FIG.value.size, ctx, true) > LEFT.w)) return null
  const notes = k.items.map((item) => (item.note?.trim() ? fitDossier(item.note, { width: LEFT.w, size: FIG.note.size, lineHeight: FIG.note.lineHeight, maxLines: 1 }, ctx) : null))
  if (notes.some((n, i) => k.items[i]!.note?.trim() && !n)) return null

  const rx = rect.x + RIGHT.x
  const right = rect.x + rect.w
  const heading = c.axes?.y_title?.trim() ?? ""
  if (heading && dossierWidth(heading, HEAD.size, ctx, true) > right - rx) return null
  const headingEnd = rx + (heading ? dossierWidth(heading, HEAD.size, ctx, true) : 0)
  const chipX = c.tag ? Math.max(headingEnd + HEAD.chipGap, rx + HEAD.chipAt) : 0
  if (c.tag && chipX + chipWidth(c.tag.text, ctx) > right) return null

  const gx = rx + PLOT.inset
  const pitch = (right - gx) / categories.length
  if (pitch < PLOT.bar * 2 + PLOT.pair + 12) return null
  const unit = c.axes?.y_unit?.trim()
  const values = c.series.flatMap((s) => s.data.map((p) => p.y))
  if (values.some((v) => v < 0)) return null
  const top = unit === "%" && Math.max(...values) <= 100 ? 100 : Math.max(...values) * 1.1
  const gy = rect.y + PLOT.top
  const base = gy + PLOT.h
  const decimals = Math.max(0, ...values.map(writtenDecimals))
  const catLabels = categories.map((cat) => dossierWidth(cat, PLOT.label.size, ctx))
  if (catLabels.some((w) => w > pitch - 8)) return null

  const statRows = t.rows.map((row) => ({
    label: String(row.cells[t.columns[0]!.key] ?? ""),
    a: String(row.cells[t.columns[1]!.key] ?? ""),
    b: String(row.cells[t.columns[2]!.key] ?? ""),
  }))
  if (statRows.some((r) => dossierWidth(r.label, STATS.label.size, ctx) > STATS.w)) return null
  const vsWord = " vs "
  const statW = (r: { a: string; b: string }) =>
    dossierWidth(r.a, STATS.value.size, ctx, true) + dossierWidth(vsWord, STATS.vs, ctx) + dossierWidth(r.b, STATS.value.size, ctx, true)
  if (statRows.some((r) => statW(r) > STATS.w)) return null
  const statPitch = statRows.length > 1 ? Math.min(STATS.pitch, (right - rx - STATS.w) / (statRows.length - 1)) : 0
  if (statRows.length > 1 && statPitch < STATS.w + 8) return null

  // The legend, right-aligned on its line.
  const legendW = names.reduce((w, name, i) => w + LEGEND.swatch + LEGEND.gap + dossierWidth(name, LEGEND.size, ctx) + (i > 0 ? LEGEND.step : 0), 0)
  let lx = right - legendW
  const legend: React.ReactNode[] = []
  names.forEach((name, i) => {
    if (i > 0) lx += LEGEND.step
    legend.push(<rect key={`s${i}`} x={lx} y={rect.y + LEGEND.top} width={LEGEND.swatch} height={LEGEND.swatch} fill={ink(i)} />)
    lx += LEGEND.swatch + LEGEND.gap
    legend.push(paintDossierLine(name, { ctx, key: `n${i}`, x: lx, top: rect.y + LEGEND.top - 4, lineHeight: 20, size: LEGEND.size, fill: meta }))
    lx += dossierWidth(name, LEGEND.size, ctx)
  })

  return (
    <g {...compositionTag("duel")}>
      <g {...blockTag(ctx, k)} data-dossier-duel-figures="">
        {k.items.map((item, i) => {
          const y = rect.y + FIG.top + i * FIG.pitch
          const f = figures[i]!
          return (
            <g key={i}>
              {paintDossierLine(item.label, { ctx, x: rect.x, top: y, lineHeight: FIG.name.lineHeight, size: FIG.name.size, bold: true, fill: dossierText(inks.ink, inks.ground, FIG.name.size) })}
              {paintDossierLine(f.text, { ctx, x: rect.x, top: y + FIG.value.top, lineHeight: FIG.value.lineHeight, size: FIG.value.size, bold: true, fill: dossierText(ink(i), inks.ground, FIG.value.size) })}
              <rect x={rect.x} y={y + FIG.bar.top} width={(Math.abs(f.n!) / maxFig) * LEFT.w} height={FIG.bar.h} rx={FIG.bar.r} fill={ink(i)} />
              {notes[i] ? paintDossierLine(item.note!.trim(), { ctx, x: rect.x, top: y + FIG.note.top, lineHeight: FIG.note.lineHeight, size: FIG.note.size, fill: meta }) : null}
            </g>
          )
        })}
      </g>
      <g {...blockTag(ctx, c)} data-dossier-duel-chart="">
        {heading ? paintDossierLine(heading, { ctx, x: rx, top: rect.y + HEAD.top, lineHeight: HEAD.lineHeight, size: HEAD.size, bold: true, fill: dossierText(inks.ink, inks.ground, HEAD.size) }) : null}
        {c.tag ? paintChip({ ctx, text: c.tag.text, ink: chipInk(c.tag, ctx, inks), x: chipX, y: rect.y + HEAD.top + 1, ground: inks.ground }) : null}
        {legend}
        {categories.map((cat, j) => {
          const x = gx + j * pitch
          return (
            <g key={j}>
              {c.series.map((s, i) => {
                const v = s.data[j]!.y
                const h = (v / top) * PLOT.h
                const bx = x + i * (PLOT.bar + PLOT.pair)
                return (
                  <g key={i}>
                    <rect x={bx} y={base - h} width={PLOT.bar} height={h} fill={ink(i)} />
                    <text
                      {...DOSSIER_SPEC}
                      x={bx + PLOT.bar / 2}
                      y={base - h - PLOT.value.gap}
                      textAnchor="middle"
                      fontFamily={ctx.fonts.heading}
                      fontSize={PLOT.value.size}
                      fontWeight="700"
                      fill={dossierText(ink(i), inks.ground, PLOT.value.size)}
                      dominantBaseline="alphabetic"
                    >
                      {v.toFixed(decimals)}
                    </text>
                  </g>
                )
              })}
              <text
                {...DOSSIER_SPEC}
                x={x + PLOT.bar + PLOT.pair / 2}
                y={base + PLOT.label.drop}
                textAnchor="middle"
                fontFamily={ctx.fonts.body}
                fontSize={PLOT.label.size}
                fill={dossierText(inks.ink, inks.ground, PLOT.label.size)}
                dominantBaseline="alphabetic"
              >
                {cat}
              </text>
            </g>
          )
        })}
        <rect x={gx - PLOT.axisLead} y={base - 0.6} width={right - gx + PLOT.axisLead} height={1.2} fill={inks.ink} />
      </g>
      <g {...blockTag(ctx, t)} data-dossier-duel-stats="">
        {statRows.map((r, j) => {
          const x = rx + j * statPitch
          const y = rect.y + STATS.top
          const baseline = dossierBaseline(y + STATS.value.top, STATS.value.lineHeight, STATS.value.size)
          return (
            <g key={j}>
              <rect x={x} y={y} width={STATS.w} height={1} fill={inks.line} />
              {paintDossierLine(r.label, { ctx, x, top: y + STATS.label.top, lineHeight: STATS.label.lineHeight, size: STATS.label.size, fill: meta })}
              <text x={x} y={baseline} fontFamily={ctx.fonts.heading} fontSize={STATS.value.size} fontWeight="700" fill={dossierText(ink(0), inks.ground, STATS.value.size)} dominantBaseline="alphabetic" xmlSpace="preserve">
                {r.a}
                <tspan {...DOSSIER_SPEC} fontSize={STATS.vs} fontWeight="400" fill={dossierText(inks.muted, inks.ground, STATS.vs)}>
                  {vsWord}
                </tspan>
                <tspan fill={dossierText(ink(1), inks.ground, STATS.value.size)}>{r.b}</tspan>
              </text>
            </g>
          )
        })}
      </g>
    </g>
  )
}

