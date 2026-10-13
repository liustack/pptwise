import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import { splitFigure } from "./portrait"
import {
  ACCOUNT_LEFT,
  ACCOUNT_W,
  accountBaseline,
  accountBodyBottom,
  accountFigureWidth,
  accountInks,
  accountMark,
  accountMarkWidth,
  accountText,
  accountWidth,
  claimDrop,
  figureBaseline,
  figureValueWidth,
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
} from "./account"
import type { Recipe } from "./recipe"

type Kpis = Extract<Component, { type: "kpi_cards" }>
type Rows = Extract<Component, { type: "row_cards" }>

/*
 * postmortem: a mistake the speaker owns, told as before, during, after and
 * the cost, then as what happened, where it went wrong, why it lasted and
 * what changed, recap's 2026-10 board (p10). From y170, under a 2px rule of
 * the ink, the figures in four equal columns parted by pale hairlines, a
 * pale hairline under them: each its label at 13px in the grey, the figure at
 * 40px in the figure face with its unit after it, its note at 13px in the
 * body ink. A figure whose item is `tone: "danger"` is bold in the red; one
 * the author marked whole is bold in the accent. From y330 the account in a
 * two-by-two grid: each part under a hairline of the ink, its number in the
 * figure face in the grey and its title at 18px heavy, then its sub line as a
 * legend word (`markOfRow`: a red cross for `tone: "danger"`, a tick for
 * `"success"`), then its text at 15px in the body ink. The part the author lit
 * is what changed: its rule 3px in the accent, its number in the deep accent.
 *
 * Takes, in the account setting: a `kpi_cards` of four items and a
 * `row_cards` of four rows, at most one lit, in either order.
 *
 * Declines: an item with an icon, a delta, a tag or a source, a row with an
 * icon, a figure wider than its column, a label or a note past one line, a
 * title and its sub line wider than their column, a text past three lines, a
 * grid that runs into the footer.
 *
 * Reads: the account inks (`./account.tsx`), the body and figure faces.
 */

const STRIP = { top: 170, rule: 2, pad: 16, inset: 20, label: 13, labelH: 19, between: 4, figure: { size: 40, unit: 14, gap: 4 }, note: 13, noteH: 19 } as const
const GRID = { top: 330, gap: 40, rowGap: 26, rule: 1, lead: 3, pad: 12, number: 18, numberGap: 10, title: 18, titleH: 27, chip: 12, chipGap: 6, between: 8, text: { size: 15, lineHeight: 25.5, maxLines: 3 } } as const

/** What an author writes to get this drawing (`./recipe.ts`). */
export const postmortemRecipe: Recipe = {
  look: "A mistake the speaker owns, told as before, during, after and the cost",
  kinds: ["points"],
  shapes: [{ parts: [{ type: "kpi_cards", count: [4, 4] }, { type: "row_cards", count: [4, 4], needs: ["items[*].text"] }] }],
}

export const postmortemComposition: Composition = ({ components, ctx, setting, rect, claim, source, kicker }) => {
  if (setting !== "account" || !wholePage(rect) || components.length !== 2) return null
  const kpis = components.find((c): c is Kpis => c.type === "kpi_cards")
  const parts = components.find((c): c is Rows => c.type === "row_cards")
  if (!kpis || !parts) return null
  const items = kpis.items
  const rows = parts.items
  if (items.length !== 4 || rows.length !== 4 || items.some((it) => it.icon || it.delta || it.tag || it.source) || rows.some((r) => r.icon || !r.text?.trim()) || rows.filter((r) => r.highlight).length > 1) return null
  const colW = ACCOUNT_W / 4
  const cells = items.map((it, i) => {
    const textW = colW - (i > 0 ? STRIP.inset : 0) - (i < 3 ? STRIP.inset : 0)
    return { it, i, textW, figure: splitFigure(it.value, it.unit), lit: wholeLit(it.value), label: stripEmphasis(it.label).trim(), note: it.note?.trim() ? stripEmphasis(it.note).trim() : null }
  })
  if (cells.some((c) => accountWidth(c.label, STRIP.label, ctx) > c.textW || accountFigureWidth(c.figure.value, c.figure.unit, STRIP.figure, ctx) > c.textW || (c.note && accountWidth(c.note, STRIP.note, ctx) > c.textW))) return null
  const cellW = (ACCOUNT_W - GRID.gap) / 2
  const blocks = rows.map((r, i) => {
    const kind = r.sub?.trim() ? markOfRow({ tone: r.tone, highlight: r.highlight }) : null
    const number = String(i + 1)
    const title = stripEmphasis(r.title).trim()
    const sub = r.sub?.trim() ? stripEmphasis(r.sub).trim() : null
    const headW = figureValueWidth(number, GRID.number, ctx) + GRID.numberGap + accountWidth(title, GRID.title, ctx, { bold: true }) + (sub && kind ? GRID.chipGap + 6 + accountMarkWidth(sub, kind, GRID.chip, ctx) : 0)
    return { r, kind, number, title, sub, headW, text: fitAccount(r.text, { width: cellW, size: GRID.text.size, lineHeight: GRID.text.lineHeight, maxLines: GRID.text.maxLines }, ctx) }
  })
  if (blocks.some((b) => !b.text || b.headW > cellW)) return null
  const head = placeAccountHead(kicker, claim, { x: ACCOUNT_LEFT, w: ACCOUNT_W, maxLines: 2 })
  if (!head) return null
  const dy = claimDrop(head)
  const credit = placeAccountSource(source, { x: ACCOUNT_LEFT, w: ACCOUNT_W })
  if (credit === false) return null
  const stripTop = STRIP.top + dy
  const notes = cells.some((c) => c.note)
  const stripH = STRIP.rule + STRIP.pad * 2 + STRIP.labelH + STRIP.between + STRIP.figure.size + (notes ? STRIP.between + STRIP.noteH : 0)
  const gridTop = Math.max(GRID.top + dy, stripTop + stripH + 40)
  const blockH = (b: (typeof blocks)[number]) => GRID.lead + GRID.pad + GRID.titleH + GRID.between + b.text!.lines.length * GRID.text.lineHeight
  const rowH = [Math.max(blockH(blocks[0]!), blockH(blocks[1]!)), Math.max(blockH(blocks[2]!), blockH(blocks[3]!))]
  if (gridTop + rowH[0]! + GRID.rowGap + rowH[1]! > accountBodyBottom(credit, 660)) return null
  const inks = accountInks(ctx)
  const ground = inks.ground
  return (
    <g {...compositionTag("postmortem")}>
      {head.node}
      <g {...blockTag(ctx, kpis)} data-account-strip="">
        {paintAccountRule(ACCOUNT_LEFT, ACCOUNT_LEFT + ACCOUNT_W, stripTop + STRIP.rule / 2, inks.ink, STRIP.rule)}
        {cells.map((c) => {
          const x0 = ACCOUNT_LEFT + c.i * colW
          const x = x0 + (c.i > 0 ? STRIP.inset : 0)
          const top = stripTop + STRIP.rule + STRIP.pad
          const danger = c.it.tone === "danger"
          const ink = danger ? inks.danger : c.lit ? inks.lead : inks.ink
          const figTop = top + STRIP.labelH + STRIP.between
          return (
            <g key={c.i} data-account-cell={c.label} data-lit={c.lit ? "" : undefined}>
              {c.i > 0 ? <rect x={x0} y={stripTop + STRIP.rule} width={1} height={stripH - STRIP.rule} fill={inks.line} /> : null}
              {paintAccountLine(c.label, { ctx, x, baseline: accountBaseline(top, STRIP.labelH, STRIP.label), size: STRIP.label, fill: accountText(inks.muted, ground, STRIP.label) })}
              {paintAccountFigure({ ctx, value: c.figure.value, unit: c.figure.unit, x, baseline: figureBaseline(figTop, STRIP.figure.size, STRIP.figure.size), spec: { ...STRIP.figure, weight: danger || c.lit ? 700 : 600 }, fill: accountText(ink, ground, STRIP.figure.unit) })}
              {c.note ? paintAccountLine(c.note, { ctx, x, baseline: accountBaseline(figTop + STRIP.figure.size + STRIP.between, STRIP.noteH, STRIP.note), size: STRIP.note, fill: accountText(inks.body, ground, STRIP.note) }) : null}
            </g>
          )
        })}
        {paintAccountRule(ACCOUNT_LEFT, ACCOUNT_LEFT + ACCOUNT_W, stripTop + stripH + 0.5, inks.line, 1)}
      </g>
      <g {...blockTag(ctx, parts)} data-account-parts="">
        {blocks.map((b, i) => {
          const x = ACCOUNT_LEFT + (i % 2) * (cellW + GRID.gap)
          const top = gridTop + (i < 2 ? 0 : rowH[0]! + GRID.rowGap)
          const lit = b.r.highlight === true
          const rule = lit ? GRID.lead : GRID.rule
          const titleTop = top + rule + GRID.pad - (lit ? 2 : 0) + (GRID.lead - rule)
          const titleBase = accountBaseline(titleTop, GRID.titleH, GRID.title)
          const numberW = figureValueWidth(b.number, GRID.number, ctx)
          const titleW = accountWidth(b.title, GRID.title, ctx, { bold: true })
          return (
            <g key={i} data-account-part={b.title} data-lit={lit ? "" : undefined}>
              <rect x={x} y={top + (GRID.lead - rule)} width={cellW} height={rule} fill={lit ? accountMark(inks.lead, ground) : inks.ink} />
              {paintAccountFigure({ ctx, value: b.number, x, baseline: titleBase, spec: { size: GRID.number, unit: GRID.number, gap: 0, weight: 700 }, fill: accountText(lit ? inks.deep : inks.muted, ground, GRID.number) })}
              {paintAccountLine(b.title, { ctx, x: x + numberW + GRID.numberGap, baseline: titleBase, size: GRID.title, bold: true, fill: accountText(inks.ink, ground, GRID.title) })}
              {b.sub && b.kind ? paintAccountMark({ ctx, kind: b.kind, text: b.sub, x: x + numberW + GRID.numberGap + titleW + GRID.chipGap + 6, baseline: titleBase - 2, size: GRID.chip }) : null}
              {paintAccount(b.text!, { ctx, x, top: titleTop + GRID.titleH + GRID.between, fill: accountText(inks.body, ground, GRID.text.size) })}
            </g>
          )
        })}
      </g>
      {credit}
    </g>
  )
}
