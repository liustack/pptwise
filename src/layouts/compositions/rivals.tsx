import type { Component } from "@/ir"
import { blendOver } from "../../render/ink"
import { blockTag, compositionTag, type Composition } from "./shared"
import { Fire, fitPitch, paintPitch, paintPitchIcon, paintPitchLine, pitchInks, pitchText, pitchWidth } from "./pitch"
import { plainLine } from "./stairs"

type Table = Extract<Component, { type: "data_table" }>

/*
 * rivals: who is already in the market and what nobody has said yet,
 * ember's 2026-10 board (the landscape page, p06). An open table: the
 * columns' names small and grey over a hairline, one row a rival with its
 * icon and its name bold, then what it does, how big it is and where it
 * runs, the plain facts in the ivory and the context in the grey, a dark
 * rule between rows. The last column, the one the page is about
 * (`columns[].emphasis`), stands in a frame of the fire over a tint of it,
 * its name, its icon (`columns[].icon`) and every cell in the fire. Under
 * the table one line, the page's point.
 *
 * Takes, in the pitch setting: a `data_table` of three to six columns whose
 * last one is marked and the others are not, two to six rows with no tag and
 * no emphasis, no title or source; then optionally a `callout` with no
 * title, tag or icon.
 *
 * Declines: a cell wider than its column on one line, a column name past one
 * line, and a closing line past two lines.
 *
 * Reads: the pitch inks (`./pitch.tsx`), the body and heading faces.
 */

const HEAD = { top: 1, h: 20, size: 12, x: 8 } as const
const RULE = 24
const ROW = { top: 25, h: 58, icon: { x: 8, size: 20 }, text: { x: 38, size: 16 }, cell: { x: 8, size: 14, fact: 15, lineHeight: 26 } } as const
const MARK = { w: 216, pad: 20, icon: 20, gap: 10, size: 15, tint: 0.08 } as const
const LINE = { gap: 12, size: 16, lineHeight: 26, maxLines: 2 } as const

export const rivalsComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "pitch") return null
  const [table, closing, ...rest] = components
  if (table?.type !== "data_table" || rest.length > 0) return null
  if (closing !== undefined && !plainLine(closing)) return null
  const t = table as Table
  const cols = t.columns
  const last = cols.length - 1
  if (cols.length < 3 || cols.length > 6 || !cols[last]!.emphasis || cols.slice(0, last).some((col) => col.emphasis || col.icon)) return null
  if (t.rows.length < 2 || t.rows.length > 6 || t.title !== undefined || t.source !== undefined || t.rows.some((row) => row.tag || row.emphasis)) return null
  const inks = pitchInks(ctx)
  const cell = (row: Table["rows"][number], key: string) => {
    const v = row.cells[key]
    return v === undefined ? "" : String(v).trim()
  }
  // Column widths: the marked column at the board's width, or wider when
  // its words need it; the rest as wide as their longest words, the room
  // left over shared in proportion.
  const sizeOf = (c: number) => (c === 0 ? ROW.text.size : c % 2 === 0 ? ROW.cell.fact : ROW.cell.size)
  const boldOf = (c: number) => c === 0
  const markIcon = cols[last]!.icon ? MARK.icon + MARK.gap : 0
  const markNeed = Math.max(pitchWidth(cols[last]!.label, HEAD.size, ctx, true) + HEAD.x * 2, ...t.rows.map((row) => MARK.pad * 2 + markIcon + pitchWidth(cell(row, cols[last]!.key), MARK.size, ctx, true)))
  const markW = Math.max(MARK.w, Math.ceil(markNeed))
  const needs = cols.slice(0, last).map((col, c) =>
    Math.max(pitchWidth(col.label, HEAD.size, ctx, true) + HEAD.x * 2, ...t.rows.map((row) => (c === 0 ? ROW.text.x + (row.icon ? 0 : -30) + 8 : ROW.cell.x * 2) + pitchWidth(cell(row, col.key), sizeOf(c), ctx, boldOf(c)))),
  )
  const tableW = rect.w - markW
  const sum = needs.reduce((a, b) => a + b, 0)
  if (sum > tableW) return null
  const widths = needs.map((need) => need + ((tableW - sum) * need) / sum)
  const xs: number[] = []
  let at = rect.x
  for (const w of widths) {
    xs.push(at)
    at += w
  }
  const markX = rect.x + tableW
  const rowsBottom = ROW.top + t.rows.length * ROW.h
  const closingFit = closing && plainLine(closing) ? fitPitch(closing.text, { width: rect.w, size: LINE.size, lineHeight: LINE.lineHeight, maxLines: LINE.maxLines }, ctx) : null
  if (closing && !closingFit) return null
  const frameH = rowsBottom + 3
  if (frameH + (closingFit ? LINE.gap + closingFit.lines.length * LINE.lineHeight : 0) > rect.h) return null

  const tint = blendOver(inks.fire, inks.ground, MARK.tint)
  const headInk = pitchText(inks.muted, inks.ground, HEAD.size)
  return (
    <g {...compositionTag("rivals")}>
      <g {...blockTag(ctx, t)}>
        <Fire id="column">
          <rect x={markX + 0.5} y={rect.y + 0.5} width={markW - 1} height={frameH - 1} fill={tint} stroke={inks.fire} strokeWidth={1} />
          {paintPitchLine(cols[last]!.label.trim(), { ctx, x: markX + HEAD.x, top: rect.y + HEAD.top, lineHeight: HEAD.h, size: HEAD.size, bold: true, fill: pitchText(inks.fire, tint, HEAD.size) })}
          {t.rows.map((row, r) => {
            const y = rect.y + ROW.top + r * ROW.h
            const text = cell(row, cols[last]!.key)
            return (
              <g key={r}>
                {cols[last]!.icon && text ? paintPitchIcon(cols[last]!.icon!, markX + MARK.pad, y + (ROW.h - MARK.icon) / 2 - 1, MARK.icon, inks.fire, tint) : null}
                {text ? paintPitchLine(text, { ctx, x: markX + MARK.pad + markIcon, top: y + 16, lineHeight: 26, size: MARK.size, bold: true, fill: pitchText(inks.fire, tint, MARK.size) }) : null}
              </g>
            )
          })}
        </Fire>
        {cols.slice(0, last).map((col, c) => (
          <g key={c}>{paintPitchLine(col.label.trim(), { ctx, x: xs[c]! + HEAD.x, top: rect.y + HEAD.top, lineHeight: HEAD.h, size: HEAD.size, bold: true, fill: headInk })}</g>
        ))}
        <rect x={rect.x} y={rect.y + RULE} width={tableW} height={1} fill={inks.line} />
        {t.rows.map((row, r) => {
          const y = rect.y + ROW.top + r * ROW.h
          return (
            <g key={r} data-pitch-rival={r}>
              <rect x={rect.x} y={y + ROW.h - 1} width={tableW} height={1} fill={inks.dim} />
              {row.icon ? paintPitchIcon(row.icon, rect.x + ROW.icon.x, y + (ROW.h - ROW.icon.size) / 2 - 1, ROW.icon.size, inks.muted, inks.ground) : null}
              {cols.slice(0, last).map((col, c) => {
                const text = cell(row, col.key)
                if (!text) return null
                const size = sizeOf(c)
                const x = c === 0 ? rect.x + (row.icon ? ROW.text.x : HEAD.x) : xs[c]! + ROW.cell.x
                const ink = c === 0 || c % 2 === 0 ? inks.ink : inks.muted
                return <g key={c}>{paintPitchLine(text, { ctx, x, top: y + 16, lineHeight: ROW.cell.lineHeight, size, bold: c === 0, fill: pitchText(ink, inks.ground, size) })}</g>
              })}
            </g>
          )
        })}
      </g>
      {closingFit && closing ? (
        <g {...blockTag(ctx, closing)} data-pitch-closing="">
          {paintPitch(closingFit, { ctx, x: rect.x, top: rect.y + frameH + LINE.gap, fill: pitchText(inks.ink, inks.ground, LINE.size), ground: inks.ground })}
        </g>
      ) : null}
    </g>
  )
}
