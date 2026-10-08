import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  CHALKBOARD_META,
  CLAIM_AT,
  ChalkUnder,
  SOURCE_AT,
  chalkChinese,
  chalkLine,
  chalkMeta,
  chalkText,
  chalkWidth,
  chalkboardInks,
  fitChalk,
  paintChalk,
  paintChalkLine,
  placeChalkClaim,
  placeChalkSource,
  wholePage,
} from "./chalkboard"

type Comparison = Extract<Component, { type: "comparison" }>

/*
 * solutions: the answers worked down the board in columns, lecture's 2026-10
 * board (p14). One column a question, divided by hairlines: its letter and
 * name in the serif, the working one line a row (the row's label, then its
 * cell) in the grey, the result large in yellow with one stroke of yellow
 * chalk under it, the result row's label small over it, and under that why,
 * the row's label and its cell in chalk white. The source at the foot.
 *
 * Takes, in the chalkboard setting: a `comparison` of two to four columns
 * and two to five rows, exactly one row marked (the result), at most two
 * rows before it and two after.
 *
 * Declines: a title, a header over the labels, a recommended column, tags, a
 * row with an icon, a working line or a result past one line in its column,
 * a reason past two lines.
 *
 * Reads: the chalkboard inks (`./chalkboard.tsx`), the heading and body faces.
 */

const COLS = { x: 64, w: 1152, gap: 24, rule: { top: 186, bottom: 600 } } as const
const HEAD = { top: 186, size: 26, lineHeight: 40 } as const
const WORK = { top: 244, step: 44, size: 16, lineHeight: 34 } as const
const RESULT = { label: { top: 330, size: 12, lineHeight: 18 }, top: 352, size: 48, lineHeight: 70, under: 428, underW: 220 } as const
const WHY = { top: 452, step: 50, size: 15, lineHeight: 25, maxLines: 2 } as const

const LETTERS = "ABCD"

export const solutionsComposition: Composition = ({ components, ctx, setting, rect, claim, source }) => {
  if (setting !== "chalkboard" || !wholePage(rect)) return null
  const [table, ...rest] = components
  if (table?.type !== "comparison" || rest.length > 0) return null
  const c = table as Comparison
  const n = c.columns.length
  if (n < 2 || n > 4 || c.title?.trim() || c.label_column?.trim() || c.recommended !== undefined || c.tag_column?.trim()) return null
  if (c.rows.length < 2 || c.rows.length > 5 || c.rows.some((r) => r.icon || r.tag || r.cells.length !== n)) return null
  const at = c.rows.findIndex((r) => r.emphasis)
  if (at < 0 || c.rows.filter((r) => r.emphasis).length !== 1) return null
  const before = c.rows.slice(0, at)
  const after = c.rows.slice(at + 1)
  if (before.length > 2 || after.length > 2) return null
  const result = c.rows[at]!
  const chinese = chalkChinese(ctx, c.columns)
  const space = chinese ? "　" : "  "
  const colon = chinese ? "：" : ": "
  const w = (COLS.w - (n - 1) * COLS.gap) / n
  const heads = c.columns.map((col, i) => `${LETTERS[i]}${space}${stripEmphasis(col).trim()}`)
  if (heads.some((h) => chalkWidth(h, HEAD.size, ctx, { serif: true }) > w)) return null
  const works = before.map((r) => r.cells.map((cell) => `${stripEmphasis(r.label).trim()}${space}${stripEmphasis(cell).trim()}`))
  if (works.flat().some((line) => chalkWidth(line, WORK.size, ctx) > w)) return null
  if (result.cells.some((cell) => !stripEmphasis(cell).trim() || chalkWidth(cell, RESULT.size, ctx, { serif: true }) > w)) return null
  const whys = after.map((r) => r.cells.map((cell) => fitChalk(`${stripEmphasis(r.label).trim()}${colon}${cell}`, { width: w, size: WHY.size, lineHeight: WHY.lineHeight, maxLines: WHY.maxLines }, ctx)))
  if (whys.flat().some((l) => !l)) return null
  const resultLabel = stripEmphasis(result.label).trim()
  const head = placeChalkClaim(claim, CLAIM_AT)
  if (head === false) return null
  const foot = placeChalkSource(source, SOURCE_AT)
  if (foot === false) return null
  const inks = chalkboardInks(ctx)
  const ground = inks.ground
  return (
    <g {...compositionTag("solutions")}>
      {head}
      <g {...blockTag(ctx, table)} data-chalk-solutions="">
        {c.columns.map((_, i) => {
          const x = COLS.x + i * (w + COLS.gap)
          return (
            <g key={i} data-chalk-solution={heads[i]}>
              {i > 0 ? chalkLine(x - COLS.gap / 2, COLS.rule.top, x - COLS.gap / 2, COLS.rule.bottom, inks.line, 1) : null}
              {paintChalkLine(heads[i]!, { ctx, x, top: HEAD.top, lineHeight: HEAD.lineHeight, size: HEAD.size, serif: true, fill: chalkText(inks.chalk, ground, HEAD.size) })}
              {works.map((row, j) => (
                <g key={j}>{paintChalkLine(row[i]!, { ctx, x, top: WORK.top + j * WORK.step, lineHeight: WORK.lineHeight, size: WORK.size, fill: chalkText(inks.muted, ground, WORK.size) })}</g>
              ))}
              {resultLabel ? paintChalkLine(resultLabel, { ctx, x, top: RESULT.label.top, lineHeight: RESULT.label.lineHeight, size: RESULT.label.size, fill: chalkMeta(inks.dim, ground), attrs: { ...CHALKBOARD_META } }) : null}
              {paintChalkLine(stripEmphasis(result.cells[i]!), { ctx, x, top: RESULT.top, lineHeight: RESULT.lineHeight, size: RESULT.size, serif: true, fill: chalkText(inks.yellow, ground, RESULT.size) })}
              <ChalkUnder x1={x} x2={x + Math.min(w, Math.max(RESULT.underW, chalkWidth(result.cells[i]!, RESULT.size, ctx, { serif: true })))} y={RESULT.under} ink={inks.yellow} width={5} />
              {whys.map((row, j) => (
                <g key={j}>{paintChalk(row[i]!, { ctx, x, top: WHY.top + j * WHY.step, fill: chalkText(inks.chalk, ground, WHY.size) })}</g>
              ))}
            </g>
          )
        })}
      </g>
      {foot}
    </g>
  )
}
