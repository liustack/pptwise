import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  Caption,
  fitManuscript,
  manuscriptInks,
  manuscriptText,
  paintManuscript,
  paintManuscriptIcon,
} from "./manuscript"

type Comparison = Extract<Component, { type: "comparison" }>

/*
 * hazards: threats to a design and the answer to each, thesis's 2026-10
 * board (p15). The table's number and title, then an open table between two
 * rules of ink: a row a threat, its icon in emerald and its name in the
 * heading serif, why it is dangerous, and the answer in bold. The threat the
 * page is about (a row marked `emphasis`) sits on gold's pale ground with a
 * gold bar at its left.
 *
 * Takes, in the manuscript setting: a `comparison` with a title, a label
 * column and two columns, two to six rows each with an icon and no tag, at
 * most one marked, and no recommended column.
 *
 * Declines: a threat's name past one line, a cell past two lines.
 *
 * Reads: the manuscript inks (`./manuscript.tsx`).
 */

const TABLE = { top: 32, head: { top: 38, size: 12, h: 22 }, headRule: 64, rows: 68, step: 72, heavy: 1.4, bar: 3 } as const
const COLS = { name: { dx: 48, w: 210 }, why: { dx: 266, w: 440 }, answer: { dx: 726, w: 420 } } as const
const CELL = { icon: { dx: 18, dy: 24, size: 20 }, name: { dy: 20, size: 16, h: 30 }, text: { dy: 14, size: 14, h: 22, maxLines: 2 } } as const

export const hazardsComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "manuscript") return null
  const [table, ...rest] = components
  if (table?.type !== "comparison" || rest.length > 0) return null
  const t = table as Comparison
  if (!t.title?.trim() || !t.label_column?.trim() || t.columns.length !== 2 || t.recommended !== undefined || t.tag_column) return null
  if (t.rows.length < 2 || t.rows.length > 6 || t.rows.some((r) => !r.icon || r.tag || r.cells.length !== 2) || t.rows.filter((r) => r.emphasis).length > 1) return null
  const label = ctx.exhibitLabels?.get(t)
  if (!label) return null
  const bottom = TABLE.rows + t.rows.length * TABLE.step
  if (rect.w < COLS.answer.dx + COLS.answer.w || rect.h < bottom + 2) return null
  const inks = manuscriptInks(ctx)
  const ground = inks.ground
  const heads = [t.label_column, ...t.columns].map((h, i) => fitManuscript(h, { width: [COLS.name.w + COLS.name.dx, COLS.why.w, COLS.answer.w][i]!, size: TABLE.head.size, lineHeight: TABLE.head.h, maxLines: 1, bold: true }, ctx))
  if (heads.some((h) => !h)) return null
  const rows = t.rows.map((r) => ({
    r,
    name: fitManuscript(r.label, { width: COLS.name.w, size: CELL.name.size, lineHeight: CELL.name.h, maxLines: 1, serif: true, bold: true }, ctx),
    why: fitManuscript(r.cells[0]!, { width: COLS.why.w, size: CELL.text.size, lineHeight: CELL.text.h, maxLines: CELL.text.maxLines }, ctx),
    answer: fitManuscript(r.cells[1]!, { width: COLS.answer.w, size: CELL.text.size, lineHeight: CELL.text.h, maxLines: CELL.text.maxLines, bold: true }, ctx),
  }))
  if (rows.some((x) => !x.name || !x.why || !x.answer)) return null
  const headX = [rect.x, rect.x + COLS.why.dx, rect.x + COLS.answer.dx]
  return (
    <g {...compositionTag("hazards")} {...blockTag(ctx, t)}>
      <Caption label={label} title={t.title} x={rect.x} top={rect.y} ctx={ctx} />
      <rect x={rect.x} y={rect.y + TABLE.top - TABLE.heavy / 2} width={rect.w} height={TABLE.heavy} fill={inks.ink} />
      {heads.map((h, i) => (
        <g key={`h-${i}`}>{paintManuscript(h!, { ctx, x: headX[i]!, top: rect.y + TABLE.head.top, bold: true, fill: manuscriptText(inks.muted, ground, TABLE.head.size) })}</g>
      ))}
      <rect x={rect.x} y={rect.y + TABLE.headRule} width={rect.w} height={1} fill={inks.line} />
      {rows.map((x, i) => {
        const y = rect.y + TABLE.rows + i * TABLE.step
        const lit = x.r.emphasis === true
        const on = lit ? inks.goldPale : ground
        return (
          <g key={i} data-manuscript-threat={x.r.label} {...(lit ? { "data-manuscript-lead": "row" } : {})}>
            {lit ? (
              <>
                <rect x={rect.x} y={y} width={rect.w} height={TABLE.step} fill={inks.goldPale} />
                <rect data-manuscript-gold="" x={rect.x} y={y} width={TABLE.bar} height={TABLE.step} fill={inks.gold} />
              </>
            ) : null}
            {paintManuscriptIcon(x.r.icon!, rect.x + CELL.icon.dx, y + CELL.icon.dy, CELL.icon.size, inks.deep, on)}
            {paintManuscript(x.name!, { ctx, x: rect.x + COLS.name.dx, top: y + CELL.name.dy, serif: true, bold: true, fill: manuscriptText(inks.ink, on, CELL.name.size), ground: on })}
            {paintManuscript(x.why!, { ctx, x: rect.x + COLS.why.dx, top: y + CELL.text.dy, fill: manuscriptText(inks.ink, on, CELL.text.size), ground: on })}
            {paintManuscript(x.answer!, { ctx, x: rect.x + COLS.answer.dx, top: y + CELL.text.dy, bold: true, fill: manuscriptText(inks.ink, on, CELL.text.size), ground: on })}
            <rect x={rect.x} y={y + TABLE.step} width={rect.w} height={1} fill={inks.line} />
          </g>
        )
      })}
      <rect x={rect.x} y={rect.y + bottom - TABLE.heavy / 2} width={rect.w} height={TABLE.heavy} fill={inks.ink} />
    </g>
  )
}
