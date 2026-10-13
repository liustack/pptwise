import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import { splitFigure } from "./portrait"
import {
  ACCOUNT_LEFT,
  ACCOUNT_META,
  ACCOUNT_SPEC,
  ACCOUNT_W,
  accountBaseline,
  accountBodyBottom,
  accountChinese,
  accountFigureWidth,
  accountInks,
  accountMark,
  accountMeta,
  accountText,
  accountWidth,
  claimDrop,
  figureBaseline,
  figureValueWidth,
  formatFigure,
  paintAccountFigure,
  paintAccountLine,
  paintAccountRule,
  placeAccountHead,
  placeAccountSource,
  plainBars,
  unitWords,
  wholeLit,
  wholePage,
} from "./account"
import type { Recipe } from "./recipe"

type Chart = Extract<Component, { type: "chart" }>
type Kpis = Extract<Component, { type: "kpi_cards" }>

/*
 * stretch: next year's target line by line against what this year did,
 * recap's 2026-10 board (p13). At the left, from x80 to x680, a pair of bars
 * for each line of the business: this year's solid in the grey, next year's
 * target a dashed outline of the accent on a pale wash of it, each with its
 * figure over it at 15px in the figure face, and over the target the step up
 * from this year, bold at 13px in the deep accent (「+2,600」). The unit at
 * the top left and a legend of the two at the top right of the plot, the
 * lines' names under it at 15px. At the right, from x760 to x1200, under a
 * 2px rule of the ink, the figures as rows parted by pale hairlines: the
 * first the target itself, 72px bold in the accent with its unit at 20px;
 * the rest at 48px in the ink; each its label at 16px and its note at 14px
 * in the grey under it.
 *
 * Takes, in the account setting: a bar `chart` of two series over two to
 * four categories, the second every point `status: "target"`, the first
 * none; and a `kpi_cards` of two or three items.
 *
 * Declines: a chart with any furniture of its own (`plainBars`), an item with
 * an icon, a delta, a tag or a source, a figure wider than the column, a
 * label or a note past one line, a category name wider than its group, a
 * column that runs into the footer.
 *
 * Reads: the account inks (`./account.tsx`), the body and figure faces.
 */

const PLOT = { x: 80, w: 600, top: 200, bottom: 530, rise: 285, bar: 56, gap: 10, value: 15, step: 13, between: 4, axis: 1.5 } as const
const HEAD = { top: 172, size: 13, box: 12, boxGap: 6, between: 18 } as const
const NAMES = { top: 538, size: 15, lineHeight: 22 } as const
const SIDE = { x: 760, w: 440, top: 186, rule: 2, pad: 22, between: 6, hero: { size: 72, unit: 20, gap: 6, weight: 700 as const, unitWeight: 700 as const }, plain: { size: 48, unit: 16, gap: 6 }, label: 16, labelH: 24, note: 14, noteH: 20 } as const

/** What an author writes to get this drawing (`./recipe.ts`). */
export const stretchRecipe: Recipe = {
  look: "Next year's target line by line against what this year did",
  kinds: ["data"],
  shapes: [{ parts: [{ type: "chart", count: [2, 4], needs: ["chart_type=bar", "series[].data[].status"] }, { type: "kpi_cards", count: [2, 3] }] }],
}

export const stretchComposition: Composition = ({ components, ctx, setting, rect, claim, source, kicker }) => {
  if (setting !== "account" || !wholePage(rect) || components.length !== 2) return null
  const chart = components.find((c): c is Chart => c.type === "chart")
  const kpis = components.find((c): c is Kpis => c.type === "kpi_cards")
  if (!chart || !kpis || !plainBars(chart, { min: 2, max: 2 })) return null
  const [now, goal] = chart.series as [Chart["series"][number], Chart["series"][number]]
  if (now.data.length < 2 || now.data.length > 4 || now.data.some((p) => p.status) || goal.data.some((p) => p.status !== "target")) return null
  const items = kpis.items
  if (items.length < 2 || items.length > 3 || items.some((it) => it.icon || it.delta || it.tag || it.source)) return null
  const chinese = accountChinese(ctx, now.data.map((p) => String(p.x)))
  const words = unitWords(chart.axes?.y_unit, 0, chinese)
  const legend = [
    { text: stripEmphasis(now.name).trim(), target: false },
    { text: stripEmphasis(goal.name).trim(), target: true },
  ]
  const legendW = legend.reduce((w, l) => w + HEAD.box + HEAD.boxGap + accountWidth(l.text, HEAD.size, ctx), 0) + HEAD.between
  if ((words ? accountWidth(words, HEAD.size, ctx) + 24 : 0) + legendW > PLOT.w) return null
  const n = now.data.length
  const groupW = PLOT.w / n
  if (PLOT.bar * 2 + PLOT.gap > groupW - 20 || now.data.some((p) => accountWidth(String(p.x), NAMES.size, ctx) > groupW - 8)) return null
  const max = Math.max(...now.data.map((p) => p.y), ...goal.data.map((p) => p.y), 1)
  const cells = items.map((it, i) => ({ it, figure: splitFigure(it.value, it.unit), lit: i === 0 || wholeLit(it.value), spec: i === 0 ? SIDE.hero : SIDE.plain, label: stripEmphasis(it.label).trim(), note: it.note?.trim() ? stripEmphasis(it.note).trim() : null }))
  if (cells.some((c) => accountFigureWidth(c.figure.value, c.figure.unit, c.spec, ctx) > SIDE.w || accountWidth(c.label, SIDE.label, ctx) > SIDE.w || (c.note && accountWidth(c.note, SIDE.note, ctx) > SIDE.w))) return null
  const head = placeAccountHead(kicker, claim, { x: ACCOUNT_LEFT, w: ACCOUNT_W, maxLines: 2 })
  if (!head) return null
  const dy = claimDrop(head)
  const credit = placeAccountSource(source, { x: ACCOUNT_LEFT, w: ACCOUNT_W })
  if (credit === false) return null
  const bottom = accountBodyBottom(credit, 660)
  const rowH = (c: (typeof cells)[number]) => SIDE.pad * 2 + c.spec.size + SIDE.between + SIDE.labelH + (c.note ? SIDE.between + SIDE.noteH : 0) + 1
  const sideBottom = SIDE.top + dy + SIDE.rule + cells.reduce((h, c) => h + rowH(c), 0)
  if (sideBottom > bottom || NAMES.top + NAMES.lineHeight > bottom) return null
  const inks = accountInks(ctx)
  const ground = inks.ground
  const rise = Math.min(PLOT.rise, PLOT.bottom - (PLOT.top + dy) - 45)
  const scale = rise / max
  const decimals = (v: number) => (Number.isInteger(v) ? 0 : 1)
  const headBase = accountBaseline(HEAD.top + dy, 18, HEAD.size)
  let lx = PLOT.x + PLOT.w - legendW
  let sy = SIDE.top + dy + SIDE.rule
  return (
    <g {...compositionTag("stretch")}>
      {head.node}
      <g {...blockTag(ctx, chart)} data-account-stretch="">
        {words ? (
          <text {...ACCOUNT_SPEC} {...ACCOUNT_META} x={PLOT.x} y={headBase} fontFamily={ctx.fonts.body} fontSize={HEAD.size} fill={accountMeta(inks.muted, ground)} dominantBaseline="alphabetic">
            {words}
          </text>
        ) : null}
        {legend.map((l, i) => {
          const x = lx
          lx += HEAD.box + HEAD.boxGap + accountWidth(l.text, HEAD.size, ctx) + HEAD.between
          return (
            <g key={i} data-account-legend={l.text}>
              {l.target ? (
                <rect x={x + 0.75} y={headBase - 10.75} width={HEAD.box - 1.5} height={HEAD.box - 1.5} fill={inks.tint} stroke={accountMark(inks.lead, ground)} strokeWidth={1.5} strokeDasharray="3 2" />
              ) : (
                <rect x={x} y={headBase - 11.5} width={HEAD.box} height={HEAD.box} fill={inks.bar} />
              )}
              {paintAccountLine(l.text, { ctx, x: x + HEAD.box + HEAD.boxGap, baseline: headBase, size: HEAD.size, fill: accountText(inks.muted, ground, HEAD.size) })}
            </g>
          )
        })}
        {now.data.map((p, i) => {
          const q = goal.data[i]!
          const cx = PLOT.x + groupW * (i + 0.5)
          const ax = cx - PLOT.gap / 2 - PLOT.bar
          const tx = cx + PLOT.gap / 2
          const ah = p.y * scale
          const th = q.y * scale
          const step = q.y - p.y
          const aBase = PLOT.bottom - ah - PLOT.between - 3
          const tBase = PLOT.bottom - th - PLOT.between - 3
          return (
            <g key={i} data-account-pair={String(p.x)}>
              <rect x={ax} y={PLOT.bottom - ah} width={PLOT.bar} height={ah} fill={inks.bar} />
              {paintAccountFigure({ ctx, value: formatFigure(p.y, { decimals: decimals(p.y) }), x: ax + PLOT.bar / 2, anchor: "middle", baseline: aBase, spec: { size: PLOT.value, unit: PLOT.value, gap: 0 }, fill: accountText(inks.ink, ground, PLOT.value) })}
              <rect data-account-target="" x={tx + 0.75} y={PLOT.bottom - th + 0.75} width={PLOT.bar - 1.5} height={th - 1.5} fill={inks.tint} stroke={accountMark(inks.lead, ground)} strokeWidth={1.5} strokeDasharray="5 3" />
              {paintAccountFigure({ ctx, value: formatFigure(q.y, { decimals: decimals(q.y) }), x: tx + PLOT.bar / 2, anchor: "middle", baseline: tBase, spec: { size: PLOT.value, unit: PLOT.value, gap: 0 }, fill: accountText(inks.ink, ground, PLOT.value) })}
              {step !== 0 && figureValueWidth(formatFigure(step, { signed: true, decimals: decimals(step) }), PLOT.step, ctx) <= PLOT.bar + PLOT.gap ? paintAccountFigure({ ctx, value: formatFigure(step, { signed: true, decimals: decimals(step) }), x: tx + PLOT.bar / 2, anchor: "middle", baseline: tBase - PLOT.value - 3, spec: { size: PLOT.step, unit: PLOT.step, gap: 0, weight: 700 }, fill: accountText(inks.deep, ground, PLOT.step) }) : null}
              {paintAccountLine(String(p.x), { ctx, x: cx, anchor: "middle", baseline: accountBaseline(NAMES.top, NAMES.lineHeight, NAMES.size), size: NAMES.size, fill: accountText(inks.ink, ground, NAMES.size) })}
            </g>
          )
        })}
        <rect x={PLOT.x} y={PLOT.bottom} width={PLOT.w} height={PLOT.axis} fill={inks.ink} />
      </g>
      <g {...blockTag(ctx, kpis)} data-account-side="">
        {paintAccountRule(SIDE.x, SIDE.x + SIDE.w, SIDE.top + dy + SIDE.rule / 2, inks.ink, SIDE.rule)}
        {cells.map((c, i) => {
          const top = sy
          const h = rowH(c)
          sy += h
          const figTop = top + SIDE.pad
          const labelTop = figTop + c.spec.size + SIDE.between
          return (
            <g key={i} data-account-cell={c.label} data-lit={c.lit ? "" : undefined}>
              {paintAccountFigure({ ctx, value: c.figure.value, unit: c.figure.unit, x: SIDE.x, baseline: figureBaseline(figTop, c.spec.size, c.spec.size), spec: c.spec, fill: accountText(c.lit ? inks.lead : inks.ink, ground, c.spec.unit) })}
              {paintAccountLine(c.label, { ctx, x: SIDE.x, baseline: accountBaseline(labelTop, SIDE.labelH, SIDE.label), size: SIDE.label, fill: accountText(inks.ink, ground, SIDE.label) })}
              {c.note ? paintAccountLine(c.note, { ctx, x: SIDE.x, baseline: accountBaseline(labelTop + SIDE.labelH + SIDE.between, SIDE.noteH, SIDE.note), size: SIDE.note, fill: accountText(inks.muted, ground, SIDE.note) }) : null}
              {paintAccountRule(SIDE.x, SIDE.x + SIDE.w, top + h - 0.5, inks.line, 1)}
            </g>
          )
        })}
      </g>
      {credit}
    </g>
  )
}
