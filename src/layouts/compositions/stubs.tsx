import type { Component } from "@/ir"
import { resolveSemanticColor } from "../../render/ink"
import { blockTag, compositionTag, type Composition } from "./shared"
import { Lead, TICKET, fitMarquee, glossBreak, marqueeInks, marqueeText, marqueeWidth, paintMarquee, paintMarqueeCard, paintMarqueeIcon, paintMarqueeLine, splitName } from "./marquee"

type IconCards = Extract<Component, { type: "icon_cards" }>
type KpiCards = Extract<Component, { type: "kpi_cards" }>

/*
 * stubs: offers a ticket earns, rally's 2026-10 board (the city page, p12).
 * Two to four tickets two to a row, each a card with a perforated stub at its
 * right: on the ticket the place in small grey type beside its icon in the
 * accent, the offer's name large and a grey line on what it gives; on the
 * stub, in the accent, the few words that say what to show for it (the
 * card's tag, 「凭票根」). Beside them a card with a figure, its icon, its
 * label, a hairline and its note, the note in the warning ink when the
 * figure is one to read with care (`tone: "warning"`).
 *
 * A card's title is written "place：offer" (「南京：乐享 1+3」). The colon is
 * declared on the place's line (`data-gloss-break`), not printed.
 *
 * Takes, in the marquee setting: an `icon_cards` of two to four, each titled
 * that way with a plain tag (no kind, tone or basis); then a `kpi_cards` of
 * one item with no delta, tag or source, its tone none or warning.
 *
 * Declines: a place or an offer past one line, a line past two, a stub's
 * words past three lines of the stub, and the figure's words past their
 * lines.
 *
 * Reads: the marquee inks (`./marquee.tsx`), the body and heading faces.
 */

const TICKETS = { top: 8, col: 432, row: 200, w: 410, h: 180, seam: 300, hole: 7, icon: { x: 22, y: 22, size: 24 }, place: { x: 56, top: 20, size: 14, lineHeight: 28 }, offer: { x: 22, top: 60, size: 24, lineHeight: 34, w: 270 }, line: { x: 22, top: 104, size: 14, lineHeight: 22, maxLines: 2, w: 268 }, stub: { x: 312, top: 60, w: 86, size: 13, lineHeight: 20, maxLines: 3 } } as const
const SIDE = { x: 880, top: 8, w: 272, h: 380, pad: 20, icon: { y: 20, size: 24 }, value: { top: 56, size: 56, lineHeight: 70 }, label: { top: 130, size: 14, lineHeight: 22, maxLines: 2 }, rule: { y: 190 }, note: { top: 204, size: 14, lineHeight: 22, maxLines: 6 } } as const

export const stubsComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "marquee") return null
  const [cards, figure, ...rest] = components
  if (cards?.type !== "icon_cards" || figure?.type !== "kpi_cards" || rest.length > 0) return null
  const ic = cards as IconCards
  const k = figure as KpiCards
  if (ic.items.length < 2 || ic.items.length > 4 || k.items.length !== 1) return null
  if (ic.items.some((it) => !it.tag || it.tag.evidence || it.tag.tone || it.tag.basis || it.tag.settled || it.tag.quiet)) return null
  const item = k.items[0]!
  if (item.delta || item.tag || item.source || (item.tone && item.tone !== "warning")) return null
  if (rect.w < SIDE.x + SIDE.w || rect.h < SIDE.top + SIDE.h) return null
  const inks = marqueeInks(ctx)
  const tickets = ic.items.map((it, i) => {
    const split = splitName(it.title)
    if (!split) return null
    const place = fitMarquee(split.name, { width: TICKETS.seam - TICKETS.place.x - 12, size: TICKETS.place.size, lineHeight: TICKETS.place.lineHeight, maxLines: 1, bold: true }, ctx)
    const offer = fitMarquee(split.rest, { width: TICKETS.offer.w, size: TICKETS.offer.size, lineHeight: TICKETS.offer.lineHeight, maxLines: 1, bold: true }, ctx)
    const line = it.text.trim() ? fitMarquee(it.text, { width: TICKETS.line.w, size: TICKETS.line.size, lineHeight: TICKETS.line.lineHeight, maxLines: TICKETS.line.maxLines }, ctx) : null
    const stub = fitMarquee(it.tag!.text, { width: TICKETS.stub.w, size: TICKETS.stub.size, lineHeight: TICKETS.stub.lineHeight, maxLines: TICKETS.stub.maxLines, bold: true }, ctx)
    if (!place || !offer || (it.text.trim() && !line) || !stub) return null
    return { it, i, split, place, offer, line, stub }
  })
  if (tickets.some((t) => !t)) return null
  const sideW = SIDE.w - SIDE.pad * 2 - 2
  const value = item.value.replace(/\*\*/g, "").trim()
  const lit = item.value.includes("**")
  const label = fitMarquee(item.label, { width: sideW, size: SIDE.label.size, lineHeight: SIDE.label.lineHeight, maxLines: SIDE.label.maxLines, bold: true }, ctx)
  const note = item.note?.trim() ? fitMarquee(item.note, { width: sideW, size: SIDE.note.size, lineHeight: SIDE.note.lineHeight, maxLines: SIDE.note.maxLines }, ctx) : null
  if (!label || (item.note?.trim() && !note) || marqueeWidth(value, SIDE.value.size, ctx, true) > sideW) return null
  const noteInk = item.tone ? resolveSemanticColor(item.tone, ctx.colors) : inks.muted

  return (
    <g {...compositionTag("stubs")}>
      <g {...blockTag(ctx, ic)} data-marquee-stubs="">
        {tickets.map((t) => {
          const { it, i, split, place, offer, line, stub } = t!
          const x = rect.x + (i % 2) * TICKETS.col
          const y = rect.y + TICKETS.top + Math.floor(i / 2) * TICKETS.row
          const seam = x + TICKETS.seam
          return (
            <g key={i} data-ticket={split.name}>
              {paintMarqueeCard({ x, y, w: TICKETS.w, h: TICKETS.h }, inks)}
              <line x1={seam + 1} y1={y} x2={seam + 1} y2={y + TICKETS.h} stroke={inks.ground} strokeWidth={2} strokeDasharray={TICKET.dash} />
              <circle cx={seam + 1} cy={y - 1} r={TICKETS.hole} fill={inks.ground} />
              <circle cx={seam + 1} cy={y + TICKETS.h + 1} r={TICKETS.hole} fill={inks.ground} />
              {paintMarqueeIcon(it.icon, x + TICKETS.icon.x, y + TICKETS.icon.y, TICKETS.icon.size, inks.fire, inks.card)}
              {paintMarquee(place, { ctx, x: x + TICKETS.place.x, top: y + TICKETS.place.top, bold: true, fill: marqueeText(inks.muted, inks.card, TICKETS.place.size), ground: inks.card, lastAttrs: glossBreak(split.sep) })}
              {paintMarquee(offer, { ctx, x: x + TICKETS.offer.x, top: y + TICKETS.offer.top, bold: true, fill: marqueeText(inks.ink, inks.card, TICKETS.offer.size), ground: inks.card })}
              {line ? paintMarquee(line, { ctx, x: x + TICKETS.line.x, top: y + TICKETS.line.top, fill: marqueeText(inks.muted, inks.card, TICKETS.line.size), ground: inks.card }) : null}
              <Lead id="stub">{paintMarquee(stub, { ctx, x: x + TICKETS.stub.x + TICKETS.stub.w / 2, top: y + TICKETS.stub.top, bold: true, anchor: "middle", fill: marqueeText(inks.fire, inks.card, TICKETS.stub.size), ground: inks.card })}</Lead>
            </g>
          )
        })}
      </g>
      <g {...blockTag(ctx, k)} data-marquee-side="">
        {paintMarqueeCard({ x: rect.x + SIDE.x, y: rect.y + SIDE.top, w: SIDE.w, h: SIDE.h }, inks)}
        {item.icon ? paintMarqueeIcon(item.icon, rect.x + SIDE.x + SIDE.pad, rect.y + SIDE.top + SIDE.icon.y, SIDE.icon.size, lit ? inks.fire : inks.muted, inks.card) : null}
        {paintMarqueeLine(value, { ctx, x: rect.x + SIDE.x + SIDE.pad, top: rect.y + SIDE.top + SIDE.value.top, lineHeight: SIDE.value.lineHeight, size: SIDE.value.size, bold: true, fill: marqueeText(lit ? inks.fire : inks.ink, inks.card, SIDE.value.size) })}
        {paintMarquee(label, { ctx, x: rect.x + SIDE.x + SIDE.pad, top: rect.y + SIDE.top + SIDE.label.top, bold: true, fill: marqueeText(inks.ink, inks.card, SIDE.label.size), ground: inks.card })}
        {note ? <rect x={rect.x + SIDE.x + SIDE.pad} y={rect.y + SIDE.top + SIDE.rule.y} width={sideW} height={1} fill={inks.line} /> : null}
        {note ? paintMarquee(note, { ctx, x: rect.x + SIDE.x + SIDE.pad, top: rect.y + SIDE.top + SIDE.note.top, fill: marqueeText(noteInk, inks.card, SIDE.note.size), ground: inks.card }) : null}
      </g>
    </g>
  )
}
