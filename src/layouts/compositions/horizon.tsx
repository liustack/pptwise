import type { Component } from "@/ir"
import { joinUnit } from "../../lib/quantity-format"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitFigureCard,
  paintFigureCard,
  paintPill,
  paintYearbookLine,
  pillText,
  pillWidth,
  PILL,
  yearbookInks,
  yearbookMeta,
  yearbookText,
  yearbookWidth,
  type YearbookInks,
} from "./yearbook"

type Chart = Extract<Component, { type: "chart" }>
type Timeline = Extract<Component, { type: "timeline" }>
type KpiCards = Extract<Component, { type: "kpi_cards" }>

/*
 * horizon: costs followed year by year to the end of a run, over a table of
 * what changes each year, almanac's 2026-10 board (the long curve page, p04).
 * A line for each series across the years, no frame: hairline gridlines with
 * their values in mono on the left, the years in mono under the plot. The
 * line the page follows (`emphasis`) is the mark, drawn heavy, its first
 * value set in mono at its start; the others step back in the palette's quiet
 * inks and then a ghost. Every line ends in its name and its last value,
 * spread apart where they would meet. Under the years a hairline and a row
 * of the timeline the page carries: its title as the row's name, each
 * milestone's title under its year, the highlighted one in the accent: the
 * table of years the costs are read against. Under that the chart's tag,
 * the pill that says the figures are a scenario. Beside the plot a column of
 * figure cards.
 *
 * Takes, in the yearbook setting: a `line` chart of two to five series over
 * three to thirteen categories written as years, every series a value at
 * every year, none below zero, with no axis title (the claim says what the
 * lines count); a `timeline` whose milestones are dated by
 * those years, each title one short line; and a `kpi_cards` of one to three
 * items.
 *
 * Declines: a year the chart does not have, a title or a label past its
 * room, figures taller than the band.
 *
 * Reads: the yearbook inks (`./yearbook.tsx`), the body, heading and mono
 * faces.
 */

const PLOT = { left: 56, right: 356, top: 24, bottom: 334, endGap: 10, labelSize: 13, labelGap: 20, tickSize: 12 } as const
const ROW = { rule: 32, base: 50, size: 12, nameGap: 28 } as const
const START = { size: 14, drop: 22, rise: 10, back: 8, clear: 4 } as const
const TAG = { top: 404 } as const
const CARDS = { w: 216, top: 10, h: 140, gap: 16 } as const

/**
 * Where the marked line's first value stands: under its first point, pushed
 * on below any gridline its words would sit on, so no rule runs through or
 * grazes them. A value that would then fall to the years under the plot
 * stands over its point instead, lifted above any gridline there.
 */
export function startBaseline(pointY: number, rules: readonly number[], floor: number): number {
  const up = START.size * 0.8 + START.clear
  const down = START.size * 0.2 + START.clear
  const sorted = [...rules].sort((a, b) => a - b)
  let baseline = pointY + START.drop
  for (const r of sorted) if (r >= baseline - up && r <= baseline + down) baseline = r + up + 1
  if (baseline + down <= floor) return baseline
  baseline = pointY - START.rise
  for (const r of sorted.reverse()) if (r >= baseline - up && r <= baseline + down) baseline = r - down - 1
  return baseline
}

/** A nice ceiling for the value axis: the largest value plus a tenth, rounded up to a round step. */
function ceilingOf(max: number): { top: number; step: number } {
  const raw = max * 1.1
  const mag = 10 ** Math.floor(Math.log10(raw))
  const top = Math.ceil(raw / mag) * mag
  const tickMag = 10 ** Math.floor(Math.log10(top / 3))
  const step = [1, 2, 5, 10].map((m) => m * tickMag).find((s) => top / s <= 4) ?? tickMag * 10
  return { top, step }
}

/** Lines' end labels pushed apart, in order down the page, so no two meet. */
export function spreadLabels(ys: readonly number[], gap: number): number[] {
  const order = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y)
  const placed = order.map((o) => o.y)
  for (let pass = 0; pass < 20; pass++) {
    let moved = false
    for (let k = 1; k < placed.length; k++) {
      const overlap = gap - (placed[k]! - placed[k - 1]!)
      if (overlap > 0.01) {
        placed[k - 1]! -= overlap / 2
        placed[k]! += overlap / 2
        moved = true
      }
    }
    if (!moved) break
  }
  const out = new Array<number>(ys.length)
  order.forEach((o, k) => (out[o.i] = placed[k]!))
  return out
}

export const horizonComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "yearbook") return null
  const [chart, timeline, kpis, ...rest] = components
  if (chart?.type !== "chart" || timeline?.type !== "timeline" || kpis?.type !== "kpi_cards" || rest.length > 0) return null
  const c = chart as Chart
  const t = timeline as Timeline
  const k = kpis as KpiCards
  // The page's claim names what the lines count: the plot has no place for an axis title.
  if (c.chart_type !== "line" || c.series.length < 2 || c.series.length > 5 || c.bands || c.reference || c.axes?.y_title || c.axes?.x_title) return null
  if (c.series.some((s) => s.tone)) return null
  const years = c.series[0]!.data.map((d) => String(d.x).trim())
  if (years.length < 3 || years.length > 13 || years.some((y) => !/^\d{4}$/.test(y))) return null
  if (c.series.some((s) => s.data.length !== years.length || s.data.some((d, i) => String(d.x).trim() !== years[i] || d.y < 0 || d.status || d.emphasis || d.note))) return null
  if (t.layout === "vertical" || t.lanes || t.periods || t.milestones.some((m) => m.desc || m.icon || m.tag || m.source || m.tone || !years.includes(m.date.trim()))) return null
  if (k.items.length < 1 || k.items.length > 3) return null
  const inks = yearbookInks(ctx)
  const unit = c.axes?.y_unit?.trim() || undefined
  // The table's name stands right of the band's edge and left of the first year's cell.
  const rowName = t.title?.trim() ?? ""
  const nameW = rowName ? yearbookWidth(rowName, ROW.size, ctx, true) : 0
  const plotX0 = rect.x + Math.max(PLOT.left, Math.ceil(nameW) + ROW.nameGap)
  // Every line ends in its name and its last value, and the plot gives way to the longest of them.
  const ends = c.series.map((s) => `${s.name} ${joinUnit(String(s.data[s.data.length - 1]!.y), unit)}`)
  const endWidth = Math.max(...ends.map((text, i) => yearbookWidth(text, PLOT.labelSize, ctx, i === c.series.findIndex((x) => x.emphasis))))
  const cardsX = rect.x + rect.w - CARDS.w
  const plotX1 = Math.min(rect.x + rect.w - PLOT.right, cardsX - 8 - PLOT.endGap - endWidth)
  const plotY0 = rect.y + PLOT.top
  const plotY1 = rect.y + PLOT.bottom
  const max = Math.max(...c.series.flatMap((s) => s.data.map((d) => d.y)))
  if (!(max > 0)) return null
  const { top, step } = ceilingOf(max)
  const xOf = (i: number) => plotX0 + (i * (plotX1 - plotX0)) / (years.length - 1)
  const yOf = (v: number) => plotY1 - (v / top) * (plotY1 - plotY0)
  const marked = c.series.findIndex((s) => s.emphasis)
  const quiet = [inks.quiet, inks.second, inks.ghost]
  let q = 0
  const look = c.series.map((_s, i) => {
    if (i === marked) return { ink: inks.mark, width: 4, dot: 5, label: inks.mark }
    const ink = quiet[Math.min(q++, quiet.length - 1)]!
    return { ink, width: 2, dot: 3, label: ink === inks.ghost ? inks.muted : ink }
  })
  if (plotX1 - plotX0 < 360) return null
  const endYs = spreadLabels(c.series.map((s) => yOf(s.data[s.data.length - 1]!.y) + 5), PLOT.labelGap)
  // The table of years under the plot.
  const rowBase = plotY1 + ROW.base
  const cells = t.milestones.map((m) => ({ m, x: xOf(years.indexOf(m.date.trim())) }))
  const pitch = (plotX1 - plotX0) / (years.length - 1)
  if (cells.some((cell) => yearbookWidth(cell.m.title, ROW.size, ctx, true, true) > pitch - 6)) return null
  // The figure cards beside the plot.
  const figures = k.items.map((item) => fitFigureCard(item, CARDS.w, ctx))
  if (figures.some((f) => !f || f.depth > CARDS.h - 10)) return null
  if (CARDS.top + k.items.length * CARDS.h + (k.items.length - 1) * CARDS.gap > rect.h) return null
  const tagW = c.tag ? pillWidth(pillText(c.tag), ctx) : 0
  if (c.tag && (tagW > plotX1 - plotX0 || TAG.top + PILL.height > rect.h)) return null
  const ticks: number[] = []
  for (let v = 0; v <= top + 1e-9; v += step) ticks.push(Math.round(v * 1e6) / 1e6)
  const first = marked >= 0 ? c.series[marked]!.data[0]!.y : null

  return (
    <g {...compositionTag("horizon")}>
      <g {...blockTag(ctx, c)}>
        {ticks.map((v) => (
          <g key={`g${v}`}>
            <line x1={plotX0} y1={yOf(v)} x2={plotX1} y2={yOf(v)} stroke={inks.line} strokeWidth={1} />
            {paintYearbookLine(joinUnit(String(v), unit), { ctx, x: plotX0 - 10, baseline: yOf(v) + 4, size: PLOT.tickSize, mono: true, anchor: "end", fill: yearbookMeta(inks.muted, inks.ground) })}
          </g>
        ))}
        {c.series.map((s, i) => {
          const points = s.data.map((d, j) => `${Math.round(xOf(j) * 10) / 10},${Math.round(yOf(d.y) * 10) / 10}`).join(" ")
          const lk = look[i]!
          const last = s.data.length - 1
          return (
            <g key={`s${i}`} data-yearbook-line={i === marked ? "marked" : ""}>
              <polyline points={points} fill="none" stroke={lk.ink} strokeWidth={lk.width} strokeLinejoin="round" strokeLinecap="round" />
              <circle cx={xOf(0)} cy={yOf(s.data[0]!.y)} r={lk.dot} fill={lk.ink} />
              <circle cx={xOf(last)} cy={yOf(s.data[last]!.y)} r={lk.dot} fill={lk.ink} />
              {paintYearbookLine(ends[i]!, { ctx, x: xOf(last) + PLOT.endGap, baseline: endYs[i]!, size: PLOT.labelSize, bold: i === marked, fill: yearbookText(lk.label, inks.ground, PLOT.labelSize) })}
            </g>
          )
        })}
        {first !== null
          ? paintYearbookLine(joinUnit(String(first), unit), {
              ctx,
              x: xOf(0) - START.back,
              baseline: startBaseline(
                yOf(first),
                ticks.map((v) => yOf(v)),
                plotY1,
              ),
              size: START.size,
              mono: true,
              bold: true,
              fill: yearbookText(inks.mark, inks.ground, START.size),
            })
          : null}
        {years.map((y, i) => paintYearbookLine(y, { ctx, key: `y${y}`, x: xOf(i), baseline: plotY1 + 22, size: PLOT.tickSize, mono: true, anchor: "middle", fill: yearbookMeta(inks.muted, inks.ground) }))}
        {c.tag ? <g data-yearbook-chart-tag="">{paintPill({ ctx, tag: c.tag, x: plotX0, y: rect.y + TAG.top, ground: inks.ground, inks })}</g> : null}
      </g>
      <g {...blockTag(ctx, t)} data-yearbook-years-row="">
        <line x1={plotX0} y1={plotY1 + ROW.rule} x2={plotX1} y2={plotY1 + ROW.rule} stroke={inks.line} strokeWidth={1} />
        {rowName ? paintYearbookLine(rowName, { ctx, x: plotX0 - ROW.nameGap, baseline: rowBase, size: ROW.size, bold: true, anchor: "end", fill: yearbookMeta(inks.muted, inks.ground) }) : null}
        {cells.map((cell, i) =>
          paintYearbookLine(cell.m.title, {
            ctx,
            key: `c${i}`,
            x: cell.x,
            baseline: rowBase,
            size: ROW.size,
            mono: true,
            bold: true,
            anchor: "middle",
            fill: yearbookText(cell.m.highlight ? inks.accent : inks.ink, inks.ground, ROW.size),
          }),
        )}
      </g>
      <g {...blockTag(ctx, k)}>
        {figures.map((f, i) => paintFigureCard(f!, { x: cardsX, y: rect.y + CARDS.top + i * (CARDS.h + CARDS.gap), w: CARDS.w, h: CARDS.h }, ctx, inks, `k${i}`))}
      </g>
    </g>
  )
}

/** The inks a horizon page's lines take, for tests: the mark for the followed line, then the quiet inks. */
export function horizonInks(inks: YearbookInks): string[] {
  return [inks.mark, inks.quiet, inks.second, inks.ghost]
}
