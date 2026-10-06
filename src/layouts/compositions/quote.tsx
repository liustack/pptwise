import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import { Lead, binderInks, binderText, binderWidth, blankToFill, fitBinder, paintBinder, paintBinderIcon, paintBinderTracked, paintChip, binderBaseline } from "./binder"

type Table = Extract<Component, { type: "data_table" }>

/*
 * quote: a price list set as one sheet, proposal's 2026-10 board (p17). One
 * framed sheet with its column headers on a band of sand, then each table a
 * group: its title as a small tracked line in petrol, its rows under it, each
 * with its icon in petrol, its item bold, what it covers, how it is priced
 * bold, and its amount. An amount still to be set (a cell of dashes, 「— — —」)
 * is a blank to fill, in a pale grey with air between the dashes. The row
 * the page leads with (marked `highlight`) sits on the brick red's tint, its
 * tag a chip of the brick red after what it covers.
 *
 * Takes, in the binder setting: two to four `data_table`s, each with a title,
 * the same three or four columns (keys and headers) and one to five rows, each
 * row with an icon, no total, and a tag only on the one row marked
 * `highlight`, at most one across the tables; eight rows at most in all.
 * The first table's headers are the sheet's.
 *
 * Declines: tables whose columns differ, a cell past its column, a group
 * title past one line and a sheet taller than the band.
 *
 * Reads: the binder inks (`./binder.tsx`).
 */

const SHEET = { r: 12, head: { h: 40, top: 10, size: 13, lineHeight: 20 }, pad: 28, bottom: 18 } as const
const GROUP = { h: 28, top: 4, size: 12, lineHeight: 22, tracking: 1 } as const
const ROW = { h: 34, icon: { dy: 8, size: 18 }, text: { dx: 30, dy: 6, lineHeight: 22 }, name: { size: 15 }, cell: { size: 14 }, blank: { tracking: 4 }, chip: { at: 200, gap: 16, dy: 5, h: 24, size: 12 } } as const
/** Where each column starts, from the sheet's left, for three and for four columns. */
const COLUMNS: Record<3 | 4, readonly number[]> = { 3: [28, 400, 790], 4: [28, 336, 726, 936] }

export const quoteComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "binder") return null
  if (components.length < 2 || components.length > 4 || components.some((c) => c.type !== "data_table")) return null
  const tables = components as Table[]
  const [first] = tables
  const n = first!.columns.length
  if (n !== 3 && n !== 4) return null
  const same = (t: Table) => t.columns.length === n && t.columns.every((c, i) => c.key === first!.columns[i]!.key && c.label.trim() === first!.columns[i]!.label.trim())
  if (tables.some((t) => !t.title?.trim() || t.source || !same(t) || t.columns.some((c) => c.emphasis || c.icon || (c.align && c.align !== "left")))) return null
  const rows = tables.flatMap((t) => t.rows)
  if (rows.length > 8 || tables.some((t) => t.rows.length < 1 || t.rows.length > 5)) return null
  if (rows.some((r) => !r.icon || r.emphasis === "total" || (r.tag && r.emphasis !== "highlight")) || rows.filter((r) => r.emphasis === "highlight").length > 1) return null
  const height = SHEET.head.h + 6 + tables.length * GROUP.h + rows.length * ROW.h + SHEET.bottom
  if (rect.w < 1132 || rect.h < height) return null
  const inks = binderInks(ctx)
  const cols = COLUMNS[n].map((x) => rect.x + x)
  const colW = (i: number) => (i < n - 1 ? cols[i + 1]! - cols[i]! - 12 : rect.x + rect.w - cols[i]! - 16)
  const heads = first!.columns.map((c, i) => (c.label.trim() ? fitBinder(c.label, { width: colW(i), size: SHEET.head.size, lineHeight: SHEET.head.lineHeight, maxLines: 1, bold: true }, ctx) : null))
  if (first!.columns.some((c, i) => c.label.trim() && !heads[i])) return null
  const cell = (row: Table["rows"][number], key: string) => String(row.cells[key] ?? "").trim()

  const groups = tables.map((t) => {
    const title = t.title!.trim()
    if (binderWidth(title, GROUP.size, ctx, true) + Array.from(title).length * GROUP.tracking > rect.w - SHEET.pad * 2) return null
    const items = t.rows.map((row) => {
      const cells = first!.columns.map((c, i) => {
        const text = cell(row, c.key)
        if (!text) return { text, layout: null, blank: false }
        if (blankToFill(text)) return { text, layout: null, blank: true }
        const room = colW(i) - (i === 0 ? ROW.text.dx : 0) - (i === 1 && row.tag ? 0 : 0)
        const layout = fitBinder(text, { width: room, size: i === 0 ? ROW.name.size : ROW.cell.size, lineHeight: ROW.text.lineHeight, maxLines: 1, bold: i !== 1 }, ctx)
        return { text, layout, blank: false }
      })
      if (cells.some((c) => c.text && !c.blank && !c.layout)) return null
      return { row, cells }
    })
    return items.some((it) => !it) ? null : { title, items: items.map((it) => it!) }
  })
  if (groups.some((g) => !g)) return null

  let y = rect.y + SHEET.head.h + 6
  const left = rect.x + 2
  const width = rect.w - 4
  return (
    <g {...compositionTag("quote")}>
      <rect x={rect.x + 0.5} y={rect.y + 0.5} width={rect.w - 1} height={height - 1} rx={SHEET.r} fill="none" stroke={inks.line} strokeWidth={1} />
      <path d={`M ${rect.x + 1} ${rect.y + SHEET.head.h + 1} L ${rect.x + 1} ${rect.y + SHEET.r} A ${SHEET.r - 1} ${SHEET.r - 1} 0 0 1 ${rect.x + SHEET.r} ${rect.y + 1} L ${rect.x + rect.w - SHEET.r} ${rect.y + 1} A ${SHEET.r - 1} ${SHEET.r - 1} 0 0 1 ${rect.x + rect.w - 1} ${rect.y + SHEET.r} L ${rect.x + rect.w - 1} ${rect.y + SHEET.head.h + 1} Z`} fill={inks.card} />
      {heads.map((h, i) => (h ? <g key={`h-${i}`}>{paintBinder(h, { ctx, x: cols[i]!, top: rect.y + 1 + SHEET.head.top, bold: true, fill: binderText(inks.muted, inks.card, SHEET.head.size), ground: inks.card })}</g> : null))}
      {groups.map((g, k) => {
        const groupTop = y
        y += GROUP.h
        const table = tables[k]!
        return (
          <g key={k} {...blockTag(ctx, table)} data-binder-quote-group={stripEmphasis(g!.title)}>
            {paintBinderTracked({ ctx, text: g!.title, x: cols[0]!, y: binderBaseline(groupTop + GROUP.top, GROUP.lineHeight, GROUP.size), size: GROUP.size, tracking: GROUP.tracking, bold: true, fill: binderText(inks.deep, inks.ground, GROUP.size) })}
            {g!.items.map((item, j) => {
              const top = y
              y += ROW.h
              const lit = item.row.emphasis === "highlight"
              const ground = lit ? inks.firePale : inks.ground
              const whatEnd = item.cells[1]?.layout ? cols[1]! + binderWidth(item.cells[1].text, ROW.cell.size, ctx) : cols[1]!
              const chipX = Math.max(cols[1]! + ROW.chip.at, whatEnd + ROW.chip.gap)
              return (
                <g key={j} data-binder-quote-row={stripEmphasis(item.cells[0]!.text)}>
                  {lit ? <rect x={left} y={top} width={width} height={ROW.h} fill={inks.firePale} /> : null}
                  {lit && item.row.tag ? <Lead id="quote">{paintChip(item.row.tag.text, chipX, top + ROW.chip.dy, { size: ROW.chip.size, h: ROW.chip.h, fg: inks.onFire, bg: inks.fire }, ctx, inks).node}</Lead> : null}
                  {paintBinderIcon(item.row.icon!, cols[0]!, top + ROW.icon.dy, ROW.icon.size, inks.deep, ground)}
                  {item.cells.map((c, i) => {
                    const x = cols[i]! + (i === 0 ? ROW.text.dx : 0)
                    if (c.blank) {
                      return <g key={i} data-binder-blank="">{paintBinderTracked({ ctx, text: c.text, x, y: binderBaseline(top + ROW.text.dy, ROW.text.lineHeight, ROW.cell.size), size: ROW.cell.size, tracking: ROW.blank.tracking, bold: true, fill: binderText(inks.tick, ground, ROW.cell.size) })}</g>
                    }
                    if (!c.layout) return null
                    return <g key={i}>{paintBinder(c.layout, { ctx, x, top: top + ROW.text.dy, bold: i !== 1, fill: binderText(inks.ink, ground, c.layout.fontSize), ground })}</g>
                  })}
                  <rect x={left} y={top + ROW.h} width={width} height={1} fill={inks.line} />
                </g>
              )
            })}
          </g>
        )
      })}
    </g>
  )
}
