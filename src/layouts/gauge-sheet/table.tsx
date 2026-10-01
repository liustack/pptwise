import type { Component } from "@/ir"
import type { EmphasisHeadingLayout } from "../../render/emphasis"
import { accessibleInk, readableOn } from "../../render/ink"
import { GAUGE_LEFT, GAUGE_RIGHT } from "../gauge-shared"
import { blockTag, ruleInk, type SheetModule } from "./frame"
import { fitFixed, paintLines } from "./type"

type Comparison = Extract<Component, { type: "comparison" }>

/*
 * table: the board's options page (p07). A comparison set as an open ruled
 * table: the row labels small and muted in their own column, the options
 * across, and the recommended option, when the author names one, lifted onto
 * a white column under a primary header and set bold in primary.
 *
 * Takes one `comparison` of two or three columns and at most five rows,
 * where every cell sets whole at 24px in two lines and every header in one.
 */

const MIN_COLUMNS = 2
const MAX_COLUMNS = 3
const MAX_ROWS = 5

const LABEL_X = GAUGE_LEFT
const LABEL_W = 280
/** The options start here and run to the right edge of the type area. */
const OPTIONS_X = 400
const OPTIONS_W = GAUGE_RIGHT - OPTIONS_X
const COLUMN_GAP = 32
/** Air right of a plain column's text. */
const PLAIN_PAD = 24
/** Air either side of the recommended column's text, inside its white column. */
const PICK_PAD = 28

const HEAD_H = 64
const HEAD_SIZE = 24
/** Baseline of the 24px header, centred in its 64px band. */
const HEAD_BASELINE = 40

const CELL_SIZE = 24
const LABEL_SIZE = 18
const ROW_LINE_HEIGHT = 32
const CELL_MAX_LINES = 2
/** Air above a row's text, and below it where a rule follows. */
const ROW_PAD = 26
/** Air below the last row's text, where the white column ends. */
const LAST_ROW_PAD = 10
/** Baselines of the 24px cell and the 18px label in a 32px line box. */
const CELL_BASELINE = 24
const LABEL_BASELINE = 22

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
 * The option columns across x400 to x1184. Each plain column is its text
 * plus 24px of air on the right, the recommended one its text plus 28px each
 * side, with 32px between boxes, and every column's text gets the same
 * measure. On the board's two columns that is 336px each.
 */
function columnsFor(count: number, picked: number | undefined): Column[] {
  const padding = Array.from({ length: count }, (_, i) => (i === picked ? PICK_PAD * 2 : PLAIN_PAD))
  const textW = Math.floor((OPTIONS_W - COLUMN_GAP * (count - 1) - padding.reduce((a, b) => a + b, 0)) / count)
  const columns: Column[] = []
  let x = OPTIONS_X
  for (let i = 0; i < count; i++) {
    const isPicked = i === picked
    const w = textW + padding[i]!
    columns.push({ x, w, textX: isPicked ? x + PICK_PAD : x, textW, picked: isPicked })
    x += w + COLUMN_GAP
  }
  return columns
}

function tableShape(components: readonly Component[]): Comparison | null {
  if (components.length !== 1) return null
  const only = components[0]!
  if (only.type !== "comparison") return null
  if (only.columns.length < MIN_COLUMNS || only.columns.length > MAX_COLUMNS) return null
  if (only.rows.length === 0 || only.rows.length > MAX_ROWS) return null
  return only
}

export const sheetTable: SheetModule = ({ slide, ctx, rect }) => {
  const comparison = tableShape(slide.components)
  if (!comparison) return null
  const { colors, fonts } = ctx
  const body = fonts.body
  const bg = ctx.defaultBg ?? colors.bg
  const surface = colors.surface
  const columns = columnsFor(comparison.columns.length, comparison.recommended)

  const headers: EmphasisHeadingLayout[] = []
  for (const [i, column] of columns.entries()) {
    const fitted = fitFixed(comparison.columns[i], {
      width: column.textW,
      size: HEAD_SIZE,
      lineHeight: ROW_LINE_HEIGHT,
      maxLines: 1,
      fontFamily: body,
      bold: false,
    })
    if (fitted === null) return null
    headers.push(fitted)
  }

  const rows = []
  for (const row of comparison.rows) {
    const label = fitFixed(row.label, {
      width: LABEL_W,
      size: LABEL_SIZE,
      lineHeight: ROW_LINE_HEIGHT,
      maxLines: CELL_MAX_LINES,
      fontFamily: body,
      bold: false,
    })
    if (label === null) return null
    const cells: EmphasisHeadingLayout[] = []
    for (const [i, column] of columns.entries()) {
      const cell = fitFixed(row.cells[i] ?? "", {
        width: column.textW,
        size: CELL_SIZE,
        lineHeight: ROW_LINE_HEIGHT,
        maxLines: CELL_MAX_LINES,
        fontFamily: body,
        bold: column.picked,
      })
      if (cell === null) return null
      cells.push(cell)
    }
    rows.push({ label, cells })
  }

  let cursor = rect.y + HEAD_H
  const placed = rows.map((row, index) => {
    const top = cursor
    const lines = Math.max(1, row.label.lines.length, ...row.cells.map((cell) => cell.lines.length))
    const last = index === rows.length - 1
    const bottom = top + ROW_PAD + lines * ROW_LINE_HEIGHT + (last ? LAST_ROW_PAD : ROW_PAD)
    cursor = bottom
    return { ...row, top, bottom, last }
  })
  const tableBottom = cursor
  if (tableBottom > rect.y + rect.h) return null

  const pick = columns.find((column) => column.picked)
  const headInk = accessibleInk(colors.muted, bg, HEAD_SIZE)
  const pickHeadInk = readableOn(colors.primary)
  const labelInk = accessibleInk(colors.muted, bg, LABEL_SIZE)
  const cellInk = accessibleInk(colors.text, bg, CELL_SIZE)
  const pickInk = accessibleInk(colors.primary, surface, CELL_SIZE)
  const rule = ruleInk(ctx)

  return (
    <g data-gauge-module="table" {...blockTag(ctx, comparison)}>
      {pick && <rect x={pick.x} y={rect.y} width={pick.w} height={tableBottom - rect.y} fill={surface} />}
      {pick && <rect x={pick.x} y={rect.y} width={pick.w} height={HEAD_H} fill={colors.primary} />}
      {columns.map((column, i) => (
        <g key={i}>
          {paintLines(headers[i]!, {
          ctx,
          x: column.textX,
          y: rect.y + HEAD_BASELINE,
          fill: column.picked ? pickHeadInk : headInk,
          fontFamily: body,
          fontWeight: "400",
          bg: column.picked ? colors.primary : undefined,
          })}
        </g>
      ))}
      {placed.map((row, index) => (
        <g key={index}>
          {paintLines(row.label, {
            ctx,
            x: LABEL_X,
            y: row.top + ROW_PAD + LABEL_BASELINE,
            fill: labelInk,
            fontFamily: body,
            fontWeight: "400",
          })}
          {columns.map((column, i) => (
            <g key={i}>
              {paintLines(row.cells[i]!, {
              ctx,
              x: column.textX,
              y: row.top + ROW_PAD + CELL_BASELINE,
              fill: column.picked ? pickInk : cellInk,
              fontFamily: body,
              fontWeight: column.picked ? "700" : "400",
              bg: column.picked ? surface : undefined,
              })}
            </g>
          ))}
          {!row.last && (
            <line x1={GAUGE_LEFT} y1={row.bottom} x2={GAUGE_RIGHT} y2={row.bottom} stroke={rule} strokeWidth={1} />
          )}
        </g>
      ))}
    </g>
  )
}
