import type { Component } from "@/ir"
import { joinUnit } from "../../lib/quantity-format"
import { barInks } from "./benchmark"
import { paintPhoto } from "./inset"
import { noteLook } from "./paired"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitYearbook,
  paintPill,
  paintYearbook,
  paintYearbookCard,
  paintYearbookIcon,
  paintYearbookLine,
  pillText,
  pillWidth,
  PILL,
  yearbookInks,
  yearbookMeta,
  yearbookText,
  yearbookWidth,
} from "./yearbook"

type ImageGrid = Extract<Component, { type: "image_grid" }>
type Chart = Extract<Component, { type: "chart" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * survey: the ways a thing can be done, each under its photograph, measured
 * on one scale, almanac's 2026-10 board (the routes page, p14). The
 * photographs in a row across the band, each its caption in italics under
 * it. Under them, on the left, the scale's name in bold and a bar for each
 * way, its name, the bar and its value in mono with its note after a middle
 * dot; a short list steps from the ghost through the quiet ink to the mark,
 * the way the page argues for last (`barInks`). On the right a card for the
 * way that is only claimed: edged and dashed in its tag's ink, its icon and
 * title over its text and its tag at the foot.
 *
 * Takes, in the yearbook setting: an `image_grid` of two to four photographs
 * with no icon, a `bar` chart on its side of one series of two to five bars,
 * none below zero, and a `callout`.
 *
 * Declines: a caption past its photograph, a name or a value past its room, a
 * text past its lines, and anything taller than the band.
 *
 * Reads: the yearbook inks (`./yearbook.tsx`), the body, heading and mono
 * faces.
 */

const PHOTOS = { top: 10, h: 190, gap: 24, caption: { gap: 6, size: 12, lineHeight: 18 } } as const
const BARS = { top: 234, title: { size: 14, lineHeight: 22 }, rows: 266, pitch: 42, bar: 26, barTop: 4, label: { size: 14, base: 20 }, barX: 146, value: { size: 14, base: 22, gap: 8 }, room: 80 } as const
const CARD = { w: 416, top: 234, h: 160, pad: 20, icon: 22, title: { top: 18, size: 16, lineHeight: 24 }, text: { top: 52, size: 14, lineHeight: 22, maxLines: 3 }, stroke: 1.5 } as const

export const surveyComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "yearbook") return null
  const [grid, chart, note, ...rest] = components
  if (grid?.type !== "image_grid" || chart?.type !== "chart" || note?.type !== "callout" || rest.length > 0) return null
  const g = grid as ImageGrid
  const c = chart as Chart
  const n_ = note as Callout
  if (g.items.length < 2 || g.items.length > 4 || g.items.some((item) => item.icon) || g.emphasis === "first") return null
  if (c.chart_type !== "bar" || c.direction !== "horizontal" || c.series.length !== 1 || c.tag || c.reference || c.changes || c.series[0]!.tone) return null
  const data = c.series[0]!.data
  if (data.length < 2 || data.length > 5 || data.some((d) => !(d.y >= 0) || d.status)) return null
  const inks = yearbookInks(ctx)
  const n = g.items.length
  const photoW = (rect.w - PHOTOS.gap * (n - 1)) / n
  const captions = g.items.map((item) => (item.caption?.trim() ? fitYearbook(item.caption, { width: photoW, size: PHOTOS.caption.size, lineHeight: PHOTOS.caption.lineHeight, maxLines: 1 }, ctx) : null))
  if (captions.some((cap, i) => g.items[i]!.caption?.trim() && !cap)) return null
  // The card on the right, the bars left of it.
  const cardX = rect.x + rect.w - CARD.w
  const barsR = cardX - BARS.room
  const unit = c.axes?.y_unit?.trim() || undefined
  const title = c.axes?.y_title?.trim() ?? ""
  const titleFit = title ? fitYearbook(title, { width: barsR - rect.x, size: BARS.title.size, lineHeight: BARS.title.lineHeight, maxLines: 1, bold: true }, ctx) : null
  if (title && !titleFit) return null
  const values = data.map((d) => `${joinUnit(String(Number(d.y.toPrecision(12))), unit)}${d.note?.trim() ? ` · ${d.note.trim()}` : ""}`)
  const names = data.map((d) => String(d.x).trim())
  const nameW = Math.max(...names.map((name) => yearbookWidth(name, BARS.label.size, ctx)))
  const barX = rect.x + Math.max(BARS.barX, nameW + 16)
  const max = Math.max(...data.map((d) => d.y))
  if (!(max > 0)) return null
  const valueWs = values.map((v) => yearbookWidth(v, BARS.value.size, ctx, true, true))
  const scale = Math.min(...data.map((d, i) => (barsR - barX - BARS.value.gap - valueWs[i]!) / Math.max(d.y, 1e-9)))
  if (!(scale > 0) || !Number.isFinite(scale)) return null
  const colors = barInks(data.map((d) => d.emphasis === true), inks)
  if (BARS.rows + data.length * BARS.pitch > rect.h) return null
  const look = noteLook(n_, inks)
  const boxInk = look.ink === inks.line ? inks.mark : look.ink
  const inner = CARD.w - CARD.pad * 2
  const noteTitle = n_.title?.trim() ? fitYearbook(n_.title, { width: inner - (n_.icon ? CARD.icon + 10 : 0), size: CARD.title.size, lineHeight: CARD.title.lineHeight, maxLines: 1, bold: true }, ctx) : null
  const textTop = noteTitle ? CARD.text.top : CARD.title.top
  const noteText = fitYearbook(n_.text, { width: inner, size: CARD.text.size, lineHeight: CARD.text.lineHeight, maxLines: CARD.text.maxLines }, ctx)
  if (!noteText || (n_.title?.trim() && !noteTitle) || (n_.tag && pillWidth(pillText(n_.tag), ctx) > inner)) return null
  const tagTop = CARD.h - CARD.pad - PILL.height + 2
  if (textTop + noteText.lines.length * CARD.text.lineHeight > (n_.tag ? tagTop - 6 : CARD.h - CARD.pad)) return null
  if (CARD.top + CARD.h > rect.h) return null
  const cardTop = rect.y + CARD.top

  return (
    <g {...compositionTag("survey")}>
      <g {...blockTag(ctx, g)} data-yearbook-photos="">
        {g.items.map((item, i) => {
          const x = rect.x + i * (photoW + PHOTOS.gap)
          return (
            <g key={i}>
              {paintPhoto({ type: "image", asset_id: item.asset_id, fit: "cover" }, { x, y: rect.y + PHOTOS.top, w: photoW, h: PHOTOS.h }, ctx)}
              {captions[i] ? paintYearbook(captions[i]!, { ctx, x, top: rect.y + PHOTOS.top + PHOTOS.h + PHOTOS.caption.gap, fill: yearbookMeta(inks.muted, inks.ground), attrs: { fontStyle: "italic" } }) : null}
            </g>
          )
        })}
      </g>
      <g {...blockTag(ctx, c)}>
        {titleFit ? paintYearbook(titleFit, { ctx, x: rect.x, top: rect.y + BARS.top, bold: true, fill: yearbookText(inks.ink, inks.ground, BARS.title.size) }) : null}
        {data.map((d, i) => {
          const y = rect.y + BARS.rows + i * BARS.pitch
          const w = Math.max(1, d.y * scale)
          const ink = colors[i]!
          return (
            <g key={i} data-yearbook-bar={d.emphasis ? "marked" : ""}>
              {paintYearbookLine(names[i]!, { ctx, x: rect.x, baseline: y + BARS.label.base, size: BARS.label.size, fill: yearbookText(inks.ink, inks.ground, BARS.label.size) })}
              <rect x={barX} y={y + BARS.barTop} width={w} height={BARS.bar} rx={2} fill={ink} />
              {paintYearbookLine(values[i]!, { ctx, x: barX + w + BARS.value.gap, baseline: y + BARS.value.base, size: BARS.value.size, mono: true, bold: true, fill: ink === inks.ghost ? yearbookMeta(inks.muted, inks.ground) : yearbookText(ink, inks.ground, BARS.value.size) })}
            </g>
          )
        })}
      </g>
      <g {...blockTag(ctx, n_)} data-yearbook-claim="">
        {paintYearbookCard({ x: cardX, y: cardTop, w: CARD.w, h: CARD.h }, inks, { stroke: look.ink, dashed: look.dashed, strokeWidth: look.ink === inks.line ? 1 : CARD.stroke })}
        {n_.icon ? paintYearbookIcon(n_.icon, cardX + CARD.pad, cardTop + CARD.title.top + 2, CARD.icon, boxInk, inks.paper) : null}
        {noteTitle ? paintYearbook(noteTitle, { ctx, x: cardX + CARD.pad + (n_.icon ? CARD.icon + 10 : 0), top: cardTop + CARD.title.top, bold: true, fill: yearbookText(inks.ink, inks.paper, CARD.title.size), ground: inks.paper }) : null}
        {paintYearbook(noteText, { ctx, x: cardX + CARD.pad, top: cardTop + textTop, fill: yearbookText(inks.muted, inks.paper, CARD.text.size), ground: inks.paper })}
        {n_.tag ? paintPill({ ctx, tag: n_.tag, x: cardX + CARD.pad, y: cardTop + tagTop, ground: inks.paper, inks, ink: look.ink === inks.line ? undefined : look.ink }) : null}
      </g>
    </g>
  )
}
