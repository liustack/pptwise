import type React from "react"
import type { Component } from "@/ir"
import type { EmphasisHeadingLayout } from "../../render/emphasis"
import { accessibleInk, readableOn } from "../../render/ink"
import { closingCallout, fitClosing, fitNoticeClosing, paintClosing, paintNoticeClosing, type ClosingLayout, type ClosingSpec } from "./closing"
import { blockTag, compositionTag, ruleInk, type Composition } from "./shared"
import { fitFixed, paintLines } from "./type"

type Comparison = Extract<Component, { type: "comparison" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * table: a comparison set as an open ruled table. The row labels sit small
 * and muted in their own column, the options run across, and the recommended
 * option, when the author names one (`recommended`), is lifted onto a
 * `surface` column under a `primary` header and set bold in primary. A
 * closing line may follow the table in a full-width `primary` block, the
 * way `rows` closes. Brief's options page (p07 of the first board), and the
 * tea board's four-path and plan pages (p09, p11).
 *
 * The table is set at one of three sizes, the largest that holds it:
 *
 * - board: 24px cells and headers, 18px labels in a 280px column, rows that
 *   grow with their text. Two or three options. The first board's size.
 * - compact: 20px cells, 22px headers, 17px labels in a 260px column, every
 *   row as tall as the tallest. Two or three options. The tea board's plan
 *   page, five rows over a closing block.
 * - dense: 17px cells, 19px headers, 16px labels in a 170px column, every row
 *   room for two lines. Two to four options. The tea board's four paths.
 *
 * Takes: one `comparison` of two to four columns and one to five rows,
 * optionally followed by an `info` or `tip` `callout` with no icon.
 *
 * Declines: one column or more than four, more than five rows, a warning
 * callout or one with an icon, anything else beside the comparison, and a
 * table that at none of its sizes keeps every header to one line, every
 * cell and label to two, and itself and its closing block inside the band.
 *
 * Band: at the board size the label column takes 304px and each option's
 * text at least 160px, so two options with a pick need 736px and three
 * 952px. The dense size puts four options in the board's 1088px.
 *
 * Reads: `primary` (the pick's header fill and its values, the closing
 * block), `surface` (the pick's column), `text` (plain cells), `muted`
 * (labels and plain headers), `border` or `muted` (rules between rows), `bg`
 * or `defaultBg`, `fonts.body`, and the theme's emphasis stroke for a marked
 * run in a cell, measured against the column it sits on.
 */

const MIN_COLUMNS = 2
const MAX_ROWS = 5
/** The narrowest an option's text may be set. */
const MIN_TEXT_W = 160

interface TableScale {
  id: "board" | "compact" | "dense" | "notice"
  maxColumns: number
  /** The row labels' measure. */
  labelW: number
  /** The options start this far right of the band's left edge. */
  optionsInset: number
  columnGap: number
  /** Air left and right of a plain column's text. */
  plainPad: readonly [number, number]
  /** Air left and right of the recommended column's text. */
  pickPad: readonly [number, number]
  /** How much wider the recommended column's box is than a plain one. */
  pickExtra: number
  headH: number
  headSize: number
  /** Baseline of a header in its band. */
  headBaseline: number
  cellSize: number
  labelSize: number
  lineHeight: number
  /** Baseline of a cell's and a label's first line below the row's text top. */
  cellBaseline: number
  labelBaseline: number
  /** Air above a row's text, below it where a rule follows, and below the last row. */
  rowPadTop: number
  rowPadBottom: number
  lastRowPad: number
  /** Every row is as tall as this many lines at least, and as tall as the tallest row. */
  evenRows: number | null
  /**
   * Whose type the table is set in. `board`: plain cells in body ink and the
   * pick in primary. `notice`: plain cells muted, the pick black and bold on
   * its white column, its header bold, a black rule under the headers and a
   * hairline under the last row.
   */
  inks?: "board" | "notice"
}

const SCALES: readonly TableScale[] = [
  {
    id: "board",
    maxColumns: 3,
    labelW: 280,
    optionsInset: 304,
    columnGap: 32,
    plainPad: [0, 24],
    pickPad: [28, 28],
    // Every column's text gets the same measure.
    pickExtra: 32,
    headH: 64,
    headSize: 24,
    headBaseline: 40,
    cellSize: 24,
    labelSize: 18,
    lineHeight: 32,
    cellBaseline: 24,
    labelBaseline: 22,
    rowPadTop: 26,
    rowPadBottom: 26,
    lastRowPad: 10,
    evenRows: null,
  },
  {
    id: "compact",
    maxColumns: 3,
    labelW: 260,
    optionsInset: 284,
    columnGap: 36,
    plainPad: [0, 16],
    pickPad: [24, 24],
    pickExtra: 48,
    headH: 52,
    headSize: 22,
    headBaseline: 34,
    cellSize: 20,
    labelSize: 17,
    lineHeight: 28,
    cellBaseline: 21,
    labelBaseline: 21,
    rowPadTop: 12,
    rowPadBottom: 12,
    lastRowPad: 16,
    evenRows: 1,
  },
  {
    id: "dense",
    maxColumns: 4,
    labelW: 170,
    optionsInset: 176,
    columnGap: 16,
    plainPad: [4, 26],
    pickPad: [18, 12],
    pickExtra: 0,
    headH: 52,
    headSize: 19,
    headBaseline: 33,
    cellSize: 17,
    labelSize: 16,
    lineHeight: 24,
    cellBaseline: 18,
    labelBaseline: 18,
    rowPadTop: 16,
    rowPadBottom: 2,
    lastRowPad: 2,
    evenRows: 2,
  },
]
/**
 * The notice setting's one size: bulletin's 2026-10 plan page (p12). 20px
 * cells and headers on 60px headers and 70px rows, 17px labels in a 170px
 * column, the pick's column 32px wider than a plain one.
 */
const NOTICE_SCALES: readonly TableScale[] = [
  {
    id: "notice",
    maxColumns: 3,
    labelW: 170,
    optionsInset: 180,
    columnGap: 28,
    plainPad: [0, 24],
    pickPad: [28, 28],
    pickExtra: 32,
    headH: 60,
    headSize: 20,
    headBaseline: 38,
    cellSize: 20,
    labelSize: 17,
    lineHeight: 30,
    cellBaseline: 23,
    labelBaseline: 22,
    rowPadTop: 20,
    rowPadBottom: 20,
    lastRowPad: 20,
    evenRows: 1,
    inks: "notice",
  },
]
const MAX_COLUMNS = Math.max(...SCALES.map((scale) => scale.maxColumns))
const CELL_MAX_LINES = 2

/** The closing block under a table: one 22px line makes the tea board's 64px block. */
const CLOSING: ClosingSpec = { size: 22, lineHeight: 34, padX: 40, padY: 15, maxLines: 2 }
/** From the table's foot to the closing block. */
const CLOSING_GAP = 24

interface Column {
  /** Left edge of the column's box. */
  x: number
  w: number
  /** Left edge and measure of its text. */
  textX: number
  textW: number
  picked: boolean
}

/**
 * The option columns across `optionsX` to `optionsX + optionsW`. Every plain
 * column is the same box, the recommended one `pickExtra` wider, with
 * `columnGap` between boxes. At the board size that gives every column's
 * text one measure (336px each on its two columns). On the tea board's plan
 * page the pick's box is 408px beside a plain 360px.
 */
function columnsFor(scale: TableScale, count: number, picked: number | undefined, optionsX: number, optionsW: number): Column[] {
  const hasPick = picked !== undefined && picked >= 0 && picked < count
  const plainPads = scale.plainPad[0] + scale.plainPad[1]
  const pickPads = scale.pickPad[0] + scale.pickPad[1]
  const plainTextW = Math.floor(
    (optionsW - scale.columnGap * (count - 1) - (hasPick ? scale.pickExtra : 0) - count * plainPads) / count,
  )
  const columns: Column[] = []
  let x = optionsX
  for (let i = 0; i < count; i++) {
    const isPicked = hasPick && i === picked
    const w = plainTextW + plainPads + (isPicked ? scale.pickExtra : 0)
    const textW = isPicked ? w - pickPads : plainTextW
    columns.push({ x, w, textX: x + (isPicked ? scale.pickPad[0] : scale.plainPad[0]), textW, picked: isPicked })
    x += w + scale.columnGap
  }
  return columns
}

function tableShape(components: readonly Component[]): { comparison: Comparison; callout?: Callout } | null {
  const [only, second, ...rest] = components
  if (only?.type !== "comparison" || rest.length > 0) return null
  if (only.columns.length < MIN_COLUMNS || only.columns.length > MAX_COLUMNS) return null
  if (only.rows.length === 0 || only.rows.length > MAX_ROWS) return null
  if (second === undefined) return { comparison: only }
  const callout = closingCallout(second)
  return callout ? { comparison: only, callout } : null
}

interface PlacedRow {
  label: EmphasisHeadingLayout
  cells: EmphasisHeadingLayout[]
  top: number
  bottom: number
  last: boolean
}

interface TableLayout {
  scale: TableScale
  columns: Column[]
  headers: EmphasisHeadingLayout[]
  rows: PlacedRow[]
  bottom: number
  closing?: ClosingLayout
}

/** The table set at `scale` in `rect`, or `null` when it does not hold whole there. */
function layoutAt(
  scale: TableScale,
  comparison: Comparison,
  callout: Callout | undefined,
  ctx: Parameters<Composition>[0]["ctx"],
  rect: Parameters<Composition>[0]["rect"],
): TableLayout | null {
  if (comparison.columns.length > scale.maxColumns) return null
  const body = ctx.fonts.body
  const optionsX = rect.x + scale.optionsInset
  const columns = columnsFor(scale, comparison.columns.length, comparison.recommended, optionsX, rect.x + rect.w - optionsX)
  if (columns.some((column) => column.textW < MIN_TEXT_W)) return null

  const headers: EmphasisHeadingLayout[] = []
  for (const [i, column] of columns.entries()) {
    const fitted = fitFixed(comparison.columns[i], {
      width: column.textW,
      size: scale.headSize,
      lineHeight: scale.lineHeight,
      maxLines: 1,
      fontFamily: body,
      bold: false,
    })
    if (fitted === null) return null
    headers.push(fitted)
  }

  const fitted = []
  for (const row of comparison.rows) {
    const label = fitFixed(row.label, {
      width: scale.labelW,
      size: scale.labelSize,
      lineHeight: scale.lineHeight,
      maxLines: CELL_MAX_LINES,
      fontFamily: body,
      bold: false,
    })
    if (label === null) return null
    const cells: EmphasisHeadingLayout[] = []
    for (const [i, column] of columns.entries()) {
      const cell = fitFixed(row.cells[i] ?? "", {
        width: column.textW,
        size: scale.cellSize,
        lineHeight: scale.lineHeight,
        maxLines: CELL_MAX_LINES,
        fontFamily: body,
        bold: column.picked,
      })
      if (cell === null) return null
      cells.push(cell)
    }
    fitted.push({ label, cells, lines: Math.max(1, label.lines.length, ...cells.map((cell) => cell.lines.length)) })
  }
  const even = scale.evenRows === null ? null : Math.max(scale.evenRows, ...fitted.map((row) => row.lines))

  let cursor = rect.y + scale.headH
  const rows: PlacedRow[] = fitted.map((row, index) => {
    const top = cursor
    const last = index === fitted.length - 1
    const lines = even ?? row.lines
    const bottom = top + scale.rowPadTop + lines * scale.lineHeight + (last ? scale.lastRowPad : scale.rowPadBottom)
    cursor = bottom
    return { label: row.label, cells: row.cells, top, bottom, last }
  })
  const bottom = cursor
  const closing = callout ? fitClosing(callout, rect.w, CLOSING, ctx) : undefined
  if (closing === null) return null
  const foot = closing ? bottom + CLOSING_GAP + closing.height : bottom
  if (foot > rect.y + rect.h) return null
  return { scale, columns, headers, rows, bottom, ...(closing ? { closing } : {}) }
}

export const tableComposition: Composition = ({ components, ctx, rect, setting }) => {
  const shape = tableShape(components)
  if (!shape) return null
  if (setting === "notice") return noticeTable(shape, ctx, rect)
  let layout: TableLayout | null = null
  for (const scale of SCALES) {
    layout = layoutAt(scale, shape.comparison, shape.callout, ctx, rect)
    if (layout) break
  }
  if (!layout) return null
  const { scale, columns, headers, rows } = layout
  const { colors, fonts } = ctx
  const body = fonts.body
  const bg = ctx.defaultBg ?? colors.bg
  const surface = colors.surface
  const left = rect.x
  const right = rect.x + rect.w

  const pick = columns.find((column) => column.picked)
  const headInk = accessibleInk(colors.muted, bg, scale.headSize)
  const pickHeadInk = readableOn(colors.primary)
  const labelInk = accessibleInk(colors.muted, bg, scale.labelSize)
  const cellInk = accessibleInk(colors.text, bg, scale.cellSize)
  const pickInk = accessibleInk(colors.primary, surface, scale.cellSize)
  const rule = ruleInk(ctx)

  const table = (
    <>
      {pick && <rect x={pick.x} y={rect.y} width={pick.w} height={layout.bottom - rect.y} fill={surface} />}
      {pick && <rect x={pick.x} y={rect.y} width={pick.w} height={scale.headH} fill={colors.primary} />}
      {columns.map((column, i) => (
        <g key={i}>
          {paintLines(headers[i]!, {
          ctx,
          x: column.textX,
          y: rect.y + scale.headBaseline,
          fill: column.picked ? pickHeadInk : headInk,
          fontFamily: body,
          fontWeight: "400",
          bg: column.picked ? colors.primary : undefined,
          })}
        </g>
      ))}
      {rows.map((row, index) => (
        <g key={index}>
          {paintLines(row.label, {
            ctx,
            x: left,
            y: row.top + scale.rowPadTop + scale.labelBaseline,
            fill: labelInk,
            fontFamily: body,
            fontWeight: "400",
          })}
          {columns.map((column, i) => (
            <g key={i}>
              {paintLines(row.cells[i]!, {
              ctx,
              x: column.textX,
              y: row.top + scale.rowPadTop + scale.cellBaseline,
              fill: column.picked ? pickInk : cellInk,
              fontFamily: body,
              fontWeight: column.picked ? "700" : "400",
              bg: column.picked ? surface : undefined,
              })}
            </g>
          ))}
          {!row.last && (
            <line x1={left} y1={row.bottom} x2={right} y2={row.bottom} stroke={rule} strokeWidth={1} />
          )}
        </g>
      ))}
    </>
  )
  // A table with no closing line is one block, tagged on the composition's
  // own group as it always was. A closing line is a second component, so
  // each gets a group of its own.
  if (!layout.closing) {
    return (
      <g {...compositionTag("table")} {...blockTag(ctx, shape.comparison)}>
        {table}
      </g>
    )
  }
  return (
    <g {...compositionTag("table")}>
      <g {...blockTag(ctx, shape.comparison)}>{table}</g>
      {paintClosing(layout.closing, { x: left, y: layout.bottom + CLOSING_GAP, w: rect.w }, CLOSING, ctx)}
    </g>
  )
}

/**
 * The table in the notice setting: the one notice size, its inks, and a
 * closing note on a light panel instead of a primary block.
 */
function noticeTable(
  shape: { comparison: Comparison; callout?: Callout },
  ctx: Parameters<Composition>[0]["ctx"],
  rect: Parameters<Composition>[0]["rect"],
): React.ReactElement | null {
  const closing = shape.callout ? fitNoticeClosing(shape.callout, rect.w, ctx) : undefined
  if (closing === null) return null
  const room = closing ? { ...rect, h: rect.h - CLOSING_GAP - closing.height } : rect
  let layout: TableLayout | null = null
  for (const scale of NOTICE_SCALES) {
    layout = layoutAt(scale, shape.comparison, undefined, ctx, room)
    if (layout) break
  }
  if (!layout) return null
  const { scale, columns, headers, rows } = layout
  const { colors, fonts } = ctx
  const body = fonts.body
  const bg = ctx.defaultBg ?? colors.bg
  const surface = colors.surface
  const left = rect.x
  const right = rect.x + rect.w
  const pick = columns.find((column) => column.picked)
  const headInk = accessibleInk(colors.muted, bg, scale.headSize)
  const pickHeadInk = readableOn(colors.primary)
  const labelInk = accessibleInk(colors.muted, bg, scale.labelSize)
  const cellInk = accessibleInk(colors.muted, bg, scale.cellSize)
  const pickInk = accessibleInk(colors.text, surface, scale.cellSize)
  const rule = ruleInk(ctx)
  const headRule = accessibleInk(colors.text, bg, scale.cellSize)
  const table = (
    <>
      {pick && <rect x={pick.x} y={rect.y} width={pick.w} height={layout.bottom - rect.y} fill={surface} />}
      {pick && <rect x={pick.x} y={rect.y} width={pick.w} height={scale.headH} fill={colors.primary} />}
      {columns.map((column, i) => (
        <g key={i}>
          {paintLines(headers[i]!, {
            ctx,
            x: column.textX,
            y: rect.y + scale.headBaseline,
            fill: column.picked ? pickHeadInk : headInk,
            fontFamily: body,
            fontWeight: column.picked ? "700" : "400",
            bg: column.picked ? colors.primary : undefined,
          })}
        </g>
      ))}
      <line x1={left} y1={rect.y + scale.headH} x2={right} y2={rect.y + scale.headH} stroke={headRule} strokeWidth={1} />
      {rows.map((row, index) => (
        <g key={index}>
          {paintLines(row.label, {
            ctx,
            x: left,
            y: row.top + scale.rowPadTop + scale.labelBaseline,
            fill: labelInk,
            fontFamily: body,
            fontWeight: "400",
          })}
          {columns.map((column, i) => (
            <g key={i}>
              {paintLines(row.cells[i]!, {
                ctx,
                x: column.textX,
                y: row.top + scale.rowPadTop + scale.cellBaseline,
                fill: column.picked ? pickInk : cellInk,
                fontFamily: body,
                fontWeight: column.picked ? "700" : "400",
                bg: column.picked ? surface : undefined,
              })}
            </g>
          ))}
          <line x1={left} y1={row.bottom} x2={right} y2={row.bottom} stroke={rule} strokeWidth={1} />
        </g>
      ))}
    </>
  )
  return (
    <g {...compositionTag("table")}>
      <g {...blockTag(ctx, shape.comparison)}>{table}</g>
      {closing && paintNoticeClosing(closing, { x: left, y: layout.bottom + CLOSING_GAP, w: rect.w }, ctx)}
    </g>
  )
}
