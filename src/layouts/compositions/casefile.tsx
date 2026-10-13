import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import { paintPortraitPhoto, splitFigure } from "./portrait"
import {
  accountBaseline,
  accountBodyBottom,
  accountChinese,
  accountFigureWidth,
  accountInks,
  accountMarkWidth,
  accountText,
  accountWidth,
  figureBaseline,
  fitAccount,
  markOfRow,
  paintAccount,
  paintAccountFigure,
  paintAccountLine,
  paintAccountMark,
  paintAccountRule,
  placeAccountHead,
  placeAccountSource,
  wholeLit,
  wholePage,
  type AccountMarkKind,
} from "./account"
import type { Recipe } from "./recipe"

type Image = Extract<Component, { type: "image" }>
type Rows = Extract<Component, { type: "row_cards" }>
type Kpis = Extract<Component, { type: "kpi_cards" }>

/*
 * casefile: one piece of work told as a case, who did which part of it and
 * what it came to, beside a photograph of it, recap's 2026-10 board (p06).
 * The photograph bleeds from the page's left edge to x400 the full height of
 * the page. In the column from x460 to x1200: the section line and the
 * claim, and from y176, under a 2px rule of the ink, the case as open rows
 * under pale hairlines, each at least 72px: its title in a 130px column at
 * 14px, its text after it at 18px. The row the author lit is the speaker's
 * part: its title bold in the deep accent after the filled square; the rows
 * after it are the team's, after the hollow grey square; the rows before it
 * (the background) take no mark. A row's tone takes the mark it asks for.
 * Under the rows a last one, 150px tall, titled 「结果」 ("Result"), holds the
 * figures in equal columns, each at 56px in the figure face over its label at
 * 14px in the grey, a figure its author marked whole bold in the accent. The
 * footer keeps to the column (`data-frame-left`), and a source that credits
 * the photograph follows the deck's label there.
 *
 * Takes, in the account setting: an `image`, a `row_cards` of three or four
 * rows with no more than one lit, and a `kpi_cards` of two to four items.
 *
 * Declines: a caption, a row with an icon or a sub line, an item with an
 * icon, a delta, a note, a tag or a source, a row title wider than its
 * column, a row text past two lines, a figure wider than its column, a label
 * past one line, a case that runs into the footer.
 *
 * Reads: the account inks (`./account.tsx`), the body and figure faces, the
 * image's crop or its centre.
 */

const PHOTO = { x: 0, y: 0, w: 400, h: 720 } as const
const COLUMN = { x: 460, w: 740 } as const
const CASE = { top: 176, rule: 2, row: 72, pad: 12, titleW: 130, gap: 20, title: 14, text: { size: 18, lineHeight: 28, maxLines: 2 }, result: { row: 150, gap: 20, figure: { size: 56, unit: 20, gap: 4 }, between: 8, label: 14, lineHeight: 20 }, bottom: 660 } as const

/** Each row's mark: the lit row the speaker's, the rows after it the team's, the rows before it none; a row's tone first. */
export function caseMarks(items: readonly { highlight?: boolean; tone?: "danger" | "warning" | "success" }[]): (AccountMarkKind | null)[] {
  const lit = items.findIndex((it) => it.highlight)
  return items.map((it, i) => (it.tone ? markOfRow(it) : lit < 0 || i < lit ? null : i === lit ? "lead" : "quiet"))
}

/** What an author writes to get this drawing (`./recipe.ts`). */
export const casefileRecipe: Recipe = {
  look: "One piece of work told as a case, who did which part and what it came to, beside its photograph",
  kinds: ["photo"],
  shapes: [{ parts: [{ type: "image" }, { type: "row_cards", count: [3, 4], needs: ["items[*].text"] }, { type: "kpi_cards", count: [2, 4] }] }],
}

export const casefileComposition: Composition = ({ components, ctx, setting, rect, claim, source, kicker }) => {
  if (setting !== "account" || !wholePage(rect) || components.length !== 3) return null
  const image = components.find((c): c is Image => c.type === "image")
  const cases = components.find((c): c is Rows => c.type === "row_cards")
  const kpis = components.find((c): c is Kpis => c.type === "kpi_cards")
  if (!image || !cases || !kpis || image.caption?.trim()) return null
  const rows = cases.items
  if (rows.length < 3 || rows.length > 4 || rows.filter((r) => r.highlight).length > 1 || rows.some((r) => r.icon || r.sub?.trim() || !r.text?.trim())) return null
  const items = kpis.items
  if (items.length < 2 || items.length > 4 || items.some((it) => it.icon || it.delta || it.note?.trim() || it.tag || it.source)) return null
  const marks = caseMarks(rows)
  const textX = COLUMN.x + CASE.titleW + CASE.gap
  const textW = COLUMN.x + COLUMN.w - textX
  const cells = rows.map((r, i) => ({
    r,
    mark: marks[i]!,
    title: stripEmphasis(r.title).trim(),
    text: fitAccount(r.text, { width: textW, size: CASE.text.size, lineHeight: CASE.text.lineHeight, maxLines: CASE.text.maxLines }, ctx),
  }))
  if (cells.some((c) => !c.text || (c.mark ? accountMarkWidth(c.title, c.mark, CASE.title, ctx) : accountWidth(c.title, CASE.title, ctx)) > CASE.titleW)) return null
  const colW = (textW - CASE.result.gap * (items.length - 1)) / items.length
  const results = items.map((it) => ({ it, figure: splitFigure(it.value, it.unit), lit: wholeLit(it.value), label: stripEmphasis(it.label).trim() }))
  if (results.some((r) => accountFigureWidth(r.figure.value, r.figure.unit, { ...CASE.result.figure, weight: r.lit ? 700 : 600 }, ctx) > colW || accountWidth(r.label, CASE.result.label, ctx) > colW)) return null
  const chinese = accountChinese(ctx, rows.map((r) => r.title))
  const resultTitle = chinese ? "结果" : "Result"
  const head = placeAccountHead(kicker, claim, { x: COLUMN.x, w: COLUMN.w, maxLines: 2 })
  if (!head) return null
  const top = Math.max(CASE.top, head.bottom + 47)
  const heights = cells.map((c) => Math.max(CASE.row, CASE.pad * 2 + c.text!.lines.length * CASE.text.lineHeight))
  const credit = placeAccountSource(source, { x: COLUMN.x, w: COLUMN.w, footer: true })
  if (credit === false) return null
  const end = top + CASE.rule + heights.reduce((a, b) => a + b, 0) + CASE.result.row
  if (end > accountBodyBottom(credit, CASE.bottom)) return null
  const inks = accountInks(ctx)
  const ground = inks.ground
  let y = top + CASE.rule
  return (
    <g {...compositionTag("casefile")} data-frame-left={COLUMN.x}>
      {paintPortraitPhoto(image.asset_id, PHOTO, ctx, { crop: image.crop, focus: [0.5, 0.5] })}
      {head.node}
      <g {...blockTag(ctx, cases)} data-account-case="">
        {paintAccountRule(COLUMN.x, COLUMN.x + COLUMN.w, top + CASE.rule / 2, inks.ink, CASE.rule)}
        {cells.map((c, i) => {
          const at = y
          const h = heights[i]!
          y += h
          const mid = at + h / 2
          const base = mid + CASE.title * 0.35
          return (
            <g key={i} data-account-case-row={c.title} data-lit={c.mark === "lead" ? "" : undefined}>
              {c.mark ? paintAccountMark({ ctx, kind: c.mark, text: c.title, x: COLUMN.x, baseline: base, size: CASE.title }) : paintAccountLine(c.title, { ctx, x: COLUMN.x, baseline: base, size: CASE.title, fill: accountText(inks.muted, ground, CASE.title) })}
              {paintAccount(c.text!, { ctx, x: textX, top: mid - (c.text!.lines.length * CASE.text.lineHeight) / 2, fill: accountText(inks.ink, ground, CASE.text.size) })}
              {paintAccountRule(COLUMN.x, COLUMN.x + COLUMN.w, at + h - 0.5, inks.line, 1)}
            </g>
          )
        })}
      </g>
      <g {...blockTag(ctx, kpis)} data-account-result="">
        {(() => {
          const at = y
          const mid = at + CASE.result.row / 2
          const blockH = CASE.result.figure.size + CASE.result.between + CASE.result.lineHeight
          const figTop = mid - blockH / 2
          return (
            <>
              {paintAccountLine(resultTitle, { ctx, x: COLUMN.x, baseline: mid + CASE.title * 0.35, size: CASE.title, fill: accountText(inks.muted, ground, CASE.title) })}
              {results.map((r, i) => {
                const x = textX + i * (colW + CASE.result.gap)
                return (
                  <g key={i} data-account-cell={r.label} data-lit={r.lit ? "" : undefined}>
                    {paintAccountFigure({ ctx, value: r.figure.value, unit: r.figure.unit, x, baseline: figureBaseline(figTop, CASE.result.figure.size, CASE.result.figure.size), spec: { ...CASE.result.figure, weight: r.lit ? 700 : 600 }, fill: accountText(r.lit ? inks.lead : inks.ink, ground, CASE.result.figure.unit) })}
                    {paintAccountLine(r.label, { ctx, x, baseline: accountBaseline(figTop + CASE.result.figure.size + CASE.result.between, CASE.result.lineHeight, CASE.result.label), size: CASE.result.label, fill: accountText(inks.muted, ground, CASE.result.label) })}
                  </g>
                )
              })}
              {paintAccountRule(COLUMN.x, COLUMN.x + COLUMN.w, at + CASE.result.row - 0.5, inks.line, 1)}
            </>
          )
        })()}
      </g>
      {credit}
    </g>
  )
}
