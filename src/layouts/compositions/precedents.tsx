import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import { Lead, binderInks, binderText, binderWidth, edgePath, fitBinder, paintBinder, paintBinderIcon, paintChip } from "./binder"
import { BinderPlainLine, fitPlainLine } from "./binder-bars"

type Table = Extract<Component, { type: "data_table" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * precedents: public records a client can check, proposal's 2026-10 board
 * (p13). Over the rows the table's title as a chip outlined in petrol (「均非
 * 我方项目」, whose they are not). A row a record, on a bar of sand: its icon
 * in a white disc, its name bold over its scale in grey, its figure at 18px
 * in petrol, and what kind of source the figure is as a white chip at the
 * right; the record the page leans on (a row marked `highlight`) with a
 * brick-red edge at its left and its chip in the brick red. Under the rows, a
 * line with a grey icon on what the records do not show.
 *
 * Takes, in the binder setting: a `data_table` with a title, three columns
 * (the name, the scale, the figure) with no headers, two to six rows, each
 * with an icon and a tag, at most one marked `highlight`, no total; then
 * optionally a `callout` with no title or tag.
 *
 * Declines: a name, scale or figure past its column, a chip past the row's
 * end, and a line past one line.
 *
 * Reads: the binder inks (`./binder.tsx`).
 */

const TITLE = { top: 0, h: 24, size: 12 } as const
const ROWS = { top: 36, step: 70, h: 62, r: 10, edge: 4, disc: { cx: 40, dy: 31, r: 18 }, icon: { dx: 30, dy: 21, size: 20 }, name: { x: 72, dy: 8, size: 16, lineHeight: 24, w: 380 }, scale: { x: 72, dy: 33, size: 13, lineHeight: 20, w: 380 }, figure: { x: 476, dy: 16, size: 18, lineHeight: 30, w: 440 }, chip: { right: 16, dy: 19, h: 24, size: 12 } } as const
const LINE_GAP = 6

export const precedentsComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "binder") return null
  const [table, note, ...rest] = components
  if (table?.type !== "data_table" || rest.length > 0 || (note && note.type !== "callout")) return null
  const t = table as Table
  if (!t.title?.trim() || t.source || t.columns.length !== 3 || t.columns.some((c) => c.label.trim() || c.emphasis || c.icon || (c.align && c.align !== "left"))) return null
  if (t.rows.length < 2 || t.rows.length > 6 || t.rows.some((r) => !r.icon || !r.tag || r.emphasis === "total") || t.rows.filter((r) => r.emphasis === "highlight").length > 1) return null
  const callout = note as Callout | undefined
  const bottom = ROWS.top + t.rows.length * ROWS.step
  if (rect.w < 1132 || rect.h < bottom + (callout ? LINE_GAP + 28 : 0)) return null
  const inks = binderInks(ctx)
  const [nameCol, scaleCol, figureCol] = t.columns.map((c) => c.key) as [string, string, string]
  const cell = (row: Table["rows"][number], key: string) => String(row.cells[key] ?? "").trim()
  const rows = t.rows.map((row) => {
    const name = fitBinder(cell(row, nameCol), { width: ROWS.name.w, size: ROWS.name.size, lineHeight: ROWS.name.lineHeight, maxLines: 1, bold: true }, ctx)
    const scale = cell(row, scaleCol) ? fitBinder(cell(row, scaleCol), { width: ROWS.scale.w, size: ROWS.scale.size, lineHeight: ROWS.scale.lineHeight, maxLines: 1 }, ctx) : null
    const figure = fitBinder(cell(row, figureCol), { width: ROWS.figure.w, size: ROWS.figure.size, lineHeight: ROWS.figure.lineHeight, maxLines: 1, bold: true }, ctx)
    const chipW = binderWidth(row.tag!.text, ROWS.chip.size, ctx, true) + 22
    if (!name || (cell(row, scaleCol) && !scale) || !figure) return null
    if (ROWS.figure.x + binderWidth(cell(row, figureCol), ROWS.figure.size, ctx, true) + 16 > rect.w - ROWS.chip.right - chipW) return null
    return { row, name, scale, figure, chipW, lit: row.emphasis === "highlight" }
  })
  if (rows.some((r) => !r)) return null
  const line = callout ? fitPlainLine(callout, rect.w, ctx) : null
  if (callout && !line) return null

  return (
    <g {...compositionTag("precedents")}>
      <g {...blockTag(ctx, t)}>
        {paintChip(t.title, rect.x, rect.y + TITLE.top, { size: TITLE.size, h: TITLE.h, fg: inks.deep, border: inks.deep }, ctx, inks).node}
        {rows.map((r, i) => {
          const { row, name, scale, figure, chipW, lit } = r!
          const y = rect.y + ROWS.top + i * ROWS.step
          const chip = lit
            ? paintChip(row.tag!.text, rect.x + rect.w - ROWS.chip.right - chipW, y + ROWS.chip.dy, { size: ROWS.chip.size, h: ROWS.chip.h, fg: inks.onFire, bg: inks.fire }, ctx, inks).node
            : paintChip(row.tag!.text, rect.x + rect.w - ROWS.chip.right - chipW, y + ROWS.chip.dy, { size: ROWS.chip.size, h: ROWS.chip.h, fg: inks.muted, bg: inks.ground }, ctx, inks).node
          return (
            <g key={i} data-binder-precedent={stripEmphasis(cell(row, nameCol))}>
              <rect x={rect.x} y={y} width={rect.w} height={ROWS.h} rx={ROWS.r} fill={inks.card} />
              {lit ? (
                <Lead id="precedent">
                  <path d={edgePath(rect.x, y, ROWS.h, ROWS.r, ROWS.edge)} fill={inks.fire} />
                  {chip}
                </Lead>
              ) : (
                chip
              )}
              <circle cx={rect.x + ROWS.disc.cx} cy={y + ROWS.disc.dy} r={ROWS.disc.r} fill={inks.ground} />
              {paintBinderIcon(row.icon!, rect.x + ROWS.icon.dx, y + ROWS.icon.dy, ROWS.icon.size, inks.deep, inks.ground)}
              {paintBinder(name, { ctx, x: rect.x + ROWS.name.x, top: y + ROWS.name.dy, bold: true, fill: binderText(inks.ink, inks.card, ROWS.name.size), ground: inks.card })}
              {scale ? paintBinder(scale, { ctx, x: rect.x + ROWS.scale.x, top: y + ROWS.scale.dy, fill: binderText(inks.muted, inks.card, ROWS.scale.size), ground: inks.card }) : null}
              {paintBinder(figure, { ctx, x: rect.x + ROWS.figure.x, top: y + ROWS.figure.dy, bold: true, fill: binderText(inks.deep, inks.card, ROWS.figure.size), ground: inks.card })}
            </g>
          )
        })}
      </g>
      {callout && line ? <BinderPlainLine callout={callout} text={line} x={rect.x} y={rect.y + bottom + LINE_GAP} ctx={ctx} /> : null}
    </g>
  )
}
