import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitScroll,
  paintScroll,
  paintScrollLine,
  placeScrollClaim,
  placeScrollSource,
  scrollBaseline,
  scrollInks,
  scrollMark,
  scrollText,
  scrollValue,
  scrollWidth,
} from "./scroll"

type Chart = Extract<Component, { type: "chart" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * nations: a count by country beside how it was counted, ink's 2026-10 board
 * (p08). The claim over the page; under it a row a country, its name in the
 * heading face set flush right, its bar in the taupe and its figure after the
 * bar, the country the author marks (`emphasis` on its point) in cinnabar,
 * name, bar and figure. At the right a card on the paper a step whiter: what
 * the counting means, its title in the heading face and its words under it.
 *
 * Takes, in the scroll setting: an untitled bar chart on its side of one
 * series of three to ten points at zero or above, then a `callout` with a
 * title.
 *
 * Declines: a chart with a tag, ranges, gaps, changes, bands, a reference,
 * notes, symbols or statuses, a callout with a symbol or a tag, a name, a
 * figure or the card's words past their room.
 *
 * Reads: the scroll inks (`./scroll.tsx`).
 */

const ROWS = { top: 140, pitch: 44, max: 10, name: { right: 110, size: 18, lineHeight: 30 }, bar: { x: 126, dy: 8, h: 16, max: 495 }, value: { gap: 8, size: 14, dy: 22 } } as const
const CARD = { x: 710, top: 140, w: 350, h: 300, pad: { x: 24, y: 18 }, title: { size: 20, lineHeight: 30 }, text: { dy: 38, size: 14, lineHeight: 25, maxLines: 9 }, gap: 24 } as const

export const nationsComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "scroll") return null
  const [chart, callout, ...rest] = components
  if (chart?.type !== "chart" || callout?.type !== "callout" || rest.length > 0) return null
  const c = chart as Chart
  const k = callout as Callout
  if (!k.title?.trim() || k.icon || k.tag) return null
  if (c.chart_type !== "bar" || c.direction !== "horizontal" || c.title?.trim() || c.series.length !== 1) return null
  if (c.tag || c.bands || c.gaps || c.changes || c.reference || c.axes?.x_title || c.axes?.y_title || c.series[0]!.tone) return null
  const points = c.series[0]!.data
  if (points.length < 3 || points.length > ROWS.max) return null
  if (points.some((d) => d.note || d.status || d.icon || d.upper !== undefined || d.y < 0)) return null
  const unit = c.axes?.x_unit?.trim() || c.axes?.y_unit?.trim() || ""
  const values = points.map((d) => (!unit ? scrollValue(d.y, ctx) : unit === "%" ? `${scrollValue(d.y, ctx)}%` : `${scrollValue(d.y, ctx)} ${unit}`))
  const valueW = Math.max(...values.map((v) => scrollWidth(v, ROWS.value.size, ctx, { bold: true })))
  const room = CARD.x - CARD.gap - ROWS.bar.x - ROWS.value.gap - valueW
  const max = Math.max(...points.map((d) => d.y), 1e-9)
  const scale = Math.min(ROWS.bar.max, room) / max
  if (scale <= 0) return null
  if (points.some((d) => scrollWidth(String(d.x), ROWS.name.size, ctx, { serif: true }) > ROWS.name.right)) return null
  if (ROWS.top + points.length * ROWS.pitch > rect.h + 4) return null
  const inner = CARD.w - CARD.pad.x * 2
  const title = fitScroll(k.title, { width: inner, size: CARD.title.size, lineHeight: CARD.title.lineHeight, maxLines: 1, serif: true }, ctx)
  const words = fitScroll(k.text, { width: inner + 2, size: CARD.text.size, lineHeight: CARD.text.lineHeight, maxLines: CARD.text.maxLines }, ctx)
  if (!title || !words) return null
  if (CARD.pad.y + CARD.text.dy + words.lines.length * CARD.text.lineHeight > CARD.h) return null
  const head = placeScrollClaim(claim, { x: rect.x, w: rect.w })
  if (head === false) return null
  const foot = placeScrollSource(source, { x: rect.x, w: rect.w })
  if (foot === false) return null
  const inks = scrollInks(ctx)
  const ground = inks.ground
  const cardX = rect.x + CARD.x
  const cardY = rect.y + CARD.top
  return (
    <g {...compositionTag("nations")}>
      {head}
      <g {...blockTag(ctx, c)}>
        {points.map((d, i) => {
          const top = rect.y + ROWS.top + i * ROWS.pitch
          const lit = d.emphasis === true
          const w = d.y * scale
          const bx = rect.x + ROWS.bar.x
          return (
            <g key={i} data-scroll-nation={String(d.x)} {...(lit ? { "data-scroll-lead": "bar" } : {})}>
              {paintScrollLine(String(d.x), { ctx, x: rect.x + ROWS.name.right, baseline: scrollBaseline(top, ROWS.name.lineHeight, ROWS.name.size, true), size: ROWS.name.size, anchor: "end", serif: true, fill: scrollText(lit ? inks.cinnabar : inks.ink, ground, ROWS.name.size) })}
              <rect x={bx} y={top + ROWS.bar.dy} width={Math.max(w, 1)} height={ROWS.bar.h} fill={scrollMark(lit ? inks.cinnabar : inks.taupe, ground)} />
              {paintScrollLine(values[i]!, { ctx, x: bx + w + ROWS.value.gap, baseline: top + ROWS.value.dy, size: ROWS.value.size, bold: true, fill: scrollText(lit ? inks.cinnabar : inks.ink, ground, ROWS.value.size) })}
            </g>
          )
        })}
      </g>
      <g {...blockTag(ctx, k)} data-scroll-card="">
        <rect x={cardX + 0.5} y={cardY + 0.5} width={CARD.w - 1} height={CARD.h - 1} fill={inks.card} stroke={inks.line} strokeWidth={1} />
        {paintScroll(title, { ctx, x: cardX + CARD.pad.x, top: cardY + CARD.pad.y, serif: true, fill: scrollText(inks.ink, inks.card, CARD.title.size), ground: inks.card })}
        {paintScroll(words, { ctx, x: cardX + CARD.pad.x, top: cardY + CARD.pad.y + CARD.text.dy, fill: scrollText(inks.ink2, inks.card, CARD.text.size), ground: inks.card })}
      </g>
      {foot}
    </g>
  )
}
