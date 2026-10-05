import type { Component } from "@/ir"
import { kpiFigure } from "../../components/kpi"
import { joinUnit } from "../../lib/quantity-format"
import type { EmphasisHeadingLayout } from "../../render/emphasis"
import { paintIcon } from "./console"
import { fitMemo, memoInks, memoText, memoWidth, paintMemo, paintMemoLine } from "./memo"
import { blockTag, compositionTag, type Composition } from "./shared"

type KpiCards = Extract<Component, { type: "kpi_cards" }>

/*
 * tallies: the reasons a decision rests on, each with the figure behind it,
 * memo's 2026-10 board (the reasons page, p03). One row a reason, on a
 * hairline: its icon in the mark, its name bold in the heading face, the
 * figure under the name set large in the heading face in the mark, and
 * beside the figure the sentence that says where it comes from.
 *
 * Every figure is in the mark: on this page the figures are the reasons,
 * and the row's name says which is which. A figure written `**…**` is set
 * the same way.
 *
 * Takes, in the memo setting: one `kpi_cards` of two to four items, every
 * one with an `icon`, a `label` and a `note`, and no delta, tag or source.
 *
 * Declines: a name past one line, a figure wider than its column, a note
 * past three lines, and rows taller than the band.
 *
 * Reads: the memo inks (`./memo.tsx`), the heading and body faces.
 */

const INSET = 10
const PITCH = 146
const RULE_ABOVE = 10
const ICON = { x: 4, top: 6, size: 28 } as const
const NAME = { x: 50, top: 2, size: 22, lineHeight: 34 } as const
const FIGURE = { x: 50, top: 40, size: 48, lineHeight: 60, w: 160 } as const
const NOTE = { x: 220, top: 44, size: 16, lineHeight: 26, maxLines: 3 } as const

export const talliesComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "memo") return null
  const [kpis, ...rest] = components
  if (kpis?.type !== "kpi_cards" || rest.length > 0) return null
  const items = (kpis as KpiCards).items
  if (items.length < 2 || items.length > 4) return null
  if (items.some((item) => !item.icon || !item.note?.trim() || item.delta || item.tag || item.source?.trim())) return null
  const inks = memoInks(ctx)
  const pitch = Math.min(PITCH, Math.floor((rect.h - INSET) / items.length))
  const rows: { icon: string; name: EmphasisHeadingLayout; value: string; note: EmphasisHeadingLayout }[] = []
  for (const item of items) {
    const { text, unit } = kpiFigure(item.value, item.unit)
    const value = joinUnit(text, unit?.trim() || undefined)
    if (memoWidth(value, FIGURE.size, "song", ctx, true) > FIGURE.w) return null
    const name = fitMemo(item.label, { width: rect.w - NAME.x, size: NAME.size, lineHeight: NAME.lineHeight, maxLines: 1, face: "song", bold: true }, ctx)
    const note = fitMemo(item.note, { width: rect.w - NOTE.x, size: NOTE.size, lineHeight: NOTE.lineHeight, maxLines: NOTE.maxLines, face: "body" }, ctx)
    if (!name || !note) return null
    if (Math.max(FIGURE.top + FIGURE.lineHeight, NOTE.top + note.lines.length * NOTE.lineHeight) > pitch - RULE_ABOVE) return null
    rows.push({ icon: item.icon!, name, value, note })
  }
  return (
    <g {...compositionTag("tallies")} {...blockTag(ctx, kpis)}>
      {rows.map(({ icon, name, value, note }, i) => {
        const top = rect.y + INSET + i * pitch
        return (
          <g key={i} data-memo-tally={i}>
            {i > 0 ? <rect x={rect.x} y={top - RULE_ABOVE} width={rect.w} height={1} fill={inks.line} /> : null}
            {paintIcon(icon, rect.x + ICON.x, top + ICON.top, ICON.size, inks.mark, inks.ground)}
            {paintMemo(name, { ctx, x: rect.x + NAME.x, top: top + NAME.top, face: "song", bold: true, fill: memoText(inks.ink, inks.ground, NAME.size) })}
            {paintMemoLine(value, {
              ctx,
              x: rect.x + FIGURE.x,
              top: top + FIGURE.top,
              lineHeight: FIGURE.lineHeight,
              size: FIGURE.size,
              face: "song",
              fill: memoText(inks.mark, inks.ground, FIGURE.size),
              bold: true,
            })}
            {paintMemo(note, { ctx, x: rect.x + NOTE.x, top: top + NOTE.top, face: "body", fill: memoText(inks.ink, inks.ground, NOTE.size) })}
          </g>
        )
      })}
    </g>
  )
}
