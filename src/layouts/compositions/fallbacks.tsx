import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import { Lead, fireTint, fitMarquee, glossBreak, marqueeInks, marqueeText, paintMarquee, paintMarqueeCard, paintMarqueeIcon, splitName } from "./marquee"

type Table = Extract<Component, { type: "data_table" }>

/*
 * fallbacks: a plan B for every risk, rally's 2026-10 board (the risk page,
 * p13). Two small headers over a stack of bars, one a risk: its icon, the
 * risk's name bold, what happened in grey, an arrow of the accent, and the
 * plan B in the light. The header over the plans is in the accent. The row
 * the page leads with (`emphasis: "highlight"`) sits on a tint of the accent,
 * its icon in the accent and its plan bold.
 *
 * A cell of the first column is written "risk：what happened" (「天气：2026-07
 * 台风…」). The colon is declared on the name's line (`data-gloss-break`),
 * not printed.
 *
 * Takes, in the marquee setting: a `data_table` of two columns, none marked
 * or with an icon, and two to six rows each with an icon, first cells written
 * that way, at most one highlighted and none a total or tagged; no title or
 * source.
 *
 * Declines: a name past its column, what happened or a plan past two lines,
 * and a header past its half.
 *
 * Reads: the marquee inks (`./marquee.tsx`), the body and heading faces.
 */

const HEAD = { top: 2, size: 12, lineHeight: 20, plan: 696 } as const
const ROWS = { top: 28, pitch: 70, h: 62, r: 10, tint: 0.18, icon: { x: 20, dy: 19, size: 24 }, name: { x: 56, top: 18, size: 17, lineHeight: 26, w: 120 }, event: { x: 180, top: 10, size: 14, lineHeight: 22, maxLines: 2, w: 480 }, arrow: { x: 666, dy: 25, w: 12, h: 12 }, plan: { x: 696, top: 10, size: 14, lineHeight: 22, maxLines: 2 } } as const

export const fallbacksComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "marquee") return null
  const [table, ...rest] = components
  if (table?.type !== "data_table" || rest.length > 0) return null
  const t = table as Table
  if (t.title || t.source || t.columns.length !== 2 || t.columns.some((col) => col.emphasis || col.icon)) return null
  if (t.rows.length < 2 || t.rows.length > 6 || t.rows.some((row) => !row.icon || row.tag || row.emphasis === "total") || t.rows.filter((row) => row.emphasis === "highlight").length > 1) return null
  if (rect.h < ROWS.top + t.rows.length * ROWS.pitch - (ROWS.pitch - ROWS.h)) return null
  const inks = marqueeInks(ctx)
  const [risk, plan] = t.columns as [Table["columns"][number], Table["columns"][number]]
  const planW = rect.w - ROWS.plan.x - 16
  const riskHead = fitMarquee(risk.label, { width: HEAD.plan - 24, size: HEAD.size, lineHeight: HEAD.lineHeight, maxLines: 1, bold: true }, ctx)
  const planHead = fitMarquee(plan.label, { width: planW, size: HEAD.size, lineHeight: HEAD.lineHeight, maxLines: 1, bold: true }, ctx)
  if (!riskHead || !planHead) return null
  const rows = t.rows.map((row, i) => {
    const split = splitName(String(row.cells[risk.key] ?? ""))
    if (!split) return null
    const lit = row.emphasis === "highlight"
    const name = fitMarquee(split.name, { width: ROWS.name.w, size: ROWS.name.size, lineHeight: ROWS.name.lineHeight, maxLines: 1, bold: true }, ctx)
    const event = fitMarquee(split.rest, { width: ROWS.event.w, size: ROWS.event.size, lineHeight: ROWS.event.lineHeight, maxLines: ROWS.event.maxLines }, ctx)
    const answer = fitMarquee(String(row.cells[plan.key] ?? ""), { width: planW, size: ROWS.plan.size, lineHeight: ROWS.plan.lineHeight, maxLines: ROWS.plan.maxLines, bold: lit }, ctx)
    if (!name || !event || !answer) return null
    return { row, i, split, lit, name, event, answer }
  })
  if (rows.some((r) => !r)) return null
  const x = (dx: number) => rect.x + dx
  const y = (dy: number) => rect.y + dy

  return (
    <g {...compositionTag("fallbacks")} {...blockTag(ctx, t)}>
      {paintMarquee(riskHead, { ctx, x: x(0), top: y(HEAD.top), bold: true, fill: marqueeText(inks.muted, inks.ground, HEAD.size), ground: inks.ground })}
      {paintMarquee(planHead, { ctx, x: x(HEAD.plan), top: y(HEAD.top), bold: true, fill: marqueeText(inks.fire, inks.ground, HEAD.size), ground: inks.ground })}
      {rows.map((r) => {
        const { row, i, split, lit, name, event, answer } = r!
        const top = y(ROWS.top + i * ROWS.pitch)
        const ground = lit ? fireTint(inks, ROWS.tint) : inks.card
        const bar = paintMarqueeCard({ x: x(0), y: top, w: rect.w, h: ROWS.h }, inks, { fill: ground, r: ROWS.r })
        return (
          <g key={i} data-risk={split.name}>
            {lit ? <Lead id="row">{bar}</Lead> : bar}
            {paintMarqueeIcon(row.icon!, x(ROWS.icon.x), top + ROWS.icon.dy, ROWS.icon.size, lit ? inks.fire : inks.muted, ground)}
            {paintMarquee(name, { ctx, x: x(ROWS.name.x), top: top + ROWS.name.top, bold: true, fill: marqueeText(inks.ink, ground, ROWS.name.size), ground, lastAttrs: glossBreak(split.sep) })}
            {paintMarquee(event, { ctx, x: x(ROWS.event.x), top: top + ROWS.event.top, fill: marqueeText(inks.muted, ground, ROWS.event.size), ground })}
            <polygon points={`${x(ROWS.arrow.x)},${top + ROWS.arrow.dy} ${x(ROWS.arrow.x + ROWS.arrow.w)},${top + ROWS.arrow.dy + ROWS.arrow.h / 2} ${x(ROWS.arrow.x)},${top + ROWS.arrow.dy + ROWS.arrow.h}`} fill={inks.fire} />
            {paintMarquee(answer, { ctx, x: x(ROWS.plan.x), top: top + ROWS.plan.top, bold: lit, fill: marqueeText(inks.ink, ground, ROWS.plan.size), ground })}
          </g>
        )
      })}
    </g>
  )
}
