import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import { manuscriptChinese } from "./manuscript"
import {
  FigCaption,
  commentOf,
  fitFigCaption,
  jointLabel,
  niceTop,
  paintPeriodicalLine,
  periodicalInks,
  periodicalMark,
  periodicalText,
  periodicalWidth,
  placeClaim,
  writtenValue,
} from "./periodical"

type Chart = Extract<Component, { type: "chart" }>

/*
 * twins: two small multiples of one run, each on its own axis, journal's
 * 2026-10 board (p13). The claim over the page; under it two bar charts side
 * by side, each named over its plot by its series and its unit, a bar a
 * category on a baseline of the type's ink, every value over its bar as the
 * author wrote it, the marked bar in the accent and the rest in the type's
 * ink. No axis is shared and none is drawn: each run stands on its own
 * scale, so the two are never read against each other's heights. Under them
 * one caption for both, the two figures' numbers before their shared title,
 * and the editor's comment.
 *
 * Takes, in the periodical setting: two upright bar charts of one series
 * each, three to seven values above zero, both titled with one title, then
 * optionally a `callout` with words alone (the comment).
 *
 * Declines: a chart with a tag, ranges, gaps, changes, a reference,
 * statuses or axis titles, a value too wide for its bar, a name, caption or
 * comment past its room.
 *
 * Reads: the periodical inks (`./periodical.tsx`), the numbers the face
 * hands down (`ctx.exhibitLabels`).
 */

const PANES = [{ left: 16 }, { left: 596 }] as const
const PANE = { w: 500, base: 400, h: 230, bar: 48, pitch: 70, inset: 10, max: 7 } as const
const NAME = { baseline: 130, size: 13 } as const
const VALUE = { size: 13, gap: 8 } as const
const YEAR = { size: 11, baseline: 420 } as const
const CAPTION = { left: 16, top: 440, w: 1100 } as const

/** A pane's name: its series and, in brackets, the unit it counts in. */
function paneName(chart: Chart, chinese: boolean): string {
  const name = chart.series[0]!.name.trim()
  const unit = chart.axes?.y_unit?.trim()
  if (!unit) return name
  return chinese ? `${name}（${unit}）` : `${name} (${unit})`
}

export const twinsComposition: Composition = ({ components, ctx, rect, setting, claim }) => {
  if (setting !== "periodical") return null
  const [a, b, callout, ...rest] = components
  if (a?.type !== "chart" || b?.type !== "chart" || rest.length > 0) return null
  const comment = callout ? commentOf(callout) : null
  if (callout && !comment) return null
  const charts = [a as Chart, b as Chart]
  const title = charts[0]!.title?.trim()
  if (!title || charts[1]!.title?.trim() !== title) return null
  for (const c of charts) {
    if (c.chart_type !== "bar" || c.direction === "horizontal" || c.series.length !== 1) return null
    if (c.tag || c.bands || c.gaps || c.changes || c.reference || c.axes?.x_title || c.axes?.y_title || c.series[0]!.tone) return null
    const data = c.series[0]!.data
    if (data.length < 3 || data.length > PANE.max || data.some((d) => d.y <= 0 || d.status || d.note || d.icon)) return null
  }
  const labels = charts.map((c) => ctx.exhibitLabels?.get(c))
  if (labels.some((l) => !l)) return null
  const chinese = manuscriptChinese(ctx, [title])
  const caption = fitFigCaption(jointLabel(labels as string[], chinese), title, comment, CAPTION.w, ctx)
  if (!caption || rect.h < CAPTION.top + caption.h || rect.w < PANES[1].left + PANE.w) return null
  const names = charts.map((c) => paneName(c, chinese))
  if (names.some((n) => periodicalWidth(n, NAME.size, ctx, { bold: true }) > PANE.w)) return null
  if (charts.some((c) => c.series[0]!.data.some((d) => periodicalWidth(writtenValue(d.y), VALUE.size, ctx, { bold: true }) > PANE.pitch - 4))) return null
  const head = placeClaim(claim, { x: rect.x, w: rect.w })
  if (head === false) return null
  const inks = periodicalInks(ctx)
  const ground = inks.ground
  const base = rect.y + PANE.base
  return (
    <g {...compositionTag("twins")}>
      {head}
      {charts.map((c, k) => {
        const x0 = rect.x + PANES[k]!.left
        const data = c.series[0]!.data
        const top = niceTop(Math.max(...data.map((d) => d.y)))
        return (
          <g key={k} {...blockTag(ctx, c)} data-periodical-pane={names[k]}>
            {paintPeriodicalLine(names[k]!, { ctx, x: x0, baseline: rect.y + NAME.baseline, size: NAME.size, bold: true, fill: periodicalText(inks.ink, ground, NAME.size) })}
            <rect x={x0} y={base - 0.5} width={PANE.w} height={1} fill={inks.lead} />
            {data.map((d, i) => {
              const x = x0 + PANE.inset + i * PANE.pitch
              const h = (d.y / top) * PANE.h
              const lit = d.emphasis === true
              const ink = lit ? inks.brick : inks.lead
              return (
                <g key={i} {...(lit ? { "data-periodical-lead": "bar" } : {})}>
                  <rect x={x} y={base - h} width={PANE.bar} height={h} fill={periodicalMark(ink, ground)} />
                  {paintPeriodicalLine(writtenValue(d.y), { ctx, x: x + PANE.bar / 2, baseline: base - h - VALUE.gap, size: VALUE.size, anchor: "middle", bold: true, fill: periodicalText(ink, ground, VALUE.size) })}
                  {paintPeriodicalLine(String(d.x), { ctx, x: x + PANE.bar / 2, baseline: rect.y + YEAR.baseline, size: YEAR.size, anchor: "middle", fill: periodicalText(inks.muted, ground, YEAR.size) })}
                </g>
              )
            })}
          </g>
        )
      })}
      <g {...(callout ? blockTag(ctx, callout) : {})}>
        <FigCaption caption={caption} x={rect.x + CAPTION.left} top={rect.y + CAPTION.top} ctx={ctx} />
      </g>
    </g>
  )
}
