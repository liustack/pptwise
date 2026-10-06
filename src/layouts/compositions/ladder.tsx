import type { Component } from "@/ir"
import { stepPoints } from "../../components/chart-svg"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  Caption,
  fitBroken,
  fitManuscript,
  glossBreak,
  manuscriptInks,
  manuscriptText,
  paintManuscript,
  paintManuscriptLine,
  stripMarks,
  withUnit,
} from "./manuscript"

type Chart = Extract<Component, { type: "chart" }>
type Kpis = Extract<Component, { type: "kpi_cards" }>

/*
 * ladder: schedules that climb in steps, thesis's 2026-10 board (p03). The
 * figure's number and title over a plot of the steps, a staircase a series
 * on a continuous axis (a statutory age by date of birth), in emerald,
 * indigo and gold, a dot where each one reaches its top, a hairline every
 * five units up with its value and a tick every five units along. At the
 * right a card a series: a bar of its colour, its name, its range set large
 * in the heading serif, and how it climbs in two lines.
 *
 * Takes, in the manuscript setting: a `scatter` chart with a title, one to
 * three series all joined as steps, then a `kpi_cards` with an item a series
 * in the same order, each with a note and no icon, tag, delta or source.
 *
 * Declines: a card's name or range past one line, a note past two lines.
 *
 * Reads: the manuscript inks (`./manuscript.tsx`).
 */

const PLOT = { dx: 86, top: 28, right: 756, bottom: 388 } as const
const AXIS = { size: 12, labelGap: 10, tick: 5, tickLabel: 22, title: 42, step: 5 } as const
const LINE = { stroke: 2.2, dot: 4 } as const
const CARDS = { dx: 806, top: 12, pitch: 128, bar: { w: 4, h: 110 }, text: { dx: 22, w: 320 }, name: { size: 13, h: 22 }, range: { dy: 24, size: 30, h: 42 }, note: { dy: 68, size: 13, h: 21 } } as const

export const ladderComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "manuscript") return null
  const [chart, cards, ...rest] = components
  if (chart?.type !== "chart" || cards?.type !== "kpi_cards" || rest.length > 0) return null
  const c = chart as Chart
  const k = cards as Kpis
  if (c.chart_type !== "scatter" || !c.title?.trim() || c.series.length < 1 || c.series.length > 3 || c.series.some((s) => !s.steps || s.data.length < 2 || s.tone || s.emphasis)) return null
  if (c.tag || c.reference || c.bands || c.changes || c.markers || k.items.length !== c.series.length) return null
  if (k.items.some((it) => !it.note?.trim() || it.icon || it.tag || it.delta || it.source || it.tone)) return null
  if (rect.w < CARDS.dx + CARDS.text.dx + CARDS.text.w || rect.h < Math.max(PLOT.bottom + AXIS.title, CARDS.top + c.series.length * CARDS.pitch)) return null
  const label = ctx.exhibitLabels?.get(c)
  if (!label) return null
  const inks = manuscriptInks(ctx)
  const ground = inks.ground
  const colors = [inks.deep, inks.indigo, inks.gold]
  const xs = c.series.flatMap((s) => s.data.map((d) => Number(d.x)))
  const ys = c.series.flatMap((s) => s.data.map((d) => d.y))
  const x0 = Math.min(...xs)
  const x1 = Math.max(...xs)
  const y0 = Math.floor(Math.min(...ys)) - 1
  const y1 = Math.ceil(Math.max(...ys)) + 1
  if (!(x1 > x0)) return null
  const X0 = rect.x + PLOT.dx
  const X1 = rect.x + PLOT.right
  const Y0 = rect.y + PLOT.top
  const Y1 = rect.y + PLOT.bottom
  const px = (v: number) => X0 + ((v - x0) / (x1 - x0)) * (X1 - X0)
  const py = (v: number) => Y1 - ((v - y0) / (y1 - y0)) * (Y1 - Y0)
  const yTicks: number[] = []
  for (let v = Math.ceil(y0 / AXIS.step) * AXIS.step; v <= y1; v += AXIS.step) if (v > y0) yTicks.push(v)
  const xTicks: number[] = []
  for (let v = Math.ceil(x0 / AXIS.step) * AXIS.step; v < x1; v += AXIS.step) if (v > x0) xTicks.push(v)
  const yUnit = c.axes?.y_unit?.trim()
  const xTitle = c.axes?.x_title?.trim()
  const muted = manuscriptText(inks.muted, ground, AXIS.size)
  const fitted = k.items.map((it) => ({
    name: fitManuscript(it.label, { width: CARDS.text.w, size: CARDS.name.size, lineHeight: CARDS.name.h, maxLines: 1, bold: true }, ctx),
    range: fitManuscript(withUnit(stripMarks(it.value), it.unit), { width: CARDS.text.w, size: CARDS.range.size, lineHeight: CARDS.range.h, maxLines: 1, serif: true, bold: true }, ctx),
    note: fitBroken(it.note!.trim(), { width: CARDS.text.w, size: CARDS.note.size, lineHeight: CARDS.note.h, maxLines: 2 }, ctx),
  }))
  if (fitted.some((f) => !f.name || !f.range || !f.note)) return null
  return (
    <g {...compositionTag("ladder")}>
      <g {...blockTag(ctx, c)}>
        <Caption label={label} title={c.title} x={X0} top={rect.y + 2} ctx={ctx} />
        {yTicks.map((v) => (
          <g key={`y-${v}`}>
            <rect x={X0} y={py(v) - 0.5} width={X1 - X0} height={1} fill={inks.line} />
            {paintManuscriptLine(withUnit(String(v), yUnit), { ctx, x: X0 - AXIS.labelGap, baseline: py(v) + 4, size: AXIS.size, anchor: "end", fill: muted })}
          </g>
        ))}
        {xTicks.map((v) => (
          <g key={`x-${v}`}>
            <line x1={px(v)} y1={Y1} x2={px(v)} y2={Y1 + AXIS.tick} stroke={inks.pebble} strokeWidth={1} />
            {paintManuscriptLine(String(v), { ctx, x: px(v), baseline: Y1 + AXIS.tickLabel, size: AXIS.size, anchor: "middle", fill: muted })}
          </g>
        ))}
        {xTitle ? paintManuscriptLine(`${xTitle} →`, { ctx, x: X1, baseline: Y1 + AXIS.title, size: AXIS.size, anchor: "end", fill: muted }) : null}
        {c.series.map((s, i) => {
          const top = Math.max(...s.data.map((d) => d.y))
          const end = s.data.find((d) => d.y === top)!
          return (
            <g key={i} data-manuscript-ladder={s.name}>
              <polyline points={stepPoints(s.data.map((d) => [px(Number(d.x)), py(d.y)] as const))} fill="none" stroke={colors[i]} strokeWidth={LINE.stroke} />
              <circle cx={px(Number(end.x))} cy={py(end.y)} r={LINE.dot} fill={colors[i]} />
            </g>
          )
        })}
      </g>
      <g {...blockTag(ctx, k)}>
        {fitted.map((f, i) => {
          const top = rect.y + CARDS.top + i * CARDS.pitch
          const x = rect.x + CARDS.dx
          return (
            <g key={i} data-manuscript-card={k.items[i]!.label}>
              <rect x={x} y={top} width={CARDS.bar.w} height={CARDS.bar.h} fill={colors[i]} />
              {paintManuscript(f.name!, { ctx, x: x + CARDS.text.dx, top, bold: true, fill: manuscriptText(inks.muted, ground, CARDS.name.size) })}
              {paintManuscript(f.range!, { ctx, x: x + CARDS.text.dx, top: top + CARDS.range.dy, serif: true, bold: true, fill: manuscriptText(inks.ink, ground, CARDS.range.size) })}
              <g {...glossBreak(f.note!.sep)}>{paintManuscript(f.note!.layout, { ctx, x: x + CARDS.text.dx, top: top + CARDS.note.dy, fill: manuscriptText(inks.muted, ground, CARDS.note.size) })}</g>
            </g>
          )
        })}
      </g>
    </g>
  )
}
