import type React from "react"
import type { Component } from "@/ir"
import { accessibleInk } from "../../render/ink"
import { fitNoticeClosing, noticeClosingCallout, paintNoticeClosing } from "./closing"
import { rowTint } from "./notice"
import { textWidth } from "./plot"
import { blockTag, compositionTag, ruleInk, type Composition } from "./shared"
import { centredBaseline, fitFixed, paintLines } from "./type"

type DataTable = Extract<Component, { type: "data_table" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * records: a data table set open, the way a report prints one. Small muted
 * headers over a black rule, one 50px row per record with a hairline between
 * rows and under the last, every cell on one line at 19px. A highlighted row
 * (`emphasis: "highlight"`) sits on a pale tint of the primary colour with its
 * text bold in primary, and a total row is set bold under a black rule. A closing
 * note may follow on a light panel. bulletin's 2026-10 company table (p07).
 *
 * Takes: `[data_table]` or `[data_table, callout]`, where the table has two to
 * six columns, one to eight rows and no `source` line of its own, and the
 * callout carries no icon.
 *
 * Declines: a table `source` (the page's source line is where a source goes),
 * a cell or header past one line of its column, and a table taller than the
 * band.
 *
 * Band: columns take their widest text and share what is left in proportion,
 * so the board's four columns fill 1120px. Six rows and a one-line note need
 * 417px.
 *
 * Reads: `primary` (a highlighted row's text and the tint behind it), `text`
 * (cells, the rule under the headers), `muted` (headers), `border` or `muted`
 * (hairlines), `surface` (the tint), `panel` (the note), `bg` or `defaultBg`,
 * `fonts.body`.
 */

const MAX_COLUMNS = 6
const MAX_ROWS = 8
/** Rows start 33px into the band, the black rule over them at 32px (y228 and y229 on the board). */
const HEAD_H = 33
/** The header's line box starts 2px above the band (y194 on the board). */
const HEAD_TOP = -2
const HEAD_SIZE = 16
const HEAD_BOX = 30
const ROW_H = 50
const CELL_SIZE = 19
const CELL_BOX = 28
/** The first column's text sits this far in, so a tinted row's name does not touch the tint's edge. */
const FIRST_INSET = 16
const COLUMN_GAP = 20
const WIDE_GAP = 60
const CLOSING_GAP = 20

function recordsShape(components: readonly Component[]): { table: DataTable; callout?: Callout } | null {
  const [table, second, ...rest] = components
  if (table?.type !== "data_table" || rest.length > 0) return null
  if (table.source?.trim()) return null
  if (table.columns.length > MAX_COLUMNS || table.rows.length > MAX_ROWS) return null
  if (second === undefined) return { table }
  const callout = noticeClosingCallout(second)
  return callout ? { table, callout } : null
}

function cell(row: DataTable["rows"][number], key: string): string {
  const v = row.cells[key]
  return v === undefined ? "" : String(v)
}

export const recordsComposition: Composition = ({ components, ctx, rect }) => {
  const shape = recordsShape(components)
  if (!shape) return null
  const { table } = shape
  const { colors, fonts } = ctx
  const body = fonts.body
  const bg = ctx.defaultBg ?? colors.bg

  // Widest text per column, bold where it is painted bold, then the band's
  // spare width shared out in proportion.
  const natural = table.columns.map((column, i) => {
    const texts = table.rows.map((row) => ({ text: cell(row, column.key), bold: row.emphasis !== undefined }))
    const widest = Math.max(
      textWidth(column.label, HEAD_SIZE, body),
      ...texts.map((t) => textWidth(t.text, CELL_SIZE, body, t.bold)),
    )
    return Math.ceil(widest) + (i === 0 ? FIRST_INSET : 0)
  })
  // A left-aligned column after a right-aligned one stands further off, so
  // a figure's last digit does not run into the next column's first word.
  const gapBefore = (i: number) =>
    i > 0 && table.columns[i - 1]!.align === "right" && (table.columns[i]!.align ?? "left") === "left" ? WIDE_GAP : COLUMN_GAP
  const gaps = table.columns.reduce((sum, _c, i) => sum + (i > 0 ? gapBefore(i) : 0), 0)
  const spare = rect.w - gaps - natural.reduce((a, b) => a + b, 0)
  if (spare < 0) return null
  const total = natural.reduce((a, b) => a + b, 0)
  const widths = natural.map((w) => w + (spare * w) / total)
  const lefts: number[] = []
  let cursor = rect.x
  for (const [i, w] of widths.entries()) {
    if (i > 0) cursor += gapBefore(i)
    lefts.push(cursor)
    cursor += w
  }

  const fit = (text: string, w: number, size: number, box: number, bold: boolean) =>
    fitFixed(text, { width: w, size, lineHeight: box, maxLines: 1, fontFamily: body, bold })
  const headers = table.columns.map((column, i) => fit(column.label, widths[i]!, HEAD_SIZE, HEAD_BOX, false))
  if (headers.some((h) => h === null)) return null
  const rows = table.rows.map((row) =>
    table.columns.map((column, i) => fit(cell(row, column.key), widths[i]! - (i === 0 ? FIRST_INSET : 0), CELL_SIZE, CELL_BOX, row.emphasis !== undefined)),
  )
  if (rows.some((r) => r.some((c) => c === null))) return null

  const closing = shape.callout ? fitNoticeClosing(shape.callout, rect.w, ctx) : undefined
  if (closing === null) return null
  const tableFoot = rect.y + HEAD_H + table.rows.length * ROW_H
  const foot = closing ? tableFoot + CLOSING_GAP + closing.height : tableFoot
  if (foot > rect.y + rect.h) return null

  const headInk = accessibleInk(colors.muted, bg, HEAD_SIZE)
  const strongRule = accessibleInk(colors.text, bg, CELL_SIZE)
  const rule = ruleInk(ctx)
  const tint = rowTint(ctx)
  const right = rect.x + rect.w
  const textX = (i: number, w: number, align: string | undefined, inset = true) =>
    align === "right" ? lefts[i]! + w : align === "center" ? lefts[i]! + w / 2 : lefts[i]! + (i === 0 && inset ? FIRST_INSET : 0)
  const anchor = (align: string | undefined) => (align === "right" ? "end" : align === "center" ? "middle" : "start") as "start" | "middle" | "end"

  const nodes: React.ReactNode[] = []
  table.columns.forEach((column, i) => {
    nodes.push(
      <g key={`head-${i}`}>
        {paintLines(headers[i]!, {
          ctx,
          x: textX(i, widths[i]!, column.align, false),
          y: centredBaseline(rect.y + HEAD_TOP, HEAD_BOX, HEAD_SIZE),
          fill: headInk,
          fontFamily: body,
          fontWeight: "400",
          anchor: anchor(column.align),
        })}
      </g>,
    )
  })
  nodes.push(<line key="head-rule" x1={rect.x} y1={rect.y + HEAD_H - 1} x2={right} y2={rect.y + HEAD_H - 1} stroke={strongRule} strokeWidth={1} />)
  table.rows.forEach((row, r) => {
    const top = rect.y + HEAD_H + r * ROW_H
    const highlight = row.emphasis === "highlight"
    const totalRow = row.emphasis === "total"
    const prevHighlight = r > 0 && table.rows[r - 1]!.emphasis === "highlight"
    if (highlight) nodes.push(<rect key={`tint-${r}`} x={rect.x} y={top} width={rect.w} height={ROW_H} fill={tint} />)
    else if (totalRow) nodes.push(<line key={`rule-${r}`} x1={rect.x} y1={top} x2={right} y2={top} stroke={strongRule} strokeWidth={1} />)
    else if (r > 0 && !prevHighlight) nodes.push(<line key={`rule-${r}`} x1={rect.x} y1={top} x2={right} y2={top} stroke={rule} strokeWidth={1} />)
    const ground = highlight ? tint : bg
    const ink = accessibleInk(highlight ? colors.primary : colors.text, ground, CELL_SIZE)
    table.columns.forEach((column, i) => {
      nodes.push(
        <g key={`cell-${r}-${i}`}>
          {paintLines(rows[r]![i]!, {
            ctx,
            x: textX(i, widths[i]!, column.align),
            y: centredBaseline(top + (ROW_H - CELL_BOX) / 2, CELL_BOX, CELL_SIZE),
            fill: ink,
            fontFamily: body,
            fontWeight: highlight || totalRow ? "700" : "400",
            anchor: anchor(column.align),
            bg: ground,
          })}
        </g>,
      )
    })
  })
  const lastHighlight = table.rows[table.rows.length - 1]!.emphasis === "highlight"
  if (!lastHighlight) nodes.push(<line key="foot-rule" x1={rect.x} y1={tableFoot} x2={right} y2={tableFoot} stroke={rule} strokeWidth={1} />)

  return (
    <g {...compositionTag("records")}>
      <g {...blockTag(ctx, table)}>{nodes}</g>
      {closing && paintNoticeClosing(closing, { x: rect.x, y: tableFoot + CLOSING_GAP, w: rect.w }, ctx)}
    </g>
  )
}
