import type { Component } from "@/ir"
import { isShareBar } from "@/ir/components/chart"
import { mostlyChinese } from "../../lib/text-script"
import { dossierSolid } from "./dossier"
import { paintPhoto } from "./inset"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  CARD_DASH,
  fitFigureCard,
  fitYearbook,
  paintFigureCard,
  paintYearbook,
  paintYearbookLine,
  yearbookInks,
  yearbookMeta,
  yearbookText,
  yearbookWidth,
} from "./yearbook"

type Image = Extract<Component, { type: "image" }>
type Chart = Extract<Component, { type: "chart" }>
type Callout = Extract<Component, { type: "callout" }>
type KpiCards = Extract<Component, { type: "kpi_cards" }>

/*
 * segments: a whole cut in two or three, and what each part means, beside a
 * photograph, almanac's 2026-10 board (the green power page, p13). The
 * photograph on the left with its caption in italics. On the right the
 * whole's name and unit in bold over one bar cut into its parts: the part the
 * page marks in the accent, the others in the ghost, each its name and its
 * amount in mono inside it, an unmarked part's share after its amount. Under
 * each part a line along it and what it means: under the marked part a solid
 * line in the accent and the chart's own line for it (`emphasis_label`),
 * under another a dashed line in the muted ink and its note
 * (`data[].note`). Under the bar a muted note. Across the foot a row of
 * figure cards.
 *
 * Takes, in the yearbook setting: an `image`, a share bar (a `stacked` chart
 * on its side with one category) of two or three parts, one of them marked,
 * then optionally one `callout` with no icon, title or tag, then a
 * `kpi_cards` of two to four items.
 *
 * Declines: a part too narrow for its words, a meaning wider than its part's
 * column, a note past its lines, and anything taller than the band.
 *
 * Reads: the yearbook inks (`./yearbook.tsx`), the body, heading and mono
 * faces.
 */

const PHOTO = { w: 520, h: 260, top: 10, caption: { gap: 6, size: 12, lineHeight: 18 } } as const
const SIDE = { gap: 40, title: { top: 10, size: 14, lineHeight: 22 }, bar: { top: 50, h: 52, gap: 3, inset: 12, name: { base: 24, size: 14 }, value: { base: 44, size: 14 } }, line: { drop: 14, label: 34, size: 13 }, note: { top: 158, size: 13, lineHeight: 20, maxLines: 3 } } as const
const CARDS = { top: 298, h: 132, gap: 12 } as const

export const segmentsComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "yearbook") return null
  const list = [...components]
  const [image, chart] = list
  if (image?.type !== "image" || chart?.type !== "chart") return null
  const note = list[2]?.type === "callout" ? (list[2] as Callout) : undefined
  const kpis = list[note ? 3 : 2]
  if (kpis?.type !== "kpi_cards" || list.length !== (note ? 4 : 3)) return null
  const img = image as Image
  const c = chart as Chart
  const k = kpis as KpiCards
  if (note && (note.icon || note.title || note.tag)) return null
  if (!isShareBar(c) || c.tag || c.series.some((s) => s.data.length !== 1 || s.tone)) return null
  const parts = c.series.map((s) => ({ name: s.name, value: s.data[0]!.y, marked: s.emphasis === true, note: s.data[0]!.note?.trim() }))
  if (parts.length < 2 || parts.length > 3 || parts.filter((p) => p.marked).length !== 1 || parts.some((p) => !(p.value >= 0) || (p.marked && p.note))) return null
  if (k.items.length < 2 || k.items.length > 4) return null
  const inks = yearbookInks(ctx)
  const total = parts.reduce((sum, p) => sum + p.value, 0)
  if (!(total > 0)) return null
  const unit = c.axes?.y_unit?.trim() || undefined
  const category = String(c.series[0]!.data[0]!.x).trim()
  const chinese = ctx.figures?.chinese ?? mostlyChinese([category, ...parts.map((p) => p.name)])
  const sideX = rect.x + PHOTO.w + SIDE.gap
  const sideW = rect.x + rect.w - sideX
  const caption = unit ? (chinese ? `${category}（${unit}）` : `${category} (${unit})`) : category
  const titleFit = fitYearbook(caption, { width: sideW, size: SIDE.title.size, lineHeight: SIDE.title.lineHeight, maxLines: 1, bold: true }, ctx)
  if (!titleFit) return null
  // The parts along the bar, each its words inside it and its meaning under it.
  let cursor = sideX
  const barW = sideW - 20
  const blocks = parts.map((p) => {
    const w = (p.value / total) * barW
    const x = cursor
    cursor += w + SIDE.bar.gap
    const solid = dossierSolid(p.marked ? inks.accent : inks.ghost, inks.ink, SIDE.bar.name.size)
    const amount = String(Number(p.value.toPrecision(12)))
    const share = `${Math.round((p.value / total) * 100)}%`
    const value = p.marked ? amount : chinese ? `${amount}，占 ${share}` : `${amount}, ${share}`
    const meaning = p.marked ? c.emphasis_label?.trim() : p.note
    return { ...p, x, w, fill: p.marked ? solid.fill : inks.ghost, words: p.marked ? solid.words : yearbookText(inks.ink, inks.ghost, SIDE.bar.name.size), value, meaning }
  })
  const room = (b: (typeof blocks)[number]) => b.w - SIDE.bar.inset * 2
  if (blocks.some((b) => yearbookWidth(b.name, SIDE.bar.name.size, ctx, true) > room(b) || yearbookWidth(b.value, SIDE.bar.value.size, ctx, true, true) > room(b))) return null
  if (blocks.some((b, i) => b.meaning && b.x + yearbookWidth(b.meaning, SIDE.line.size, ctx, b.marked) > (i < blocks.length - 1 ? blocks[i + 1]!.x - 8 : rect.x + rect.w))) return null
  const noteFit = note ? fitYearbook(note.text, { width: sideW, size: SIDE.note.size, lineHeight: SIDE.note.lineHeight, maxLines: SIDE.note.maxLines }, ctx) : null
  if (note && !noteFit) return null
  if (noteFit && SIDE.note.top + noteFit.lines.length * SIDE.note.lineHeight > CARDS.top - 10) return null
  const imgCaption = img.caption?.trim() ? fitYearbook(img.caption, { width: PHOTO.w, size: PHOTO.caption.size, lineHeight: PHOTO.caption.lineHeight, maxLines: 1 }, ctx) : null
  if (img.caption?.trim() && !imgCaption) return null
  const n = k.items.length
  const cardW = (rect.w - CARDS.gap * (n - 1)) / n
  const figures = k.items.map((item) => fitFigureCard(item, cardW, ctx))
  if (figures.some((f) => !f || f.depth > CARDS.h - 6) || CARDS.top + CARDS.h > rect.h) return null
  const barTop = rect.y + SIDE.bar.top
  const lineY = barTop + SIDE.bar.h + SIDE.line.drop - 2

  return (
    <g {...compositionTag("segments")}>
      <g {...blockTag(ctx, img)} data-yearbook-photo="">
        {paintPhoto(img, { x: rect.x, y: rect.y + PHOTO.top, w: PHOTO.w, h: PHOTO.h }, ctx)}
        {imgCaption ? paintYearbook(imgCaption, { ctx, x: rect.x, top: rect.y + PHOTO.top + PHOTO.h + PHOTO.caption.gap, fill: yearbookMeta(inks.muted, inks.ground), attrs: { fontStyle: "italic" } }) : null}
      </g>
      <g {...blockTag(ctx, c)}>
        {paintYearbook(titleFit, { ctx, x: sideX, top: rect.y + SIDE.title.top, bold: true, fill: yearbookText(inks.ink, inks.ground, SIDE.title.size) })}
        {blocks.map((b, i) => (
          <g key={i} data-yearbook-part={b.marked ? "marked" : ""}>
            <rect x={b.x} y={barTop} width={Math.max(1, b.w)} height={SIDE.bar.h} rx={2} fill={b.fill} />
            {paintYearbookLine(b.name, { ctx, x: b.x + SIDE.bar.inset, baseline: barTop + SIDE.bar.name.base, size: SIDE.bar.name.size, bold: true, fill: b.words })}
            {paintYearbookLine(b.value, { ctx, x: b.x + SIDE.bar.inset, baseline: barTop + SIDE.bar.value.base, size: SIDE.bar.value.size, mono: true, bold: true, fill: b.words })}
            {b.meaning ? (
              <g data-yearbook-meaning={b.marked ? "marked" : ""}>
                <line x1={b.x} y1={lineY} x2={b.x + b.w} y2={lineY} stroke={b.marked ? inks.accent : inks.muted} strokeWidth={b.marked ? 2 : 1.5} strokeDasharray={b.marked ? undefined : CARD_DASH} />
                {paintYearbookLine(b.meaning, { ctx, x: b.x, baseline: lineY + SIDE.line.label - 14, size: SIDE.line.size, bold: b.marked, fill: b.marked ? yearbookText(inks.accent, inks.ground, SIDE.line.size) : yearbookMeta(inks.muted, inks.ground) })}
              </g>
            ) : null}
          </g>
        ))}
      </g>
      {note && noteFit ? <g {...blockTag(ctx, note)}>{paintYearbook(noteFit, { ctx, x: sideX, top: rect.y + SIDE.note.top, fill: yearbookText(inks.muted, inks.ground, SIDE.note.size) })}</g> : null}
      <g {...blockTag(ctx, k)}>
        {figures.map((f, i) => paintFigureCard(f!, { x: rect.x + i * (cardW + CARDS.gap), y: rect.y + CARDS.top, w: cardW, h: CARDS.h }, ctx, inks, `k${i}`))}
      </g>
    </g>
  )
}
