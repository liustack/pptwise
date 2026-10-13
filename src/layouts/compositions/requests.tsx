import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  ACCOUNT_LEFT,
  ACCOUNT_W,
  accountBodyBottom,
  accountChinese,
  accountInks,
  accountText,
  accountTrackedWidth,
  accountWidth,
  claimDrop,
  figureLineWidth,
  figureValueWidth,
  fitAccount,
  paintAccount,
  paintAccountBox,
  paintAccountFigure,
  paintAccountIcon,
  paintAccountLine,
  paintAccountRule,
  paintAccountTracked,
  paintFigureLine,
  placeAccountHead,
  placeAccountSource,
  wholePage,
} from "./account"
import type { Recipe } from "./recipe"

type Table = Extract<Component, { type: "data_table" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * requests: what the speaker asks the reviewers for, each ask beside what it
 * costs and what it buys, with boxes for the reviewers to tick, recap's
 * 2026-10 board (p15). From y176, under the column names at 13px tracked in
 * the grey and a 2px rule of the ink, the asks as rows 80px tall under pale
 * hairlines: the ask's name at 18px heavy after its symbol, what exactly at
 * 16px, the cost right-aligned with its figures at 22px in the figure face
 * (a cost that is all figure and unit is set whole in it), what it buys at
 * 16px, and last, under a column the composition names (「评审意见」,
 * "Decision"), an empty box for each choice on the page's ballot with the
 * choice's word after it at 14px. The row the author lit sits on a pale wash
 * of the accent a little wider than the table, its name and cost in the deep
 * accent, what it buys bold. From y520, under a 2px rule of the ink, the
 * callout after its symbol at 26px, at 18px, its marked figures at 34px bold
 * in the figure face, the last of several in the accent.
 *
 * Takes, in the account setting, on a page with a `ballot` of two to four
 * choices: a `data_table` of four columns (the ask, what exactly, the cost
 * right-aligned, what it buys), two to four rows, at most one lit, every row
 * with a symbol; and a `callout` without a title or a tag, its text one line.
 *
 * Declines: a ballot with a signature or choices per item, a table title or
 * source, a column with emphasis or an icon, a total row, a row tag, a cell
 * wider than its column, a callout past one line, a page that runs into the
 * footer.
 *
 * Reads: the account inks (`./account.tsx`), the body and figure faces, the
 * page's ballot.
 */

const TABLE = { top: 176, head: 13, tracking: 1.04, headPad: 8, rule: 2, row: 80, gap: 20, cols: [110, 290, 170, 0, 150] as const, icon: 20, iconGap: 10, name: 18, text: 16, figure: 22, words: 15, box: 16, boxGap: 6, choice: 14, choiceGap: 16, wash: 14 } as const
const NOTE = { top: 520, rule: 2, pad: 18, icon: 26, gap: 14, size: 18, figure: 34, lineHeight: 40 } as const

/** A cost cell as the line `paintFigureLine` sets: its figure runs marked, so they set large in the figure face. */
export function markFigures(text: string): string {
  return stripEmphasis(text).replace(/[+\-−]?\d[\d,]*(?:\.\d+)?/gu, (m) => `**${m}**`)
}

/** Whether a cost cell is a figure and its unit only (「36 万元/年」, 「+260 万元」), set whole in the figure face. */
function wholeFigure(text: string): boolean {
  return /^[+\-−]?\d[\d.,]*%?\s*\S{0,5}$/u.test(stripEmphasis(text).trim())
}

/** What an author writes to get this drawing (`./recipe.ts`). */
export const requestsRecipe: Recipe = {
  look: "What the speaker asks for, each ask beside what it costs and buys, with boxes to tick",
  kinds: ["comparison"],
  shapes: [{ parts: [{ type: "data_table", count: [2, 4], needs: ["columns[].align", "rows[*].icon"] }, { type: "callout" }], page: ["ballot"] }],
}

export const requestsComposition: Composition = ({ components, ctx, setting, rect, claim, source, kicker, ballot }) => {
  if (setting !== "account" || !wholePage(rect) || components.length !== 2) return null
  if (!ballot || ballot.choices.length < 2 || ballot.choices.length > 4 || ballot.signature || ballot.item_choices) return null
  const table = components.find((c): c is Table => c.type === "data_table")
  const note = components.find((c): c is Callout => c.type === "callout")
  if (!table || !note || table.title?.trim() || table.source?.trim() || note.title || note.tag) return null
  const cols = table.columns
  const rows = table.rows
  if (cols.length !== 4 || cols[2]!.align !== "right" || rows.length < 2 || rows.length > 4) return null
  if (cols.some((c) => c.emphasis || c.icon) || rows.some((r) => !r.icon || r.emphasis === "total" || r.tag) || rows.filter((r) => r.emphasis === "highlight").length > 1) return null
  const chinese = accountChinese(ctx, cols.map((c) => c.label))
  const decision = chinese ? "评审意见" : "Decision"
  const widths: number[] = [...TABLE.cols]
  widths[3] = ACCOUNT_W - widths.reduce((a, b) => a + b, 0) - TABLE.gap * 4
  const colX: number[] = []
  let at = ACCOUNT_LEFT
  for (const w of widths) {
    colX.push(at)
    at += w + TABLE.gap
  }
  const headers = [...cols.map((c) => stripEmphasis(c.label).trim()), decision]
  if (headers.some((h, i) => accountTrackedWidth(h, TABLE.head, TABLE.tracking, ctx) > widths[i]!)) return null
  const choices = ballot.choices.map((c) => stripEmphasis(c).trim())
  const choicesW = choices.reduce((w, c) => w + TABLE.box + TABLE.boxGap + accountWidth(c, TABLE.choice, ctx), 0) + TABLE.choiceGap * (choices.length - 1)
  if (choicesW > widths[4]!) return null
  const cell = (r: (typeof rows)[number], i: number) => stripEmphasis(String(r.cells[cols[i]!.key] ?? "")).trim()
  const costWidth = (v: string, lit: boolean) => (wholeFigure(v) ? figureValueWidth(v, TABLE.figure, ctx, true) : figureLineWidth(markFigures(v), TABLE.words, TABLE.figure, ctx)) * (lit ? 1.02 : 1)
  const fits = rows.every((r) => {
    const lit = r.emphasis === "highlight"
    return (
      TABLE.icon + TABLE.iconGap + accountWidth(cell(r, 0), TABLE.name, ctx, { bold: true }) <= widths[0]! &&
      accountWidth(cell(r, 1), TABLE.text, ctx) <= widths[1]! &&
      costWidth(cell(r, 2), lit) <= widths[2]! &&
      accountWidth(cell(r, 3), TABLE.text, ctx, { bold: lit }) <= widths[3]!
    )
  })
  if (!fits) return null
  const textX = ACCOUNT_LEFT + (note.icon ? NOTE.icon + NOTE.gap : 0)
  const noteW = ACCOUNT_LEFT + ACCOUNT_W - textX
  const figured = /\*\*/.test(note.text)
  const plainNote = figured ? null : fitAccount(note.text, { width: noteW, size: NOTE.size, lineHeight: NOTE.lineHeight, maxLines: 1 }, ctx)
  if (figured ? figureLineWidth(note.text, NOTE.size, NOTE.figure, ctx) > noteW : !plainNote) return null
  const head = placeAccountHead(kicker, claim, { x: ACCOUNT_LEFT, w: ACCOUNT_W, maxLines: 2 })
  if (!head) return null
  const dy = claimDrop(head)
  const credit = placeAccountSource(source, { x: ACCOUNT_LEFT, w: ACCOUNT_W })
  if (credit === false) return null
  const top = TABLE.top + dy
  const ruleY = top + 19 + TABLE.headPad
  const rowsTop = ruleY + TABLE.rule
  const noteTop = Math.max(NOTE.top + dy, rowsTop + rows.length * TABLE.row + 40)
  if (noteTop + NOTE.rule + NOTE.pad + NOTE.lineHeight > accountBodyBottom(credit, 660)) return null
  const inks = accountInks(ctx)
  const ground = inks.ground
  const noteMid = noteTop + NOTE.rule + NOTE.pad + NOTE.lineHeight / 2
  return (
    <g {...compositionTag("requests")}>
      {head.node}
      <g {...blockTag(ctx, table)} data-account-requests="">
        {headers.map((h, i) => (
          <g key={i}>{paintAccountTracked({ ctx, text: h, x: i === 2 ? colX[i]! + widths[i]! : colX[i]!, anchor: i === 2 ? "end" : "start", y: top + 14, size: TABLE.head, tracking: TABLE.tracking, fill: accountText(inks.muted, ground, TABLE.head) })}</g>
        ))}
        {paintAccountRule(ACCOUNT_LEFT, ACCOUNT_LEFT + ACCOUNT_W, ruleY + TABLE.rule / 2, inks.ink, TABLE.rule)}
        {rows.map((r, k) => {
          const rowTop = rowsTop + k * TABLE.row
          const mid = rowTop + TABLE.row / 2
          const lit = r.emphasis === "highlight"
          const on = lit ? inks.tint : ground
          const name = cell(r, 0)
          const cost = cell(r, 2)
          const costInk = accountText(lit ? inks.deep : inks.ink, on, TABLE.words)
          const costRight = colX[2]! + widths[2]!
          let bx = colX[4]!
          return (
            <g key={k} data-account-ask={name} data-lit={lit ? "" : undefined}>
              {lit ? <rect data-account-wash="" x={ACCOUNT_LEFT - TABLE.wash} y={rowTop} width={ACCOUNT_W + TABLE.wash * 2} height={TABLE.row - 1} fill={inks.tint} /> : null}
              {paintAccountIcon(r.icon!, ACCOUNT_LEFT, mid - TABLE.icon / 2, TABLE.icon, lit ? inks.deep : inks.ink, on, { stroke: 1.8 })}
              {paintAccountLine(name, { ctx, x: ACCOUNT_LEFT + TABLE.icon + TABLE.iconGap, baseline: mid + TABLE.name * 0.35, size: TABLE.name, bold: true, fill: accountText(lit ? inks.deep : inks.ink, on, TABLE.name) })}
              {paintAccountLine(cell(r, 1), { ctx, x: colX[1]!, baseline: mid + TABLE.text * 0.35, size: TABLE.text, fill: accountText(inks.ink, on, TABLE.text) })}
              {wholeFigure(cost)
                ? paintAccountFigure({ ctx, value: cost, x: costRight, anchor: "end", baseline: mid + TABLE.figure * 0.35, spec: { size: TABLE.figure, unit: TABLE.figure, gap: 0, weight: lit ? 700 : 600 }, fill: costInk })
                : paintFigureLine({ ctx, text: markFigures(cost), x: costRight - figureLineWidth(markFigures(cost), TABLE.words, TABLE.figure, ctx), baseline: mid + TABLE.figure * 0.35, size: TABLE.words, figureSize: TABLE.figure, ink: costInk, lit: costInk })}
              {paintAccountLine(cell(r, 3), { ctx, x: colX[3]!, baseline: mid + TABLE.text * 0.35, size: TABLE.text, bold: lit, fill: accountText(inks.ink, on, TABLE.text) })}
              {choices.map((c, j) => {
                const x = bx
                bx += TABLE.box + TABLE.boxGap + accountWidth(c, TABLE.choice, ctx) + TABLE.choiceGap
                return (
                  <g key={j} data-ballot-choice={c}>
                    {paintAccountBox(x, mid - TABLE.box / 2, TABLE.box, inks.ink, { fill: lit ? ground : undefined })}
                    {paintAccountLine(c, { ctx, x: x + TABLE.box + TABLE.boxGap, baseline: mid + TABLE.choice * 0.35, size: TABLE.choice, fill: accountText(inks.ink, on, TABLE.choice) })}
                  </g>
                )
              })}
              {paintAccountRule(ACCOUNT_LEFT, ACCOUNT_LEFT + ACCOUNT_W, rowTop + TABLE.row - 0.5, inks.line, 1)}
            </g>
          )
        })}
      </g>
      <g {...blockTag(ctx, note)} data-account-note="">
        {paintAccountRule(ACCOUNT_LEFT, ACCOUNT_LEFT + ACCOUNT_W, noteTop + NOTE.rule / 2, inks.ink, NOTE.rule)}
        {note.icon ? paintAccountIcon(note.icon, ACCOUNT_LEFT, noteMid - NOTE.icon / 2, NOTE.icon, inks.ink, ground, { stroke: 1.7 }) : null}
        {figured
          ? paintFigureLine({ ctx, text: note.text, x: textX, baseline: noteMid + NOTE.size * 0.35, size: NOTE.size, figureSize: NOTE.figure, ink: accountText(inks.ink, ground, NOTE.size), lit: accountText(inks.lead, ground, NOTE.size) })
          : paintAccount(plainNote!, { ctx, x: textX, top: noteMid - NOTE.lineHeight / 2, fill: accountText(inks.ink, ground, NOTE.size) })}
      </g>
      {credit}
    </g>
  )
}
