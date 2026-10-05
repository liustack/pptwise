import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blendOver } from "../../render/ink"
import { paintIcon } from "./console"
import { fitMemo, memoInks, memoMeta, memoText, memoWidth, paintMemo, paintMemoLine } from "./memo"
import { blockTag, compositionTag, type Composition } from "./shared"

type DataTable = Extract<Component, { type: "data_table" }>
type Row = DataTable["rows"][number]

/*
 * rota: who is on and who is off, day by day, memo's 2026-10 board (the
 * staggered rota page, p10). A table read as a rota: its first column names
 * the people, every other column is a day, and a cell either is blank (the
 * person is in, a block of ink) or holds the one word the table uses for a
 * day off (「休」, "Off"), set in the mark inside a dashed outline of the
 * mark. A closing total row (`emphasis: "total"`) is typed under a 2px rule
 * of ink, its figures in bold mono in the mark: how many are in each day.
 *
 * The table's `title` is typed over it as a muted line, and a row's icon
 * leads its name.
 *
 * Takes, in the memo setting: one `data_table` of a names column and three to
 * seven day columns, two to twelve rows of people whose day cells are blank
 * or one word of at most three characters, the same word everywhere, with at
 * least one blank and one word, then optionally a total row.
 *
 * Declines: any other shape, a name wider than its column, rows taller than
 * the band.
 *
 * Reads: the memo inks (`./memo.tsx`), the body and mono faces.
 */

const TITLE = { top: 0, size: 14, lineHeight: 26 } as const
const HEAD = { top: 30, size: 14, lineHeight: 22 } as const
const GRID = { x: 90, cell: 84, top: 54, pitch: 30, inset: 3, dash: "3 3" } as const
const NAME = { iconX: 4, iconTop: 6, icon: 16, x: 26, size: 13 } as const
const OFF = { size: 13 } as const
const TOTAL = { gap: 8, rule: 2, size: 15, label: 14, lineHeight: 40 } as const
const ON_MIX = 0.82

function cellText(row: Row, key: string): string {
  const v = row.cells[key]
  return v === undefined ? "" : stripEmphasis(String(v)).trim()
}

export const rotaComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "memo") return null
  const [table, ...rest] = components
  if (table?.type !== "data_table" || rest.length > 0) return null
  const t = table as DataTable
  if (t.source?.trim() || t.columns.length < 4 || t.columns.length > 8) return null
  const days = t.columns.slice(1)
  const last = t.rows[t.rows.length - 1]
  const total = last?.emphasis === "total" ? last : undefined
  const people = total ? t.rows.slice(0, -1) : t.rows
  if (people.length < 2 || people.some((row) => row.emphasis || row.tag)) return null
  const words = new Set(people.flatMap((row) => days.map((day) => cellText(row, day.key))))
  const off = [...words].filter((w) => w !== "")
  if (off.length !== 1 || !words.has("") || Array.from(off[0]!).length > 3) return null
  const word = off[0]!
  const cell = Math.min(GRID.cell, (rect.w - GRID.x) / days.length)
  const nameKey = t.columns[0]!.key
  if (people.some((row) => memoWidth(cellText(row, nameKey), NAME.size, "mono", ctx) > GRID.x - NAME.x - 4)) return null
  const gridBottom = rect.y + GRID.top + people.length * GRID.pitch
  const totalTop = gridBottom + TOTAL.gap
  if ((total ? totalTop + TOTAL.lineHeight : gridBottom) > rect.y + rect.h) return null
  const inks = memoInks(ctx)
  const title = t.title?.trim() ? fitMemo(t.title, { width: rect.w, size: TITLE.size, lineHeight: TITLE.lineHeight, maxLines: 1, face: "body" }, ctx) : null
  if (t.title?.trim() && !title) return null
  const on = blendOver(inks.ink, inks.ground, ON_MIX)
  const gx = rect.x + GRID.x
  const gridW = GRID.x + days.length * cell
  return (
    <g {...compositionTag("rota")} {...blockTag(ctx, table)}>
      {title ? paintMemo(title, { ctx, x: rect.x, top: rect.y + TITLE.top, face: "body", fill: memoMeta(inks.muted, inks.ground) }) : null}
      {days.map((day, j) =>
        paintMemoLine(day.label, {
          ctx,
          key: `d-${j}`,
          x: gx + j * cell + cell / 2,
          top: rect.y + HEAD.top,
          lineHeight: HEAD.lineHeight,
          size: HEAD.size,
          face: "body",
          bold: true,
          fill: memoText(inks.ink, inks.ground, HEAD.size),
          anchor: "middle",
        }),
      )}
      {people.map((row, r) => {
        const y = rect.y + GRID.top + r * GRID.pitch
        return (
          <g key={r} data-rota-row={r}>
            {row.icon ? paintIcon(row.icon, rect.x + NAME.iconX, y + NAME.iconTop, NAME.icon, inks.muted, inks.ground) : null}
            {paintMemoLine(cellText(row, nameKey), { ctx, x: rect.x + NAME.x, top: y, lineHeight: GRID.pitch, size: NAME.size, face: "mono", fill: memoMeta(inks.muted, inks.ground) })}
            {days.map((day, j) => {
              const x = gx + j * cell
              const isOff = cellText(row, day.key) === word
              return isOff ? (
                <g key={j} data-rota-off="">
                  <rect
                    x={x + GRID.inset}
                    y={y + GRID.inset}
                    width={cell - GRID.inset * 2}
                    height={GRID.pitch - GRID.inset * 2}
                    fill="none"
                    stroke={inks.mark}
                    strokeWidth={1.5}
                    strokeDasharray={GRID.dash}
                  />
                  {paintMemoLine(word, {
                    ctx,
                    x: x + cell / 2,
                    top: y,
                    lineHeight: GRID.pitch,
                    size: OFF.size,
                    face: "body",
                    bold: true,
                    fill: memoText(inks.mark, inks.ground, OFF.size),
                    anchor: "middle",
                  })}
                </g>
              ) : (
                <rect key={j} data-rota-on="" x={x + GRID.inset} y={y + GRID.inset} width={cell - GRID.inset * 2} height={GRID.pitch - GRID.inset * 2} fill={on} />
              )
            })}
          </g>
        )
      })}
      {total ? (
        <g data-rota-total="">
          <rect x={rect.x} y={totalTop - TOTAL.rule / 2} width={gridW} height={TOTAL.rule} fill={inks.ink} />
          {paintMemoLine(cellText(total, nameKey), {
            ctx,
            x: rect.x + NAME.iconX,
            top: totalTop,
            lineHeight: TOTAL.lineHeight,
            size: TOTAL.label,
            face: "body",
            bold: true,
            fill: memoText(inks.ink, inks.ground, TOTAL.label),
          })}
          {days.map((day, j) => {
            const text = cellText(total, day.key)
            return text
              ? paintMemoLine(text, {
                  ctx,
                  key: `t-${j}`,
                  x: gx + j * cell + cell / 2,
                  top: totalTop,
                  lineHeight: TOTAL.lineHeight,
                  size: TOTAL.size,
                  face: "mono",
                  bold: true,
                  fill: memoText(inks.mark, inks.ground, TOTAL.size),
                  anchor: "middle",
                })
              : null
          })}
        </g>
      ) : null}
    </g>
  )
}
