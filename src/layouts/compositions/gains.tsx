import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import { Lead, binderInks, binderText, fitBinder, paintBinder, paintBinderCard, paintBinderIcon, wholeMark } from "./binder"
import { stripEmphasis } from "../../render/emphasis"
import { BAR, BinderBar, fitBinderBar, type BarSpec } from "./binder-bars"

type Banner = Extract<Component, { type: "verdict_banner" }>
type Kpis = Extract<Component, { type: "kpi_cards" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * gains: what the client gets, proposal's 2026-10 board (p02). A line
 * naming the offer with its icon, then a card per thing the client gets:
 * its icon, what it is in two lines of 20px bold, a hairline, the figure at
 * 40px in petrol, and a note in two lines; the figure the page lands on
 * (written `**…**`) in the tangerine. Under the cards, one bar of the pale
 * petrol with its icon and one line.
 *
 * Takes, in the binder setting: optionally a `verdict_banner` (the line over
 * the cards), a `kpi_cards` of two to four with an icon each, no unit, delta,
 * tag, tone or source, at most one value marked whole; then optionally a
 * `callout` with no title or tag.
 *
 * Declines: a figure wider than its card, a label or a note past two lines,
 * a banner or a bar past one line.
 *
 * Reads: the binder inks (`./binder.tsx`).
 */

const HEAD = { icon: { dy: 4, size: 22 }, text: { dx: 32, top: 2, size: 17, lineHeight: 26, w: 1000 } } as const
const CARDS = { top: 42, h: 300, gap: 14, pad: 28, icon: { top: 22, size: 26 }, label: { top: 62, size: 20, lineHeight: 31, maxLines: 2 }, rule: 146, value: { top: 164, size: 40, lineHeight: 50 }, note: { top: 222, size: 13, lineHeight: 21, maxLines: 2 } } as const
const BAR_TOP = 364
/** The bar under the cards: the board's 16px, bold, the offer's last word. */
const TIP: BarSpec = { ...BAR, size: 16, bold: true }

export const gainsComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "binder") return null
  let i = 0
  const banner = components[i]?.type === "verdict_banner" ? (components[i++] as Banner) : undefined
  const kpis = components[i]?.type === "kpi_cards" ? (components[i++] as Kpis) : undefined
  const bar = components[i]?.type === "callout" ? (components[i++] as Callout) : undefined
  if (!kpis || i !== components.length) return null
  const n = kpis.items.length
  if (n < 2 || n > 4 || rect.w < 1132 || rect.h < BAR_TOP + 58) return null
  if (kpis.items.some((it) => !it.icon || it.unit || it.delta || it.tag || it.tone || it.source)) return null
  if (kpis.items.filter((it) => it.value.includes("**")).length > 1 || kpis.items.some((it) => it.value.includes("**") && !wholeMark(it.value))) return null
  const inks = binderInks(ctx)
  const w = (rect.w - CARDS.gap * (n - 1)) / n
  const inner = w - CARDS.pad * 2
  const head = banner ? fitBinder(banner.text, { width: HEAD.text.w, size: HEAD.text.size, lineHeight: HEAD.text.lineHeight, maxLines: 1, bold: true }, ctx) : null
  if (banner && !head) return null
  const cards = kpis.items.map((it) => {
    const value = fitBinder(stripEmphasis(it.value), { width: inner, size: CARDS.value.size, lineHeight: CARDS.value.lineHeight, maxLines: 1, bold: true }, ctx)
    const label = fitBinder(it.label, { width: inner, size: CARDS.label.size, lineHeight: CARDS.label.lineHeight, maxLines: CARDS.label.maxLines, bold: true }, ctx)
    const note = it.note?.trim() ? fitBinder(it.note, { width: inner, size: CARDS.note.size, lineHeight: CARDS.note.lineHeight, maxLines: CARDS.note.maxLines }, ctx) : null
    if (!value || !label || (it.note?.trim() && !note)) return null
    return { it, value, label, note, lit: wholeMark(it.value) }
  })
  if (cards.some((c) => !c)) return null
  const tip = bar ? fitBinderBar(bar, rect.w, ctx, TIP) : null
  if (bar && !tip) return null

  return (
    <g {...compositionTag("gains")}>
      {banner && head ? (
        <g {...blockTag(ctx, banner)} data-binder-banner="">
          {banner.icon ? paintBinderIcon(banner.icon, rect.x, rect.y + HEAD.icon.dy, HEAD.icon.size, inks.deep, inks.ground) : null}
          {paintBinder(head, { ctx, x: rect.x + (banner.icon ? HEAD.text.dx : 0), top: rect.y + HEAD.text.top, bold: true, fill: binderText(inks.deep, inks.ground, HEAD.text.size) })}
        </g>
      ) : null}
      <g {...blockTag(ctx, kpis)}>
        {cards.map((c, k) => {
          const { it, value, label, note, lit } = c!
          const x = rect.x + k * (w + CARDS.gap)
          const y = rect.y + CARDS.top
          const figure = paintBinder(value, { ctx, x: x + CARDS.pad, top: y + CARDS.value.top, bold: true, fill: binderText(lit ? inks.fire : inks.deep, inks.card, CARDS.value.size), ground: inks.card })
          return (
            <g key={k} data-binder-gain={k}>
              {paintBinderCard({ x, y, w, h: CARDS.h }, inks)}
              {paintBinderIcon(it.icon!, x + CARDS.pad, y + CARDS.icon.top, CARDS.icon.size, inks.deep, inks.card)}
              {paintBinder(label, { ctx, x: x + CARDS.pad, top: y + CARDS.label.top, bold: true, fill: binderText(inks.ink, inks.card, CARDS.label.size), ground: inks.card })}
              <rect x={x + CARDS.pad} y={y + CARDS.rule} width={inner} height={1} fill={inks.line} />
              {lit ? <Lead id="gain">{figure}</Lead> : figure}
              {note ? paintBinder(note, { ctx, x: x + CARDS.pad, top: y + CARDS.note.top, fill: binderText(inks.muted, inks.card, CARDS.note.size), ground: inks.card }) : null}
            </g>
          )
        })}
      </g>
      {bar && tip ? <BinderBar callout={bar} fitted={tip} x={rect.x} y={rect.y + BAR_TOP} w={rect.w} ctx={ctx} spec={TIP} /> : null}
    </g>
  )
}
