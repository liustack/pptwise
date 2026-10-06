import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import { Lead, binderInks, binderText, binderWidth, fitBinder, paintBinder, paintBinderIcon, paintBinderLine, paintChip } from "./binder"
import { BinderBar, fitBinderBar, BAR, type BarSpec } from "./binder-bars"

type FromTo = Extract<Component, { type: "from_to" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * drift: how far a few measures have moved, proposal's 2026-10 board (p09).
 * Over the rows the two states' names in small grey. A row a measure, under
 * a rule (2px of petrol over the first, a hairline over the rest): its icon
 * in petrol, its name bold over its note in small grey, the value it had at
 * 38px in a faded grey, an arrow, the value it has now at 38px in petrol (the
 * measure the page is about in the brick red), each with its unit after it in
 * small type, and what the move is as a pale petrol chip at the right. Under
 * the rows a hairline, then a bar of sand with the note's icon and one line.
 *
 * Takes, in the binder setting: a `from_to` of three or four rows, each with
 * an icon, with no change, label column, span or state kickers, at most one
 * row marked; then optionally a `callout` with no title or tag.
 *
 * Declines: a name, note, value or chip past its column, and a note past one
 * line.
 *
 * Reads: the binder inks (`./binder.tsx`).
 */

const HEAD = { top: 6, size: 12, lineHeight: 18 } as const
const COLS = { from: 316, arrow: 576, to: 656 } as const
const ROW = { top: 32, step: 108, icon: { dy: 30, size: 22 }, name: { x: 34, dy: 24, size: 18, lineHeight: 28, w: 270 }, note: { x: 34, dy: 56, size: 12, lineHeight: 17, maxLines: 2, w: 270 }, value: { dy: 22, size: 38, lineHeight: 54, w: 240 }, unit: { size: 14, gap: 10 }, arrow: { dy: 37, size: 26 }, chip: { dy: 38, h: 26, size: 13 } } as const
const SAND: BarSpec = { ...BAR, fill: "card" }
const BAR_GAP = 18

export const driftComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "binder") return null
  const [shift, note, ...rest] = components
  if (shift?.type !== "from_to" || rest.length > 0 || (note && note.type !== "callout")) return null
  const s = shift as FromTo
  const n = s.rows.length
  if (n < 3 || n > 4 || s.label_column || s.span || s.from.kicker || s.to.kicker) return null
  if (s.rows.some((r) => !r.icon || r.change)) return null
  const bottom = ROW.top + n * ROW.step
  const callout = note as Callout | undefined
  if (rect.w < 1132 || rect.h < bottom + (callout ? BAR_GAP + SAND.h : 0)) return null
  const inks = binderInks(ctx)
  const fromHead = fitBinder(s.from.title, { width: COLS.arrow - COLS.from, size: HEAD.size, lineHeight: HEAD.lineHeight, maxLines: 1, bold: true }, ctx)
  const toHead = fitBinder(s.to.title, { width: rect.w - COLS.to - 200, size: HEAD.size, lineHeight: HEAD.lineHeight, maxLines: 1, bold: true }, ctx)
  if (!fromHead || !toHead) return null

  const rows = s.rows.map((r) => {
    const name = fitBinder(r.label, { width: ROW.name.w, size: ROW.name.size, lineHeight: ROW.name.lineHeight, maxLines: 1, bold: true }, ctx)
    const sub = r.note?.trim() ? fitBinder(r.note, { width: ROW.note.w, size: ROW.note.size, lineHeight: ROW.note.lineHeight, maxLines: ROW.note.maxLines }, ctx) : null
    const unit = r.unit?.trim() ?? ""
    const unitW = unit ? ROW.unit.gap + binderWidth(unit, ROW.unit.size, ctx) : 0
    const from = binderWidth(r.from, ROW.value.size, ctx, true) + unitW
    const to = binderWidth(r.to, ROW.value.size, ctx, true) + unitW
    const chip = r.tag?.text.trim() ?? ""
    const chipW = chip ? binderWidth(chip, ROW.chip.size, ctx, true) + 22 : 0
    if (!name || (r.note?.trim() && !sub) || from > COLS.arrow - COLS.from - 8 || COLS.to + to + 16 + chipW > rect.w) return null
    return { r, name, sub, unit, chip, chipW, fromW: binderWidth(r.from, ROW.value.size, ctx, true), toW: binderWidth(r.to, ROW.value.size, ctx, true) }
  })
  if (rows.some((row) => !row)) return null
  const bar = callout ? fitBinderBar(callout, rect.w, ctx, SAND) : null
  if (callout && !bar) return null
  const headY = rect.y + HEAD.top

  return (
    <g {...compositionTag("drift")}>
      <g {...blockTag(ctx, s)}>
        {paintBinder(fromHead, { ctx, x: rect.x + COLS.from, top: headY, bold: true, fill: binderText(inks.muted, inks.ground, HEAD.size) })}
        {paintBinder(toHead, { ctx, x: rect.x + COLS.to, top: headY, bold: true, fill: binderText(inks.muted, inks.ground, HEAD.size) })}
        {rows.map((row, i) => {
          const { r, name, sub, unit, chip, chipW, fromW, toW } = row!
          const y = rect.y + ROW.top + i * ROW.step
          const lit = r.emphasis === true
          const valueBase = (top: number) => Math.round(top + ROW.value.lineHeight / 2 + ROW.value.size * 0.385)
          const toValue = (
            <g data-binder-now="">
              {paintBinderLine(r.to.trim(), { ctx, x: rect.x + COLS.to, baseline: valueBase(y + ROW.value.dy), size: ROW.value.size, bold: true, fill: binderText(lit ? inks.fire : inks.deep, inks.ground, ROW.value.size) })}
            </g>
          )
          return (
            <g key={i} data-binder-shift={stripEmphasis(r.label)}>
              <rect x={rect.x} y={y} width={rect.w} height={i === 0 ? 2 : 1} fill={i === 0 ? inks.deep : inks.line} />
              {paintBinderIcon(r.icon!, rect.x, y + ROW.icon.dy, ROW.icon.size, inks.deep, inks.ground)}
              {paintBinder(name, { ctx, x: rect.x + ROW.name.x, top: y + ROW.name.dy, bold: true, fill: binderText(inks.ink, inks.ground, ROW.name.size) })}
              {sub ? paintBinder(sub, { ctx, x: rect.x + ROW.note.x, top: y + ROW.note.dy, fill: binderText(inks.muted, inks.ground, ROW.note.size) }) : null}
              {paintBinderLine(r.from.trim(), { ctx, x: rect.x + COLS.from, baseline: valueBase(y + ROW.value.dy), size: ROW.value.size, bold: true, fill: binderText(inks.fade, inks.ground, ROW.value.size) })}
              {unit ? paintBinderLine(unit, { ctx, x: rect.x + COLS.from + fromW + ROW.unit.gap, baseline: valueBase(y + ROW.value.dy), size: ROW.unit.size, fill: binderText(inks.fade, inks.ground, ROW.unit.size) }) : null}
              {paintBinderIcon("arrow-right", rect.x + COLS.arrow, y + ROW.arrow.dy, ROW.arrow.size, inks.muted, inks.ground)}
              {lit ? <Lead id="now">{toValue}</Lead> : toValue}
              {unit ? paintBinderLine(unit, { ctx, x: rect.x + COLS.to + toW + ROW.unit.gap, baseline: valueBase(y + ROW.value.dy), size: ROW.unit.size, fill: binderText(inks.muted, inks.ground, ROW.unit.size) }) : null}
              {chip ? paintChip(chip, rect.x + rect.w - chipW, y + ROW.chip.dy, { size: ROW.chip.size, h: ROW.chip.h, fg: inks.deep, bg: inks.pale }, ctx, inks).node : null}
            </g>
          )
        })}
        <rect x={rect.x} y={rect.y + bottom} width={rect.w} height={1} fill={inks.line} />
      </g>
      {callout && bar ? <BinderBar callout={callout} fitted={bar} x={rect.x} y={rect.y + bottom + BAR_GAP} w={rect.w} ctx={ctx} spec={SAND} /> : null}
    </g>
  )
}
