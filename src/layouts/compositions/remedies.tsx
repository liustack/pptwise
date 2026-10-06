import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import { Lead, binderInks, binderText, edgePath, fitBinder, paintBinder, paintBinderIcon } from "./binder"

type Table = Extract<Component, { type: "data_table" }>

/*
 * remedies: a risk register, proposal's 2026-10 board (p15). Three columns
 * under their headers in small grey and a 2px rule of petrol: a row a risk,
 * its icon in petrol and its name bold, what the public record says, and the
 * answer bold after the column's icon in the success ink (a shield). The risk
 * the page leads with (a row marked `highlight`) sits on the brick red's tint
 * with a brick-red edge at its left. Hairlines between the rows.
 *
 * Takes, in the binder setting: a `data_table` of three columns, the last
 * with an icon, no title, source or marked column, two to five rows, each
 * with an icon, no tag or total, at most one marked `highlight`.
 *
 * Declines: a name past one line, a record or an answer past two lines.
 *
 * Reads: the binder inks (`./binder.tsx`).
 */

const HEAD = { top: 2, size: 13, lineHeight: 20 } as const
const COLS = { risk: 0, record: 266, answer: 722 } as const
const RULE = 28
const ROWS = { top: 34, step: 80, h: 74, r: 6, edge: 4, icon: { dx: 18, dy: 24, size: 22 }, name: { dx: 52, dy: 22, size: 16, lineHeight: 28, w: 206 }, record: { dy: 14, size: 14, lineHeight: 23, maxLines: 2, w: 420 }, answer: { icon: { dy: 18, size: 18 }, dx: 28, dy: 14, size: 14, lineHeight: 23, maxLines: 2, w: 370 }, hairline: 77 } as const

export const remediesComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "binder") return null
  const [table, ...rest] = components
  if (table?.type !== "data_table" || rest.length > 0) return null
  const t = table as Table
  if (t.title || t.source || t.columns.length !== 3 || t.columns.some((c) => c.emphasis || (c.align && c.align !== "left"))) return null
  const [riskCol, recordCol, answerCol] = t.columns as [Table["columns"][number], Table["columns"][number], Table["columns"][number]]
  if (!answerCol.icon || riskCol.icon || recordCol.icon) return null
  if (t.rows.length < 2 || t.rows.length > 5 || t.rows.some((r) => !r.icon || r.tag || r.emphasis === "total") || t.rows.filter((r) => r.emphasis === "highlight").length > 1) return null
  if (rect.w < 1132 || rect.h < ROWS.top + t.rows.length * ROWS.step) return null
  const inks = binderInks(ctx)
  const cell = (row: Table["rows"][number], key: string) => String(row.cells[key] ?? "").trim()
  const heads = t.columns.map((c) => (c.label.trim() ? fitBinder(c.label, { width: 400, size: HEAD.size, lineHeight: HEAD.lineHeight, maxLines: 1, bold: true }, ctx) : null))
  if (t.columns.some((c, i) => c.label.trim() && !heads[i])) return null
  const rows = t.rows.map((row) => {
    const name = fitBinder(cell(row, riskCol.key), { width: ROWS.name.w, size: ROWS.name.size, lineHeight: ROWS.name.lineHeight, maxLines: 1, bold: true }, ctx)
    const record = fitBinder(cell(row, recordCol.key), { width: ROWS.record.w, size: ROWS.record.size, lineHeight: ROWS.record.lineHeight, maxLines: ROWS.record.maxLines }, ctx)
    const answer = fitBinder(cell(row, answerCol.key), { width: ROWS.answer.w, size: ROWS.answer.size, lineHeight: ROWS.answer.lineHeight, maxLines: ROWS.answer.maxLines, bold: true }, ctx)
    return name && record && answer ? { row, name, record, answer, lit: row.emphasis === "highlight" } : null
  })
  if (rows.some((r) => !r)) return null
  const headInk = binderText(inks.muted, inks.ground, HEAD.size)

  return (
    <g {...compositionTag("remedies")} {...blockTag(ctx, t)}>
      {heads.map((h, i) => (h ? <g key={`h-${i}`}>{paintBinder(h, { ctx, x: rect.x + [COLS.risk, COLS.record, COLS.answer][i]!, top: rect.y + HEAD.top, bold: true, fill: headInk })}</g> : null))}
      <rect x={rect.x} y={rect.y + RULE} width={rect.w} height={2} fill={inks.deep} />
      {rows.map((r, i) => {
        const { row, name, record, answer, lit } = r!
        const y = rect.y + ROWS.top + i * ROWS.step
        const ground = lit ? inks.firePale : inks.ground
        return (
          <g key={i} data-binder-risk={stripEmphasis(cell(row, riskCol.key))}>
            {lit ? (
              <>
                <rect x={rect.x} y={y} width={rect.w} height={ROWS.h} rx={ROWS.r} fill={inks.firePale} />
                <Lead id="risk">
                  <path d={edgePath(rect.x, y, ROWS.h, ROWS.r, ROWS.edge)} fill={inks.fire} />
                </Lead>
              </>
            ) : null}
            {paintBinderIcon(row.icon!, rect.x + ROWS.icon.dx, y + ROWS.icon.dy, ROWS.icon.size, inks.deep, ground)}
            {paintBinder(name, { ctx, x: rect.x + ROWS.name.dx, top: y + ROWS.name.dy, bold: true, fill: binderText(inks.ink, ground, ROWS.name.size), ground })}
            {paintBinder(record, { ctx, x: rect.x + COLS.record, top: y + ROWS.record.dy, fill: binderText(inks.ink, ground, ROWS.record.size), ground })}
            {paintBinderIcon(answerCol.icon!, rect.x + COLS.answer, y + ROWS.answer.icon.dy, ROWS.answer.icon.size, inks.success, ground)}
            {paintBinder(answer, { ctx, x: rect.x + COLS.answer + ROWS.answer.dx, top: y + ROWS.answer.dy, bold: true, fill: binderText(inks.ink, ground, ROWS.answer.size), ground })}
            {i < rows.length - 1 ? <rect x={rect.x} y={y + ROWS.hairline} width={rect.w} height={1} fill={inks.line} /> : null}
          </g>
        )
      })}
    </g>
  )
}
