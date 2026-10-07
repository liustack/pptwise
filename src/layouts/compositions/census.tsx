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
 * census: a run of years as bars with the years nobody published, beside
 * two cards, journal's 2026-10 board (p09). The claim over the page; under
 * it a bar a year on a baseline of the type's ink, every value over its bar,
 * the marked year in the accent and the rest in the type's ink, and where
 * the author kept a gap (`gaps`) a dashed outline as tall as the bars run on
 * average with its label over it; the figure's number and title and the
 * editor's comment under the bars. At the right two cards on the inner
 * page's white, each with a rule along its top (the type's ink, then the
 * linen grey), its figure large in the heading serif, its label and its
 * note.
 *
 * Takes, in the periodical setting: a titled upright bar chart of one series
 * at zero or above, at most nine categories with its gaps, then optionally a
 * `callout` with words alone (the comment), then a `kpi_cards` of one or two
 * with notes and no symbol, tag, source or direction.
 *
 * Declines: a chart with a tag, ranges, changes, a reference or statuses, a
 * value too wide for its bar, a figure, label, note, caption or comment past
 * its room.
 *
 * Reads: the periodical inks (`./periodical.tsx`), the number the face hands
 * down (`ctx.exhibitLabels`).
 */

const PLOT = { left: 36, pitch: 80, bar: 60, base: 400, h: 250, rule: { from: 16, to: 756 }, max: 9 } as const
const VALUE = { size: 14, gap: 8 } as const
const YEAR = { size: 12, baseline: 420 } as const
const GAP = { size: 11, gap: 8, dash: "4 3" } as const
const CAPTION = { left: 16, top: 444, w: 740 } as const
const CARDS = { x: 816, top: 126, pitch: 180, w: 336, h: 160, rule: 3, pad: 22, value: { dy: 16, h: 56, size: 46 }, label: { dy: 80, size: 15, h: 24 }, note: { dy: 108, size: 12, h: 20 }, max: 2 } as const

export const censusComposition: Composition = ({ components, ctx, rect, setting, claim }) => {
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
  if (c.chart_type !== "bar" || c.direction === "horizontal" || !c.title?.trim() || c.series.length !== 1) return null
  if (c.tag || c.bands || c.changes || c.reference || c.axes?.x_title || c.axes?.y_title || c.series[0]!.tone || c.series[0]!.emphasis) return null
  if (c.series[0]!.data.some((d) => d.y < 0 || d.status || d.note || d.icon)) return null
  if (k.items.length < 1 || k.items.length > CARDS.max || k.items.some((it) => !it.note?.trim() || it.icon || it.tag || it.source || it.delta || it.tone)) return null
  const { model, gapAt } = insertGaps(buildChartModel(c.series), c.gaps)
  const n = model.categories.length
  if (n < 2 || n > PLOT.max) return null
  const label = ctx.exhibitLabels?.get(c)
  if (!label) return null
  const caption = fitFigCaption(label, c.title, comment, CAPTION.w, ctx)
  if (!caption) return null
  const values = c.series[0]!.data.map((d) => d.y)
  const decimals = decimalsIn(values)
  const texts = model.series[0]!.values.map((v) => (v === null ? null : fixedValue(v, decimals)))
  if (texts.some((t) => t !== null && periodicalWidth(t, VALUE.size, ctx, { bold: true }) > PLOT.pitch - 4)) return null
  if (model.categories.some((cat) => periodicalWidth(String(cat.x), YEAR.size, ctx) > PLOT.pitch - 4)) return null
  const spec = { size: CARDS.value.size, unit: CARDS.value.size * 0.4 }
  const cards = k.items.map((it) => ({
    it,
    label: fitPeriodical(it.label, { width: CARDS.w - CARDS.pad * 2, size: CARDS.label.size, lineHeight: CARDS.label.h, maxLines: 1, bold: true }, ctx),
    note: fitPeriodical(it.note!, { width: CARDS.w - CARDS.pad * 2, size: CARDS.note.size, lineHeight: CARDS.note.h, maxLines: 1 }, ctx),
  }))
  if (cards.some((card) => !card.label || !card.note || figureWidth(card.it.value, card.it.unit, spec, ctx) > CARDS.w - CARDS.pad * 2)) return null
  if (rect.w < CARDS.x + CARDS.w || rect.h < CAPTION.top + caption.h) return null
  const head = placeClaim(claim, { x: rect.x, w: rect.w })
  if (head === false) return null
  const inks = periodicalInks(ctx)
  const ground = inks.ground
  const top = niceTop(Math.max(...values))
  const base = rect.y + PLOT.base
  const by = (v: number) => base - (v / top) * PLOT.h
  const bx = (i: number) => rect.x + PLOT.left + i * PLOT.pitch
  const gapTop = by(gapHeight(model))
  const marked = c.series[0]!.data.find((d) => d.emphasis)
  return (
    <g {...compositionTag("census")}>
      {head}
      <g {...blockTag(ctx, c)}>
        <rect x={rect.x + PLOT.rule.from} y={base - 0.5} width={PLOT.rule.to - PLOT.rule.from} height={1} fill={inks.lead} />
        {model.categories.map((cat, i) => {
          const x = bx(i)
          const gap = gapAt.get(i)
          const v = model.series[0]!.values[i]
          const lit = v !== null && marked !== undefined && String(marked.x) === String(cat.x)
          const ink = lit ? inks.brick : inks.lead
          return (
            <g key={cat.key} {...(gap !== undefined ? { "data-periodical-gap": String(cat.x) } : { "data-periodical-bar": String(cat.x) })} {...(lit ? { "data-periodical-lead": "bar" } : {})}>
              {gap !== undefined ? (
                <>
                  <rect x={x + 0.5} y={gapTop + 0.5} width={PLOT.bar - 1} height={base - gapTop - 1} fill="none" stroke={inks.ghost} strokeWidth={1} strokeDasharray={GAP.dash} />
                  {paintPeriodicalLine(gap, { ctx, x: x + PLOT.bar / 2, baseline: gapTop - GAP.gap, size: GAP.size, anchor: "middle", fill: periodicalText(inks.muted, ground, GAP.size) })}
                </>
              ) : v !== null ? (
                <>
                  <rect x={x} y={by(v)} width={PLOT.bar} height={base - by(v)} fill={periodicalMark(ink, ground)} />
                  {paintPeriodicalLine(texts[i]!, { ctx, x: x + PLOT.bar / 2, baseline: by(v) - VALUE.gap, size: VALUE.size, anchor: "middle", bold: true, fill: periodicalText(ink, ground, VALUE.size) })}
                </>
              ) : null}
              {paintPeriodicalLine(String(cat.x), { ctx, x: x + PLOT.bar / 2, baseline: rect.y + YEAR.baseline, size: YEAR.size, anchor: "middle", fill: periodicalText(inks.muted, ground, YEAR.size) })}
            </g>
          )
        })}
      </g>
      <g {...(callout ? blockTag(ctx, callout) : {})}>
        <FigCaption caption={caption} x={rect.x + CAPTION.left} top={rect.y + CAPTION.top} ctx={ctx} />
      </g>
      <g {...blockTag(ctx, k)}>
        {cards.map((card, i) => {
          const x = rect.x + CARDS.x
          const y = rect.y + CARDS.top + i * CARDS.pitch
          const lit = wholeMark(card.it.value)
          return (
            <g key={i} data-periodical-card={card.it.value.replace(/\*/g, "")}>
              <rect x={x} y={y} width={CARDS.w} height={CARDS.h} fill={inks.card} />
              <rect x={x} y={y} width={CARDS.w} height={CARDS.rule} fill={periodicalMark(i === 0 ? inks.lead : inks.taupe, inks.card)} />
              {paintFigure({ ctx, value: card.it.value, unit: card.it.unit, x: x + CARDS.pad, baseline: periodicalBaseline(y + CARDS.value.dy, CARDS.value.h, CARDS.value.size, true), spec, fill: periodicalText(lit ? inks.brick : inks.ink, inks.card, CARDS.value.size), ground: inks.card })}
              {paintPeriodical(card.label!, { ctx, x: x + CARDS.pad, top: y + CARDS.label.dy, bold: true, ground: inks.card, fill: periodicalText(inks.ink, inks.card, CARDS.label.size) })}
              {paintPeriodical(card.note!, { ctx, x: x + CARDS.pad, top: y + CARDS.note.dy, ground: inks.card, fill: periodicalText(inks.muted, inks.card, CARDS.note.size) })}
            </g>
          )
        })}
      </g>
    </g>
  )
}
