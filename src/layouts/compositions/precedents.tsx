import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import { Lead, binderInks, binderText, fitBinder, paintBinder, paintBinderIcon } from "./binder"
import { BinderPlainLine, fitPlainLine } from "./binder-bars"
import type { Recipe } from "./recipe"

type Table = Extract<Component, { type: "data_table" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * precedents: public records a client can check, proposal's 2026-10 print
 * board (p13). A ruled table: the headers in small grey over a 2px rule of
 * the ink (the table's title heads the name column when that column has no
 * header of its own, 「项目（均非我方项目）」), a row a record under a
 * hairline: its icon in petrol, its name bold over its scale in grey, its
 * figure at 17px with its numbers bold, and what kind of source the figure
 * is in small grey in a column of its own (the table's fourth column, or the
 * row's tag); a 2px rule of the ink closes the table. The record the page
 * leans on (a row marked `highlight`) has its icon, its numbers and its kind
 * of source in the brick red, bold, on no ground of its own. Under the
 * table, a line with a grey icon on what the records do not show.
 *
 * Takes, in the binder setting: a `data_table` of three columns (the name,
 * the scale, the figure), each row with a tag, or four (the kind of source
 * last), each row with an icon, two to six rows, at most one marked
 * `highlight`, no total, and a title only when the name column has no
 * header. Then optionally a `callout` with no tag.
 *
 * Declines: a header, name, scale, figure or kind past its column, and a
 * line past one line.
 *
 * Reads: the binder inks (`./binder.tsx`).
 */

const COLS = { icon: 28, name: 380, kind: 120, gap: 16 } as const
const HEAD = { size: 13, lineHeight: 18, pad: 8 } as const
const ROWS = { h: 64, edge: 2, icon: { size: 20 }, name: { size: 15, lineHeight: 22 }, scale: { size: 13, lineHeight: 18 }, figure: { size: 17, lineHeight: 26, maxLines: 2 }, kind: { size: 13, lineHeight: 18, maxLines: 2 } } as const
const LINE_GAP = 24
const NUMBER = /(\d[\d.,%]*)/gu

/** The figure with its numbers marked to be set bold, unless the author marked runs of their own. */
function boldNumbers(text: string): string {
  return text.includes("**") ? text : text.replace(NUMBER, "**$1**")
}

/** What an author writes to get this drawing (`./recipe.ts`). */
export const precedentsRecipe: Recipe = {
  look: "Public records a client can check",
  kinds: ["evidence"],
  shapes: [{ parts: [{ type: "data_table", count: [2, 6], needs: ["rows[*].icon"] }, { type: "callout", optional: true }] }],
}

export const precedentsComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "binder") return null
  const [table, note, ...rest] = components
  if (table?.type !== "data_table" || rest.length > 0 || (note && note.type !== "callout")) return null
  const t = table as Table
  const n = t.columns.length
  if (t.source || (n !== 3 && n !== 4) || t.columns.some((c) => c.emphasis || c.icon || (c.align && c.align !== "left"))) return null
  if (t.rows.length < 2 || t.rows.length > 6 || t.rows.some((r) => !r.icon || r.emphasis === "total" || (n === 3 ? !r.tag : r.tag)) || t.rows.filter((r) => r.emphasis === "highlight").length > 1) return null
  const [nameCol, scaleCol, figureCol, kindCol] = t.columns as [Table["columns"][number], Table["columns"][number], Table["columns"][number], Table["columns"][number] | undefined]
  if (t.title?.trim() && (nameCol.label.trim() || scaleCol.label.trim())) return null
  const callout = note as Callout | undefined
  const tableH = HEAD.lineHeight + HEAD.pad + ROWS.edge + t.rows.length * ROWS.h + ROWS.edge
  if (rect.h < tableH + (callout ? LINE_GAP + 24 : 0)) return null
  const inks = binderInks(ctx)
  const x = { name: COLS.icon + COLS.gap, figure: COLS.icon + COLS.name + COLS.gap * 2, kind: rect.w - COLS.kind }
  const figureW = x.kind - COLS.gap - x.figure
  const cell = (row: Table["rows"][number], key: string) => String(row.cells[key] ?? "").trim()
  const kindOf = (row: Table["rows"][number]) => (kindCol ? cell(row, kindCol.key) : (row.tag?.text.trim() ?? ""))
  const head = (text: string, w: number) => (text ? fitBinder(text, { width: w, size: HEAD.size, lineHeight: HEAD.lineHeight, maxLines: 1 }, ctx) : null)
  const nameHead = nameCol.label.trim() || t.title?.trim() || ""
  const heads = [head(nameHead, COLS.name), head(figureCol.label.trim(), figureW), head(kindCol?.label.trim() ?? "", COLS.kind)]
  if ((nameHead && !heads[0]) || (figureCol.label.trim() && !heads[1]) || (kindCol?.label.trim() && !heads[2])) return null
  const rows = t.rows.map((row) => {
    const name = fitBinder(cell(row, nameCol.key), { width: COLS.name, size: ROWS.name.size, lineHeight: ROWS.name.lineHeight, maxLines: 1, bold: true }, ctx)
    const scale = cell(row, scaleCol.key) ? fitBinder(cell(row, scaleCol.key), { width: COLS.name, size: ROWS.scale.size, lineHeight: ROWS.scale.lineHeight, maxLines: 1 }, ctx) : null
    const figure = fitBinder(boldNumbers(cell(row, figureCol.key)), { width: figureW, size: ROWS.figure.size, lineHeight: ROWS.figure.lineHeight, maxLines: ROWS.figure.maxLines }, ctx)
    const kind = kindOf(row) ? fitBinder(kindOf(row), { width: COLS.kind, size: ROWS.kind.size, lineHeight: ROWS.kind.lineHeight, maxLines: ROWS.kind.maxLines, bold: row.emphasis === "highlight" }, ctx) : null
    if (!name || (cell(row, scaleCol.key) && !scale) || !figure || (kindOf(row) && !kind)) return null
    return { row, name, scale, figure, kind, lit: row.emphasis === "highlight" }
  })
  if (rows.some((r) => !r)) return null
  const line = callout ? fitPlainLine(callout, rect.w, ctx) : null
  if (callout && !line) return null

  const headInk = binderText(inks.muted, inks.ground, HEAD.size)
  const rowsTop = rect.y + HEAD.lineHeight + HEAD.pad + ROWS.edge
  return (
    <g {...compositionTag("precedents")}>
      <g {...blockTag(ctx, t)}>
        {heads[0] ? paintBinder(heads[0], { ctx, x: rect.x + x.name, top: rect.y, fill: headInk }) : null}
        {heads[1] ? paintBinder(heads[1], { ctx, x: rect.x + x.figure, top: rect.y, fill: headInk }) : null}
        {heads[2] ? paintBinder(heads[2], { ctx, x: rect.x + x.kind, top: rect.y, fill: headInk }) : null}
        <rect x={rect.x} y={rowsTop - ROWS.edge} width={rect.w} height={ROWS.edge} fill={inks.ink} />
        {rows.map((r, i) => {
          const { row, name, scale, figure, kind, lit } = r!
          const y = rowsTop + i * ROWS.h
          const stack = ROWS.name.lineHeight + (scale ? ROWS.scale.lineHeight : 0)
          const ink = lit ? inks.fireText : inks.ink
          const lead = (
            <>
              {paintBinderIcon(row.icon!, rect.x, y + (ROWS.h - ROWS.icon.size) / 2, ROWS.icon.size, lit ? inks.fireText : inks.deep, inks.ground)}
              {kind ? paintBinder(kind, { ctx, x: rect.x + x.kind, top: y + (ROWS.h - kind.lines.length * ROWS.kind.lineHeight) / 2, bold: lit, fill: binderText(lit ? inks.fireText : inks.muted, inks.ground, ROWS.kind.size) }) : null}
              <g data-binder-precedent-figure="">
                {paintBinder(figure, {
                  ctx,
                  x: rect.x + x.figure,
                  top: y + (ROWS.h - figure.lines.length * ROWS.figure.lineHeight) / 2,
                  fill: binderText(inks.ink, inks.ground, ROWS.figure.size),
                  runInk: binderText(ink, inks.ground, ROWS.figure.size),
                  runWeight: "700",
                })}
              </g>
            </>
          )
          return (
            <g key={i} data-binder-precedent={stripEmphasis(cell(row, nameCol.key))}>
              {lit ? <Lead id="precedent">{lead}</Lead> : lead}
              {paintBinder(name, { ctx, x: rect.x + x.name, top: y + (ROWS.h - stack) / 2, bold: true, fill: binderText(inks.ink, inks.ground, ROWS.name.size) })}
              {scale ? paintBinder(scale, { ctx, x: rect.x + x.name, top: y + (ROWS.h - stack) / 2 + ROWS.name.lineHeight, fill: binderText(inks.muted, inks.ground, ROWS.scale.size) }) : null}
              <rect x={rect.x} y={y + ROWS.h - (i === rows.length - 1 ? 0 : 1)} width={rect.w} height={i === rows.length - 1 ? ROWS.edge : 1} fill={i === rows.length - 1 ? inks.ink : inks.line} />
            </g>
          )
        })}
      </g>
      {callout && line ? <BinderPlainLine callout={callout} text={line} x={rect.x} y={rect.y + tableH + LINE_GAP} ctx={ctx} /> : null}
    </g>
  )
}
