import type { Component } from "@/ir"
import { kpiFigure } from "../../components/kpi"
import { joinUnit } from "../../lib/quantity-format"
import { readableOn, accessibleInk } from "../../render/ink"
import { barInks } from "./benchmark"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitYearbook,
  fitYearbookMono,
  paintPill,
  paintYearbook,
  paintYearbookCard,
  paintYearbookLine,
  pillText,
  pillWidth,
  PILL,
  yearbookInks,
  yearbookText,
  yearbookWidth,
} from "./yearbook"

type KpiCards = Extract<Component, { type: "kpi_cards" }>
type Code = Extract<Component, { type: "code" }>
type Chart = Extract<Component, { type: "chart" }>

/*
 * magnitude: one figure set as large as the page allows, and beside it the
 * card that puts it in proportion, almanac's 2026-10 board (the carbon price
 * page, p12). On the left the figure at 200px, bold, in the accent when the
 * author marks it, its label bold under it, the formula it comes from in
 * mono, its note muted and its tag, the law it rests on. On the right a card:
 * the chart's name, a short list of bars, each its name and its value with
 * its note, the value inside the bar in the readable ink when the bar is wide
 * enough and after it in the bar's ink when it is not; under them a second
 * figure in mono, its label, a hairline, and its tag and note.
 *
 * Takes, in the yearbook setting: a `kpi_cards` of one item, a `code` of one
 * line, a `bar` chart on its side of one series of two to four bars, none
 * below zero, and a `kpi_cards` of one item.
 *
 * Declines: a figure wider than the left column at 200px, a formula past its
 * line, a name or a note past its room, and anything taller than the band.
 *
 * Reads: the yearbook inks (`./yearbook.tsx`), the body, heading and mono
 * faces.
 */

const LEFT = { w: 600, figure: { top: 10, size: 200, lineHeight: 200 }, label: { top: 226, size: 16, lineHeight: 30 }, formula: { top: 260, size: 24, lineHeight: 40 }, note: { top: 310, size: 15, lineHeight: 24, maxLines: 2 }, tag: { top: 380 } } as const
const CARD = { w: 496, top: 10, bottom: 24, pad: 24, title: { top: 20, size: 14, lineHeight: 22 }, rows: { top: 66, pitch: 80, bar: 34, label: { size: 15, base: 18 }, barX: 116, room: 24, value: { size: 14, base: 23, inset: 10, gap: 8 } }, figure: { top: 236, size: 40, lineHeight: 50 }, label: { top: 290, size: 13, lineHeight: 22, maxLines: 1 }, rule: 326, tag: 344, note: { top: 376, size: 13, lineHeight: 22, maxLines: 2 } } as const

export const magnitudeComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "yearbook") return null
  const [lead, code, chart, side, ...rest] = components
  if (lead?.type !== "kpi_cards" || code?.type !== "code" || chart?.type !== "chart" || side?.type !== "kpi_cards" || rest.length > 0) return null
  const l = lead as KpiCards
  const f = code as Code
  const c = chart as Chart
  const s = side as KpiCards
  if (l.items.length !== 1 || s.items.length !== 1) return null
  const one = l.items[0]!
  const two = s.items[0]!
  if ([one, two].some((item) => item.icon || item.delta || item.tone || item.source?.trim())) return null
  if (f.title || f.highlight_lines || f.code.trim().includes("\n")) return null
  if (c.chart_type !== "bar" || c.direction !== "horizontal" || c.series.length !== 1 || c.tag || c.reference || c.changes) return null
  const data = c.series[0]!.data
  if (data.length < 2 || data.length > 4 || data.some((d) => !(d.y >= 0) || d.status)) return null
  const inks = yearbookInks(ctx)

  // The figure and what stands under it.
  const big = kpiFigure(one.value, one.unit)
  const figure = fitYearbook(joinUnit(big.text, big.unit), { width: LEFT.w, size: LEFT.figure.size, lineHeight: LEFT.figure.lineHeight, maxLines: 1, bold: true }, ctx)
  const label = fitYearbook(one.label, { width: LEFT.w, size: LEFT.label.size, lineHeight: LEFT.label.lineHeight, maxLines: 1, bold: true }, ctx)
  const formula = fitYearbookMono(f.code.trim(), { width: LEFT.w, size: LEFT.formula.size, lineHeight: LEFT.formula.lineHeight, maxLines: 1 })
  const note = one.note?.trim() ? fitYearbook(one.note, { width: LEFT.w, size: LEFT.note.size, lineHeight: LEFT.note.lineHeight, maxLines: LEFT.note.maxLines }, ctx) : null
  if (!figure || !label || !formula || (one.note?.trim() && !note)) return null
  if (one.tag && pillWidth(pillText(one.tag), ctx) > LEFT.w) return null
  if (LEFT.tag.top + PILL.height > rect.h) return null

  // The card.
  const cardX = rect.x + rect.w - CARD.w
  if (cardX < rect.x + LEFT.w + 20) return null
  const cardTop = rect.y + CARD.top
  const cardH = rect.h - CARD.top - CARD.bottom
  const inner = CARD.w - CARD.pad * 2
  const unit = c.axes?.y_unit?.trim() || undefined
  const title = c.axes?.y_title?.trim() ?? ""
  const titleFit = title ? fitYearbook(title, { width: inner, size: CARD.title.size, lineHeight: CARD.title.lineHeight, maxLines: 1, bold: true }, ctx) : null
  if (title && !titleFit) return null
  const values = data.map((d) => `${joinUnit(String(Number(d.y.toPrecision(12))), unit)}${d.note?.trim() ? ` · ${d.note.trim()}` : ""}`)
  const marked = data.map((d) => d.emphasis === true)
  const colors = barInks(marked, inks)
  const barX = cardX + CARD.pad + CARD.rows.barX
  const max = Math.max(...data.map((d) => d.y))
  if (!(max > 0)) return null
  const scale = (cardX + CARD.w - CARD.pad - CARD.rows.room - barX) / max
  const rows = data.map((d, i) => {
    const w = Math.max(1, d.y * scale)
    const vw = yearbookWidth(values[i]!, CARD.rows.value.size, ctx, true, true)
    const inside = vw + CARD.rows.value.inset * 2 <= w
    return { name: String(d.x).trim(), w, inside, vw }
  })
  if (rows.some((r) => !r.inside && barX + r.w + CARD.rows.value.gap + r.vw > cardX + CARD.w - 8)) return null
  if (rows.some((r) => yearbookWidth(r.name, CARD.rows.label.size, ctx, true) > CARD.rows.barX - 10)) return null
  if (CARD.rows.top + (data.length - 1) * CARD.rows.pitch + CARD.rows.bar > CARD.figure.top - 20) return null
  const side2 = kpiFigure(two.value, two.unit)
  const sideFigure = fitYearbookMono(joinUnit(side2.text, side2.unit), { width: inner, size: CARD.figure.size, lineHeight: CARD.figure.lineHeight, maxLines: 1 })
  const sideLabel = fitYearbook(two.label, { width: inner, size: CARD.label.size, lineHeight: CARD.label.lineHeight, maxLines: CARD.label.maxLines }, ctx)
  const sideNote = two.note?.trim() ? fitYearbook(two.note, { width: inner, size: CARD.note.size, lineHeight: CARD.note.lineHeight, maxLines: CARD.note.maxLines }, ctx) : null
  if (!sideFigure || !sideLabel || (two.note?.trim() && !sideNote)) return null
  if (two.tag && pillWidth(pillText(two.tag), ctx) > inner) return null
  const noteTop = two.tag ? CARD.note.top : CARD.tag
  if (noteTop + (sideNote?.lines.length ?? 0) * CARD.note.lineHeight > cardH - 8) return null

  const figureInk = yearbookText(big.marked ? inks.accent : inks.ink, inks.ground, LEFT.figure.size)
  return (
    <g {...compositionTag("magnitude")}>
      <g {...blockTag(ctx, l)} data-yearbook-magnitude={big.marked ? "marked" : ""}>
        {paintYearbook(figure, { ctx, x: rect.x, top: rect.y + LEFT.figure.top, bold: true, fill: figureInk, runInk: figureInk })}
        {paintYearbook(label, { ctx, x: rect.x, top: rect.y + LEFT.label.top, bold: true, fill: yearbookText(inks.ink, inks.ground, LEFT.label.size) })}
        {note ? paintYearbook(note, { ctx, x: rect.x, top: rect.y + LEFT.note.top, fill: yearbookText(inks.muted, inks.ground, LEFT.note.size) }) : null}
        {one.tag ? paintPill({ ctx, tag: one.tag, x: rect.x, y: rect.y + LEFT.tag.top, ground: inks.ground, inks }) : null}
      </g>
      <g {...blockTag(ctx, f)} data-yearbook-formula="">
        {paintYearbook(formula, { ctx, x: rect.x, top: rect.y + LEFT.formula.top, mono: true, fill: yearbookText(inks.ink, inks.ground, LEFT.formula.size) })}
      </g>
      {paintYearbookCard({ x: cardX, y: cardTop, w: CARD.w, h: cardH }, inks)}
      <g {...blockTag(ctx, c)}>
        {titleFit ? paintYearbook(titleFit, { ctx, x: cardX + CARD.pad, top: cardTop + CARD.title.top, bold: true, fill: yearbookText(inks.ink, inks.paper, CARD.title.size), ground: inks.paper }) : null}
        {rows.map((r, i) => {
          const y = cardTop + CARD.rows.top + i * CARD.rows.pitch
          const ink = colors[i]!
          const words = r.inside ? accessibleInk(readableOn(ink), ink, CARD.rows.value.size) : yearbookText(ink === inks.ghost ? inks.ink : ink, inks.paper, CARD.rows.value.size)
          return (
            <g key={i} data-yearbook-bar={marked[i] ? "marked" : ""}>
              {paintYearbookLine(r.name, { ctx, x: cardX + CARD.pad, baseline: y + CARD.rows.label.base, size: CARD.rows.label.size, bold: true, fill: yearbookText(inks.ink, inks.paper, CARD.rows.label.size) })}
              <rect x={barX} y={y} width={r.w} height={CARD.rows.bar} rx={2} fill={ink} />
              {paintYearbookLine(values[i]!, { ctx, x: r.inside ? barX + CARD.rows.value.inset : barX + r.w + CARD.rows.value.gap, baseline: y + CARD.rows.value.base, size: CARD.rows.value.size, mono: true, bold: true, fill: words })}
            </g>
          )
        })}
      </g>
      <g {...blockTag(ctx, s)} data-yearbook-side="">
        {paintYearbook(sideFigure, { ctx, x: cardX + CARD.pad, top: cardTop + CARD.figure.top, mono: true, bold: true, fill: yearbookText(side2.marked ? inks.accent : inks.ink, inks.paper, CARD.figure.size), ground: inks.paper })}
        {paintYearbook(sideLabel, { ctx, x: cardX + CARD.pad, top: cardTop + CARD.label.top, fill: yearbookText(inks.muted, inks.paper, CARD.label.size), ground: inks.paper })}
        <rect x={cardX + CARD.pad} y={cardTop + CARD.rule} width={inner - 8} height={1} fill={inks.line} />
        {two.tag ? paintPill({ ctx, tag: two.tag, x: cardX + CARD.pad, y: cardTop + CARD.tag, ground: inks.paper, inks }) : null}
        {sideNote ? paintYearbook(sideNote, { ctx, x: cardX + CARD.pad, top: cardTop + noteTop, fill: yearbookText(inks.muted, inks.paper, CARD.note.size), ground: inks.paper }) : null}
      </g>
    </g>
  )
}
