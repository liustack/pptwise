import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  ACCOUNT_LEFT,
  ACCOUNT_W,
  accountBodyBottom,
  accountInks,
  accountText,
  accountTrackedWidth,
  accountWidth,
  claimDrop,
  figureSign,
  figureValueWidth,
  fitAccount,
  paintAccount,
  paintAccountFigure,
  paintAccountIcon,
  paintAccountLine,
  paintAccountRule,
  paintAccountTracked,
  placeAccountHead,
  placeAccountSource,
  wholePage,
} from "./account"
import type { Recipe } from "./recipe"

type Table = Extract<Component, { type: "data_table" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * deltas: what moved between two years, measure by measure, and what the
 * speaker reads into it, recap's 2026-10 board (p11). From y172, under the
 * column names at 13px tracked in the grey and a 2px rule of the ink, the
 * measures as rows 56px tall under pale hairlines: each its symbol at 20px
 * and its name at 16px, then its figures right-aligned at 20px in the figure
 * face, and last the change at 22px: a loss (a figure with a minus) bold in
 * the red, a gain in the ink. The row the author lit sits on a pale wash of
 * the accent a little wider than the table, its name bold, its symbol and
 * its change in the deep accent, the change at 26px. From y540 the callout
 * after its symbol at 24px, at 18px in the ink.
 *
 * Takes, in the account setting: a `data_table` of three to five columns,
 * every column after the first right-aligned and the last the change, two
 * to six rows, at most one lit; and a `callout` without a title or a tag.
 *
 * Declines: a table title, a table source, a column with emphasis or an
 * icon, a total row, a row tag, a cell wider than its column, a name wider
 * than its column, a callout past two lines, a table that runs into the
 * callout or the callout into the footer.
 *
 * Reads: the account inks (`./account.tsx`), the body and figure faces.
 */

const TABLE = { top: 172, head: 13, tracking: 1.04, headPad: 8, rule: 2, row: 56, gap: 20, figureCol: 180, changeCol: 200, icon: 20, iconGap: 12, name: 16, figure: 20, change: 22, litChange: 26, wash: 14 } as const
const NOTE = { top: 540, icon: 24, gap: 14, size: 18, lineHeight: 29, maxLines: 2 } as const

/** What an author writes to get this drawing (`./recipe.ts`). */
export const deltasRecipe: Recipe = {
  look: "What moved between two years, measure by measure, and what the speaker reads into it",
  kinds: ["data"],
  shapes: [{ parts: [{ type: "data_table", count: [2, 6], needs: ["columns[].align"] }, { type: "callout" }] }],
}

export const deltasComposition: Composition = ({ components, ctx, setting, rect, claim, source, kicker }) => {
  if (setting !== "account" || !wholePage(rect) || components.length !== 2) return null
  const table = components.find((c): c is Table => c.type === "data_table")
  const note = components.find((c): c is Callout => c.type === "callout")
  if (!table || !note || table.title?.trim() || table.source?.trim() || note.title || note.tag) return null
  const cols = table.columns
  const rows = table.rows
  if (cols.length < 3 || cols.length > 5 || rows.length < 2 || rows.length > 6) return null
  if (cols.some((c, i) => c.emphasis || c.icon || (i > 0 && c.align !== "right")) || rows.some((r) => r.emphasis === "total" || r.tag) || rows.filter((r) => r.emphasis === "highlight").length > 1) return null
  const widths: number[] = cols.map((_, i) => (i === 0 ? 0 : i === cols.length - 1 ? TABLE.changeCol : TABLE.figureCol))
  widths[0] = ACCOUNT_W - widths.slice(1).reduce((a, b) => a + b, 0) - TABLE.gap * (cols.length - 1)
  if (widths[0]! < 200) return null
  const icons = rows.some((r) => r.icon)
  const nameX = ACCOUNT_LEFT + (icons ? TABLE.icon + TABLE.iconGap : 0)
  const nameW = widths[0]! - (icons ? TABLE.icon + TABLE.iconGap : 0)
  const cell = (r: (typeof rows)[number], key: string) => stripEmphasis(String(r.cells[key] ?? "")).trim()
  const headers = cols.map((c) => stripEmphasis(c.label).trim())
  if (headers.some((h, i) => accountTrackedWidth(h, TABLE.head, TABLE.tracking, ctx) > widths[i]!)) return null
  const fits = rows.every((r) => {
    const lit = r.emphasis === "highlight"
    return cols.every((c, i) => {
      const v = cell(r, c.key)
      if (i === 0) return accountWidth(v, TABLE.name, ctx, { bold: lit }) <= nameW
      const size = i === cols.length - 1 ? (lit ? TABLE.litChange : TABLE.change) : TABLE.figure
      return figureValueWidth(v, size, ctx) <= widths[i]!
    })
  })
  if (!fits) return null
  const textX = ACCOUNT_LEFT + (note.icon ? NOTE.icon + NOTE.gap : 0)
  const text = fitAccount(note.text, { width: ACCOUNT_LEFT + ACCOUNT_W - textX, size: NOTE.size, lineHeight: NOTE.lineHeight, maxLines: NOTE.maxLines }, ctx)
  if (!text) return null
  const head = placeAccountHead(kicker, claim, { x: ACCOUNT_LEFT, w: ACCOUNT_W, maxLines: 2 })
  if (!head) return null
  const dy = claimDrop(head)
  const credit = placeAccountSource(source, { x: ACCOUNT_LEFT, w: ACCOUNT_W })
  if (credit === false) return null
  const top = TABLE.top + dy
  const ruleY = top + 19 + TABLE.headPad
  const rowsTop = ruleY + TABLE.rule
  const tableBottom = rowsTop + rows.length * TABLE.row
  const noteTop = Math.max(NOTE.top + dy, tableBottom + 40)
  if (noteTop + text.lines.length * NOTE.lineHeight > accountBodyBottom(credit, 660)) return null
  const inks = accountInks(ctx)
  const ground = inks.ground
  const colX: number[] = []
  let at = ACCOUNT_LEFT
  for (const w of widths) {
    colX.push(at)
    at += w + TABLE.gap
  }
  return (
    <g {...compositionTag("deltas")}>
      {head.node}
      <g {...blockTag(ctx, table)} data-account-deltas="">
        {headers.map((h, i) => (
          <g key={i}>{paintAccountTracked({ ctx, text: h, x: i === 0 ? ACCOUNT_LEFT : colX[i]! + widths[i]!, anchor: i === 0 ? "start" : "end", y: top + 14, size: TABLE.head, tracking: TABLE.tracking, fill: accountText(inks.muted, ground, TABLE.head) })}</g>
        ))}
        {paintAccountRule(ACCOUNT_LEFT, ACCOUNT_LEFT + ACCOUNT_W, ruleY + TABLE.rule / 2, inks.ink, TABLE.rule)}
        {rows.map((r, k) => {
          const rowTop = rowsTop + k * TABLE.row
          const mid = rowTop + TABLE.row / 2
          const lit = r.emphasis === "highlight"
          const on = lit ? inks.tint : ground
          const name = cell(r, cols[0]!.key)
          return (
            <g key={k} data-account-row={name} data-lit={lit ? "" : undefined}>
              {lit ? <rect data-account-wash="" x={ACCOUNT_LEFT - TABLE.wash} y={rowTop} width={ACCOUNT_W + TABLE.wash * 2} height={TABLE.row - 1} fill={inks.tint} /> : null}
              {r.icon ? paintAccountIcon(r.icon, ACCOUNT_LEFT, mid - TABLE.icon / 2, TABLE.icon, lit ? inks.deep : inks.ink, on, { stroke: 1.7 }) : null}
              {paintAccountLine(name, { ctx, x: nameX, baseline: mid + TABLE.name * 0.35, size: TABLE.name, bold: lit, fill: accountText(inks.ink, on, TABLE.name) })}
              {cols.slice(1).map((c, j) => {
                const i = j + 1
                const v = cell(r, c.key)
                const last = i === cols.length - 1
                const loss = last && figureSign(v) < 0
                const size = last ? (lit ? TABLE.litChange : TABLE.change) : TABLE.figure
                const ink = last && lit ? inks.deep : loss ? inks.danger : inks.ink
                return <g key={i}>{paintAccountFigure({ ctx, value: v, x: colX[i]! + widths[i]!, anchor: "end", baseline: mid + size * 0.35, spec: { size, unit: size, gap: 0, weight: last && (lit || loss) ? 700 : 600 }, fill: accountText(ink, on, size) })}</g>
              })}
              {paintAccountRule(ACCOUNT_LEFT, ACCOUNT_LEFT + ACCOUNT_W, rowTop + TABLE.row - 0.5, inks.line, 1)}
            </g>
          )
        })}
      </g>
      <g {...blockTag(ctx, note)} data-account-note="">
        {note.icon ? paintAccountIcon(note.icon, ACCOUNT_LEFT, noteTop + (NOTE.lineHeight - NOTE.icon) / 2, NOTE.icon, inks.ink, ground, { stroke: 1.7 }) : null}
        {paintAccount(text, { ctx, x: textX, top: noteTop, fill: accountText(inks.ink, ground, NOTE.size) })}
      </g>
      {credit}
    </g>
  )
}

