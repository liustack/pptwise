import type { Component } from "@/ir"
import { isShareBar } from "@/ir/components/chart"
import { joinUnit } from "../../lib/quantity-format"
import { mostlyChinese } from "../../lib/text-script"
import { blendOver } from "../../render/ink"
import { dossierSolid } from "./dossier"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitFigureCard,
  fitYearbook,
  paintFigureCard,
  paintYearbook,
  paintYearbookLine,
  yearbookInks,
  yearbookMeta,
  yearbookText,
  yearbookWidth,
} from "./yearbook"

type Chart = Extract<Component, { type: "chart" }>
type KpiCards = Extract<Component, { type: "kpi_cards" }>

/*
 * breakdown: one amount cut into the parts it is made of, the parts the page
 * is about bracketed together, almanac's 2026-10 board (the exposure page,
 * p07). The whole's name in bold over a bar across the band, its unit after
 * it; each part a block its share of the width, its name and its amount in
 * mono inside it: the parts the page does not mark in the quiet ink and the
 * other inks after it, the marked run in the mark stepping paler part by part.
 * Over the marked run a bracket in the accent and over the bracket the run's
 * own line (`emphasis_label`); under the bar, the largest unmarked part's
 * amount and share in the muted ink. Under the bar a row of figure cards.
 *
 * Takes, in the yearbook setting: a share bar (a `stacked` chart on its side
 * with one category) of two to six parts whose marked parts stand together,
 * with an `emphasis_label`; then a `kpi_cards` of one to four items.
 *
 * Declines: a part too narrow for its name and amount, a line wider than the
 * band, cards taller than the band.
 *
 * Reads: the yearbook inks (`./yearbook.tsx`), the body, heading and mono
 * faces, the deck's figures (`ctx.figures`).
 */

const CAPTION = { top: 4, size: 14, lineHeight: 22 } as const
const BAR = { top: 76, h: 70, gap: 3, inset: 12, name: { base: 28, size: 14 }, value: { base: 54, size: 18 } } as const
const BRACKET = { y: 60, hook: 10, stroke: 2, label: { base: 54, size: 15 } } as const
const UNDER = { base: 170, size: 13 } as const
const CARDS = { top: 214, h: 140, gap: 24 } as const
/** How far each further part of the marked run steps from the mark toward the page: the board's 1, 0.86, 0.72, 0.6. */
const RUN_STEPS = [1, 1, 0.86, 0.72, 0.6, 0.5] as const

function decimalsOf(v: number): number {
  const text = String(Number(v.toPrecision(12)))
  const dot = text.indexOf(".")
  return dot < 0 || /e/i.test(text) ? 0 : text.length - dot - 1
}

export const breakdownComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "yearbook") return null
  const [chart, kpis, ...rest] = components
  if (chart?.type !== "chart" || kpis?.type !== "kpi_cards" || rest.length > 0) return null
  const c = chart as Chart
  const k = kpis as KpiCards
  if (!isShareBar(c) || !c.emphasis_label?.trim() || c.tag) return null
  const parts = c.series.map((s) => ({ name: s.name, value: s.data[0]?.y ?? NaN, marked: s.emphasis === true, note: s.data[0]?.note }))
  if (parts.length < 2 || parts.length > 6 || parts.some((p) => !(p.value >= 0) || p.note) || c.series.some((s) => s.data.length !== 1 || s.tone)) return null
  const markedAt = parts.flatMap((p, i) => (p.marked ? [i] : []))
  if (markedAt.length === 0 || markedAt.some((i, j) => j > 0 && i !== markedAt[j - 1]! + 1)) return null
  if (k.items.length < 1 || k.items.length > 4) return null
  const inks = yearbookInks(ctx)
  const total = parts.reduce((sum, p) => sum + p.value, 0)
  if (!(total > 0)) return null
  const unit = c.axes?.y_unit?.trim() || undefined
  const category = String(c.series[0]!.data[0]!.x).trim()
  const chinese = ctx.figures?.chinese ?? mostlyChinese([category, ...parts.map((p) => p.name)])
  const caption = unit ? (chinese ? `${category}（${unit}）` : `${category} (${unit})`) : category
  const captionFit = fitYearbook(caption, { width: rect.w, size: CAPTION.size, lineHeight: CAPTION.lineHeight, maxLines: 1, bold: true }, ctx)
  if (!captionFit) return null
  const decimals = Math.min(3, Math.max(0, ...parts.map((p) => decimalsOf(p.value))))
  const amount = (v: number) => v.toFixed(decimals)
  let cursor = rect.x
  const others = [inks.quiet, inks.second, inks.ghost]
  let other = 0
  let run = 0
  const blocks = parts.map((p) => {
    const w = (p.value / total) * rect.w
    const x = cursor
    cursor += w
    const base = p.marked ? blendOver(inks.mark, inks.ground, RUN_STEPS[Math.min(run++, RUN_STEPS.length - 1)]!) : others[Math.min(other++, others.length - 1)]!
    const solid = dossierSolid(base, inks.ink, BAR.name.size)
    return { ...p, x, w, fill: solid.fill, words: solid.words }
  })
  const room = (b: (typeof blocks)[number]) => b.w - BAR.gap - BAR.inset - 6
  if (blocks.some((b) => yearbookWidth(b.name, BAR.name.size, ctx, true) > room(b) || yearbookWidth(amount(b.value), BAR.value.size, ctx, true, true) > room(b))) return null
  // The run's own line, over its bracket.
  const runX0 = blocks[markedAt[0]!]!.x
  const runX1 = blocks[markedAt[markedAt.length - 1]!]!.x + blocks[markedAt[markedAt.length - 1]!]!.w - BAR.gap
  const label = c.emphasis_label.trim()
  const labelW = yearbookWidth(label, BRACKET.label.size, ctx, true)
  if (labelW > rect.w) return null
  const labelX = Math.min(Math.max((runX0 + runX1) / 2, rect.x + labelW / 2), rect.x + rect.w - labelW / 2)
  // The largest unmarked part's amount and share under the bar.
  const rival = blocks.filter((b) => !b.marked).reduce<(typeof blocks)[number] | null>((best, b) => (best === null || b.value > best.value ? b : best), null)
  const pct = rival ? `${((rival.value / total) * 100).toFixed(1)}%` : ""
  // Computed, so a line with no room is left out.
  const computed = rival ? (chinese ? `${rival.name} ${joinUnit(amount(rival.value), unit)}，占 ${pct}` : `${rival.name} ${joinUnit(amount(rival.value), unit)}, ${pct}`) : null
  const under = computed && rival!.x + yearbookWidth(computed, UNDER.size, ctx) <= rect.x + rect.w ? computed : null
  const n = k.items.length
  const cardW = (rect.w - CARDS.gap * (n - 1)) / n
  const figures = k.items.map((item) => fitFigureCard(item, cardW, ctx))
  if (figures.some((f) => !f || f.depth > CARDS.h - 10) || CARDS.top + CARDS.h > rect.h) return null
  const barTop = rect.y + BAR.top

  return (
    <g {...compositionTag("breakdown")}>
      <g {...blockTag(ctx, c)}>
        {paintYearbook(captionFit, { ctx, x: rect.x, top: rect.y + CAPTION.top, bold: true, fill: yearbookText(inks.ink, inks.ground, CAPTION.size) })}
        {blocks.map((b, i) => (
          <g key={i} data-yearbook-part={b.marked ? "marked" : ""}>
            <rect x={b.x} y={barTop} width={Math.max(1, b.w - (i < blocks.length - 1 ? BAR.gap : 0))} height={BAR.h} fill={b.fill} />
            {paintYearbookLine(b.name, { ctx, x: b.x + BAR.inset, baseline: barTop + BAR.name.base, size: BAR.name.size, bold: true, fill: b.words })}
            {paintYearbookLine(amount(b.value), { ctx, x: b.x + BAR.inset, baseline: barTop + BAR.value.base, size: BAR.value.size, mono: true, bold: true, fill: b.words })}
          </g>
        ))}
        <g data-yearbook-bracket="">
          <line x1={runX0} y1={rect.y + BRACKET.y} x2={runX1} y2={rect.y + BRACKET.y} stroke={inks.accent} strokeWidth={BRACKET.stroke} />
          <line x1={runX0} y1={rect.y + BRACKET.y} x2={runX0} y2={rect.y + BRACKET.y + BRACKET.hook} stroke={inks.accent} strokeWidth={BRACKET.stroke} />
          <line x1={runX1} y1={rect.y + BRACKET.y} x2={runX1} y2={rect.y + BRACKET.y + BRACKET.hook} stroke={inks.accent} strokeWidth={BRACKET.stroke} />
          {paintYearbookLine(label, { ctx, x: labelX, baseline: rect.y + BRACKET.label.base, size: BRACKET.label.size, bold: true, anchor: "middle", fill: yearbookText(inks.accent, inks.ground, BRACKET.label.size) })}
        </g>
        {under ? paintYearbookLine(under, { ctx, x: rival!.x, baseline: rect.y + UNDER.base, size: UNDER.size, fill: yearbookMeta(inks.muted, inks.ground) }) : null}
      </g>
      <g {...blockTag(ctx, k)}>
        {figures.map((f, i) => paintFigureCard(f!, { x: rect.x + i * (cardW + CARDS.gap), y: rect.y + CARDS.top, w: cardW, h: CARDS.h }, ctx, inks, `k${i}`))}
      </g>
    </g>
  )
}
