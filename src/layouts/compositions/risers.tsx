import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  CHALKBOARD_META,
  CLAIM_AT,
  chalkLine,
  chalkMark,
  chalkMeta,
  chalkText,
  chalkTrackedWidth,
  chalkWidth,
  chalkboardInks,
  fitChalk,
  paintChalk,
  paintChalkLine,
  paintChalkTracked,
  chalkBaseline,
  placeChalkClaim,
  placeChalkSource,
  wholePage,
} from "./chalkboard"

type Table = Extract<Component, { type: "data_table" }>
type Paragraph = Extract<Component, { type: "paragraph" }>

/*
 * risers: rates by bracket drawn as a staircase on the board, lecture's
 * 2026-10 board (p09). One step a row of the table, left to right, each a
 * box of the board as tall as its rate stands, the rate written over it in
 * the serif and, under the chalk line the steps stand on, the bracket's
 * range and the table's third column small. The row the author marks
 * (`emphasis: "highlight"`) is a step filled in yellow with its rate larger
 * in yellow. What the columns are is written small over the steps at the
 * top left. A worked line under the steps, then the source.
 *
 * Takes, in the chalkboard setting: a `data_table` of three to eight rows
 * and two or three columns, one of them every cell a percentage (「10%」), the
 * first of the others the range under the step and the last, if any, the
 * line under that; at most one row highlighted; then optionally a
 * `paragraph`.
 *
 * Declines: a table with a title, a source, a column marked or with an icon,
 * a row with an icon, a tag or a total, a negative rate, a label too wide for
 * its step, a key or a closing line past one line.
 *
 * Reads: the chalkboard inks (`./chalkboard.tsx`), the heading and body faces.
 */

const STAIRS = { x0: 64, x1: 1196, base: 560, height: 300, gap: 12 } as const
const RATE = { size: 22, litSize: 28, rise: 14 } as const
const LABEL = { dy: 24, size: 12, second: 44 } as const
const KEY = { x: 64, top: 166, size: 12, lineHeight: 18, tracking: 1 } as const
const CLOSE = { top: 610, size: 15, lineHeight: 26 } as const
const SOURCE = { x: 64, w: 1152, top: 644, foot: 676 } as const

/** A cell written as a percentage, its number, or `null`. */
export function percentOf(cell: string | number | undefined): number | null {
  const m = /^\s*(-?\d+(?:\.\d+)?)\s*[%％]\s*$/u.exec(String(cell ?? ""))
  return m ? Number(m[1]) : null
}

export const risersComposition: Composition = ({ components, ctx, setting, rect, claim, source }) => {
  if (setting !== "chalkboard" || !wholePage(rect)) return null
  const [table, close, ...rest] = components
  if (table?.type !== "data_table" || rest.length > 0) return null
  if (close !== undefined && close.type !== "paragraph") return null
  const t = table as Table
  if (t.title?.trim() || t.source?.trim()) return null
  if (t.columns.length < 2 || t.columns.length > 3 || t.columns.some((c) => c.emphasis || c.icon)) return null
  const n = t.rows.length
  if (n < 3 || n > 8 || t.rows.some((r) => r.icon || r.tag || r.emphasis === "total")) return null
  if (t.rows.filter((r) => r.emphasis === "highlight").length > 1) return null
  const rateCol = t.columns.find((c) => t.rows.every((r) => percentOf(r.cells[c.key]) !== null))
  if (!rateCol) return null
  const others = t.columns.filter((c) => c !== rateCol)
  const [rangeCol, underCol] = others
  const rates = t.rows.map((r) => percentOf(r.cells[rateCol.key])!)
  if (rates.some((v) => v < 0)) return null
  const max = Math.max(...rates)
  if (!(max > 0)) return null
  const step = (STAIRS.x1 - STAIRS.x0 + STAIRS.gap) / n
  const w = step - STAIRS.gap
  const cell = (r: Table["rows"][number], key: string | undefined) => (key === undefined ? "" : stripEmphasis(String(r.cells[key] ?? "")).trim())
  for (const r of t.rows) {
    if (!cell(r, rangeCol!.key) || chalkWidth(cell(r, rangeCol!.key), LABEL.size, ctx) > step - 4) return null
    if (underCol && chalkWidth(cell(r, underCol.key), LABEL.size, ctx) > step - 4) return null
    if (chalkWidth(cell(r, rateCol.key), RATE.litSize, ctx, { serif: true }) > w) return null
  }
  const key = t.columns.map((c) => stripEmphasis(c.label).trim()).filter(Boolean).join("　·　")
  if (key && chalkTrackedWidth(key, KEY.size, KEY.tracking, ctx) > 1152) return null
  const closing = close ? fitChalk((close as Paragraph).text, { width: 1152, size: CLOSE.size, lineHeight: CLOSE.lineHeight, maxLines: 1 }, ctx) : undefined
  if (closing === null) return null
  const head = placeChalkClaim(claim, CLAIM_AT)
  if (head === false) return null
  const foot = placeChalkSource(source, SOURCE)
  if (foot === false) return null
  const inks = chalkboardInks(ctx)
  const ground = inks.ground
  return (
    <g {...compositionTag("risers")}>
      {head}
      <g {...blockTag(ctx, table)} data-chalk-risers="">
        {key ? <g data-chalk-key={key}>{paintChalkTracked({ ctx, text: key, x: KEY.x, y: chalkBaseline(KEY.top, KEY.lineHeight, KEY.size), size: KEY.size, tracking: KEY.tracking, fill: chalkMeta(inks.dim, ground), attrs: { ...CHALKBOARD_META } })}</g> : null}
        {t.rows.map((r, i) => {
          const x = STAIRS.x0 + i * step
          const h = (rates[i]! / max) * STAIRS.height
          const hot = r.emphasis === "highlight"
          const top = STAIRS.base - h
          const rateSize = hot ? RATE.litSize : RATE.size
          return (
            <g key={i} data-chalk-step={cell(r, rangeCol!.key)} data-chalk-lit={hot ? "" : undefined}>
              <rect x={x} y={top} width={w} height={h} fill={hot ? inks.yellow : inks.panel} stroke={chalkMark(hot ? inks.yellow : inks.muted, ground)} strokeWidth={1.5} />
              {paintChalkLine(cell(r, rateCol.key), { ctx, x: x + w / 2, anchor: "middle", baseline: top - RATE.rise, size: rateSize, serif: true, fill: chalkText(hot ? inks.yellow : inks.chalk, ground, rateSize) })}
              {paintChalkLine(cell(r, rangeCol!.key), { ctx, x: x + w / 2, anchor: "middle", baseline: STAIRS.base + LABEL.dy, size: LABEL.size, fill: chalkText(hot ? inks.chalk : inks.muted, ground, LABEL.size) })}
              {underCol && cell(r, underCol.key) ? paintChalkLine(cell(r, underCol.key), { ctx, x: x + w / 2, anchor: "middle", baseline: STAIRS.base + LABEL.second, size: LABEL.size, fill: chalkMeta(inks.dim, ground), attrs: { ...CHALKBOARD_META } }) : null}
            </g>
          )
        })}
        {chalkLine(STAIRS.x0, STAIRS.base, STAIRS.x1, STAIRS.base, chalkMark(inks.chalk, ground), 2)}
      </g>
      {closing && close ? (
        <g {...blockTag(ctx, close)} data-chalk-close="">
          {paintChalk(closing, { ctx, x: 64, top: CLOSE.top, fill: chalkText(inks.chalk, ground, CLOSE.size) })}
        </g>
      ) : null}
      {foot}
    </g>
  )
}
