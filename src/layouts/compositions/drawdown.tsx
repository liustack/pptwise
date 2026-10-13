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
  formatFigure,
  markOfTag,
  paintAccountFigure,
  paintAccountLine,
  paintAccountMark,
  paintAccountRule,
  placeAccountHead,
  placeAccountSource,
  plainBars,
  wholePage,
} from "./account"
import type { Recipe } from "./recipe"

type Chart = Extract<Component, { type: "chart" }>
type Kpis = Extract<Component, { type: "kpi_cards" }>

/*
 * drawdown: one figure the speaker moved, set as large as the page allows,
 * with the before and after under it, recap's 2026-10 board (p08). In the
 * column from x80 to x660: the first figure's tag as a legend word (「我牵头」),
 * the figure itself at 168px bold in the figure face in the accent with its
 * unit after it, and its label at 16px. From y470 the chart's two or three
 * categories as bars on their side, each after its name at 14px in the grey,
 * 24px thick on one scale, its value after it at 20px; the bar the author
 * marked (the one the page is about) in the accent, the others in the grey,
 * and after the marked bar the change from the first, bold in the deep
 * accent (「−18 天」). At the right, from x740 to x1200, under a 2px rule of
 * the ink, the other figures as rows parted by pale hairlines: each at 60px
 * in the figure face with its unit after it, its label at 16px under it.
 *
 * Takes, in the account setting: a bar `chart` of one series of two or three
 * categories, one of them marked, and a `kpi_cards` of three or four items,
 * the first the figure the page is about.
 *
 * Declines: a chart with any furniture of its own (`plainBars`), an item with
 * an icon, a delta, a note or a source, a tag on any item but the first, a
 * figure wider than its column, a category name wider than its column, a
 * label past one line, a column that runs into the footer.
 *
 * Reads: the account inks (`./account.tsx`), the body and figure faces.
 */

const HERO = { x: 80, w: 580, top: 176, chip: 13, chipH: 18, gap: 6, figure: { size: 168, unit: 28, gap: 10, weight: 700 as const, unitWeight: 700 as const }, label: 16, labelH: 24 } as const
const BARS = { top: 470, nameW: 70, gap: 12, name: 14, h: 24, between: 14, track: 416, value: 20, valueGap: 10 } as const
const SIDE = { x: 740, w: 460, top: 186, rule: 2, pad: 26, figure: { size: 60, unit: 18, gap: 6 }, between: 6, label: 16, labelH: 24 } as const

/** What an author writes to get this drawing (`./recipe.ts`). */
export const drawdownRecipe: Recipe = {
  look: "One figure the speaker moved, set as large as the page allows, with the before and after under it",
  kinds: ["fact"],
  shapes: [{ parts: [{ type: "chart", count: [2, 3], needs: ["chart_type=bar", "series[].data[].emphasis"] }, { type: "kpi_cards", count: [3, 4] }] }],
}

export const drawdownComposition: Composition = ({ components, ctx, setting, rect, claim, source, kicker }) => {
  if (setting !== "account" || !wholePage(rect) || components.length !== 2) return null
  const chart = components.find((c): c is Chart => c.type === "chart")
  const kpis = components.find((c): c is Kpis => c.type === "kpi_cards")
  if (!chart || !kpis || !plainBars(chart, { min: 1, max: 1 })) return null
  const points = chart.series[0]!.data
  if (points.length < 2 || points.length > 3) return null
  const markedAt = points.findIndex((p) => p.emphasis)
  const lit = markedAt >= 0 ? markedAt : chart.series[0]!.emphasis ? points.length - 1 : -1
  if (lit < 0) return null
  const items = kpis.items
  if (items.length < 3 || items.length > 4 || items.some((it, i) => it.icon || it.delta || it.note?.trim() || it.source || (i > 0 && it.tag))) return null
  const hero = items[0]!
  const heroFigure = splitFigure(hero.value, hero.unit)
  if (accountFigureWidth(heroFigure.value, heroFigure.unit, HERO.figure, ctx) > HERO.w) return null
  if (accountWidth(hero.label, HERO.label, ctx) > HERO.w) return null
  if (hero.tag && accountMarkWidth(hero.tag.text, markOfTag(hero.tag), HERO.chip, ctx) > HERO.w) return null
  const unit = chart.axes?.y_unit?.trim() ?? ""
  const spaced = unit && !/^[%‰]/u.test(unit) ? " " : ""
  const valueOf = (y: number) => `${formatFigure(y, { decimals: Number.isInteger(y) ? 0 : 1 })}${unit ? spaced + unit : ""}`
  const max = Math.max(...points.map((p) => p.y))
  const scale = BARS.track / (max || 1)
  const first = points[0]!.y
  const change = lit > 0 ? points[lit]!.y - first : 0
  const changeWords = change !== 0 ? `${formatFigure(change, { signed: true, decimals: Number.isInteger(change) ? 0 : 1 })}${unit ? spaced + unit : ""}` : null
  const barX = HERO.x + BARS.nameW + BARS.gap
  const rowsFit = points.every((p, i) => {
    const end = barX + p.y * scale + BARS.valueGap + figureValueWidth(valueOf(p.y), BARS.value, ctx) + (i === lit && changeWords ? BARS.valueGap + figureValueWidth(changeWords, BARS.value, ctx) : 0)
    return accountWidth(String(p.x), BARS.name, ctx) <= BARS.nameW && end <= SIDE.x - 20
  })
  if (!rowsFit) return null
  const side = items.slice(1).map((it) => ({ it, figure: splitFigure(it.value, it.unit), label: stripEmphasis(it.label).trim() }))
  if (side.some((s) => accountFigureWidth(s.figure.value, s.figure.unit, SIDE.figure, ctx) > SIDE.w || accountWidth(s.label, SIDE.label, ctx) > SIDE.w)) return null
  const head = placeAccountHead(kicker, claim, { x: ACCOUNT_LEFT, w: ACCOUNT_W, maxLines: 2 })
  if (!head) return null
  const dy = claimDrop(head)
  const credit = placeAccountSource(source, { x: ACCOUNT_LEFT, w: ACCOUNT_W })
  if (credit === false) return null
  const bottom = accountBodyBottom(credit, 660)
  const rowH = SIDE.pad * 2 + SIDE.figure.size + SIDE.between + SIDE.labelH + 1
  const barsBottom = BARS.top + dy + points.length * BARS.h + (points.length - 1) * BARS.between
  if (barsBottom > bottom || SIDE.top + dy + SIDE.rule + side.length * rowH > bottom) return null
  const inks = accountInks(ctx)
  const ground = inks.ground
  const heroTop = HERO.top + dy
  const figTop = heroTop + (hero.tag ? HERO.chipH + HERO.gap : 0)
  return (
    <g {...compositionTag("drawdown")}>
      {head.node}
      <g {...blockTag(ctx, kpis)} data-account-drawdown="">
        <g data-account-hero={stripEmphasis(hero.label)} data-lit="">
          {hero.tag ? paintAccountMark({ ctx, kind: markOfTag(hero.tag), text: hero.tag.text, x: HERO.x, baseline: accountBaseline(heroTop, HERO.chipH, HERO.chip), size: HERO.chip }) : null}
          {paintAccountFigure({ ctx, value: heroFigure.value, unit: heroFigure.unit, x: HERO.x, baseline: figureBaseline(figTop, HERO.figure.size, HERO.figure.size), spec: HERO.figure, fill: accountText(inks.lead, ground, HERO.figure.unit) })}
          {paintAccountLine(stripEmphasis(hero.label).trim(), { ctx, x: HERO.x, baseline: accountBaseline(figTop + HERO.figure.size + HERO.gap, HERO.labelH, HERO.label), size: HERO.label, fill: accountText(inks.ink, ground, HERO.label) })}
        </g>
        <g data-account-side="">
          {paintAccountRule(SIDE.x, SIDE.x + SIDE.w, SIDE.top + dy + SIDE.rule / 2, inks.ink, SIDE.rule)}
          {side.map((s, i) => {
            const top = SIDE.top + dy + SIDE.rule + i * rowH
            return (
              <g key={i} data-account-cell={s.label}>
                {paintAccountFigure({ ctx, value: s.figure.value, unit: s.figure.unit, x: SIDE.x, baseline: figureBaseline(top + SIDE.pad, SIDE.figure.size, SIDE.figure.size), spec: SIDE.figure, fill: accountText(inks.ink, ground, SIDE.figure.unit) })}
                {paintAccountLine(s.label, { ctx, x: SIDE.x, baseline: accountBaseline(top + SIDE.pad + SIDE.figure.size + SIDE.between, SIDE.labelH, SIDE.label), size: SIDE.label, fill: accountText(inks.ink, ground, SIDE.label) })}
                {paintAccountRule(SIDE.x, SIDE.x + SIDE.w, top + rowH - 0.5, inks.line, 1)}
              </g>
            )
          })}
        </g>
      </g>
      <g {...blockTag(ctx, chart)} data-account-bars="">
        {points.map((p, i) => {
          const top = BARS.top + dy + i * (BARS.h + BARS.between)
          const mid = top + BARS.h / 2
          const w = Math.max(2, Math.round(p.y * scale))
          const isLit = i === lit
          const valueX = barX + w + BARS.valueGap
          const valueW = figureValueWidth(valueOf(p.y), BARS.value, ctx)
          return (
            <g key={i} data-account-bar={String(p.x)} data-lit={isLit ? "" : undefined}>
              {paintAccountLine(String(p.x), { ctx, x: HERO.x, baseline: mid + BARS.name * 0.35, size: BARS.name, fill: accountText(inks.muted, ground, BARS.name) })}
              <rect x={barX} y={top} width={w} height={BARS.h} fill={isLit ? accountMark(inks.lead, ground) : inks.bar} />
              {paintAccountFigure({ ctx, value: valueOf(p.y), x: valueX, baseline: mid + BARS.value * 0.35, spec: { size: BARS.value, unit: BARS.value, gap: 0 }, fill: accountText(inks.ink, ground, BARS.value) })}
              {isLit && changeWords ? paintAccountFigure({ ctx, value: changeWords, x: valueX + valueW + BARS.valueGap, baseline: mid + BARS.value * 0.35, spec: { size: BARS.value, unit: BARS.value, gap: 0, weight: 700 }, fill: accountText(inks.deep, ground, BARS.value) }) : null}
            </g>
          )
        })}
      </g>
      {credit}
    </g>
  )
}
