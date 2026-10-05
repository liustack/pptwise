import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import { Lead, TICKET, fitMarquee, glossBreak, marqueeBaseline, marqueeInks, marqueeText, marqueeTrackedWidth, paintMarquee, paintMarqueeCard, paintMarqueeIcon, paintMarqueeLine, paintMarqueeTracked, splitName } from "./marquee"

type NumberedCards = Extract<Component, { type: "numbered_cards" }>

/*
 * asks: what a proposal asks the room to decide, rally's 2026-10 board (the
 * request page, p17). Requests two to a row, each a ticket with a perforated
 * stub at its right: on the ticket the request's icon and what it is about
 * in small tracked type, the request itself large, a grey line on what it
 * means; on the stub a box to tick for each choice on the page's ballot
 * (「批准」「再议」) and, at its foot, where in the deck it rests (the card's
 * `sub`). The request the page leads with (`emphasis`) is a ticket of the
 * accent with the dark ink on it.
 *
 * A card's title is written "about：request" (「方向：押大型演唱会的场外和
 * 城市」). The colon is declared on the label's line (`data-gloss-break`),
 * not printed.
 *
 * Takes, in the marquee setting, on a page with a `ballot` of two choices
 * and no signature: a `numbered_cards` of three or four, titled that way,
 * with icons, at most one marked.
 *
 * Declines: a label wider than its row, a request past two lines, a line
 * past two lines, a choice wider than the stub and a reference past one line.
 *
 * Reads: the marquee inks (`./marquee.tsx`), the page's ballot.
 */

const TICKETS = { top: 8, col: 584, row: 214, w: 568, h: 198, seam: 440, hole: 7, icon: { x: 24, y: 24, size: 26 }, label: { x: 62, top: 22, size: 15, lineHeight: 30, tracking: 2 }, title: { x: 24, top: 66, size: 22, lineHeight: 32, maxLines: 2, w: 400 }, text: { x: 24, top: 136, size: 14, lineHeight: 22, maxLines: 2, w: 400 }, box: { x: 462, top: 50, pitch: 56, size: 22, w: 2, r: 4 }, choice: { x: 494, size: 15, lineHeight: 26 }, ref: { x: 452, top: 160, size: 11, lineHeight: 22, w: 112 } } as const

export const asksComposition: Composition = ({ components, ctx, rect, setting, ballot }) => {
  if (setting !== "marquee" || !ballot || ballot.choices.length !== 2 || ballot.signature) return null
  const [cards, ...rest] = components
  if (cards?.type !== "numbered_cards" || rest.length > 0) return null
  const nc = cards as NumberedCards
  if (nc.items.length < 3 || nc.items.length > 4 || nc.items.some((it) => !it.icon)) return null
  if (rect.w < TICKETS.col + TICKETS.w || rect.h < TICKETS.top + 2 * TICKETS.row - (TICKETS.row - TICKETS.h)) return null
  const inks = marqueeInks(ctx)
  const choices = ballot.choices.map((c) => c.trim())
  if (choices.some((c) => marqueeTrackedWidth(c, TICKETS.choice.size, 0, ctx, true) > TICKETS.w - TICKETS.choice.x - 4)) return null
  const asks = nc.items.map((it, i) => {
    const split = splitName(it.title)
    if (!split) return null
    if (marqueeTrackedWidth(split.name, TICKETS.label.size, TICKETS.label.tracking, ctx, true) > TICKETS.seam - TICKETS.label.x - 16) return null
    const title = fitMarquee(split.rest, { width: TICKETS.title.w, size: TICKETS.title.size, lineHeight: TICKETS.title.lineHeight, maxLines: TICKETS.title.maxLines, bold: true }, ctx)
    const text = it.text?.trim() ? fitMarquee(it.text, { width: TICKETS.text.w, size: TICKETS.text.size, lineHeight: TICKETS.text.lineHeight, maxLines: TICKETS.text.maxLines }, ctx) : null
    const ref = it.sub?.trim() ? fitMarquee(it.sub, { width: TICKETS.ref.w, size: TICKETS.ref.size, lineHeight: TICKETS.ref.lineHeight, maxLines: 1 }, ctx) : null
    if (!title || (it.text?.trim() && !text) || (it.sub?.trim() && !ref)) return null
    return { it, i, split, title, text, ref, lit: it.emphasis === true }
  })
  if (asks.some((a) => !a)) return null

  return (
    <g {...compositionTag("asks")} {...blockTag(ctx, nc)}>
      {asks.map((a) => {
        const { it, i, split, title, text, ref, lit } = a!
        const x = rect.x + (i % 2) * TICKETS.col
        const y = rect.y + TICKETS.top + Math.floor(i / 2) * TICKETS.row
        const ground = lit ? inks.fire : inks.card
        const words = (ink: string, size: number) => marqueeText(lit ? inks.onFire : ink, ground, size)
        const seam = x + TICKETS.seam
        const card = paintMarqueeCard({ x, y, w: TICKETS.w, h: TICKETS.h }, inks, { fill: ground })
        return (
          <g key={i} data-ask={split.name}>
            {lit ? <Lead id="ask">{card}</Lead> : card}
            <line x1={seam + 1} y1={y} x2={seam + 1} y2={y + TICKETS.h} stroke={inks.ground} strokeWidth={2} strokeDasharray={TICKET.dash} />
            <circle cx={seam + 1} cy={y - 1} r={TICKETS.hole} fill={inks.ground} />
            <circle cx={seam + 1} cy={y + TICKETS.h + 1} r={TICKETS.hole} fill={inks.ground} />
            {paintMarqueeIcon(it.icon!, x + TICKETS.icon.x, y + TICKETS.icon.y, TICKETS.icon.size, lit ? inks.onFire : inks.fire, ground)}
            {paintMarqueeTracked({ ctx, text: split.name, x: x + TICKETS.label.x, y: marqueeBaseline(y + TICKETS.label.top, TICKETS.label.lineHeight, TICKETS.label.size), size: TICKETS.label.size, tracking: TICKETS.label.tracking, bold: true, fill: words(inks.muted, TICKETS.label.size), attrs: glossBreak(split.sep) })}
            {paintMarquee(title, { ctx, x: x + TICKETS.title.x, top: y + TICKETS.title.top, bold: true, fill: words(inks.ink, TICKETS.title.size), ground })}
            {text ? paintMarquee(text, { ctx, x: x + TICKETS.text.x, top: y + TICKETS.text.top, fill: words(inks.muted, TICKETS.text.size), ground }) : null}
            {choices.map((c, j) => {
              const top = y + TICKETS.box.top + j * TICKETS.box.pitch
              const inset = TICKETS.box.w / 2
              return (
                <g key={j} data-ballot-choice={c}>
                  <rect x={x + TICKETS.box.x + inset} y={top + inset} width={TICKETS.box.size - TICKETS.box.w} height={TICKETS.box.size - TICKETS.box.w} rx={TICKETS.box.r - inset} fill="none" stroke={lit ? inks.onFire : inks.muted} strokeWidth={TICKETS.box.w} />
                  {paintMarqueeLine(c, { ctx, x: x + TICKETS.choice.x, top: top - 2, lineHeight: TICKETS.choice.lineHeight, size: TICKETS.choice.size, bold: true, fill: words(inks.ink, TICKETS.choice.size) })}
                </g>
              )
            })}
            {ref ? paintMarquee(ref, { ctx, x: x + TICKETS.ref.x, top: y + TICKETS.ref.top, fill: words(inks.muted, TICKETS.ref.size), ground }) : null}
          </g>
        )
      })}
    </g>
  )
}
