import type { Component } from "@/ir"
import { figureStyleOf, groupDigits, wholeValueDecimals, writtenFigure } from "../../lib/quantity-format"
import { mostlyChinese } from "../../lib/text-script"
import { blockTag, compositionTag, type Composition } from "./shared"
import { Lead, fitMarquee, marqueeInks, marqueeText, marqueeTrackedWidth, marqueeWidth, paintMarquee, paintMarqueeCard, paintMarqueeLine, paintMarqueeTracked, marqueeBaseline } from "./marquee"

type KpiCards = Extract<Component, { type: "kpi_cards" }>
type Chart = Extract<Component, { type: "chart" }>

/*
 * crest: one figure at its crest, rally's 2026-10 board (the market page,
 * p03). At the left the figure set huge in the accent, tracked tight; under
 * it its unit and its label on one bold line (「万人次 · 2025 年 · 同比
 * +18.81%」), its note in the grey; at the foot of the column a card with a
 * bold line and what it rests on. At the right the run that led to it: an
 * upright bar a year, the marked one in the accent and the rest in the dim
 * violet, each value over its bar and each year under it on a hairline, the
 * series named over them with its unit (「大型演出票房（亿元）」).
 *
 * Takes, in the marquee setting: a `kpi_cards` of one item with no delta,
 * tone, icon, source or tag; then a `bar` chart of one upright series of two
 * to six bars, at most one marked, with no tag, bands, changes or
 * reference; then optionally a `callout` with a title, no icon and no tag.
 *
 * Declines: the figure wider than its column at 130px, the unit line past
 * one line, the note past two lines, a value wider than its bar, a year
 * wider than its slot, and the card's text past two lines.
 *
 * Reads: the marquee inks (`./marquee.tsx`), the body and heading faces.
 */

const FIGURE = { top: 12, size: 130, lineHeight: 150, tracking: -3, w: 640 } as const
const UNIT = { top: 162, size: 26, lineHeight: 40, w: 640 } as const
const NOTE = { top: 212, size: 16, lineHeight: 26, maxLines: 2, w: 600 } as const
const CARD = { top: 312, h: 110, w: 600, pad: 24, title: { top: 16, size: 17, lineHeight: 28 }, text: { top: 48, size: 14, lineHeight: 22, maxLines: 2 } } as const
const BARS = { x: 696, caption: { baseline: 26, size: 13 }, plotTop: 48, base: 372, pitch: 112, w: 80, r: 6, value: { gap: 10, size: 16 }, year: { drop: 24, size: 14 }, axis: { x: 680, w: 1.5 } } as const

export const crestComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "marquee") return null
  const [figure, chart, card, ...rest] = components
  if (figure?.type !== "kpi_cards" || chart?.type !== "chart" || rest.length > 0) return null
  if (card !== undefined && (card.type !== "callout" || !card.title?.trim() || card.icon || card.tag)) return null
  const k = figure as KpiCards
  if (k.items.length !== 1) return null
  const item = k.items[0]!
  if (item.delta || item.tone || item.icon || item.source || item.tag) return null
  const c = chart as Chart
  if (c.chart_type !== "bar" || c.direction === "horizontal" || c.series.length !== 1 || c.tag || c.bands || c.changes || c.reference || c.emphasis_label) return null
  const data = c.series[0]!.data
  if (data.length < 2 || data.length > 6 || data.filter((d) => d.emphasis).length > 1 || data.some((d) => d.status || d.note || d.upper !== undefined || !(d.y > 0))) return null
  if (rect.w < BARS.axis.x + 1 || rect.h < BARS.base + BARS.year.drop + 4) return null
  const inks = marqueeInks(ctx)
  const value = item.value.replace(/\*\*/g, "").trim()
  if (marqueeTrackedWidth(value, FIGURE.size, FIGURE.tracking, ctx, true) > FIGURE.w) return null
  const unitLine = [item.unit?.trim(), item.label.trim()].filter((part): part is string => Boolean(part)).join(" · ")
  const unit = fitMarquee(unitLine, { width: UNIT.w, size: UNIT.size, lineHeight: UNIT.lineHeight, maxLines: 1, bold: true }, ctx)
  const note = item.note?.trim() ? fitMarquee(item.note, { width: NOTE.w, size: NOTE.size, lineHeight: NOTE.lineHeight, maxLines: NOTE.maxLines }, ctx) : null
  if (!unit || (item.note?.trim() && !note)) return null
  const cardTitle = card?.type === "callout" ? fitMarquee(card.title, { width: CARD.w - CARD.pad * 2, size: CARD.title.size, lineHeight: CARD.title.lineHeight, maxLines: 1, bold: true }, ctx) : null
  const cardText = card?.type === "callout" ? fitMarquee(card.text, { width: CARD.w - CARD.pad * 2, size: CARD.text.size, lineHeight: CARD.text.lineHeight, maxLines: CARD.text.maxLines }, ctx) : null
  if (card && (!cardTitle || !cardText)) return null

  // The bars: the tallest reaches the plot's top, every other to scale.
  const chinese = ctx.figures?.chinese ?? mostlyChinese(data.map((d) => String(d.x)))
  const style = figureStyleOf(chinese)
  const max = Math.max(...data.map((d) => d.y))
  const whole = wholeValueDecimals(data.map((d) => d.y))
  const plotH = BARS.base - BARS.plotTop
  const pitch = Math.min(BARS.pitch, (rect.w - BARS.x - BARS.w) / Math.max(1, data.length - 1))
  const bars = data.map((d, i) => {
    const h = (d.y / max) * plotH
    return { x: rect.x + BARS.x + i * pitch, h, value: groupDigits(writtenFigure(d.y, whole), style), year: String(d.x).trim(), marked: d.emphasis === true, d }
  })
  if (bars.some((b) => marqueeWidth(b.value, BARS.value.size, ctx, true) > pitch - 8 || marqueeWidth(b.year, BARS.year.size, ctx, true) > pitch - 8)) return null
  const unitName = c.axes?.y_unit?.trim()
  const seriesName = c.series[0]!.name.trim()
  const caption = unitName ? (chinese ? `${seriesName}（${unitName}）` : `${seriesName} (${unitName})`) : seriesName
  if (caption && marqueeWidth(caption, BARS.caption.size, ctx, true) > rect.w - BARS.x) return null

  const y = rect.y
  const base = y + BARS.base
  return (
    <g {...compositionTag("crest")}>
      <g {...blockTag(ctx, k)} data-marquee-crest="">
        <Lead id="figure">
          {paintMarqueeTracked({ ctx, text: value, x: rect.x, y: marqueeBaseline(y + FIGURE.top, FIGURE.lineHeight, FIGURE.size), size: FIGURE.size, tracking: FIGURE.tracking, bold: true, fill: marqueeText(inks.fire, inks.ground, FIGURE.size) })}
        </Lead>
        {paintMarquee(unit, { ctx, x: rect.x, top: y + UNIT.top, bold: true, fill: marqueeText(inks.ink, inks.ground, UNIT.size), ground: inks.ground })}
        {note ? paintMarquee(note, { ctx, x: rect.x, top: y + NOTE.top, fill: marqueeText(inks.muted, inks.ground, NOTE.size), ground: inks.ground }) : null}
      </g>
      <g {...blockTag(ctx, c)} data-marquee-run="">
        {caption ? paintMarqueeLine(caption, { ctx, x: rect.x + BARS.x, baseline: y + BARS.caption.baseline, size: BARS.caption.size, bold: true, fill: marqueeText(inks.muted, inks.ground, BARS.caption.size) }) : null}
        {bars.map((b, i) => {
          const bar = <rect x={b.x} y={base - b.h} width={BARS.w} height={b.h} rx={BARS.r} fill={b.marked ? inks.fire : inks.dim} />
          return (
            <g key={i} data-marquee-bar={b.year}>
              {b.marked ? <Lead id="bar">{bar}</Lead> : bar}
              {paintMarqueeLine(b.value, { ctx, x: b.x + BARS.w / 2, baseline: base - b.h - BARS.value.gap, size: BARS.value.size, bold: true, anchor: "middle", fill: marqueeText(b.marked ? inks.ink : inks.muted, inks.ground, BARS.value.size) })}
              {paintMarqueeLine(b.year, { ctx, x: b.x + BARS.w / 2, baseline: base + BARS.year.drop, size: BARS.year.size, bold: true, anchor: "middle", fill: marqueeText(inks.muted, inks.ground, BARS.year.size) })}
            </g>
          )
        })}
        <rect x={rect.x + BARS.axis.x} y={base - BARS.axis.w / 2} width={rect.w - BARS.axis.x} height={BARS.axis.w} fill={inks.line} />
      </g>
      {card && cardTitle && cardText ? (
        <g {...blockTag(ctx, card)} data-marquee-card="">
          {paintMarqueeCard({ x: rect.x, y: y + CARD.top, w: CARD.w, h: CARD.h }, inks)}
          {paintMarquee(cardTitle, { ctx, x: rect.x + CARD.pad, top: y + CARD.top + CARD.title.top, bold: true, fill: marqueeText(inks.ink, inks.card, CARD.title.size), ground: inks.card })}
          {paintMarquee(cardText, { ctx, x: rect.x + CARD.pad, top: y + CARD.top + CARD.text.top, fill: marqueeText(inks.muted, inks.card, CARD.text.size), ground: inks.card })}
        </g>
      ) : null}
    </g>
  )
}
