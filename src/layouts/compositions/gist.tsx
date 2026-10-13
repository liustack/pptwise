import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import { splitFigure } from "./portrait"
import {
  ACCOUNT_LEFT,
  ACCOUNT_W,
  SECTION,
  accountBaseline,
  accountBodyBottom,
  accountFigureWidth,
  accountInks,
  accountMarkWidth,
  accountText,
  figureBaseline,
  fitAccount,
  markOfTag,
  paintAccount,
  paintAccountFigure,
  paintAccountMark,
  paintAccountRule,
  placeAccountClaim,
  placeAccountKicker,
  placeAccountSource,
  wholeLit,
  wholePage,
} from "./account"
import type { Recipe } from "./recipe"

type Paragraph = Extract<Component, { type: "paragraph" }>
type Kpis = Extract<Component, { type: "kpi_cards" }>

/*
 * gist: the year in one sentence, recap's 2026-10 board (p02). Under the
 * section line the claim set large, 48/67 heavy across the measure from
 * y140, a run the author marked underlined in red. Under it the paragraph
 * that says it in full, 19/34 in the body ink, 940 wide from y316. From
 * y470, under a 2px rule of the ink, the figures in equal columns parted by
 * pale hairlines: each figure at 60px in the figure face with its unit
 * after it, the label at 15px, and under it the legend mark its tag asks for
 * (`markOfTag`). A figure the author marked whole is in the accent, one whose
 * item is `tone: "danger"` in the red.
 *
 * Takes, in the account setting: a `paragraph` and a `kpi_cards` of two to
 * four items, in either order.
 *
 * Declines: an item with an icon, a delta, a note or a source, a figure
 * wider than its column, a label past two lines, a paragraph past four
 * lines, a claim past two lines at 48px, a strip that runs into the footer.
 *
 * Reads: the account inks (`./account.tsx`), the body and figure faces.
 */

const CLAIM = { top: 140, size: 48, lineHeight: 67, maxLines: 2 } as const
const PARA = { top: 316, gap: 30, w: 940, size: 19, lineHeight: 34, maxLines: 4 } as const
const STRIP = { top: 470, gap: 36, rule: 2, pad: 22, inset: 24, figure: { size: 60, unit: 16, gap: 4 }, between: 8, label: { size: 15, lineHeight: 22, maxLines: 2 }, chip: { size: 13, lineHeight: 20 }, bottom: 660 } as const

/** What an author writes to get this drawing (`./recipe.ts`). */
export const gistRecipe: Recipe = {
  look: "The year in one sentence",
  kinds: ["statement"],
  shapes: [{ parts: [{ type: "paragraph" }, { type: "kpi_cards", count: [2, 4] }] }],
}

export const gistComposition: Composition = ({ components, ctx, setting, rect, claim, source, kicker }) => {
  if (setting !== "account" || !wholePage(rect) || components.length !== 2) return null
  const para = components.find((c): c is Paragraph => c.type === "paragraph")
  const kpis = components.find((c): c is Kpis => c.type === "kpi_cards")
  if (!para || !kpis) return null
  const items = kpis.items
  if (items.length < 2 || items.length > 4 || items.some((it) => it.icon || it.delta || it.note?.trim() || it.source)) return null
  const n = items.length
  const colW = ACCOUNT_W / n
  const cells = items.map((it, i) => {
    const textW = colW - (i > 0 ? STRIP.inset : 0) - (i < n - 1 ? STRIP.inset : 0)
    const figure = splitFigure(it.value, it.unit)
    return {
      it,
      figure,
      textW,
      lit: wholeLit(it.value),
      label: fitAccount(it.label, { width: textW, size: STRIP.label.size, lineHeight: STRIP.label.lineHeight, maxLines: STRIP.label.maxLines }, ctx),
      fits: accountFigureWidth(figure.value, figure.unit, STRIP.figure, ctx) <= textW && (!it.tag || accountMarkWidth(it.tag.text, markOfTag(it.tag), STRIP.chip.size, ctx) <= textW),
    }
  })
  if (cells.some((c) => !c.label || !c.fits)) return null
  const text = fitAccount(para.text, { width: PARA.w, size: PARA.size, lineHeight: PARA.lineHeight, maxLines: PARA.maxLines }, ctx)
  if (!text) return null
  const section = placeAccountKicker(kicker, { x: ACCOUNT_LEFT, top: SECTION.top, w: ACCOUNT_W })
  if (section === false) return null
  let lines = 1
  let head = placeAccountClaim(claim, { x: ACCOUNT_LEFT, w: ACCOUNT_W, top: CLAIM.top, size: CLAIM.size, lineHeight: CLAIM.lineHeight, maxLines: 1 })
  if (head === false) {
    lines = 2
    head = placeAccountClaim(claim, { x: ACCOUNT_LEFT, w: ACCOUNT_W, top: CLAIM.top, size: CLAIM.size, lineHeight: CLAIM.lineHeight, maxLines: CLAIM.maxLines })
  }
  if (head === false) return null
  const paraTop = Math.max(PARA.top, CLAIM.top + (head ? lines * CLAIM.lineHeight : 0) + PARA.gap)
  const stripTop = Math.max(STRIP.top, paraTop + text.lines.length * PARA.lineHeight + STRIP.gap)
  const labelLines = Math.max(...cells.map((c) => c.label!.lines.length))
  const chips = items.some((it) => it.tag)
  const stripBottom = stripTop + STRIP.rule + STRIP.pad + STRIP.figure.size + STRIP.between + labelLines * STRIP.label.lineHeight + (chips ? STRIP.between + STRIP.chip.lineHeight : 0)
  const credit = placeAccountSource(source, { x: ACCOUNT_LEFT, w: ACCOUNT_W })
  if (credit === false) return null
  if (stripBottom > accountBodyBottom(credit, STRIP.bottom)) return null
  const inks = accountInks(ctx)
  const ground = inks.ground
  const figureTop = stripTop + STRIP.rule + STRIP.pad
  const labelTop = figureTop + STRIP.figure.size + STRIP.between
  return (
    <g {...compositionTag("gist")}>
      {section}
      {head}
      <g {...blockTag(ctx, para)} data-account-gist="">
        {paintAccount(text, { ctx, x: ACCOUNT_LEFT, top: paraTop, fill: accountText(inks.body, ground, PARA.size) })}
      </g>
      <g {...blockTag(ctx, kpis)} data-account-strip="">
        {paintAccountRule(ACCOUNT_LEFT, ACCOUNT_LEFT + ACCOUNT_W, stripTop + STRIP.rule / 2, inks.ink, STRIP.rule)}
        {cells.map((c, i) => {
          const x0 = ACCOUNT_LEFT + i * colW
          const x = x0 + (i > 0 ? STRIP.inset : 0)
          const ink = c.it.tone === "danger" ? inks.danger : c.lit ? inks.lead : inks.ink
          return (
            <g key={i} data-account-cell={stripEmphasis(c.it.label)} data-lit={c.lit ? "" : undefined}>
              {i > 0 ? <rect x={x0} y={stripTop + STRIP.rule} width={1} height={stripBottom - stripTop - STRIP.rule} fill={inks.line} /> : null}
              {paintAccountFigure({ ctx, value: c.figure.value, unit: c.figure.unit, x, baseline: figureBaseline(figureTop, STRIP.figure.size, STRIP.figure.size), spec: STRIP.figure, fill: accountText(ink, ground, STRIP.figure.unit) })}
              {paintAccount(c.label!, { ctx, x, top: labelTop, fill: accountText(inks.ink, ground, STRIP.label.size) })}
              {c.it.tag ? paintAccountMark({ ctx, kind: markOfTag(c.it.tag), text: c.it.tag.text, x, baseline: accountBaseline(labelTop + c.label!.lines.length * STRIP.label.lineHeight + STRIP.between, STRIP.chip.lineHeight, STRIP.chip.size), size: STRIP.chip.size }) : null}
            </g>
          )
        })}
      </g>
      {credit}
    </g>
  )
}
