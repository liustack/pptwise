import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import { Lead, binderInks, binderText, binderWidth, fitBinder, glossBreak, paintBinder, paintBinderCard, paintBinderIcon, paintBinderLine, paintChip, splitDot, splitName } from "./binder"

type Comparison = Extract<Component, { type: "comparison" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * cycles: what a store of energy earns a day, worked out place by place,
 * proposal's 2026-10 board (p08). Over the cards the formula on a bar of the
 * pale petrol, bold in petrol, with what it rests on as a white chip at the
 * right (the callout's tag). A card a place: its name at 20px in petrol, the
 * comparison's title at its right in small grey (the unit every card reads
 * in), then a line a cycle: the cycle's name as a white chip, what it buys at
 * and sells at with an arrow between, what it earns at the right in petrol;
 * a hairline; the marked row's label in small grey, after it the part of the
 * figure's cell after a " · " (「1111.3 元 · 未计尖峰」), and the day's figure at
 * 44px in petrol; at the right
 * the last row's label and its range bold. Under the cards, the warning in a
 * box outlined in the tangerine, its icon in the darker tangerine, its title
 * bold and its text grey.
 *
 * A cycle's cell is written "buy → sell：earns" (「谷 0.3828 → 峰 0.9566：514.1
 * 元」). The arrow is drawn, and the colon declared on the line it ends
 * (`data-gloss-break`), not printed.
 *
 * Takes, in the binder setting: a `callout` with no title and a tag (the
 * formula); a `comparison` of two columns with a title, no label column,
 * tags, icons or recommendation, whose rows are one to three cycles written
 * that way, then the marked row and one labelled row (the year); then a
 * `callout` with a title and no tag.
 *
 * Declines: a formula or a chip past the bar, a name, cycle, figure or range
 * past its card, and a warning past one line.
 *
 * Reads: the binder inks (`./binder.tsx`).
 */

const FORMULA = { top: 4, h: 52, padLeft: 24, size: 18, chip: { right: 54, h: 24, size: 12 } } as const
const CARD = { top: 72, gap: 16, h: 280, pad: 28, name: { top: 18, size: 20, lineHeight: 30 }, unit: { top: 24, size: 12, lineHeight: 20, w: 200 }, cycles: { top: 62, step: 44, chip: { dy: 4, h: 24, size: 12 }, from: { dx: 82 }, arrow: { dx: 182, dy: 7, size: 18 }, to: { dx: 212 }, size: 15, lineHeight: 32, value: { size: 18 } }, rule: 10, day: { label: { size: 13, lineHeight: 20 }, figure: { dy: 22, size: 44, lineHeight: 56 }, year: { dy: 30, size: 20, lineHeight: 32 }, rightW: 230 } } as const
const WARN = { gap: 16, h: 72, border: 2, icon: { x: 24, y: 22, size: 24 }, textX: 62, title: { top: 12, size: 16, lineHeight: 24 }, text: { top: 38, size: 14, lineHeight: 24 } } as const

interface Cycle {
  name: string
  from: string
  to: string
  value: string
  sep: string
}

function readCycle(name: string, cell: string): Cycle | null {
  const split = splitName(cell.trim())
  // The earning follows the last colon: the buy and sell sides may hold none.
  if (!split) return null
  const legs = /^(.+?)\s*→\s*(.+)$/su.exec(split.name)
  if (!legs) return null
  return { name, from: legs[1]!.trim(), to: legs[2]!.trim(), value: split.rest, sep: split.sep }
}

export const cyclesComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "binder") return null
  const [formula, table, warning, ...rest] = components
  if (formula?.type !== "callout" || table?.type !== "comparison" || warning?.type !== "callout" || rest.length > 0) return null
  const f = formula as Callout
  const c = table as Comparison
  const wn = warning as Callout
  if (f.title || !f.tag || !wn.title?.trim() || wn.tag) return null
  if (c.columns.length !== 2 || !c.title?.trim() || c.label_column || c.tag_column || c.recommended !== undefined || c.rows.some((r) => r.tag || r.icon)) return null
  const marked = c.rows.findIndex((r) => r.emphasis)
  if (marked < 1 || marked > 3) return null
  const after = c.rows.slice(marked + 1)
  const year = after[0]
  if (!year || !year.label.trim() || after.length !== 1) return null
  const cycleRows = c.rows.slice(0, marked)
  if (cycleRows.some((r) => !r.label.trim())) return null
  const inks = binderInks(ctx)
  const w = (rect.w - CARD.gap) / 2
  const inner = w - CARD.pad * 2
  const bottom = CARD.top + CARD.h + WARN.gap + WARN.h
  if (rect.w < 1132 || rect.h < bottom) return null

  // The formula bar: the formula bold in petrol, the tag a white chip at the right.
  const tagText = f.tag!.text.trim()
  const chipW = binderWidth(tagText, FORMULA.chip.size, ctx, true) + 22
  const formulaLine = fitBinder(f.text, { width: rect.w - FORMULA.padLeft - FORMULA.chip.right - chipW - 16, size: FORMULA.size, lineHeight: FORMULA.h, maxLines: 1, bold: true }, ctx)
  if (!formulaLine) return null

  const cards = c.columns.map((name, i) => {
    const title = fitBinder(name, { width: inner - CARD.unit.w - 8, size: CARD.name.size, lineHeight: CARD.name.lineHeight, maxLines: 1, bold: true }, ctx)
    const unit = fitBinder(c.title!, { width: CARD.unit.w, size: CARD.unit.size, lineHeight: CARD.unit.lineHeight, maxLines: 1 }, ctx)
    const cycles = cycleRows.map((r) => readCycle(r.label.trim(), r.cells[i] ?? ""))
    if (!title || !unit || cycles.some((cy) => !cy)) return null
    for (const cy of cycles) {
      const chipRoom = binderWidth(cy!.name, CARD.cycles.chip.size, ctx, true) + 22
      if (chipRoom > CARD.cycles.from.dx - 6) return null
      if (binderWidth(cy!.from, CARD.cycles.size, ctx, true) > CARD.cycles.arrow.dx - CARD.cycles.from.dx - 6) return null
      const toW = binderWidth(cy!.to, CARD.cycles.size, ctx, true)
      const valueW = binderWidth(cy!.value, CARD.cycles.value.size, ctx, true)
      if (CARD.cycles.to.dx + toW + 12 + valueW > inner) return null
    }
    // A day's figure may carry a note after a " · ", which joins the row's label.
    const cell = (c.rows[marked]!.cells[i] ?? "").trim()
    const parts = splitDot(cell)
    const note = parts?.rest ?? ""
    const dayLabel = note ? `${c.rows[marked]!.label.trim()} · ${note}` : c.rows[marked]!.label.trim()
    const label = fitBinder(dayLabel, { width: inner - CARD.day.rightW - 8, size: CARD.day.label.size, lineHeight: CARD.day.label.lineHeight, maxLines: 1, bold: true }, ctx)
    const yearLabel = fitBinder(year.label, { width: CARD.day.rightW, size: CARD.day.label.size, lineHeight: CARD.day.label.lineHeight, maxLines: 1, bold: true }, ctx)
    const yearValue = fitBinder(year.cells[i] ?? "", { width: CARD.day.rightW, size: CARD.day.year.size, lineHeight: CARD.day.year.lineHeight, maxLines: 1, bold: true }, ctx)
    if (!yearLabel || !yearValue) return null
    // The day's figure may run on to the year's figure under it at the right.
    const yearW = Math.max(binderWidth(year.label, CARD.day.label.size, ctx, true), binderWidth(year.cells[i] ?? "", CARD.day.year.size, ctx, true))
    const figure = fitBinder(stripEmphasis(parts ? parts.name : cell), { width: inner - yearW - 16, size: CARD.day.figure.size, lineHeight: CARD.day.figure.lineHeight, maxLines: 1, bold: true }, ctx)
    if (!label || !figure) return null
    return { title, unit, cycles: cycles.map((cy) => cy!), label, note, figure, yearLabel, yearValue }
  })
  if (cards.some((card) => !card)) return null

  const warnTitle = fitBinder(wn.title!, { width: rect.w - WARN.textX - 24, size: WARN.title.size, lineHeight: WARN.title.lineHeight, maxLines: 1, bold: true }, ctx)
  const warnText = fitBinder(wn.text, { width: rect.w - WARN.textX - 16, size: WARN.text.size, lineHeight: WARN.text.lineHeight, maxLines: 1 }, ctx)
  if (!warnTitle || !warnText) return null
  const ruleY = CARD.cycles.top + cycleRows.length * CARD.cycles.step + CARD.rule
  const warnTop = rect.y + CARD.top + CARD.h + WARN.gap

  return (
    <g {...compositionTag("cycles")}>
      <g {...blockTag(ctx, f)} data-binder-formula-bar="">
        <rect x={rect.x} y={rect.y + FORMULA.top} width={rect.w} height={FORMULA.h} rx={10} fill={inks.pale} />
        {paintBinder(formulaLine, { ctx, x: rect.x + FORMULA.padLeft, top: rect.y + FORMULA.top, bold: true, fill: binderText(inks.deep, inks.pale, FORMULA.size), ground: inks.pale })}
        {paintChip(tagText, rect.x + rect.w - FORMULA.chip.right - chipW, rect.y + FORMULA.top + (FORMULA.h - FORMULA.chip.h) / 2, { size: FORMULA.chip.size, h: FORMULA.chip.h, fg: inks.deep, bg: inks.ground }, ctx, inks).node}
      </g>
      <g {...blockTag(ctx, c)}>
        {cards.map((card, i) => {
          const { title, unit, cycles, label, figure, yearLabel, yearValue } = card!
          const x = rect.x + i * (w + CARD.gap)
          const y = rect.y + CARD.top
          const tx = x + CARD.pad
          const right = x + w - CARD.pad
          return (
            <g key={i} data-binder-cycles={stripEmphasis(c.columns[i]!)}>
              {paintBinderCard({ x, y, w, h: CARD.h }, inks)}
              {paintBinder(title, { ctx, x: tx, top: y + CARD.name.top, bold: true, fill: binderText(inks.deep, inks.card, CARD.name.size), ground: inks.card })}
              {paintBinder(unit, { ctx, x: right, top: y + CARD.unit.top, anchor: "end", fill: binderText(inks.muted, inks.card, CARD.unit.size), ground: inks.card })}
              {cycles.map((cy, j) => {
                const top = y + CARD.cycles.top + j * CARD.cycles.step
                const ink = binderText(inks.ink, inks.card, CARD.cycles.size)
                return (
                  <g key={j} data-binder-cycle={cy.name}>
                    {paintChip(cy.name, tx, top + CARD.cycles.chip.dy, { size: CARD.cycles.chip.size, h: CARD.cycles.chip.h, fg: inks.muted, bg: inks.ground }, ctx, inks).node}
                    {paintBinderLine(cy.from, { ctx, x: tx + CARD.cycles.from.dx, top, lineHeight: CARD.cycles.lineHeight, size: CARD.cycles.size, bold: true, fill: ink, attrs: glossBreak("→") })}
                    {paintBinderIcon("arrow-right", tx + CARD.cycles.arrow.dx, top + CARD.cycles.arrow.dy, CARD.cycles.arrow.size, inks.muted, inks.card)}
                    {paintBinderLine(cy.to, { ctx, x: tx + CARD.cycles.to.dx, top, lineHeight: CARD.cycles.lineHeight, size: CARD.cycles.size, bold: true, fill: ink, attrs: glossBreak(cy.sep) })}
                    {paintBinderLine(cy.value, { ctx, x: right, top, lineHeight: CARD.cycles.lineHeight, size: CARD.cycles.value.size, bold: true, anchor: "end", fill: binderText(inks.deep, inks.card, CARD.cycles.value.size) })}
                  </g>
                )
              })}
              <rect x={tx} y={y + ruleY} width={right - tx} height={1} fill={inks.line} />
              {paintBinder(label, { ctx, x: tx, top: y + ruleY + 12, bold: true, fill: binderText(inks.muted, inks.card, CARD.day.label.size), ground: inks.card })}
              {paintBinder(figure, { ctx, x: tx, top: y + ruleY + 12 + CARD.day.figure.dy, bold: true, fill: binderText(inks.deep, inks.card, CARD.day.figure.size), ground: inks.card })}
              {paintBinder(yearLabel, { ctx, x: right, top: y + ruleY + 12, bold: true, anchor: "end", fill: binderText(inks.muted, inks.card, CARD.day.label.size), ground: inks.card })}
              {paintBinder(yearValue, { ctx, x: right, top: y + ruleY + 12 + CARD.day.year.dy, bold: true, anchor: "end", fill: binderText(inks.ink, inks.card, CARD.day.year.size), ground: inks.card })}
            </g>
          )
        })}
      </g>
      <g {...blockTag(ctx, wn)} data-binder-warning="">
        <Lead id="warning">
          <rect x={rect.x + WARN.border / 2} y={warnTop + WARN.border / 2} width={rect.w - WARN.border} height={WARN.h - WARN.border} rx={12 - WARN.border / 2} fill="none" stroke={inks.fire} strokeWidth={WARN.border} />
        </Lead>
        {wn.icon ? paintBinderIcon(wn.icon, rect.x + WARN.icon.x, warnTop + WARN.icon.y, WARN.icon.size, inks.fireText, inks.ground) : null}
        {paintBinder(warnTitle, { ctx, x: rect.x + WARN.textX, top: warnTop + WARN.title.top, bold: true, fill: binderText(inks.ink, inks.ground, WARN.title.size) })}
        {paintBinder(warnText, { ctx, x: rect.x + WARN.textX, top: warnTop + WARN.text.top, fill: binderText(inks.muted, inks.ground, WARN.text.size) })}
      </g>
    </g>
  )
}
