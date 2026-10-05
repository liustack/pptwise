import type { Component } from "@/ir"
import { paintTag, tagInks, tagWidth } from "../../components/tag"
import { blockTag, compositionTag, type Composition } from "./shared"
import { Lead, MARQUEE_SPEC, fitMarquee, glossBreak, marqueeInks, marqueeText, marqueeWidth, paintMarquee, paintMarqueeCard, paintMarqueeIcon, paintMarqueeLine, splitDot, splitSentence } from "./marquee"

type IconCards = Extract<Component, { type: "icon_cards" }>
type KpiCards = Extract<Component, { type: "kpi_cards" }>

/*
 * wall: what peers have done and what they could show for it, rally's
 * 2026-10 board (the cases page, p10). A wall of cards three to a row, each a
 * case: its icon and name, a grey line of its trade and year, what it did, a
 * dashed rule, what it reported in grey, and a tag of where that report
 * comes from, outlined in the ink its kind of source takes. Beside the wall
 * one card of the accent holding the count the page lands on, huge, in the
 * dark ink: what it counts over it, its unit and its note under it.
 *
 * A card's title is written "name · trade · year" and its text "what was
 * done。what came of it": the name stands bold, the rest grey under it; the
 * deed over the rule, the result under it. The full stop is declared on the
 * deed's last line (`data-gloss-break`), not printed.
 *
 * Takes, in the marquee setting: an `icon_cards` of two to six, each with a
 * tag, titled and written that way; then a `kpi_cards` of one item with no
 * delta, icon, tag or source.
 *
 * Declines: a name or a trade past one line, a deed past two lines, a result
 * past one line, a tag wider than its card, and the count's words past their
 * lines.
 *
 * Reads: the marquee inks (`./marquee.tsx`), the tag inks (`components/tag`).
 */

const WALL = { pitch: 300, row: 210, top: 4, w: 284, h: 194, pad: 18 } as const
const CASE = { icon: { y: 18, size: 22 }, name: { x: 50, top: 16, size: 17, lineHeight: 26, w: 220 }, trade: { top: 48, size: 12, lineHeight: 20 }, deed: { top: 74, size: 14, lineHeight: 22, maxLines: 2 }, rule: { top: 128, w: 1.5, dash: "4 3" }, result: { top: 138, size: 14, lineHeight: 24 }, tag: { top: 164, size: 12, height: 22, padX: 10 } } as const
const COUNT = { x: 916, top: 4, w: 236, h: 404, pad: 24, label: { top: 24, size: 15, lineHeight: 24, maxLines: 2 }, value: { top: 58, size: 140, lineHeight: 150 }, unit: { top: 218, size: 15, lineHeight: 22 }, note: { top: 258, size: 15, lineHeight: 24, maxLines: 5 } } as const

export const wallComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "marquee") return null
  const [cards, count, ...rest] = components
  if (cards?.type !== "icon_cards" || count?.type !== "kpi_cards" || rest.length > 0) return null
  const ic = cards as IconCards
  const k = count as KpiCards
  if (ic.items.length < 2 || ic.items.length > 6 || ic.items.some((it) => !it.tag) || k.items.length !== 1) return null
  const item = k.items[0]!
  if (item.delta || item.icon || item.tag || item.source || item.tone) return null
  if (rect.w < COUNT.x + COUNT.w || rect.h < COUNT.top + COUNT.h) return null
  const inks = marqueeInks(ctx)
  const textW = WALL.w - WALL.pad * 2 + 2
  const tagSpec = { size: CASE.tag.size, height: CASE.tag.height, padX: CASE.tag.padX, fontFamily: ctx.fonts.body }
  const cases = ic.items.map((it, i) => {
    const title = splitDot(it.title)
    const body = splitSentence(it.text)
    if (!title || !body) return null
    const name = fitMarquee(title.name, { width: CASE.name.w, size: CASE.name.size, lineHeight: CASE.name.lineHeight, maxLines: 1, bold: true }, ctx)
    const trade = fitMarquee(title.rest, { width: textW, size: CASE.trade.size, lineHeight: CASE.trade.lineHeight, maxLines: 1 }, ctx)
    const deed = fitMarquee(body.lead, { width: textW, size: CASE.deed.size, lineHeight: CASE.deed.lineHeight, maxLines: CASE.deed.maxLines }, ctx)
    const result = fitMarquee(body.rest, { width: textW, size: CASE.result.size, lineHeight: CASE.result.lineHeight, maxLines: 1 }, ctx)
    if (!name || !trade || !deed || !result || tagWidth(it.tag!.text, tagSpec) > textW) return null
    return { it, i, body, name, trade, deed, result }
  })
  if (cases.some((c) => !c)) return null
  const cw = COUNT.w - COUNT.pad * 2
  const value = item.value.replace(/\*\*/g, "").trim()
  const label = fitMarquee(item.label, { width: cw, size: COUNT.label.size, lineHeight: COUNT.label.lineHeight, maxLines: COUNT.label.maxLines, bold: true }, ctx)
  const unit = item.unit?.trim() ? fitMarquee(item.unit, { width: cw, size: COUNT.unit.size, lineHeight: COUNT.unit.lineHeight, maxLines: 1, bold: true }, ctx) : null
  const note = item.note?.trim() ? fitMarquee(item.note, { width: cw, size: COUNT.note.size, lineHeight: COUNT.note.lineHeight, maxLines: COUNT.note.maxLines }, ctx) : null
  if (!label || (item.unit?.trim() && !unit) || (item.note?.trim() && !note) || marqueeWidth(value, COUNT.value.size, ctx, true) > cw) return null
  const onFire = (size: number) => marqueeText(inks.onFire, inks.fire, size)

  return (
    <g {...compositionTag("wall")}>
      <g {...blockTag(ctx, ic)} data-marquee-wall="">
        {cases.map((c) => {
          const { it, i, body, name, trade, deed, result } = c!
          const x = rect.x + (i % 3) * WALL.pitch
          const y = rect.y + WALL.top + Math.floor(i / 3) * WALL.row
          const tag = it.tag!
          return (
            <g key={i} data-case={name.lines[0]}>
              {paintMarqueeCard({ x, y, w: WALL.w, h: WALL.h }, inks)}
              {paintMarqueeIcon(it.icon, x + WALL.pad, y + CASE.icon.y, CASE.icon.size, inks.muted, inks.card)}
              {paintMarquee(name, { ctx, x: x + CASE.name.x, top: y + CASE.name.top, bold: true, fill: marqueeText(inks.ink, inks.card, CASE.name.size), ground: inks.card, lastAttrs: { "data-gloss-break": " · " } })}
              {paintMarquee(trade, { ctx, x: x + WALL.pad, top: y + CASE.trade.top, fill: marqueeText(inks.muted, inks.card, CASE.trade.size), ground: inks.card })}
              {paintMarquee(deed, { ctx, x: x + WALL.pad, top: y + CASE.deed.top, fill: marqueeText(inks.ink, inks.card, CASE.deed.size), ground: inks.card, lastAttrs: glossBreak(body.sep) })}
              <line x1={x + WALL.pad} y1={y + CASE.rule.top + CASE.rule.w / 2} x2={x + WALL.pad + textW - 2} y2={y + CASE.rule.top + CASE.rule.w / 2} stroke={inks.line} strokeWidth={CASE.rule.w} strokeDasharray={CASE.rule.dash} />
              {paintMarquee(result, { ctx, x: x + WALL.pad, top: y + CASE.result.top, fill: marqueeText(inks.muted, inks.card, CASE.result.size), ground: inks.card })}
              {paintTag({ tag, x: x + WALL.pad, y: y + CASE.tag.top, spec: tagSpec, inks: tagInks(ctx, tag, false, inks.card, CASE.tag.size), attrs: { ...MARQUEE_SPEC } })}
            </g>
          )
        })}
      </g>
      <g {...blockTag(ctx, k)} data-marquee-count="">
        <Lead id="count">
          {paintMarqueeCard({ x: rect.x + COUNT.x, y: rect.y + COUNT.top, w: COUNT.w, h: COUNT.h }, inks, { fill: inks.fire })}
          {paintMarquee(label, { ctx, x: rect.x + COUNT.x + COUNT.pad, top: rect.y + COUNT.top + COUNT.label.top, bold: true, fill: onFire(COUNT.label.size), ground: inks.fire })}
          {paintMarqueeLine(value, { ctx, x: rect.x + COUNT.x + COUNT.pad, top: rect.y + COUNT.top + COUNT.value.top, lineHeight: COUNT.value.lineHeight, size: COUNT.value.size, bold: true, fill: onFire(COUNT.value.size) })}
          {unit ? paintMarquee(unit, { ctx, x: rect.x + COUNT.x + COUNT.pad, top: rect.y + COUNT.top + COUNT.unit.top, bold: true, fill: onFire(COUNT.unit.size), ground: inks.fire }) : null}
          {note ? paintMarquee(note, { ctx, x: rect.x + COUNT.x + COUNT.pad, top: rect.y + COUNT.top + COUNT.note.top, fill: onFire(COUNT.note.size), ground: inks.fire }) : null}
        </Lead>
      </g>
    </g>
  )
}
