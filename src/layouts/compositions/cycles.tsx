import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import { binderInks, binderText, binderWidth, fitBinder, glossBreak, paintBinder, paintBinderIcon, paintBinderLine, splitDot, splitName } from "./binder"
import { BinderPlainLine, fitPlainLine, noteHeight } from "./binder-bars"
import type { Recipe } from "./recipe"

type Comparison = Extract<Component, { type: "comparison" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * cycles: what a store of energy earns a day, worked out place by place,
 * proposal's 2026-10 print board (p08). Over the columns the formula bold
 * in petrol with what it rests on in small grey at the right (the callout's
 * tag), a hairline under both. A column a place, parted by a hairline: its
 * name at 20px in petrol, the comparison's title at its right in small grey
 * (the unit every column reads in), then a line a cycle: the cycle's name in
 * small grey, what it buys at and sells at with an arrow between, what it
 * earns at the right in petrol; a hairline; the marked row's label in small
 * grey, after it the part of the figure's cell after a " · " (「1111.3 元 ·
 * 未计尖峰」), and the day's figure at 44px in petrol; at the right the last
 * row's label and its range bold. Under the columns, the warning as a line:
 * its icon and its title in the brick red, the one thing the page lights,
 * and its text after them.
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
 * Declines: a formula and its source past the line, a name, cycle, figure or
 * range past its column, and a warning past two lines.
 *
 * Reads: the binder inks (`./binder.tsx`).
 */

const FORMULA = { top: 0, lineHeight: 36, size: 18, tag: { size: 13 }, rule: 44 } as const
const COL = { top: 64, pad: 28, h: 268, name: { top: 10, size: 20, lineHeight: 30 }, unit: { top: 16, size: 12, lineHeight: 20, w: 200 }, cycles: { top: 54, step: 44, name: { size: 13 }, from: { dx: 82 }, arrow: { dx: 182, dy: 7, size: 18 }, to: { dx: 212 }, size: 15, lineHeight: 32, value: { size: 18 } }, rule: 10, day: { label: { size: 13, lineHeight: 20 }, figure: { dy: 22, size: 44, lineHeight: 56 }, year: { dy: 30, size: 20, lineHeight: 32 }, rightW: 230 } } as const
const WARN = { gap: 24 } as const

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

/** What an author writes to get this drawing (`./recipe.ts`). */
export const cyclesRecipe: Recipe = {
  look: "What a store of energy earns a day, worked out place by place",
  kinds: ["data"],
  shapes: [{ parts: [{ type: "callout", needs: ["tag"] }, { type: "comparison", count: [4, 4], needs: ["title", "rows[].emphasis", "rows[].cells[]~colon"] }, { type: "callout", needs: ["title"] }] }],
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
  const w = rect.w / 2
  const inner = w - COL.pad

  // The formula bold in petrol, what it rests on in small grey at the right.
  const tagText = f.tag!.text.trim()
  const tagW = binderWidth(tagText, FORMULA.tag.size, ctx)
  const formulaLine = fitBinder(f.text, { width: rect.w - tagW - 24, size: FORMULA.size, lineHeight: FORMULA.lineHeight, maxLines: 1, bold: true }, ctx)
  if (!formulaLine) return null

  const cols = c.columns.map((name, i) => {
    const title = fitBinder(name, { width: inner - COL.unit.w - 8, size: COL.name.size, lineHeight: COL.name.lineHeight, maxLines: 1, bold: true }, ctx)
    const unit = fitBinder(c.title!, { width: COL.unit.w, size: COL.unit.size, lineHeight: COL.unit.lineHeight, maxLines: 1 }, ctx)
    const cycles = cycleRows.map((r) => readCycle(r.label.trim(), r.cells[i] ?? ""))
    if (!title || !unit || cycles.some((cy) => !cy)) return null
    for (const cy of cycles) {
      if (binderWidth(cy!.name, COL.cycles.name.size, ctx) > COL.cycles.from.dx - 8) return null
      if (binderWidth(cy!.from, COL.cycles.size, ctx, true) > COL.cycles.arrow.dx - COL.cycles.from.dx - 6) return null
      const toW = binderWidth(cy!.to, COL.cycles.size, ctx, true)
      const valueW = binderWidth(cy!.value, COL.cycles.value.size, ctx, true)
      if (COL.cycles.to.dx + toW + 12 + valueW > inner) return null
    }
    // A day's figure may carry a note after a " · ", which joins the row's label.
    const cell = (c.rows[marked]!.cells[i] ?? "").trim()
    const parts = splitDot(cell)
    const note = parts?.rest ?? ""
    const dayLabel = note ? `${c.rows[marked]!.label.trim()} · ${note}` : c.rows[marked]!.label.trim()
    const label = fitBinder(dayLabel, { width: inner - COL.day.rightW - 8, size: COL.day.label.size, lineHeight: COL.day.label.lineHeight, maxLines: 1, bold: true }, ctx)
    const yearLabel = fitBinder(year.label, { width: COL.day.rightW, size: COL.day.label.size, lineHeight: COL.day.label.lineHeight, maxLines: 1, bold: true }, ctx)
    const yearValue = fitBinder(year.cells[i] ?? "", { width: COL.day.rightW, size: COL.day.year.size, lineHeight: COL.day.year.lineHeight, maxLines: 1, bold: true }, ctx)
    if (!yearLabel || !yearValue) return null
    // The day's figure may run on to the year's figure under it at the right.
    const yearW = Math.max(binderWidth(year.label, COL.day.label.size, ctx, true), binderWidth(year.cells[i] ?? "", COL.day.year.size, ctx, true))
    const figure = fitBinder(stripEmphasis(parts ? parts.name : cell), { width: inner - yearW - 16, size: COL.day.figure.size, lineHeight: COL.day.figure.lineHeight, maxLines: 1, bold: true }, ctx)
    if (!label || !figure) return null
    return { title, unit, cycles: cycles.map((cy) => cy!), label, note, figure, yearLabel, yearValue }
  })
  if (cols.some((col) => !col)) return null

  const warn = fitPlainLine(wn, rect.w, ctx, 2)
  if (!warn) return null
  const ruleY = COL.cycles.top + cycleRows.length * COL.cycles.step + COL.rule
  const warnTop = rect.y + COL.top + COL.h + WARN.gap
  if (COL.top + COL.h + WARN.gap + noteHeight(warn) > rect.h) return null

  return (
    <g {...compositionTag("cycles")}>
      <g {...blockTag(ctx, f)} data-binder-formula-bar="">
        {paintBinder(formulaLine, { ctx, x: rect.x, top: rect.y + FORMULA.top, bold: true, fill: binderText(inks.deep, inks.ground, FORMULA.size) })}
        {paintBinderLine(tagText, { ctx, x: rect.x + rect.w, top: rect.y + FORMULA.top, lineHeight: FORMULA.lineHeight, size: FORMULA.tag.size, anchor: "end", fill: binderText(inks.muted, inks.ground, FORMULA.tag.size) })}
        <rect x={rect.x} y={rect.y + FORMULA.rule} width={rect.w} height={1} fill={inks.line} />
      </g>
      <g {...blockTag(ctx, c)}>
        {cols.map((col, i) => {
          const { title, unit, cycles, label, figure, yearLabel, yearValue } = col!
          const x = rect.x + i * w
          const y = rect.y + COL.top
          const tx = x + (i === 0 ? 0 : COL.pad)
          const right = tx + inner
          return (
            <g key={i} data-binder-cycles={stripEmphasis(c.columns[i]!)}>
              {i > 0 ? <rect x={x} y={y} width={1} height={COL.h} fill={inks.line} /> : null}
              {paintBinder(title, { ctx, x: tx, top: y + COL.name.top, bold: true, fill: binderText(inks.deep, inks.ground, COL.name.size) })}
              {paintBinder(unit, { ctx, x: right, top: y + COL.unit.top, anchor: "end", fill: binderText(inks.muted, inks.ground, COL.unit.size) })}
              {cycles.map((cy, j) => {
                const top = y + COL.cycles.top + j * COL.cycles.step
                const ink = binderText(inks.ink, inks.ground, COL.cycles.size)
                return (
                  <g key={j} data-binder-cycle={cy.name}>
                    {paintBinderLine(cy.name, { ctx, x: tx, top, lineHeight: COL.cycles.lineHeight, size: COL.cycles.name.size, fill: binderText(inks.muted, inks.ground, COL.cycles.name.size) })}
                    {paintBinderLine(cy.from, { ctx, x: tx + COL.cycles.from.dx, top, lineHeight: COL.cycles.lineHeight, size: COL.cycles.size, bold: true, fill: ink, attrs: glossBreak("→") })}
                    {paintBinderIcon("arrow-right", tx + COL.cycles.arrow.dx, top + COL.cycles.arrow.dy, COL.cycles.arrow.size, inks.muted, inks.ground)}
                    {paintBinderLine(cy.to, { ctx, x: tx + COL.cycles.to.dx, top, lineHeight: COL.cycles.lineHeight, size: COL.cycles.size, bold: true, fill: ink, attrs: glossBreak(cy.sep) })}
                    {paintBinderLine(cy.value, { ctx, x: right, top, lineHeight: COL.cycles.lineHeight, size: COL.cycles.value.size, bold: true, anchor: "end", fill: binderText(inks.deep, inks.ground, COL.cycles.value.size) })}
                  </g>
                )
              })}
              <rect x={tx} y={y + ruleY} width={inner} height={1} fill={inks.line} />
              {paintBinder(label, { ctx, x: tx, top: y + ruleY + 12, bold: true, fill: binderText(inks.muted, inks.ground, COL.day.label.size) })}
              {paintBinder(figure, { ctx, x: tx, top: y + ruleY + 12 + COL.day.figure.dy, bold: true, fill: binderText(inks.deep, inks.ground, COL.day.figure.size) })}
              {paintBinder(yearLabel, { ctx, x: right, top: y + ruleY + 12, bold: true, anchor: "end", fill: binderText(inks.muted, inks.ground, COL.day.label.size) })}
              {paintBinder(yearValue, { ctx, x: right, top: y + ruleY + 12 + COL.day.year.dy, bold: true, anchor: "end", fill: binderText(inks.ink, inks.ground, COL.day.year.size) })}
            </g>
          )
        })}
      </g>
      <g data-binder-warning="">
        <BinderPlainLine callout={wn} text={warn} x={rect.x} y={warnTop} ctx={ctx} lead />
      </g>
    </g>
  )
}
