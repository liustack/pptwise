import type { Component } from "@/ir"
import { figureStyleOf, groupDigits, joinUnit, wholeValueDecimals, writtenFigure } from "../../lib/quantity-format"
import { mostlyChinese } from "../../lib/text-script"
import { blockTag, compositionTag, type Composition } from "./shared"
import { Lead, fitMarquee, glossBreak, marqueeInks, marqueeText, marqueeWidth, paintMarquee, paintMarqueeCard, paintMarqueeIcon, paintMarqueeLine, splitSentence } from "./marquee"

type Steps = Extract<Component, { type: "steps" }>
type KpiCards = Extract<Component, { type: "kpi_cards" }>
type Chart = Extract<Component, { type: "chart" }>

/*
 * route: a weekend walked stop by stop, rally's 2026-10 board (the weekend
 * page, p08). Along a dotted line, a disc a stop with its icon, its name
 * under it and a grey line under that. The discs are the accent; a stop the
 * plan stays out of (`tone: "warning"`) is the dim violet with a light icon
 * and a grey name, and the sentence after its first (「我们不进场卖货」) stands
 * over its disc. Under the route two cards: at the left a figure in the accent
 * with its label over it and its note under; at the right bars on their side
 * with the chart's caption over them, the marked bar in the accent and the
 * rest in the dim violet, each named at its left and its value after it.
 *
 * Takes, in the marquee setting: a `steps` of two to five with icons, at
 * most one with a tone and that one `warning`; then a `kpi_cards` of one item
 * with no delta, tone, icon, tag or source; then a `bar` chart on its side of
 * one series of two to six bars, at most one marked, with no notes or
 * ranges.
 *
 * Declines: a name or a line wider than its stop, a stop's second sentence
 * on a stop that is not set aside, the figure wider than its card, a note
 * past three lines, a bar's name past its column and the caption past one
 * line.
 *
 * Reads: the marquee inks (`./marquee.tsx`), the body and heading faces.
 */

const ROUTE = { y: 82, x0: 36, x1: 1116, first: 56, span: 1040, w: 4, dash: "2 12", disc: 30, icon: 26, name: { baseline: 142, size: 18 }, line: { baseline: 166, size: 13 }, aside: { baseline: 38, size: 12 } } as const
const CARDS = { top: 204, h: 220, gap: 20, left: 300 } as const
const FIGURE = { pad: 24, label: { top: 18, size: 13, lineHeight: 22 }, value: { top: 44, size: 64, lineHeight: 76 }, note: { top: 124, size: 14, lineHeight: 22, maxLines: 3 } } as const
const BARS = { pad: 24, caption: { top: 18, size: 13, lineHeight: 22 }, top: 56, pitch: 30, h: 18, r: 4, name: { right: 146, size: 14, baseline: 16 }, bar: { x: 162 }, value: { gap: 10, size: 14, baseline: 17 }, full: 560 } as const

export const routeComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "marquee") return null
  const [steps, figure, chart, ...rest] = components
  if (steps?.type !== "steps" || figure?.type !== "kpi_cards" || chart?.type !== "chart" || rest.length > 0) return null
  const s = steps as Steps
  if (s.items.length < 2 || s.items.length > 5 || s.items.some((it) => !it.icon || (it.tone && it.tone !== "warning")) || s.items.filter((it) => it.tone).length > 1) return null
  const k = figure as KpiCards
  if (k.items.length !== 1) return null
  const item = k.items[0]!
  if (item.delta || item.tone || item.icon || item.tag || item.source || item.unit) return null
  const c = chart as Chart
  if (c.chart_type !== "bar" || c.direction !== "horizontal" || c.series.length !== 1 || c.tag || c.reference || c.changes) return null
  const data = c.series[0]!.data
  if (data.length < 2 || data.length > 6 || data.filter((d) => d.emphasis).length > 1 || data.some((d) => d.note || d.upper !== undefined || d.status || !(d.y >= 0))) return null
  if (rect.w < CARDS.left + 400 || rect.h < CARDS.top + CARDS.h) return null
  const inks = marqueeInks(ctx)
  const x = (dx: number) => rect.x + dx
  const y = (dy: number) => rect.y + dy
  const pitch = ROUTE.span / (s.items.length - 1)
  const stops = s.items.map((it, i) => {
    const aside = it.tone === "warning"
    const split = aside ? splitSentence(it.text) : null
    const under = split ? split.lead : it.text.trim()
    const over = split ? split.rest : null
    return { it, i, aside, split, under, over, cx: x(ROUTE.first) + i * pitch }
  })
  const room = Math.min(pitch - 16, 240)
  if (stops.some((st) => marqueeWidth(st.it.title, ROUTE.name.size, ctx, true) > room || marqueeWidth(st.under, ROUTE.line.size, ctx) > room || (st.over && marqueeWidth(st.over, ROUTE.aside.size, ctx, true) > room))) return null
  if (stops.some((st) => !st.aside && splitSentence(st.it.text))) return null

  const value = item.value.replace(/\*\*/g, "").trim()
  const lit = item.value.includes("**")
  // The board's text boxes are 260px, past the card's right padding.
  const figW = CARDS.left - 40
  const figLabel = fitMarquee(item.label, { width: figW, size: FIGURE.label.size, lineHeight: FIGURE.label.lineHeight, maxLines: 1, bold: true }, ctx)
  const note = item.note?.trim() ? fitMarquee(item.note, { width: figW, size: FIGURE.note.size, lineHeight: FIGURE.note.lineHeight, maxLines: FIGURE.note.maxLines }, ctx) : null
  if (!figLabel || (item.note?.trim() && !note) || marqueeWidth(value, FIGURE.value.size, ctx, true) > figW) return null

  const chinese = ctx.figures?.chinese ?? mostlyChinese(data.map((d) => String(d.x)))
  const unit = c.axes?.y_unit?.trim() || undefined
  const percent = unit === "%"
  const max = percent ? 100 : Math.max(...data.map((d) => d.y))
  const barsX = CARDS.left + CARDS.gap
  const barsW = rect.w - barsX
  const caption = c.series[0]!.name.trim()
  const captionFit = caption ? fitMarquee(caption, { width: barsW - BARS.pad * 2, size: BARS.caption.size, lineHeight: BARS.caption.lineHeight, maxLines: 1, bold: true }, ctx) : null
  if (caption && !captionFit) return null
  const whole = wholeValueDecimals(data.map((d) => d.y))
  const scale = Math.min(BARS.full, barsW - BARS.bar.x - 90) / (max > 0 ? max : 1)
  const bars = data.map((d, i) => ({
    name: String(d.x).trim(),
    value: joinUnit(groupDigits(writtenFigure(d.y, whole), figureStyleOf(chinese)), unit),
    w: d.y * scale,
    marked: d.emphasis === true,
    top: CARDS.top + BARS.top + i * BARS.pitch,
  }))
  if (bars.some((b) => marqueeWidth(b.name, BARS.name.size, ctx, b.marked) > BARS.name.right - BARS.pad - 4)) return null
  if (CARDS.top + BARS.top + data.length * BARS.pitch > CARDS.top + CARDS.h) return null

  return (
    <g {...compositionTag("route")}>
      <g {...blockTag(ctx, s)} data-marquee-route="">
        <line x1={x(ROUTE.x0)} y1={y(ROUTE.y)} x2={x(ROUTE.x1)} y2={y(ROUTE.y)} stroke={inks.line} strokeWidth={ROUTE.w} strokeDasharray={ROUTE.dash} strokeLinecap="round" />
        {stops.map((st) => {
          const disc = <circle cx={st.cx} cy={y(ROUTE.y)} r={ROUTE.disc} fill={st.aside ? inks.dim : inks.fire} />
          return (
            <g key={st.i} data-stop={st.it.title} data-stop-aside={st.aside ? "1" : undefined}>
              {st.aside ? disc : <Lead id="stop">{disc}</Lead>}
              {paintMarqueeIcon(st.it.icon!, st.cx - ROUTE.icon / 2, y(ROUTE.y) - ROUTE.icon / 2, ROUTE.icon, st.aside ? inks.ink : inks.onFire, st.aside ? inks.dim : inks.fire)}
              {paintMarqueeLine(st.it.title.trim(), { ctx, x: st.cx, baseline: y(ROUTE.name.baseline), size: ROUTE.name.size, bold: true, anchor: "middle", fill: marqueeText(st.aside ? inks.muted : inks.ink, inks.ground, ROUTE.name.size) })}
              {paintMarqueeLine(st.under, { ctx, x: st.cx, baseline: y(ROUTE.line.baseline), size: ROUTE.line.size, anchor: "middle", fill: marqueeText(inks.muted, inks.ground, ROUTE.line.size), attrs: st.split ? glossBreak(st.split.sep) : undefined })}
              {st.over ? paintMarqueeLine(st.over, { ctx, x: st.cx, baseline: y(ROUTE.aside.baseline), size: ROUTE.aside.size, bold: true, anchor: "middle", fill: marqueeText(inks.muted, inks.ground, ROUTE.aside.size) }) : null}
            </g>
          )
        })}
      </g>
      <g {...blockTag(ctx, k)} data-marquee-stay="">
        {paintMarqueeCard({ x: x(0), y: y(CARDS.top), w: CARDS.left, h: CARDS.h }, inks)}
        {paintMarquee(figLabel, { ctx, x: x(FIGURE.pad), top: y(CARDS.top + FIGURE.label.top), bold: true, fill: marqueeText(inks.muted, inks.card, FIGURE.label.size), ground: inks.card })}
        {lit ? (
          <Lead id="figure">{paintMarqueeLine(value, { ctx, x: x(FIGURE.pad), top: y(CARDS.top + FIGURE.value.top), lineHeight: FIGURE.value.lineHeight, size: FIGURE.value.size, bold: true, fill: marqueeText(inks.fire, inks.card, FIGURE.value.size) })}</Lead>
        ) : (
          paintMarqueeLine(value, { ctx, x: x(FIGURE.pad), top: y(CARDS.top + FIGURE.value.top), lineHeight: FIGURE.value.lineHeight, size: FIGURE.value.size, bold: true, fill: marqueeText(inks.ink, inks.card, FIGURE.value.size) })
        )}
        {note ? paintMarquee(note, { ctx, x: x(FIGURE.pad), top: y(CARDS.top + FIGURE.note.top), fill: marqueeText(inks.muted, inks.card, FIGURE.note.size), ground: inks.card }) : null}
      </g>
      <g {...blockTag(ctx, c)} data-marquee-incidence="">
        {paintMarqueeCard({ x: x(barsX), y: y(CARDS.top), w: barsW, h: CARDS.h }, inks)}
        {captionFit ? paintMarquee(captionFit, { ctx, x: x(barsX + BARS.pad), top: y(CARDS.top + BARS.caption.top), bold: true, fill: marqueeText(inks.muted, inks.card, BARS.caption.size), ground: inks.card }) : null}
        {bars.map((b, i) => {
          const bar = <rect x={x(barsX + BARS.bar.x)} y={y(b.top + 3)} width={Math.max(1, b.w)} height={BARS.h} rx={BARS.r} fill={b.marked ? inks.fire : inks.dim} />
          return (
            <g key={i} data-bar={b.name}>
              {paintMarqueeLine(b.name, { ctx, x: x(barsX + BARS.name.right), baseline: y(b.top + BARS.name.baseline), size: BARS.name.size, bold: b.marked, anchor: "end", fill: marqueeText(b.marked ? inks.ink : inks.muted, inks.card, BARS.name.size) })}
              {b.marked ? <Lead id="bar">{bar}</Lead> : bar}
              {paintMarqueeLine(b.value, { ctx, x: x(barsX + BARS.bar.x) + b.w + BARS.value.gap, baseline: y(b.top + BARS.value.baseline), size: BARS.value.size, bold: true, fill: marqueeText(b.marked ? inks.fire : inks.ink, inks.card, BARS.value.size) })}
            </g>
          )
        })}
      </g>
    </g>
  )
}
