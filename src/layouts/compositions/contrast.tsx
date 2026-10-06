import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import { buildChartModel, gapHeight, insertGaps } from "../../components/chart-model"
import { wholeMark } from "./manuscript"
import {
  FigCaption,
  commentOf,
  decimalsIn,
  figureWidth,
  fitFigCaption,
  fitPeriodical,
  fixedValue,
  niceTop,
  paintFigure,
  paintPeriodical,
  paintPeriodicalIcon,
  paintPeriodicalLine,
  periodicalBaseline,
  periodicalInks,
  periodicalMark,
  periodicalText,
  periodicalWidth,
  placeClaim,
} from "./periodical"

type Chart = Extract<Component, { type: "chart" }>
type Kpis = Extract<Component, { type: "kpi_cards" }>

/*
 * contrast: two groups year by year as pairs of bars, beside a card about a
 * third, journal's 2026-10 board (p10). The claim over the page; under it a
 * key of the two groups, a pair of bars a year on a baseline of the type's
 * ink, the first group in the type's ink and the second in the linen grey,
 * every value over its bar, and where the author kept a gap a dashed outline
 * as wide as a pair with its name and label inside it; the figure's number
 * and title and the editor's comment under the bars. At the right a card on
 * the inner page's white: the first figure's tag as its title beside its
 * symbol, the first figure huge (in the accent when marked) with its label,
 * the second figure with its unit and label, and the second figure's note
 * in an italic line at the foot.
 *
 * Takes, in the periodical setting: a titled upright bar chart of two series
 * at zero or above, at most seven categories with its gaps, then optionally
 * a `callout` with words alone (the comment), then a `kpi_cards` of two, the
 * first with a symbol and a tag and no note, the second with a note.
 *
 * Declines: a chart with a tag, ranges, changes, a reference, statuses or a
 * marked series, a value too wide for its bar, a figure, label, note,
 * caption or comment past its room.
 *
 * Reads: the periodical inks (`./periodical.tsx`), the number the face hands
 * down (`ctx.exhibitLabels`).
 */

const PLOT = { left: 26, pitch: 112, bar: 40, inner: 44, base: 410, h: 270, rule: { from: 6, to: 696 }, max: 6 } as const
const VALUE = { size: 12, gap: 7 } as const
const YEAR = { size: 12, baseline: 430 } as const
const KEY = { top: 132, square: 12, size: 12, gap: 6, pitch: 70 } as const
const GAP = { size: 11, first: 40, second: 56, dash: "4 3" } as const
const CAPTION = { left: 6, top: 450, w: 690 } as const
const CARD = { x: 756, top: 126, w: 396, h: 330, pad: 26, icon: { dy: 24, size: 22 }, title: { dx: 34, dy: 20, size: 15, h: 28 }, first: { dy: 64, h: 70, size: 60 }, firstLabel: { dy: 138, size: 13, h: 22 }, second: { dy: 184, h: 44, size: 34, unit: 14 }, secondLabel: { dy: 232, size: 13, h: 22 }, note: { dy: 270, size: 12, h: 20, maxLines: 2 } } as const

export const contrastComposition: Composition = ({ components, ctx, rect, setting, claim }) => {
  if (setting !== "periodical") return null
  const [chart, ...more] = components
  if (chart?.type !== "chart") return null
  let rest = more
  const comment = rest[0]?.type === "callout" ? commentOf(rest[0]) : null
  if (rest[0]?.type === "callout" && !comment) return null
  const callout = comment ? rest[0] : undefined
  if (comment) rest = rest.slice(1)
  const [kpis, ...extra] = rest
  if (kpis?.type !== "kpi_cards" || extra.length > 0) return null
  const c = chart as Chart
  const k = kpis as Kpis
  if (c.chart_type !== "bar" || c.direction === "horizontal" || !c.title?.trim() || c.series.length !== 2) return null
  if (c.tag || c.bands || c.changes || c.reference || c.axes?.x_title || c.axes?.y_title || c.series.some((s) => s.tone || s.emphasis || s.data.some((d) => d.y < 0 || d.status || d.emphasis || d.note || d.icon))) return null
  const [first, second] = k.items
  if (k.items.length !== 2 || !first || !second || !first.icon || !first.tag?.text.trim() || first.note || first.source || first.delta || first.tone) return null
  if (!second.note?.trim() || second.icon || second.tag || second.source || second.delta || second.tone) return null
  const { model, gapAt } = insertGaps(buildChartModel(c.series), c.gaps)
  const n = model.categories.length
  if (n < 2 || n > PLOT.max) return null
  const label = ctx.exhibitLabels?.get(c)
  if (!label) return null
  const caption = fitFigCaption(label, c.title, comment, CAPTION.w, ctx)
  if (!caption || rect.h < CAPTION.top + caption.h || rect.w < CARD.x + CARD.w) return null
  const values = c.series.flatMap((s) => s.data.map((d) => d.y))
  const decimals = decimalsIn(values)
  if (values.some((v) => periodicalWidth(fixedValue(v, decimals), VALUE.size, ctx, { bold: true }) > PLOT.inner)) return null
  const cardW = CARD.w - CARD.pad * 2
  const title = fitPeriodical(first.tag.text, { width: cardW - CARD.title.dx, size: CARD.title.size, lineHeight: CARD.title.h, maxLines: 1, bold: true }, ctx)
  const firstLabel = fitPeriodical(first.label, { width: cardW, size: CARD.firstLabel.size, lineHeight: CARD.firstLabel.h, maxLines: 1 }, ctx)
  const secondLabel = fitPeriodical(second.label, { width: cardW, size: CARD.secondLabel.size, lineHeight: CARD.secondLabel.h, maxLines: 1 }, ctx)
  const note = fitPeriodical(second.note, { width: cardW, size: CARD.note.size, lineHeight: CARD.note.h, maxLines: CARD.note.maxLines }, ctx)
  if (!title || !firstLabel || !secondLabel || !note) return null
  if (figureWidth(first.value, first.unit, { size: CARD.first.size, unit: CARD.first.size * 0.4 }, ctx) > cardW || figureWidth(second.value, second.unit, { size: CARD.second.size, unit: CARD.second.unit }, ctx) > cardW) return null
  const head = placeClaim(claim, { x: rect.x, w: rect.w })
  if (head === false) return null
  const inks = periodicalInks(ctx)
  const ground = inks.ground
  const top = niceTop(Math.max(...values))
  const base = rect.y + PLOT.base
  const uy = (v: number) => base - (v / top) * PLOT.h
  const gx = (i: number) => rect.x + PLOT.left + i * PLOT.pitch
  const gapTop = uy(gapHeight(model))
  const colors = [inks.lead, inks.taupe]
  const lit = wholeMark(first.value)
  const cx = rect.x + CARD.x + CARD.pad
  const cy = rect.y + CARD.top
  return (
    <g {...compositionTag("contrast")}>
      {head}
      <g {...blockTag(ctx, c)}>
        {c.series.map((s, si) => {
          const x = rect.x + PLOT.left + si * KEY.pitch
          return (
            <g key={`k-${si}`} data-periodical-key={s.name}>
              <rect x={x} y={rect.y + KEY.top} width={KEY.square} height={KEY.square} fill={periodicalMark(colors[si]!, ground)} />
              {paintPeriodicalLine(s.name, { ctx, x: x + KEY.square + KEY.gap, top: rect.y + KEY.top - 2, lineHeight: KEY.square + 4, size: KEY.size, fill: periodicalText(inks.ink, ground, KEY.size) })}
            </g>
          )
        })}
        <rect x={rect.x + PLOT.rule.from} y={base - 0.5} width={PLOT.rule.to - PLOT.rule.from} height={1} fill={inks.lead} />
        {model.categories.map((cat, i) => {
          const x = gx(i)
          const gap = gapAt.get(i)
          if (gap !== undefined) {
            return (
              <g key={cat.key} data-periodical-gap={String(cat.x)}>
                <rect x={x + 0.5} y={gapTop + 0.5} width={PLOT.inner + PLOT.bar - 1} height={base - gapTop - 1} fill="none" stroke={inks.ghost} strokeWidth={1} strokeDasharray={GAP.dash} />
                {paintPeriodicalLine(String(cat.x), { ctx, x: x + (PLOT.inner + PLOT.bar) / 2, baseline: gapTop + GAP.first, size: GAP.size, anchor: "middle", fill: periodicalText(inks.muted, ground, GAP.size) })}
                {paintPeriodicalLine(gap, { ctx, x: x + (PLOT.inner + PLOT.bar) / 2, baseline: gapTop + GAP.second, size: GAP.size, anchor: "middle", fill: periodicalText(inks.muted, ground, GAP.size) })}
              </g>
            )
          }
          return (
            <g key={cat.key} data-periodical-pair={String(cat.x)}>
              {model.series.map((s, si) => {
                const v = s.values[i]
                if (v === null) return null
                const bx = x + si * PLOT.inner
                return (
                  <g key={si}>
                    <rect x={bx} y={uy(v)} width={PLOT.bar} height={base - uy(v)} fill={periodicalMark(colors[si]!, ground)} />
                    {paintPeriodicalLine(fixedValue(v, decimals), { ctx, x: bx + PLOT.bar / 2, baseline: uy(v) - VALUE.gap, size: VALUE.size, anchor: "middle", bold: true, fill: periodicalText(colors[si]!, ground, VALUE.size) })}
                  </g>
                )
              })}
              {paintPeriodicalLine(String(cat.x), { ctx, x: x + (PLOT.inner + PLOT.bar) / 2, baseline: rect.y + YEAR.baseline, size: YEAR.size, anchor: "middle", fill: periodicalText(inks.muted, ground, YEAR.size) })}
            </g>
          )
        })}
      </g>
      <g {...(callout ? blockTag(ctx, callout) : {})}>
        <FigCaption caption={caption} x={rect.x + CAPTION.left} top={rect.y + CAPTION.top} ctx={ctx} />
      </g>
      <g {...blockTag(ctx, k)} data-periodical-card="">
        <rect x={rect.x + CARD.x} y={cy} width={CARD.w} height={CARD.h} fill={inks.card} />
        {paintPeriodicalIcon(first.icon, cx, cy + CARD.icon.dy, CARD.icon.size, lit ? inks.brick : inks.lead, inks.card)}
        {paintPeriodical(title, { ctx, x: cx + CARD.title.dx, top: cy + CARD.title.dy, bold: true, ground: inks.card, fill: periodicalText(inks.ink, inks.card, CARD.title.size) })}
        <g {...(lit ? { "data-periodical-lead": "figure" } : {})}>
          {paintFigure({ ctx, value: first.value, unit: first.unit, x: cx, baseline: periodicalBaseline(cy + CARD.first.dy, CARD.first.h, CARD.first.size, true), spec: { size: CARD.first.size, unit: CARD.first.size * 0.4 }, fill: periodicalText(lit ? inks.brick : inks.ink, inks.card, CARD.first.size), ground: inks.card })}
        </g>
        {paintPeriodical(firstLabel, { ctx, x: cx, top: cy + CARD.firstLabel.dy, ground: inks.card, fill: periodicalText(inks.muted, inks.card, CARD.firstLabel.size) })}
        {paintFigure({ ctx, value: second.value, unit: second.unit, x: cx, baseline: periodicalBaseline(cy + CARD.second.dy, CARD.second.h, CARD.second.size, true), spec: { size: CARD.second.size, unit: CARD.second.unit }, fill: periodicalText(wholeMark(second.value) ? inks.brick : inks.ink, inks.card, CARD.second.size), ground: inks.card })}
        {paintPeriodical(secondLabel, { ctx, x: cx, top: cy + CARD.secondLabel.dy, ground: inks.card, fill: periodicalText(inks.muted, inks.card, CARD.secondLabel.size) })}
        {paintPeriodical(note, { ctx, x: cx, top: cy + CARD.note.dy, italic: true, ground: inks.card, fill: periodicalText(inks.muted, inks.card, CARD.note.size) })}
      </g>
    </g>
  )
}
