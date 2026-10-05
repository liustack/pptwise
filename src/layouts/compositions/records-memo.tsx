import type React from "react"
import type { Component } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import type { EmphasisHeadingLayout } from "../../render/emphasis"
import { paintIcon } from "./console"
import {
  fitMemo,
  memoInks,
  memoMeta,
  memoQuietInks,
  memoTagWidth,
  memoText,
  memoWidth,
  paintMemo,
  paintMemoLine,
  paintMemoTag,
  type MemoFace,
  type MemoInks,
} from "./memo"
import { blockTag, compositionTag, type CompositionProps } from "./shared"

type DataTable = Extract<Component, { type: "data_table" }>
type Row = DataTable["rows"][number]

/*
 * records in the memo setting: an open table typed on the memo's paper,
 * memo's 2026-10 board. Headers in small mono over a 2px rule of ink,
 * hairlines between rows, no fill but the marked row's tint of the mark.
 *
 * Two forms, by what the table holds.
 *
 * A table of figures (the retention page, p07): some column after the first
 * has a figure in every cell. The first such column is what the page argues
 * from, set large in the heading face, bold, 22px; any later figure column
 * (a sample size) is typed small in mono; other columns are notes in the
 * muted ink. A row's `tag` leads its last cell as a square outlined tag, one
 * colour per kind of tag in the order they first appear (`memoQuietInks`),
 * the marked row's in the mark: a source's kind told apart at a glance. 56px
 * a row.
 *
 * A table of duties (the roles page, p15): no column of figures. The first
 * column names the party in the heading face, bold, after the row's icon;
 * every other column is a sentence or two in the body face. 80px a row.
 *
 * The marked row (`emphasis: "highlight"`) sits on the mark's tint, its name,
 * figure and icon in the mark. A `title` is typed over the headers as a
 * muted line.
 *
 * Takes: one `data_table` of two to six columns and up to seven rows of
 * figures or five of duties, with no `source`.
 *
 * Declines: a cell past its lines, a table wider or taller than the band.
 */

const MAX_COLUMNS = 6
const HEADER = { size: 13, lineHeight: 22, top: 2, rule: 28, rows: 30 } as const
const TITLE = { size: 14, lineHeight: 22, gap: 8 } as const
const PAD = 8
const ICON = { x: 10, size: 22, gap: 10 } as const

/** A table of figures: one line a cell. */
const FIGURES = {
  row: 56,
  pitch: 57,
  name: { size: 17, lineHeight: 26, top: 15 },
  figure: { size: 22, lineHeight: 32, top: 12 },
  count: { size: 15, lineHeight: 26, top: 15 },
  note: { size: 15, lineHeight: 26, top: 15 },
  tagged: { size: 14, lineHeight: 26, top: 15, tagTop: 16, gap: 12 },
} as const

/** A table of duties: up to two lines a cell. */
const DUTIES = {
  row: 80,
  pitch: 81,
  name: { size: 18, lineHeight: 30, top: 24 },
  cell: { size: 16, lineHeight: 26, top: 26, maxLines: 2 },
  iconTop: 28,
} as const

const FIGURE_CELL = /\d/

function cellText(row: Row, key: string): string {
  const v = row.cells[key]
  return v === undefined ? "" : String(v)
}

type ColumnRole = "name" | "figure" | "count" | "note"

/** Each column's role in a table of figures, or `null` for a table of duties. */
function figureRoles(table: DataTable): ColumnRole[] | null {
  const figureColumns = table.columns.map((column, c) => c > 0 && table.rows.every((row) => FIGURE_CELL.test(cellText(row, column.key))))
  const first = figureColumns.indexOf(true)
  if (first < 0) return null
  return table.columns.map((_, c) => (c === 0 ? "name" : c === first ? "figure" : figureColumns[c] ? "count" : "note"))
}

const ROLE_STYLE: Record<ColumnRole, { face: MemoFace; size: number; lineHeight: number; top: number; bold: boolean }> = {
  name: { face: "body", ...FIGURES.name, bold: false },
  figure: { face: "song", ...FIGURES.figure, bold: true },
  count: { face: "mono", ...FIGURES.count, bold: false },
  note: { face: "body", ...FIGURES.note, bold: false },
}

/** The tag colours by kind: each distinct tag text its own quiet ink, in order of first appearance. */
function tagColours(table: DataTable, ctx: ComponentCtx, inks: MemoInks): Map<string, string> {
  const quiet = memoQuietInks(ctx)
  const colours = new Map<string, string>()
  for (const row of table.rows) {
    const tag = row.tag
    if (!tag || tag.quiet || row.emphasis === "highlight" || colours.has(tag.text)) continue
    colours.set(tag.text, quiet[colours.size % quiet.length] ?? inks.muted)
  }
  return colours
}

export function recordsMemo({ components, ctx, rect }: CompositionProps): React.ReactElement | null {
  const [table, ...rest] = components
  if (table?.type !== "data_table" || rest.length > 0) return null
  if (table.source?.trim() || table.columns.length > MAX_COLUMNS) return null
  const inks = memoInks(ctx)
  const title = table.title?.trim() ? fitMemo(table.title, { width: rect.w, size: TITLE.size, lineHeight: TITLE.lineHeight, maxLines: 1, face: "body" }, ctx) : null
  if (table.title?.trim() && !title) return null
  const top = rect.y + (title ? TITLE.lineHeight + TITLE.gap : 0)
  const roles = figureRoles(table)
  const drawn = roles ? figureTable(table, roles, { ctx, rect, top, inks }) : dutiesTable(table, { ctx, rect, top, inks })
  if (!drawn) return null
  return (
    <g {...compositionTag("records")} data-memo-records={roles ? "figures" : "duties"} {...blockTag(ctx, table)}>
      {title ? paintMemo(title, { ctx, x: rect.x, top: rect.y, face: "body", fill: memoMeta(inks.muted, inks.ground) }) : null}
      {drawn}
    </g>
  )
}

interface Frame {
  ctx: ComponentCtx
  rect: CompositionProps["rect"]
  top: number
  inks: MemoInks
}

/** The headers over their 2px rule, each at its column's left edge. */
function paintHeaders(table: DataTable, xs: readonly number[], frame: Frame): React.ReactNode {
  const { ctx, rect, top, inks } = frame
  return (
    <g data-memo-headers="">
      {table.columns.map((column, c) =>
        column.label.trim()
          ? paintMemoLine(column.label, {
              ctx,
              key: `h-${c}`,
              x: xs[c]! + PAD,
              top: top + HEADER.top,
              lineHeight: HEADER.lineHeight,
              size: HEADER.size,
              face: "mono",
              fill: memoMeta(inks.muted, inks.ground),
            })
          : null,
      )}
      <rect x={rect.x} y={top + HEADER.rule} width={rect.w} height={2} fill={inks.ink} />
    </g>
  )
}

/** Column lefts from widths. */
function lefts(x: number, widths: readonly number[]): number[] {
  const out: number[] = []
  let at = x
  for (const w of widths) {
    out.push(at)
    at += w
  }
  return out
}

/** Natural widths shared out to `total`, or `null` when they do not fit. */
function share(natural: readonly number[], total: number): number[] | null {
  const sum = natural.reduce((s, w) => s + w, 0)
  if (sum > total) return null
  const spare = total - sum
  return natural.map((w) => w + (spare * w) / sum)
}

function figureTable(table: DataTable, roles: ColumnRole[], frame: Frame): React.ReactNode | null {
  const { ctx, rect, top, inks } = frame
  if (table.rows.length * FIGURES.pitch + HEADER.rows > rect.y + rect.h - top) return null
  const last = table.columns.length - 1
  const natural = table.columns.map((column, c) => {
    const style = ROLE_STYLE[roles[c]!]
    const cells = table.rows.map((row) => {
      const text = cellText(row, column.key)
      const words = memoWidth(text, c === last && row.tag ? FIGURES.tagged.size : style.size, style.face, ctx, style.bold)
      return words + (c === last && row.tag ? memoTagWidth(row.tag.text) + FIGURES.tagged.gap : 0)
    })
    return Math.ceil(Math.max(memoWidth(column.label, HEADER.size, "mono", ctx), ...cells)) + PAD * 2 + 12
  })
  const widths = share(natural, rect.w)
  if (!widths) return null
  const xs = lefts(rect.x, widths)
  const colours = tagColours(table, ctx, inks)
  return (
    <g>
      {paintHeaders(table, xs, frame)}
      {table.rows.map((row, r) => {
        const rowTop = top + HEADER.rows + r * FIGURES.pitch
        const marked = row.emphasis === "highlight"
        const ground = marked ? inks.tint : inks.ground
        return (
          <g key={r} data-memo-row={marked ? "marked" : ""}>
            {marked ? <rect x={rect.x} y={rowTop} width={rect.w} height={FIGURES.row} fill={inks.tint} /> : null}
            <rect x={rect.x} y={rowTop + FIGURES.row} width={rect.w} height={1} fill={inks.line} />
            {table.columns.map((column, c) => {
              const role = roles[c]!
              const text = cellText(row, column.key)
              const style = ROLE_STYLE[role]
              const x = xs[c]! + PAD
              const tag = c === last ? row.tag : undefined
              if (tag) {
                const ink = marked ? inks.mark : tag.quiet ? inks.muted : (colours.get(tag.text) ?? inks.muted)
                const tagW = memoTagWidth(tag.text)
                return (
                  <g key={c}>
                    {paintMemoTag({ ctx, text: tag.text, x, y: rowTop + FIGURES.tagged.tagTop, ink, ground })}
                    {text
                      ? paintMemoLine(text, {
                          ctx,
                          x: x + tagW + FIGURES.tagged.gap,
                          top: rowTop + FIGURES.tagged.top,
                          lineHeight: FIGURES.tagged.lineHeight,
                          size: FIGURES.tagged.size,
                          face: "body",
                          fill: memoText(inks.muted, ground, FIGURES.tagged.size),
                        })
                      : null}
                  </g>
                )
              }
              if (!text) return null
              const ink = role === "figure" || role === "name" ? (marked ? inks.mark : inks.ink) : inks.muted
              return paintMemoLine(text, {
                ctx,
                key: `${c}`,
                x,
                top: rowTop + style.top,
                lineHeight: style.lineHeight,
                size: style.size,
                face: style.face,
                fill: memoText(ink, ground, style.size),
                bold: style.bold || (role === "name" && marked),
              })
            })}
          </g>
        )
      })}
    </g>
  )
}

function dutiesTable(table: DataTable, frame: Frame): React.ReactNode | null {
  const { ctx, rect, top, inks } = frame
  if (table.rows.length * DUTIES.pitch + HEADER.rows > rect.y + rect.h - top) return null
  const iconed = table.rows.some((row) => row.icon)
  const nameInset = iconed ? ICON.x + ICON.size + ICON.gap : PAD
  const nameW = Math.ceil(Math.max(memoWidth(table.columns[0]!.label, HEADER.size, "mono", ctx), ...table.rows.map((row) => memoWidth(cellText(row, table.columns[0]!.key), DUTIES.name.size, "song", ctx, true)))) + nameInset + PAD * 2
  const restW = (rect.w - nameW) / Math.max(1, table.columns.length - 1)
  if (restW < 120) return null
  const widths = [nameW, ...table.columns.slice(1).map(() => restW)]
  const xs = lefts(rect.x, widths)
  const cells: (EmphasisHeadingLayout | null)[][] = []
  for (const row of table.rows) {
    const line: (EmphasisHeadingLayout | null)[] = []
    for (const [c, column] of table.columns.entries()) {
      const text = cellText(row, column.key)
      if (!text.trim()) {
        line.push(null)
        continue
      }
      const fitted =
        c === 0
          ? fitMemo(text, { width: nameW - nameInset - PAD, size: DUTIES.name.size, lineHeight: DUTIES.name.lineHeight, maxLines: 1, face: "song", bold: true }, ctx)
          : fitMemo(text, { width: restW - PAD * 2, size: DUTIES.cell.size, lineHeight: DUTIES.cell.lineHeight, maxLines: DUTIES.cell.maxLines, face: "body" }, ctx)
      if (!fitted) return null
      line.push(fitted)
    }
    cells.push(line)
  }
  return (
    <g>
      {paintHeaders(table, xs, frame)}
      {table.rows.map((row, r) => {
        const rowTop = top + HEADER.rows + r * DUTIES.pitch
        const marked = row.emphasis === "highlight"
        const ground = marked ? inks.tint : inks.ground
        return (
          <g key={r} data-memo-row={marked ? "marked" : ""}>
            {marked ? <rect x={rect.x} y={rowTop} width={rect.w} height={DUTIES.row} fill={inks.tint} /> : null}
            <rect x={rect.x} y={rowTop + DUTIES.row} width={rect.w} height={1} fill={inks.line} />
            {row.icon ? paintIcon(row.icon, rect.x + ICON.x, rowTop + DUTIES.iconTop, ICON.size, marked ? inks.mark : inks.muted, ground) : null}
            {cells[r]!.map((cell, c) =>
              cell
                ? c === 0
                  ? <g key={c}>{paintMemo(cell, { ctx, x: xs[0]! + nameInset, top: rowTop + DUTIES.name.top, face: "song", bold: true, fill: memoText(marked ? inks.mark : inks.ink, ground, DUTIES.name.size), ground })}</g>
                  : <g key={c}>{paintMemo(cell, { ctx, x: xs[c]! + PAD, top: rowTop + DUTIES.cell.top, face: "body", fill: memoText(inks.ink, ground, DUTIES.cell.size), ground })}</g>
                : null,
            )}
          </g>
        )
      })}
    </g>
  )
}
