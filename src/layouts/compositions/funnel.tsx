import type { Component } from "@/ir"
import { kpiFigure } from "../../components/kpi"
import { figureStyleOf, groupDigits, joinUnit, writtenFigure } from "../../lib/quantity-format"
import { mostlyChinese } from "../../lib/text-script"
import { blockTag, compositionTag, type Composition } from "./shared"
import { Fire, fitPitch, paintPitch, paintPitchCard, paintPitchLine, paintPitchTracked, pitchBaseline, pitchInks, pitchText, pitchTrackedWidth, pitchWidth } from "./pitch"

type Chart = Extract<Component, { type: "chart" }>
type KpiCards = Extract<Component, { type: "kpi_cards" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * funnel: a plan narrowed to the part a pitch is about, ember's 2026-10
 * board (the landing points page, p05). Levels stacked as trapezoids, each
 * as wide as its value (to the 0.55th power, so the smallest still holds its
 * words), the widest a plain block in the palette's quietest ink, the
 * levels between it and the last a step up from the dark, and the last, the
 * one the page is about, in the fire. Each level names its value bold and
 * what it counts under it. At the right a card with what has already
 * happened, its figure large, and a card with what it means for the founder.
 *
 * Takes, in the pitch setting: a `chart` of `chart_type: "funnel"` with one
 * series of two to four levels that never widen, no tag; then optionally a
 * `kpi_cards` of one item with no delta, tone, icon, source or tag; then
 * optionally a `callout` with a title and no tag or icon. A value is printed
 * with the value axis's unit (`axes.y_unit`), as the ordinary funnel does.
 *
 * Declines: a value or a name wider than its level, a card's label past one
 * line, its figure wider than the card, its note past two lines, and the
 * callout's text past four lines.
 *
 * Reads: the pitch inks (`./pitch.tsx`), the body and heading faces.
 */

const SHAPE = { cx: 356, w: 700, power: 0.55, top: 4, pitch: 130, gap: 12, value: { dy: 62, size: 30 }, name: { dy: 90, size: 14 }, pad: 16, minH: 80 } as const
const SIDE = { x: 776, w: 376, pad: 24, label: { top: 20, size: 13, lineHeight: 22, tracking: 2 } } as const
const FIGURE = { h: 190, value: { top: 50, size: 56, lineHeight: 70 }, note: { top: 124, size: 15, lineHeight: 24, maxLines: 2 } } as const
const MEANS = { gap: 18, h: 200, text: { top: 50, size: 17, lineHeight: 28, maxLines: 4 } } as const

export const funnelComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "pitch") return null
  const [chart, ...others] = components
  if (chart?.type !== "chart") return null
  const c = chart as Chart
  if (c.chart_type !== "funnel" || c.series.length !== 1 || c.tag !== undefined) return null
  const data = c.series[0]!.data
  if (data.length < 2 || data.length > 4 || data.some((d, i) => d.y <= 0 || (i > 0 && d.y > data[i - 1]!.y))) return null
  let figure: KpiCards | undefined
  let means: Callout | undefined
  for (const other of others) {
    if (other.type === "kpi_cards" && !figure && !means) figure = other
    else if (other.type === "callout" && !means) means = other
    else return null
  }
  if (figure && (figure.items.length !== 1 || figure.items.some((item) => item.delta || item.tone || item.icon || item.source || item.tag))) return null
  if (means && (means.title === undefined || means.tag !== undefined || means.icon !== undefined)) return null
  if (rect.w < SIDE.x + SIDE.w) return null
  const inks = pitchInks(ctx)
  const chinese = ctx.figures?.chinese ?? mostlyChinese(data.map((d) => String(d.x)))
  const unit = c.axes?.y_unit?.trim() || undefined
  const max = data[0]!.y
  // Rounded to the hundredth: a fractional power's last bits differ between
  // V8 releases, and printed in full they made the page's markup, and its
  // gallery hash, depend on which Node drew it.
  const widthOf = (y: number) => Math.round(SHAPE.w * Math.pow(y / max, SHAPE.power) * 100) / 100
  const pitch = Math.min(SHAPE.pitch, (rect.h - SHAPE.top + SHAPE.gap) / data.length)
  const levelH = pitch - SHAPE.gap
  // Four levels share the board's three levels' height; a level shorter than
  // a value over a name has no room for them.
  if (levelH < SHAPE.minH) return null
  const n = data.length
  const levels = data.map((d, i) => {
    const top = i === 0 ? max : data[i - 1]!.y
    const w0 = widthOf(top)
    const w1 = widthOf(d.y)
    const fill = i === n - 1 ? inks.fire : i === 0 ? inks.quiet : inks.deep
    const value = joinUnit(groupDigits(writtenFigure(d.y), figureStyleOf(chinese)), unit)
    const name = String(d.x).trim()
    const room = Math.min(w0, w1) - SHAPE.pad * 2
    return { d, i, w0, w1, fill, value, name, fits: pitchWidth(value, SHAPE.value.size, ctx, true) <= room && pitchWidth(name, SHAPE.name.size, ctx, true) <= room }
  })
  if (levels.some((l) => !l.fits)) return null

  const sx = rect.x + SIDE.x
  const inner = SIDE.w - SIDE.pad * 2
  const labelFits = (text: string) => pitchTrackedWidth(text, SIDE.label.size, SIDE.label.tracking, ctx, true) <= inner
  const fig = figure ? kpiFigure(figure.items[0]!.value, figure.items[0]!.unit) : null
  const figText = fig ? joinUnit(fig.text, fig.unit) : ""
  if (figure && (!labelFits(figure.items[0]!.label) || pitchWidth(figText, FIGURE.value.size, ctx, true) > inner)) return null
  const note = figure?.items[0]!.note?.trim() ? fitPitch(figure.items[0]!.note, { width: inner, size: FIGURE.note.size, lineHeight: FIGURE.note.lineHeight, maxLines: FIGURE.note.maxLines }, ctx) : null
  if (figure?.items[0]!.note?.trim() && !note) return null
  const meansTop = figure ? FIGURE.h + MEANS.gap : 0
  const meansText = means ? fitPitch(means.text, { width: inner, size: MEANS.text.size, lineHeight: MEANS.text.lineHeight, maxLines: MEANS.text.maxLines }, ctx) : null
  if (means && (!meansText || !labelFits(means.title!))) return null
  if (means && meansTop + MEANS.h > rect.h) return null

  const cx = rect.x + SHAPE.cx
  const level = (l: (typeof levels)[number]) => {
    const y = rect.y + SHAPE.top + l.i * pitch
    const on = l.fill === inks.fire
    const valueInk = pitchText(l.fill === inks.deep ? inks.ink : inks.onFire, l.fill, SHAPE.value.size)
    const nameInk = pitchText(l.fill === inks.deep ? inks.muted : inks.onFire, l.fill, SHAPE.name.size)
    const shape = (
      <g key={l.i} data-pitch-level={l.i}>
        <polygon points={`${cx - l.w0 / 2},${y} ${cx + l.w0 / 2},${y} ${cx + l.w1 / 2},${y + levelH} ${cx - l.w1 / 2},${y + levelH}`} fill={l.fill} />
        {paintPitchLine(l.value, { ctx, x: cx, baseline: y + SHAPE.value.dy * (levelH / (SHAPE.pitch - SHAPE.gap)), size: SHAPE.value.size, bold: true, anchor: "middle", fill: valueInk })}
        {paintPitchLine(l.name, { ctx, x: cx, baseline: y + SHAPE.name.dy * (levelH / (SHAPE.pitch - SHAPE.gap)), size: SHAPE.name.size, bold: true, anchor: "middle", fill: nameInk })}
      </g>
    )
    return on ? <Fire key={l.i} id="level">{shape}</Fire> : shape
  }
  const label = (text: string, top: number) =>
    paintPitchTracked({ ctx, text, x: sx + SIDE.pad, y: pitchBaseline(top + SIDE.label.top, SIDE.label.lineHeight, SIDE.label.size), size: SIDE.label.size, tracking: SIDE.label.tracking, bold: true, fill: pitchText(inks.muted, inks.card, SIDE.label.size) })
  return (
    <g {...compositionTag("funnel")}>
      <g {...blockTag(ctx, c)}>{levels.map(level)}</g>
      {figure && fig ? (
        <g {...blockTag(ctx, figure)} data-pitch-figure="">
          {paintPitchCard({ x: sx, y: rect.y, w: SIDE.w, h: FIGURE.h }, inks)}
          {label(figure.items[0]!.label.trim(), rect.y)}
          {paintPitchLine(figText, { ctx, x: sx + SIDE.pad, top: rect.y + FIGURE.value.top, lineHeight: FIGURE.value.lineHeight, size: FIGURE.value.size, bold: true, fill: pitchText(inks.ink, inks.card, FIGURE.value.size) })}
          {note ? paintPitch(note, { ctx, x: sx + SIDE.pad, top: rect.y + FIGURE.note.top, fill: pitchText(inks.muted, inks.card, FIGURE.note.size), ground: inks.card }) : null}
        </g>
      ) : null}
      {means && meansText ? (
        <g {...blockTag(ctx, means)} data-pitch-means="">
          {paintPitchCard({ x: sx, y: rect.y + meansTop, w: SIDE.w, h: MEANS.h }, inks)}
          {label(means.title!.trim(), rect.y + meansTop)}
          {paintPitch(meansText, { ctx, x: sx + SIDE.pad, top: rect.y + meansTop + MEANS.text.top, fill: pitchText(inks.ink, inks.card, MEANS.text.size), ground: inks.card })}
        </g>
      ) : null}
    </g>
  )
}
