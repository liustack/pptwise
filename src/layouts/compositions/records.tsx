import type React from "react"
import type { Component } from "@/ir"
import { accessibleInk } from "../../render/ink"
import { fitNoticeClosing, noticeClosingCallout, paintNoticeClosing } from "./closing"
import { gridMark, gridMarkOn, gridRowTint } from "./grid"
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
 *
 * The grid setting (swiss's 2026-10 board, p09) sets the same table a touch
 * heavier: a 2px black rule under the headers and over a total row, 48px
 * rows of 20px cells, and a highlighted row on a pale tint of the emphasis
 * ink with its text bold in that ink (`./grid.ts`).
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

/** The table's measures in one setting. */
interface RecordsSpec {
  headTop: number
  headBox: number
  /** Rows start this far into the band. */
  headH: number
  /** The strong rules' thickness: under the headers and over a total row. */
  strong: number
  rowH: number
  cellSize: number
  closingGap: number
}

const NOTICE_SPEC: RecordsSpec = { headTop: HEAD_TOP, headBox: HEAD_BOX, headH: HEAD_H, strong: 1, rowH: ROW_H, cellSize: CELL_SIZE, closingGap: CLOSING_GAP }
/** swiss's board: headers in a 26px box from y202, the rule at y232, rows from y234. */
const GRID_SPEC: RecordsSpec = { headTop: 6, headBox: 26, headH: 38, strong: 2, rowH: 48, cellSize: 20, closingGap: 26 }

function recordsShape(components: readonly Component[]): { table: DataTable; callout?: Callout } | null {
  const [table, second, ...rest] = components
  if (table?.type !== "data_table" || rest.length > 0) return null
  if (table.source?.trim()) return null
  // No place for a title over the open table: the ordinary table prints it.
  if (table.title?.trim()) return null
  if (table.columns.length > MAX_COLUMNS || table.rows.length > MAX_ROWS) return null
  if (second === undefined) return { table }
  const callout = noticeClosingCallout(second)
  return callout ? { table, callout } : null
}

function cell(row: DataTable["rows"][number], key: string): string {
  const v = row.cells[key]
  return v === undefined ? "" : String(v)
}

export const recordsComposition: Composition = ({ components, ctx, rect, setting }) => {
  const shape = recordsShape(components)
  if (!shape) return null
  const grid = setting === "grid"
  const spec = grid ? GRID_SPEC : NOTICE_SPEC
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
      ...texts.map((t) => textWidth(t.text, spec.cellSize, body, t.bold)),
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
  const headers = table.columns.map((column, i) => fit(column.label, widths[i]!, HEAD_SIZE, spec.headBox, false))
  if (headers.some((h) => h === null)) return null
  const rows = table.rows.map((row) =>
    table.columns.map((column, i) => fit(cell(row, column.key), widths[i]! - (i === 0 ? FIRST_INSET : 0), spec.cellSize, CELL_BOX, row.emphasis !== undefined)),
  )
  if (rows.some((r) => r.some((c) => c === null))) return null

  const closing = shape.callout ? fitNoticeClosing(shape.callout, rect.w, ctx) : undefined
  if (closing === null) return null
  const tableFoot = rect.y + spec.headH + table.rows.length * spec.rowH
  const foot = closing ? tableFoot + spec.closingGap + closing.height : tableFoot
  if (foot > rect.y + rect.h) return null

  const headInk = accessibleInk(colors.muted, bg, HEAD_SIZE)
  const strongRule = accessibleInk(colors.text, bg, spec.cellSize)
  const rule = ruleInk(ctx)
  const tint = grid ? gridRowTint(ctx) : rowTint(ctx)
  const mark = grid ? gridMark(ctx) : colors.primary
  /** A strong rule whose top edge is `y`, drawn as a filled band when it is thicker than a hairline. */
  const strongLine = (key: string, y: number) =>
    spec.strong > 1 ? (
      <rect key={key} x={rect.x} y={y} width={rect.w} height={spec.strong} fill={strongRule} />
    ) : (
      <line key={key} x1={rect.x} y1={y} x2={right} y2={y} stroke={strongRule} strokeWidth={1} />
    )
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
          y: centredBaseline(rect.y + spec.headTop, spec.headBox, HEAD_SIZE),
          fill: headInk,
          fontFamily: body,
          fontWeight: "400",
          anchor: anchor(column.align),
        })}
      </g>,
    )
  })
  nodes.push(strongLine("head-rule", rect.y + spec.headH - spec.strong))
  table.rows.forEach((row, r) => {
    const top = rect.y + spec.headH + r * spec.rowH
    const highlight = row.emphasis === "highlight"
    const totalRow = row.emphasis === "total"
    const prevHighlight = r > 0 && table.rows[r - 1]!.emphasis === "highlight"
    if (highlight) nodes.push(<rect key={`tint-${r}`} x={rect.x} y={top} width={rect.w} height={spec.rowH} fill={tint} />)
    else if (totalRow) nodes.push(strongLine(`rule-${r}`, top))
    else if (r > 0 && !prevHighlight) nodes.push(<line key={`rule-${r}`} x1={rect.x} y1={top} x2={right} y2={top} stroke={rule} strokeWidth={1} />)
    const ground = highlight ? tint : bg
    const ink = highlight && grid ? gridMarkOn(ctx, ground, spec.cellSize) : accessibleInk(highlight ? mark : colors.text, ground, spec.cellSize)
    table.columns.forEach((column, i) => {
      nodes.push(
        <g key={`cell-${r}-${i}`}>
          {paintLines(rows[r]![i]!, {
            ctx,
            x: textX(i, widths[i]!, column.align),
            y: centredBaseline(top + (spec.rowH - CELL_BOX) / 2, CELL_BOX, spec.cellSize),
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
      {closing && paintNoticeClosing(closing, { x: rect.x, y: tableFoot + spec.closingGap, w: rect.w }, ctx)}
    </g>
  )
}
