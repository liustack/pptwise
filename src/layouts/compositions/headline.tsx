import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import { zeroAxis } from "./chronicle"
import { insertGaps, buildChartModel } from "../../components/chart-model"
import { cutRule, inkBox } from "./manuscript"
import {
  FigCaption,
  commentOf,
  decimalsIn,
  figureWidth,
  fitFigCaption,
  fitPeriodical,
  fixedValue,
  paintFigure,
  paintPeriodical,
  paintPeriodicalLine,
  periodicalBaseline,
  periodicalInks,
  periodicalMark,
  periodicalText,
  periodicalWidth,
  placeClaim,
  withUnitText,
} from "./periodical"

type Kpis = Extract<Component, { type: "kpi_cards" }>
type Chart = Extract<Component, { type: "chart" }>

/*
 * headline: one figure set huge beside the small trend it ends, journal's
 * 2026-10 board (p06). The claim over the page; under it at the left the
 * figure at 200px in the heading serif in the accent, its unit after it a
 * third its size, then its label and the line that puts it in context. At
 * the right a small line chart of one to three series on a zero-based axis
 * of a few hairlines (each cut clear of the words it would touch), the
 * series the page leads with in the accent and the
 * others in the linen grey, each named with its last value after its end and
 * its first value over its start, a gap the author kept left open with its
 * label at the foot, every category under the axis; under it the figure's
 * number and title and the editor's comment.
 *
 * Takes, in the periodical setting: a `kpi_cards` of one (no symbol, tag,
 * source or direction), a titled `line` chart of one to three series over
 * four to fifteen categories at zero or above, gaps allowed, then
 * optionally a `callout` with words alone (the comment).
 *
 * Declines: a figure past its column, a label or note past one line, a chart
 * with markers, bands, a tag, notes or axis titles, a category wider than
 * the room between two points, and a caption or end label past its room.
 *
 * Reads: the periodical inks (`./periodical.tsx`), the number the face hands
 * down (`ctx.exhibitLabels`).
 */

const FIGURE = { top: 126, h: 230, size: 200, unit: 72, tracking: -6, w: 600 } as const
const LABEL = { x: 6, top: 360, size: 18, h: 26, w: 560 } as const
const NOTE = { x: 6, top: 390, size: 13, h: 22 } as const
const PLOT = { left: 676, right: 1126, top: 150, bottom: 400 } as const
const TICK = { size: 11, gap: 8, dy: 4, below: 18 } as const
const LINE = { stroke: 2.4, dot: 3 } as const
const ENDS = { size: 12, first: { dx: -4, dy: -8 }, last: { dx: 6, dy: 4 } } as const
const GAP = { size: 10, lift: 6 } as const
const CAPTION = { top: 436, w: 476 } as const

export const headlineComposition: Composition = ({ components, ctx, rect, setting, claim }) => {
  if (setting !== "periodical") return null
  const [kpis, chart, callout, ...rest] = components
  if (kpis?.type !== "kpi_cards" || chart?.type !== "chart" || rest.length > 0) return null
  const comment = callout ? commentOf(callout) : null
  if (callout && !comment) return null
  const k = kpis as Kpis
  const c = chart as Chart
  const item = k.items[0]
  if (k.items.length !== 1 || !item || item.icon || item.tag || item.source || item.delta || item.tone) return null
  if (c.chart_type !== "line" || !c.title?.trim() || c.markers || c.bands || c.tag || c.axes?.x_title || c.axes?.y_title) return null
  if (c.series.length < 1 || c.series.length > 3 || c.series.some((s) => s.tone || s.data.some((d) => d.note || d.y < 0))) return null
  const { model, gapAt } = insertGaps(buildChartModel(c.series), c.gaps)
  const n = model.categories.length
  if (n < 4 || n > 15) return null
  const label = ctx.exhibitLabels?.get(c)
  if (!label) return null
  const spec = { size: FIGURE.size, unit: FIGURE.unit, unitStyle: "attached" as const }
  if (figureWidth(item.value, item.unit, spec, ctx) > FIGURE.w) return null
  const itemLabel = fitPeriodical(item.label, { width: LABEL.w, size: LABEL.size, lineHeight: LABEL.h, maxLines: 1, serif: true }, ctx)
  const itemNote = item.note?.trim() ? fitPeriodical(item.note, { width: LABEL.w, size: NOTE.size, lineHeight: NOTE.h, maxLines: 1 }, ctx) : undefined
  if (!itemLabel || itemNote === null) return null
  const caption = fitFigCaption(label, c.title, comment, CAPTION.w, ctx)
  if (!caption || rect.h < CAPTION.top + caption.h) return null
  const values = c.series.flatMap((s) => s.data.map((d) => d.y))
  const axis = zeroAxis(Math.max(...values), 2)
  if (!axis) return null
  const unit = c.axes?.y_unit
  const decimals = decimalsIn(values)
  const inks = periodicalInks(ctx)
  const ground = inks.ground
  const leadIndex = c.series.findIndex((s) => s.emphasis)
  // The series' names stand after their ends inside the type area: the plot gives up width for them.
  const endW = Math.max(...c.series.map((s) => periodicalWidth(`${s.name.trim()} ${fixedValue(s.data[s.data.length - 1]!.y, decimals)}`, ENDS.size, ctx, { bold: true })))
  const X0 = rect.x + PLOT.left
  const X1 = Math.min(rect.x + PLOT.right, rect.x + rect.w - ENDS.last.dx - endW)
  const Y0 = rect.y + PLOT.top
  const Y1 = rect.y + PLOT.bottom
  const cx = (i: number) => X0 + (i / (n - 1)) * (X1 - X0)
  const cy = (v: number) => Y1 - (v / axis.top) * (Y1 - Y0)
  const ticks: number[] = []
  for (let v = 0; v <= axis.top + 1e-9; v += axis.step) ticks.push(Number(v.toFixed(6)))
  const tickDecimals = decimalsIn([axis.step])
  const series = model.series.map((s) => {
    const source = c.series[s.seriesIndex]!
    const color = s.seriesIndex === leadIndex ? inks.brick : inks.taupe
    const at = s.values.flatMap((v, i) => (v === null ? [] : [i]))
    const first = at[0]!
    const last = at[at.length - 1]!
    const runs: number[][] = []
    for (const i of at) {
      const run = runs[runs.length - 1]
      if (run && run[run.length - 1] === i - 1) run.push(i)
      else runs.push([i])
    }
    return { s, source, color, first, last, runs, lastText: `${source.name.trim()} ${fixedValue(s.values[last]!, decimals)}`, firstText: fixedValue(s.values[first]!, decimals) }
  })
  // Every category is named under the axis, so each needs the room between two points.
  if (model.categories.some((cat) => periodicalWidth(String(cat.x), TICK.size, ctx) > (X1 - X0) / (n - 1) - 4)) return null
  if (X1 - X0 < (PLOT.right - PLOT.left) / 2 || series.some((s) => cx(s.last) + ENDS.last.dx + periodicalWidth(s.lastText, ENDS.size, ctx, { bold: true }) > rect.x + rect.w + 0.5)) return null
  const head = placeClaim(claim, { x: rect.x, w: rect.w })
  if (head === false) return null
  const muted = periodicalText(inks.muted, ground, TICK.size)
  // The gridlines stop short of the words that sit on them, as the zero line does on the effects page.
  const words = [
    ...series.flatMap(({ s, first, last, firstText, lastText }) => [
      inkBox(firstText, cx(first) + ENDS.first.dx, cy(s.values[first]!) + ENDS.first.dy, ENDS.size, ctx, { bold: true }),
      inkBox(lastText, cx(last) + ENDS.last.dx, cy(s.values[last]!) + ENDS.last.dy, ENDS.size, ctx, { bold: true }),
    ]),
    ...[...gapAt].map(([i, text]) => inkBox(text, cx(i), Y1 - GAP.lift, GAP.size, ctx, { anchor: "middle" })),
  ]
  return (
    <g {...compositionTag("headline")}>
      {head}
      <g {...blockTag(ctx, k)} data-periodical-lead="figure">
        {paintFigure({ ctx, value: item.value, unit: item.unit, x: rect.x, baseline: periodicalBaseline(rect.y + FIGURE.top, FIGURE.h, FIGURE.size, true), spec, fill: periodicalText(inks.brick, ground, FIGURE.size), ground, tracking: FIGURE.tracking })}
        {paintPeriodical(itemLabel, { ctx, x: rect.x + LABEL.x, top: rect.y + LABEL.top, serif: true, fill: periodicalText(inks.ink, ground, LABEL.size) })}
        {itemNote ? paintPeriodical(itemNote, { ctx, x: rect.x + NOTE.x, top: rect.y + NOTE.top, fill: periodicalText(inks.muted, ground, NOTE.size) }) : null}
      </g>
      <g {...blockTag(ctx, c)}>
        {ticks.map((v) => (
          <g key={`t-${v}`}>
            {cutRule("horizontal", cy(v), X0, X1, words).map(([a, b], i) => (
              <rect key={i} x={a} y={cy(v) - 0.5} width={b - a} height={1} fill={inks.line} />
            ))}
            {paintPeriodicalLine(withUnitText(fixedValue(v, tickDecimals), unit), { ctx, x: X0 - TICK.gap, baseline: cy(v) + TICK.dy, size: TICK.size, anchor: "end", fill: muted })}
          </g>
        ))}
        {model.categories.map((cat, i) => paintPeriodicalLine(String(cat.x), { ctx, key: `x-${i}`, x: cx(i), baseline: Y1 + TICK.below, size: TICK.size, anchor: "middle", fill: muted }))}
        {[...gapAt].map(([i, words]) => (
          <g key={`g-${i}`} data-periodical-gap={String(model.categories[i]!.x)}>
            {paintPeriodicalLine(words, { ctx, x: cx(i), baseline: Y1 - GAP.lift, size: GAP.size, anchor: "middle", fill: periodicalText(inks.muted, ground, GAP.size) })}
          </g>
        ))}
        {series.map(({ s, color, runs }) => (
          <g key={`s-${s.seriesIndex}`} data-periodical-series={s.name}>
            {runs.map((run, r) =>
              run.length === 1 ? (
                <circle key={r} cx={cx(run[0]!)} cy={cy(s.values[run[0]!]!)} r={LINE.dot} fill={periodicalMark(color, ground)} />
              ) : (
                <polyline key={r} points={run.map((i) => `${cx(i)},${cy(s.values[i]!)}`).join(" ")} fill="none" stroke={periodicalMark(color, ground)} strokeWidth={LINE.stroke} />
              ),
            )}
          </g>
        ))}
        {series.map(({ s, color, first, last, firstText, lastText }) => (
          <g key={`l-${s.seriesIndex}`}>
            {paintPeriodicalLine(firstText, { ctx, x: cx(first) + ENDS.first.dx, baseline: cy(s.values[first]!) + ENDS.first.dy, size: ENDS.size, bold: true, fill: periodicalText(color, ground, ENDS.size) })}
            {paintPeriodicalLine(lastText, { ctx, x: cx(last) + ENDS.last.dx, baseline: cy(s.values[last]!) + ENDS.last.dy, size: ENDS.size, bold: true, fill: periodicalText(color, ground, ENDS.size) })}
          </g>
        ))}
        <FigCaption caption={caption} x={rect.x + PLOT.left} top={rect.y + CAPTION.top} ctx={ctx} />
      </g>
    </g>
  )
}
