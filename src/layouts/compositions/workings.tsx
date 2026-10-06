import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import { Lead, binderInks, binderText, binderTrackedWidth, binderWidth, fitBinder, glossBreak, paintBinder, paintBinderCard, paintBinderLine, paintBinderTracked, paintChip, wholeMark, binderBaseline } from "./binder"
import { BinderRuleLine, fitRuleLine } from "./binder-bars"

type Table = Extract<Component, { type: "data_table" }>
type Kpis = Extract<Component, { type: "kpi_cards" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * workings: a sum worked out on one page, proposal's 2026-10 board (p06), the
 * page a proposal is judged on. At the left the inputs as a ruled table under
 * a 2px rule of petrol: each input's symbol in a petrol disc, its name bold
 * over how it is reached in small grey, its value at 20px in petrol to the
 * right, and what kind of source it rests on as an outlined chip. At the
 * right the working: a card with what is worked out, the formula in italic,
 * the figures put in, and the result at 40px in petrol; under it the answer
 * the page lands on as a block of the brick red, its result at 60px in
 * white. Under both, a line under a hairline saying what the sum leaves
 * out.
 *
 * The table's first column names each input after its symbol and a space
 * (「E 年发电量」, "E Annual output"); a figure's note is its formula and the
 * figures put in, written "formula = figures" (「E × p − O = 108 × 0.45 − 4.6」).
 * The space and the " = " are declared on the lines they end
 * (`data-gloss-break`), not printed.
 *
 * Takes, in the binder setting: a `data_table` of four columns (the name,
 * how it is reached with an empty header, the value aligned right, the kind
 * of source) and two to four rows with no icon, tag, emphasis or source,
 * every name led by a one-letter symbol; a `kpi_cards` of two figures with
 * notes written that way, the second marked whole; optionally a `callout`
 * with no title or tag.
 *
 * Declines: a name, a way, a value or a source kind past its column, a
 * formula, figures or result past its card, and a line past one line.
 *
 * Reads: the binder inks (`./binder.tsx`).
 */

const TABLE = { w: 636, head: { top: 4, size: 12, lineHeight: 18, tracking: 1 }, rule: 28, rows: { top: 42, step: 76 }, disc: { cx: 18, dy: 26, r: 18, size: 17, baseline: 32 }, name: { x: 52, dy: 4, size: 17, lineHeight: 26, w: 220 }, how: { x: 52, dy: 32, size: 12, lineHeight: 20, w: 360 }, value: { right: 406, dy: 10, size: 20, lineHeight: 30, w: 140 }, kind: { x: 436, dy: 14, h: 24, size: 12 }, hairline: 66 } as const
const WORK = { x: 676, top0: 4, w: 456, h: 168, gap: 16, pad: 28, label: { top: 18, size: 14, lineHeight: 20 }, formula: { top: 44, size: 18, lineHeight: 26 }, figures: { top: 72, size: 14, lineHeight: 22 }, result: { top: 102, size: 40, lineHeight: 50 }, answer: { top: 92, size: 60, lineHeight: 70 } } as const
const FOOT = { top: 376 } as const
const SYMBOL = /^([A-Za-zα-ωΑ-Ω])\s+(.+)$/su

function splitFormula(note: string | undefined): { formula: string; figures: string } | null {
  const m = /^(.+?)\s+=\s+(.+)$/su.exec(note?.trim() ?? "")
  return m ? { formula: m[1]!.trim(), figures: m[2]!.trim() } : null
}

export const workingsComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "binder") return null
  const [table, figures, foot, ...rest] = components
  if (table?.type !== "data_table" || figures?.type !== "kpi_cards" || rest.length > 0 || (foot && foot.type !== "callout")) return null
  const t = table as Table
  const k = figures as Kpis
  if (t.columns.length !== 4 || t.title || t.source || t.rows.length < 2 || t.rows.length > 4) return null
  const [nameCol, howCol, valueCol, kindCol] = t.columns as [Table["columns"][number], Table["columns"][number], Table["columns"][number], Table["columns"][number]]
  if (howCol.label.trim() || valueCol.align !== "right" || t.columns.some((col) => col.emphasis || col.icon)) return null
  if (t.rows.some((r) => r.icon || r.tag || r.emphasis)) return null
  if (k.items.length !== 2 || k.items.some((it) => it.icon || it.unit || it.delta || it.tag || it.tone || it.source)) return null
  if (wholeMark(k.items[0]!.value) || !wholeMark(k.items[1]!.value)) return null
  if (rect.w < 1132 || rect.h < FOOT.top + 52) return null
  const inks = binderInks(ctx)
  const cell = (row: Table["rows"][number], key: string) => String(row.cells[key] ?? "").trim()

  const heads = [nameCol, valueCol, kindCol].map((col) => col.label.trim())
  const rows = t.rows.map((row) => {
    const m = SYMBOL.exec(cell(row, nameCol.key))
    if (!m) return null
    const name = fitBinder(m[2]!, { width: TABLE.name.w, size: TABLE.name.size, lineHeight: TABLE.name.lineHeight, maxLines: 1, bold: true }, ctx)
    const how = cell(row, howCol.key) ? fitBinder(cell(row, howCol.key), { width: TABLE.how.w, size: TABLE.how.size, lineHeight: TABLE.how.lineHeight, maxLines: 1 }, ctx) : null
    // The value may run left over the name's column as far as the name leaves room.
    const valueRoom = Math.max(TABLE.value.w, TABLE.value.right - (TABLE.name.x + (name ? binderWidth(m[2]!, TABLE.name.size, ctx, true) : 0) + 16))
    const value = fitBinder(cell(row, valueCol.key), { width: valueRoom, size: TABLE.value.size, lineHeight: TABLE.value.lineHeight, maxLines: 1, bold: true }, ctx)
    const kind = cell(row, kindCol.key)
    if (!name || (cell(row, howCol.key) && !how) || !value || (kind && TABLE.kind.x + binderTrackedWidth(kind, TABLE.kind.size, 0, ctx, true) + 22 > TABLE.w)) return null
    return { symbol: m[1]!, name, how, value, kind }
  })
  if (rows.some((r) => !r)) return null

  const sums = k.items.map((it, i) => {
    const split = splitFormula(it.note)
    const answer = i === 1
    const inner = WORK.w - WORK.pad * 2
    const label = fitBinder(it.label, { width: inner, size: WORK.label.size, lineHeight: WORK.label.lineHeight, maxLines: 1, bold: true }, ctx)
    const formula = split ? fitBinder(split.formula, { width: inner, size: WORK.formula.size, lineHeight: WORK.formula.lineHeight, maxLines: 1, bold: true }, ctx) : null
    const figs = split ? fitBinder(split.figures, { width: inner, size: WORK.figures.size, lineHeight: WORK.figures.lineHeight, maxLines: 1 }, ctx) : null
    const spec = answer ? WORK.answer : WORK.result
    const result = fitBinder(stripEmphasis(it.value), { width: inner, size: spec.size, lineHeight: spec.lineHeight, maxLines: 1, bold: true }, ctx)
    if (!label || !result || (it.note?.trim() && (!split || !formula || !figs))) return null
    return { label, formula, figs, result, answer }
  })
  if (sums.some((s) => !s)) return null
  const footer = foot ? fitRuleLine(foot as Callout, rect.w, ctx) : null
  if (foot && !footer) return null

  const headY = binderBaseline(rect.y + TABLE.head.top, TABLE.head.lineHeight, TABLE.head.size)
  const headInk = binderText(inks.muted, inks.ground, TABLE.head.size)
  return (
    <g {...compositionTag("workings")}>
      <g {...blockTag(ctx, t)} data-binder-inputs="">
        {heads[0] ? paintBinderTracked({ ctx, text: heads[0], x: rect.x, y: headY, size: TABLE.head.size, tracking: TABLE.head.tracking, bold: true, fill: headInk }) : null}
        {heads[1] ? paintBinderLine(heads[1], { ctx, x: rect.x + TABLE.value.right, baseline: headY, size: TABLE.head.size, bold: true, anchor: "end", fill: headInk }) : null}
        {heads[2] ? paintBinderLine(heads[2], { ctx, x: rect.x + TABLE.kind.x, baseline: headY, size: TABLE.head.size, bold: true, fill: headInk }) : null}
        <rect x={rect.x} y={rect.y + TABLE.rule} width={TABLE.w} height={2} fill={inks.deep} />
        {rows.map((r, i) => {
          const { symbol, name, how, value, kind } = r!
          const y = rect.y + TABLE.rows.top + i * TABLE.rows.step
          return (
            <g key={i} data-binder-input={symbol}>
              <circle cx={rect.x + TABLE.disc.cx} cy={y + TABLE.disc.dy} r={TABLE.disc.r} fill={inks.deep} />
              {paintBinderLine(symbol, { ctx, x: rect.x + TABLE.disc.cx, baseline: y + TABLE.disc.baseline, size: TABLE.disc.size, bold: true, italic: true, anchor: "middle", fill: binderText(inks.onDeep, inks.deep, TABLE.disc.size), attrs: glossBreak(" ") })}
              {paintBinder(name, { ctx, x: rect.x + TABLE.name.x, top: y + TABLE.name.dy, bold: true, fill: binderText(inks.ink, inks.ground, TABLE.name.size) })}
              {how ? paintBinder(how, { ctx, x: rect.x + TABLE.how.x, top: y + TABLE.how.dy, fill: binderText(inks.muted, inks.ground, TABLE.how.size) }) : null}
              {paintBinder(value, { ctx, x: rect.x + TABLE.value.right, top: y + TABLE.value.dy, bold: true, anchor: "end", fill: binderText(inks.deep, inks.ground, TABLE.value.size) })}
              {kind ? paintChip(kind, rect.x + TABLE.kind.x, y + TABLE.kind.dy, { size: TABLE.kind.size, h: TABLE.kind.h, fg: inks.muted, border: inks.rule }, ctx, inks).node : null}
              {i < rows.length - 1 ? <rect x={rect.x} y={y + TABLE.hairline} width={TABLE.w} height={1} fill={inks.line} /> : null}
            </g>
          )
        })}
      </g>
      <g {...blockTag(ctx, k)}>
        {sums.map((s, i) => {
          const { label, formula, figs, result, answer } = s!
          const x = rect.x + WORK.x
          const y = rect.y + WORK.top0 + i * (WORK.h + WORK.gap)
          const ground = answer ? inks.fire : inks.card
          const words = (ink: string, size: number) => binderText(answer ? inks.onFire : ink, ground, size)
          const spec = answer ? WORK.answer : WORK.result
          const body = (
            <>
              {paintBinderCard({ x, y, w: WORK.w, h: WORK.h }, inks, { fill: ground })}
              {paintBinder(label, { ctx, x: x + WORK.pad, top: y + WORK.label.top, bold: true, fill: words(inks.muted, WORK.label.size), ground })}
              {formula ? <g data-binder-formula="">{paintBinderLine(formula.lines.join(""), { ctx, x: x + WORK.pad, top: y + WORK.formula.top, lineHeight: WORK.formula.lineHeight, size: WORK.formula.size, bold: true, italic: true, fill: words(inks.ink, WORK.formula.size), attrs: glossBreak(" = ") })}</g> : null}
              {figs ? paintBinder(figs, { ctx, x: x + WORK.pad, top: y + WORK.figures.top, fill: words(inks.muted, WORK.figures.size), ground }) : null}
              {paintBinder(result, { ctx, x: x + WORK.pad, top: y + spec.top, bold: true, fill: words(answer ? inks.ink : inks.deep, spec.size), ground })}
            </>
          )
          return (
            <g key={i} data-binder-sum={answer ? "answer" : "working"}>
              {answer ? <Lead id="answer">{body}</Lead> : body}
            </g>
          )
        })}
      </g>
      {foot && footer ? <BinderRuleLine callout={foot as Callout} text={footer} x={rect.x} y={rect.y + FOOT.top} w={rect.w} ctx={ctx} /> : null}
    </g>
  )
}
