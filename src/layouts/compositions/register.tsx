import type { Component } from "@/ir"
import { blendOver } from "../../render/ink"
import { blockTag, compositionTag, type Composition } from "./shared"
import { Fire, fitPitch, paintPitch, paintPitchIcon, paintPitchLine, pitchInks, pitchText, pitchWidth } from "./pitch"

type Table = Extract<Component, { type: "data_table" }>

/*
 * register: a risk register, ember's 2026-10 board (the risks page, p13).
 * The columns' names small and grey over a 2px rule of the ivory; one row a
 * risk, 66px tall: its icon, its name bold, then the columns between in up
 * to two lines each, the first in the ivory and the next in the grey, and a
 * short last column (when, who) bold. A dark rule between rows. The row the
 * page leads with (`emphasis: "highlight"`) sits on a tint of the fire, its
 * icon in the fire.
 *
 * Takes, in the pitch setting: a `data_table` of three to five columns, none
 * marked and none with an icon, two to six rows, at most one highlighted and
 * none a total, no tags, no title or source.
 *
 * Declines: a risk's name past one line, a cell past two lines of its
 * column, and a column name past one line.
 *
 * Reads: the pitch inks (`./pitch.tsx`), the body and heading faces.
 */

const HEAD = { top: 0, h: 20, size: 12, x: 8 } as const
const RULE = { top: 24, h: 2 } as const
const ROW = { top: 26, h: 66, icon: { x: 12, size: 20 }, name: { x: 42, size: 16, lineHeight: 26 }, cell: { x: 8, top: 10, size: 14, lineHeight: 22, maxLines: 2 }, short: { size: 13, lineHeight: 26 } } as const
const TINT = 0.1
/** The share of the measure the name column keeps at least: the board's 236 of 1152. */
const NAME_SHARE = 0.205
/** A last column whose every cell is at most this wide is the short one (when, who), set bold. */
const SHORT_MAX = 96

export const registerComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "pitch") return null
  const [table, ...rest] = components
  if (table?.type !== "data_table" || rest.length > 0) return null
  const t = table as Table
  const cols = t.columns
  if (cols.length < 3 || cols.length > 5 || cols.some((col) => col.emphasis || col.icon || (col.align && col.align !== "left"))) return null
  if (t.rows.length < 2 || t.rows.length > 6 || t.title !== undefined || t.source !== undefined) return null
  if (t.rows.some((row) => row.tag || row.emphasis === "total") || t.rows.filter((row) => row.emphasis === "highlight").length > 1) return null
  if (rect.h < ROW.top + t.rows.length * ROW.h) return null
  const inks = pitchInks(ctx)
  const cell = (row: Table["rows"][number], key: string) => {
    const v = row.cells[key]
    return v === undefined ? "" : String(v).trim()
  }
  const last = cols.length - 1
  const lastKey = cols[last]!.key
  const shortW = Math.max(pitchWidth(cols[last]!.label, HEAD.size, ctx, true), ...t.rows.map((row) => pitchWidth(cell(row, lastKey), ROW.short.size, ctx, true)))
  const short = shortW <= SHORT_MAX
  // The name column a fifth of the measure, or as wide as its longest name,
  // the short column as wide as its words, and the columns between sharing
  // the rest in proportion to their longest cells.
  // The name column keeps the board's fifth of the measure, or more for a longer name.
  const nameW = Math.max(rect.w * NAME_SHARE, pitchWidth(cols[0]!.label, HEAD.size, ctx, true) + HEAD.x * 2, ...t.rows.map((row) => ROW.name.x + pitchWidth(cell(row, cols[0]!.key), ROW.name.size, ctx, true) + 16))
  const tailW = short ? Math.ceil(shortW) + 24 : 0
  const middle = cols.slice(1, short ? last : cols.length)
  const weights = middle.map((col) => Math.max(pitchWidth(col.label, HEAD.size, ctx, true), ...t.rows.map((row) => Math.min(pitchWidth(cell(row, col.key), ROW.cell.size, ctx), 480))))
  const room = rect.w - nameW - tailW
  if (room < middle.length * 160) return null
  const total = weights.reduce((a, b) => a + b, 0)
  const widths = [nameW, ...weights.map((w) => (room * w) / total), ...(short ? [tailW] : [])]
  const xs: number[] = []
  let at = rect.x
  for (const w of widths) {
    xs.push(at)
    at += w
  }
  const rows = t.rows.map((row) => ({
    row,
    name: fitPitch(cell(row, cols[0]!.key), { width: widths[0]! - ROW.name.x - 8, size: ROW.name.size, lineHeight: ROW.name.lineHeight, maxLines: 1, bold: true }, ctx),
    cells: middle.map((col, m) => {
      const text = cell(row, col.key)
      return text ? fitPitch(text, { width: widths[m + 1]! - ROW.cell.x - 16, size: ROW.cell.size, lineHeight: ROW.cell.lineHeight, maxLines: ROW.cell.maxLines }, ctx) : null
    }),
  }))
  if (rows.some((r) => (cell(r.row, cols[0]!.key) && !r.name) || r.cells.some((c, m) => cell(r.row, middle[m]!.key) !== "" && !c))) return null
  if (cols.some((col, c) => pitchWidth(col.label, HEAD.size, ctx, true) > widths[c]! - HEAD.x)) return null

  const tint = blendOver(inks.fire, inks.ground, TINT)
  const headInk = pitchText(inks.muted, inks.ground, HEAD.size)
  return (
    <g {...compositionTag("register")}>
      <g {...blockTag(ctx, t)}>
        {cols.map((col, c) => (
          <g key={c}>{paintPitchLine(col.label.trim(), { ctx, x: xs[c]! + HEAD.x, top: rect.y + HEAD.top, lineHeight: HEAD.h, size: HEAD.size, bold: true, fill: headInk })}</g>
        ))}
        <rect x={rect.x} y={rect.y + RULE.top} width={rect.w} height={RULE.h} fill={inks.ink} />
        {rows.map((r, i) => {
          const y = rect.y + ROW.top + i * ROW.h
          const lit = r.row.emphasis === "highlight"
          const ground = lit ? tint : inks.ground
          const icon = r.row.icon ? paintPitchIcon(r.row.icon, rect.x + ROW.icon.x, y + (ROW.h - ROW.icon.size) / 2, ROW.icon.size, lit ? inks.fire : inks.muted, ground) : null
          return (
            <g key={i} data-pitch-risk={lit ? "lit" : ""}>
              {lit ? (
                <Fire id="risk">
                  <rect x={rect.x} y={y} width={rect.w} height={ROW.h} fill={tint} />
                  {icon}
                </Fire>
              ) : (
                icon
              )}
              <rect x={rect.x} y={y + ROW.h - 1} width={rect.w} height={1} fill={inks.dim} />
              {r.name ? paintPitch(r.name, { ctx, x: rect.x + (r.row.icon ? ROW.name.x : HEAD.x), top: y + (ROW.h - ROW.name.lineHeight) / 2, bold: true, fill: pitchText(inks.ink, ground, ROW.name.size), ground }) : null}
              {r.cells.map((c, m) =>
                c ? (
                  <g key={m}>
                    {paintPitch(c, { ctx, x: xs[m + 1]! + ROW.cell.x, top: y + ROW.cell.top, fill: pitchText(m % 2 === 0 ? inks.ink : inks.muted, ground, ROW.cell.size), ground })}
                  </g>
                ) : null,
              )}
              {short && cell(r.row, lastKey)
                ? paintPitchLine(cell(r.row, lastKey), { ctx, x: xs[last]! + HEAD.x, top: y + (ROW.h - ROW.short.lineHeight) / 2, lineHeight: ROW.short.lineHeight, size: ROW.short.size, bold: true, fill: pitchText(inks.ink, ground, ROW.short.size) })
                : null}
            </g>
          )
        })}
      </g>
    </g>
  )
}
