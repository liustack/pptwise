import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import { Lead, binderInks, binderText, binderWidth, fitBinder, glossBreak, paintBinder, paintBinderLine, wholeMark, binderBaseline } from "./binder"
import { BinderPlainLine, fitPlainLine } from "./binder-bars"
import type { Recipe } from "./recipe"

type Table = Extract<Component, { type: "data_table" }>
type Kpis = Extract<Component, { type: "kpi_cards" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * workings: a sum worked out on one page, proposal's 2026-10 print board
 * (p06), the page a proposal is judged on. At the left the inputs as a
 * ruled table: the column headers in small grey over a 2px rule of the ink,
 * a row an input under a hairline, its symbol in italic petrol before its
 * name bold, how it is reached in grey, its value bold to the right, and the
 * kind of source it rests on in small grey in a column of its own. At the
 * right the working, two figures under each other parted by a hairline:
 * what is worked out in grey, the figure at 52px in petrol with its unit
 * after it at 20px, and the formula in italic with the figures put in after
 * " = "; the answer the page lands on under it at 72px in the brick red.
 * Under both, a line with a grey icon saying what the sum leaves out.
 *
 * The table's first column names each input after its symbol and a space
 * (「E 年发电量」, "E Annual output"); a figure's note is its formula and the
 * figures put in, written "formula = figures" (「E × p − O = 108 × 0.45 − 4.6」).
 * The space after the symbol is declared on its line (`data-gloss-break`),
 * not printed.
 *
 * Takes, in the binder setting: a `data_table` of four columns (the name,
 * how it is reached, the value aligned right, the kind of source) and two to
 * four rows with no icon, tag, emphasis or source, every name led by a
 * one-letter symbol; a `kpi_cards` of two figures with notes written that
 * way, the second marked whole; optionally a `callout` with no title or tag.
 *
 * Declines: a name, a way, a value or a source kind past its column, a
 * formula, figures or result past its column, and a line past one line.
 *
 * Reads: the binder inks (`./binder.tsx`).
 */

const TABLE = { w: 736, gap: 16, cols: { name: 150, value: 150, kind: 96 }, head: { size: 13, lineHeight: 18, pad: 8 }, rule: 2, row: 66, symbol: { size: 22, gap: 10 }, name: { size: 15 }, how: { size: 14, lineHeight: 20, maxLines: 2 }, value: { size: 18 }, kind: { size: 13, lineHeight: 18, maxLines: 2 } } as const
const WORK = { x: 800, w: 352, label: { size: 14, lineHeight: 20 }, gap: 6, result: { size: 52, lineHeight: 58, unit: 20 }, answer: { size: 72, lineHeight: 76, unit: 24 }, unitGap: 6, formula: { size: 13, lineHeight: 18 }, pad: 22 } as const
const FOOT = { gap: 36 } as const
const SYMBOL = /^([A-Za-zα-ωΑ-Ω])\s+(.+)$/su
const FIGURE = /^([+−-]?[\d.,]+)\s+(\S.*)$/su

function splitFormula(note: string | undefined): { formula: string; figures: string } | null {
  const m = /^(.+?)\s+=\s+(.+)$/su.exec(note?.trim() ?? "")
  return m ? { formula: m[1]!.trim(), figures: m[2]!.trim() } : null
}

/** What an author writes to get this drawing (`./recipe.ts`). */
export const workingsRecipe: Recipe = {
  look: "A sum worked out on one page",
  kinds: ["data"],
  shapes: [{ parts: [{ type: "data_table", count: [2, 4], needs: ["columns[].align"] }, { type: "kpi_cards", count: [2, 2] }, { type: "callout", optional: true }] }],
}

export const workingsComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "binder") return null
  const [table, figures, foot, ...rest] = components
  if (table?.type !== "data_table" || figures?.type !== "kpi_cards" || rest.length > 0 || (foot && foot.type !== "callout")) return null
  const t = table as Table
  const k = figures as Kpis
  if (t.columns.length !== 4 || t.title || t.source || t.rows.length < 2 || t.rows.length > 4) return null
  const [nameCol, howCol, valueCol, kindCol] = t.columns as [Table["columns"][number], Table["columns"][number], Table["columns"][number], Table["columns"][number]]
  if (valueCol.align !== "right" || t.columns.some((col) => col.emphasis || col.icon)) return null
  if (t.rows.some((r) => r.icon || r.tag || r.emphasis)) return null
  if (k.items.length !== 2 || k.items.some((it) => it.icon || it.unit || it.delta || it.tag || it.tone || it.source)) return null
  if (wholeMark(k.items[0]!.value) || !wholeMark(k.items[1]!.value)) return null
  if (rect.w < WORK.x + WORK.w) return null
  const inks = binderInks(ctx)
  const cell = (row: Table["rows"][number], key: string) => String(row.cells[key] ?? "").trim()
  const right = WORK.x - 64
  const tableW = Math.min(TABLE.w, right)
  const howW = tableW - TABLE.cols.name - TABLE.cols.value - TABLE.cols.kind - TABLE.gap * 3
  const x = { name: 0, how: TABLE.cols.name + TABLE.gap, value: TABLE.cols.name + TABLE.gap + howW + TABLE.gap + TABLE.cols.value, kind: tableW - TABLE.cols.kind }

  const headOf = (col: Table["columns"][number], w: number) => (col.label.trim() ? fitBinder(col.label, { width: w, size: TABLE.head.size, lineHeight: TABLE.head.lineHeight, maxLines: 1 }, ctx) : null)
  const heads = [headOf(nameCol, TABLE.cols.name), headOf(howCol, howW), headOf(valueCol, TABLE.cols.value), headOf(kindCol, TABLE.cols.kind)]
  if (t.columns.some((col, i) => col.label.trim() && !heads[i])) return null
  const rows = t.rows.map((row) => {
    const m = SYMBOL.exec(cell(row, nameCol.key))
    if (!m) return null
    const symbolW = binderWidth(m[1]!, TABLE.symbol.size, ctx)
    const name = fitBinder(m[2]!, { width: TABLE.cols.name - symbolW - TABLE.symbol.gap, size: TABLE.name.size, lineHeight: TABLE.row, maxLines: 1, bold: true }, ctx)
    const how = cell(row, howCol.key) ? fitBinder(cell(row, howCol.key), { width: howW, size: TABLE.how.size, lineHeight: TABLE.how.lineHeight, maxLines: TABLE.how.maxLines }, ctx) : null
    const value = fitBinder(cell(row, valueCol.key), { width: TABLE.cols.value, size: TABLE.value.size, lineHeight: TABLE.row, maxLines: 1, bold: true }, ctx)
    const kind = cell(row, kindCol.key) ? fitBinder(cell(row, kindCol.key), { width: TABLE.cols.kind, size: TABLE.kind.size, lineHeight: TABLE.kind.lineHeight, maxLines: TABLE.kind.maxLines }, ctx) : null
    if (!name || (cell(row, howCol.key) && !how) || !value || (cell(row, kindCol.key) && !kind)) return null
    return { symbol: m[1]!, symbolW, name, how, value, kind }
  })
  if (rows.some((r) => !r)) return null

  const sums = k.items.map((it, i) => {
    const answer = i === 1
    const spec = answer ? WORK.answer : WORK.result
    const split = splitFormula(it.note)
    const label = fitBinder(it.label, { width: WORK.w, size: WORK.label.size, lineHeight: WORK.label.lineHeight, maxLines: 1 }, ctx)
    const raw = stripEmphasis(it.value).trim()
    const figure = FIGURE.exec(raw)
    const main = figure ? figure[1]! : raw
    const unit = figure ? figure[2]!.trim() : ""
    const width = binderWidth(main, spec.size, ctx, true) + (unit ? WORK.unitGap + binderWidth(unit, spec.unit, ctx, true) : 0)
    const formulaW = split ? binderWidth(split.formula, WORK.formula.size, ctx) + binderWidth(` = ${split.figures}`, WORK.formula.size, ctx) : 0
    if (!label || width > WORK.w || formulaW > WORK.w || (it.note?.trim() && !split)) return null
    return { label, main, unit, mainW: binderWidth(main, spec.size, ctx, true), split, answer, spec }
  })
  if (sums.some((s) => !s)) return null
  const tableH = TABLE.head.lineHeight + TABLE.head.pad + TABLE.rule + rows.length * TABLE.row
  const sumH = (s: NonNullable<(typeof sums)[number]>) => WORK.label.lineHeight + WORK.gap + s.spec.lineHeight + (s.split ? WORK.gap + WORK.formula.lineHeight : 0)
  const workH = sumH(sums[0]!) + WORK.pad * 2 + 1 + sumH(sums[1]!)
  const footTop = Math.max(tableH, workH) + FOOT.gap
  const footer = foot ? fitPlainLine(foot as Callout, rect.w, ctx) : null
  if (foot && !footer) return null
  if (footTop + (foot ? 28 : 0) > rect.h) return null

  const headInk = binderText(inks.muted, inks.ground, TABLE.head.size)
  const rowTop = rect.y + TABLE.head.lineHeight + TABLE.head.pad + TABLE.rule
  return (
    <g {...compositionTag("workings")}>
      <g {...blockTag(ctx, t)} data-binder-inputs="">
        {heads[0] ? paintBinder(heads[0], { ctx, x: rect.x + x.name, top: rect.y, fill: headInk }) : null}
        {heads[1] ? paintBinder(heads[1], { ctx, x: rect.x + x.how, top: rect.y, fill: headInk }) : null}
        {heads[2] ? paintBinder(heads[2], { ctx, x: rect.x + x.value, top: rect.y, anchor: "end", fill: headInk }) : null}
        {heads[3] ? paintBinder(heads[3], { ctx, x: rect.x + x.kind, top: rect.y, fill: headInk }) : null}
        <rect x={rect.x} y={rowTop - TABLE.rule} width={tableW} height={TABLE.rule} fill={inks.ink} />
        {rows.map((r, i) => {
          const { symbol, symbolW, name, how, value, kind } = r!
          const y = rowTop + i * TABLE.row
          const mid = binderBaseline(y, TABLE.row, TABLE.name.size)
          return (
            <g key={i} data-binder-input={symbol}>
              {paintBinderLine(symbol, { ctx, x: rect.x + x.name, baseline: mid, size: TABLE.symbol.size, italic: true, fill: binderText(inks.deep, inks.ground, TABLE.symbol.size), attrs: glossBreak(" ") })}
              {paintBinder(name, { ctx, x: rect.x + x.name + symbolW + TABLE.symbol.gap, baseline: mid, bold: true, fill: binderText(inks.ink, inks.ground, TABLE.name.size) })}
              {how ? paintBinder(how, { ctx, x: rect.x + x.how, top: y + (TABLE.row - how.lines.length * TABLE.how.lineHeight) / 2, fill: binderText(inks.muted, inks.ground, TABLE.how.size) }) : null}
              {paintBinder(value, { ctx, x: rect.x + x.value, baseline: binderBaseline(y, TABLE.row, TABLE.value.size), bold: true, anchor: "end", fill: binderText(inks.ink, inks.ground, TABLE.value.size) })}
              {kind ? paintBinder(kind, { ctx, x: rect.x + x.kind, top: y + (TABLE.row - kind.lines.length * TABLE.kind.lineHeight) / 2, fill: binderText(inks.muted, inks.ground, TABLE.kind.size) }) : null}
              <rect x={rect.x} y={y + TABLE.row - 1} width={tableW} height={1} fill={inks.line} />
            </g>
          )
        })}
      </g>
      <g {...blockTag(ctx, k)}>
        {sums.map((s, i) => {
          const { label, main, unit, mainW, split, answer, spec } = s!
          const wx = rect.x + WORK.x
          const top = rect.y + (i === 0 ? 0 : sumH(sums[0]!) + WORK.pad * 2 + 1)
          const figureTop = top + WORK.label.lineHeight + WORK.gap
          const base = binderBaseline(figureTop, spec.lineHeight, spec.size)
          const ink = answer ? inks.fire : inks.deep
          const figure = (
            <g data-binder-figure="">
              {paintBinderLine(main, { ctx, x: wx, baseline: base, size: spec.size, bold: true, fill: binderText(ink, inks.ground, spec.size) })}
              {unit ? paintBinderLine(unit, { ctx, x: wx + mainW + WORK.unitGap, baseline: base, size: spec.unit, bold: true, fill: binderText(ink, inks.ground, spec.unit) }) : null}
            </g>
          )
          const formulaTop = figureTop + spec.lineHeight + WORK.gap
          return (
            <g key={i} data-binder-sum={answer ? "answer" : "working"}>
              {paintBinder(label, { ctx, x: wx, top, fill: binderText(inks.muted, inks.ground, WORK.label.size) })}
              {answer ? <Lead id="answer">{figure}</Lead> : figure}
              {split ? (
                <g data-binder-formula="">
                  {paintBinderLine(split.formula, { ctx, x: wx, top: formulaTop, lineHeight: WORK.formula.lineHeight, size: WORK.formula.size, italic: true, fill: binderText(inks.muted, inks.ground, WORK.formula.size) })}
                  {paintBinderLine(`= ${split.figures}`, {
                    ctx,
                    x: wx + binderWidth(`${split.formula} `, WORK.formula.size, ctx),
                    top: formulaTop,
                    lineHeight: WORK.formula.lineHeight,
                    size: WORK.formula.size,
                    fill: binderText(inks.muted, inks.ground, WORK.formula.size),
                  })}
                </g>
              ) : null}
              {i === 0 ? <rect x={wx} y={top + sumH(s!) + WORK.pad} width={WORK.w} height={1} fill={inks.line} /> : null}
            </g>
          )
        })}
      </g>
      {foot && footer ? <BinderPlainLine callout={foot as Callout} text={footer} x={rect.x} y={rect.y + footTop} ctx={ctx} /> : null}
    </g>
  )
}
