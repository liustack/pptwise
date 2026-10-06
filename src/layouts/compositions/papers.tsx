import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import { binderInks, binderText, binderWidth, fitBinder, paintBinder, paintBinderCard, paintBinderIcon, paintCheckbox, paintChip } from "./binder"
import { BinderClosingLine, fitClosingLine } from "./binder-bars"

type IconCards = Extract<Component, { type: "icon_cards" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * papers: what a client is asked to hand over, as a checklist, proposal's
 * 2026-10 board (p18). Two columns of cards of sand, each a paper: an empty
 * box to tick, its icon in petrol, its name bold, what it is used for in
 * grey, and who holds it as a pale petrol chip at the card's top right (the
 * card's tag). Under the cards, the closing line under a 2px rule of petrol,
 * its first sentence bold and the rest grey.
 *
 * Takes, in the binder setting: an `icon_cards` of two to six with no title
 * or tone, each with a tag; then optionally a `callout` with no title, icon
 * or tag.
 *
 * Declines: a name past one line, a text past one line beside its chip, and a
 * closing line past one line.
 *
 * Reads: the binder inks (`./binder.tsx`).
 */

const CARD = { top: 6, gap: 16, w: 558, h: 110, step: 124, box: { x: 24, y: 24, size: 24, r: 5 }, icon: { x: 70, y: 24, size: 22 }, name: { x: 104, dy: 20, size: 18, lineHeight: 30 }, text: { x: 104, dy: 56, size: 14, lineHeight: 22 }, chip: { right: 24, y: 24, h: 24, size: 12 } } as const
const CLOSING_GAP = 20

export const papersComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "binder") return null
  const [cards, note, ...rest] = components
  if (cards?.type !== "icon_cards" || rest.length > 0 || (note && note.type !== "callout")) return null
  const ic = cards as IconCards & { title?: string }
  const n = ic.items.length
  if (ic.title || n < 2 || n > 6 || ic.items.some((it) => !it.tag || (it as { tone?: string }).tone)) return null
  const rows = Math.ceil(n / 2)
  const bottom = CARD.top + (rows - 1) * CARD.step + CARD.h
  if (rect.w < 1132 || rect.h < bottom + (note ? CLOSING_GAP + 50 : 0)) return null
  const inks = binderInks(ctx)
  const w = (rect.w - CARD.gap) / 2
  const items = ic.items.map((it) => {
    const chipW = binderWidth(it.tag!.text, CARD.chip.size, ctx, true) + 22
    const name = fitBinder(it.title, { width: w - CARD.name.x - CARD.chip.right - chipW - 8, size: CARD.name.size, lineHeight: CARD.name.lineHeight, maxLines: 1, bold: true }, ctx)
    const text = fitBinder(it.text, { width: w - CARD.text.x - CARD.chip.right, size: CARD.text.size, lineHeight: CARD.text.lineHeight, maxLines: 1 }, ctx)
    return name && text ? { it, name, text, chipW } : null
  })
  if (items.some((item) => !item)) return null
  const callout = note as Callout | undefined
  const closing = callout ? fitClosingLine(callout, rect.w, ctx) : null
  if (callout && !closing) return null

  return (
    <g {...compositionTag("papers")}>
      <g {...blockTag(ctx, ic)}>
        {items.map((item, i) => {
          const { it, name, text, chipW } = item!
          const x = rect.x + (i % 2) * (w + CARD.gap)
          const y = rect.y + CARD.top + Math.floor(i / 2) * CARD.step
          return (
            <g key={i} data-binder-paper={stripEmphasis(it.title)}>
              {paintBinderCard({ x, y, w, h: CARD.h }, inks)}
              {paintCheckbox(x + CARD.box.x, y + CARD.box.y, CARD.box.size, inks.deep, inks.ground, { r: CARD.box.r })}
              {paintBinderIcon(it.icon, x + CARD.icon.x, y + CARD.icon.y, CARD.icon.size, inks.deep, inks.card)}
              {paintBinder(name, { ctx, x: x + CARD.name.x, top: y + CARD.name.dy, bold: true, fill: binderText(inks.ink, inks.card, CARD.name.size), ground: inks.card })}
              {paintBinder(text, { ctx, x: x + CARD.text.x, top: y + CARD.text.dy, fill: binderText(inks.muted, inks.card, CARD.text.size), ground: inks.card })}
              {paintChip(it.tag!.text, x + w - CARD.chip.right - chipW, y + CARD.chip.y, { size: CARD.chip.size, h: CARD.chip.h, fg: inks.deep, bg: inks.pale }, ctx, inks).node}
            </g>
          )
        })}
      </g>
      {callout && closing ? <BinderClosingLine callout={callout} fitted={closing} x={rect.x} y={rect.y + bottom + CLOSING_GAP} w={rect.w} ctx={ctx} /> : null}
    </g>
  )
}
