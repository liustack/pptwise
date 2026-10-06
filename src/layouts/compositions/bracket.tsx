import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import { changeText } from "../../lib/change-figure"
import { manuscriptChinese, wholeMark } from "./manuscript"
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
  paintPeriodicalTracked,
  periodicalBaseline,
  periodicalInks,
  periodicalMark,
  periodicalText,
  periodicalTrackedWidth,
  periodicalWidth,
  placeClaim,
} from "./periodical"

type Chart = Extract<Component, { type: "chart" }>
type Kpis = Extract<Component, { type: "kpi_cards" }>
type Paragraph = Extract<Component, { type: "paragraph" }>

/*
 * bracket: a run of bars with its change bracketed, beside a column of
 * figures, journal's 2026-10 board (p11). The claim over the page; under it
 * the chart's tag in the accent, a bar a category on a baseline of the
 * type's ink, every value over its bar, the marked bar in the accent and the
 * rest in the type's ink, and over the run the change the author asked for
 * (`changes`) as a bracket from the first bar to the last with the change
 * computed over it; the figure's number and title and the editor's comment
 * under the bars. At the right a column: the first figure's tag as its
 * header, a ruled row a figure, its label at the left and the figure large
 * in the heading serif with its unit small, the marked one larger in the
 * accent, and a note under the column.
 *
 * Takes, in the periodical setting: a titled upright bar chart of one series
 * of three to seven values above zero with one change and optionally a tag,
 * followed optionally by a `callout` with words alone (the comment), and a
 * `kpi_cards` of two to four with a tag on the first and no symbol, note,
 * source or direction, followed optionally by a `paragraph` (the note): the
 * chart and its comment first or the column and its note first.
 *
 * Declines: a chart with ranges, gaps, a reference or statuses, a value too
 * wide for its bar, a tag, figure, label, caption, comment or note past its
 * room.
 *
 * Reads: the periodical inks (`./periodical.tsx`), the number the face hands
 * down (`ctx.exhibitLabels`).
 */

const TAG = { x: 16, top: 116, h: 22, size: 11, tracking: 1 } as const
const PLOT = { left: 36, pitch: 96, bar: 64, base: 410, h: 260, rule: { from: 16, to: 716 }, max: 7 } as const
const VALUE = { size: 13, gap: 8 } as const
const YEAR = { size: 12, baseline: 430 } as const
const BRACKET = { over: 28, tick: 6, stop: 22, size: 12, gap: 6, stroke: 0.8 } as const
const CAPTION = { left: 16, top: 446, w: 700 } as const
const COLUMN = { x: 776, w: 376, header: { top: 126, size: 13, h: 24 }, rows: { top: 166, pitch: 64, h: 44, rule: 54 }, label: { size: 13 }, value: { x: 100, size: 28, lit: 36, unit: 13 }, note: { top: 430, size: 12, h: 20, maxLines: 2 }, max: 4 } as const

/** The chart with its comment, and the column with its note, in either order the author wrote them. */
function readGroups(components: readonly Component[]): { chart: Chart; callout?: Component; comment: string | null; kpis: Kpis; paragraph?: Paragraph } | null {
  const chartAt = components.findIndex((c) => c.type === "chart")
  const kpiAt = components.findIndex((c) => c.type === "kpi_cards")
  if (chartAt < 0 || kpiAt < 0) return null
  const after = (at: number, type: Component["type"]) => (components[at + 1]?.type === type ? components[at + 1] : undefined)
  const callout = after(chartAt, "callout")
  const paragraph = after(kpiAt, "paragraph") as Paragraph | undefined
  const comment = callout ? commentOf(callout) : null
  if (callout && !comment) return null
  const used = 2 + (callout ? 1 : 0) + (paragraph ? 1 : 0)
  // The two groups stand one after the other, each whole.
  const first = Math.min(chartAt, kpiAt)
  const firstLength = first === chartAt ? 1 + (callout ? 1 : 0) : 1 + (paragraph ? 1 : 0)
  if (first !== 0 || Math.max(chartAt, kpiAt) !== firstLength || components.length !== used) return null
  return { chart: components[chartAt] as Chart, callout, comment, kpis: components[kpiAt] as Kpis, paragraph }
}

export const bracketComposition: Composition = ({ components, ctx, rect, setting, claim }) => {
  if (setting !== "periodical") return null
  const groups = readGroups(components)
  if (!groups) return null
  const { chart: c, callout, comment, kpis: k, paragraph: p } = groups
  if (c.chart_type !== "bar" || c.direction === "horizontal" || !c.title?.trim() || c.series.length !== 1 || c.changes?.length !== 1 || c.changes[0]!.at !== undefined) return null
  if (c.bands || c.gaps || c.reference || c.axes?.x_title || c.axes?.y_title || c.series[0]!.tone || (c.tag && (c.tag.evidence || c.tag.basis || c.tag.quiet))) return null
  const points = c.series[0]!.data
  if (points.length < 3 || points.length > PLOT.max || points.some((d) => d.y <= 0 || d.status || d.note || d.icon)) return null
  const head0 = k.items[0]
  if (k.items.length < 2 || k.items.length > COLUMN.max || !head0?.tag?.text.trim() || k.items.slice(1).some((it) => it.tag) || k.items.some((it) => it.icon || it.note || it.source || it.delta || it.tone)) return null
  const change = c.changes[0]!
  const fromAt = points.findIndex((d) => String(d.x) === change.from)
  const toAt = points.findIndex((d) => String(d.x) === change.to)
  if (fromAt < 0 || toAt <= fromAt) return null
  const label = ctx.exhibitLabels?.get(c)
  if (!label) return null
  const caption = fitFigCaption(label, c.title, comment, CAPTION.w, ctx)
  if (!caption || rect.h < CAPTION.top + caption.h || rect.w < COLUMN.x + COLUMN.w) return null
  const tag = c.tag?.text.trim()
  if (tag && periodicalTrackedWidth(tag, TAG.size, TAG.tracking, ctx, { bold: true }) > PLOT.rule.to - TAG.x) return null
  const decimals = decimalsIn(points.map((d) => d.y))
  const texts = points.map((d) => fixedValue(d.y, decimals))
  if (texts.some((t) => periodicalWidth(t, VALUE.size, ctx, { bold: true }) > PLOT.pitch - 4)) return null
  const header = fitPeriodical(head0.tag!.text, { width: COLUMN.w, size: COLUMN.header.size, lineHeight: COLUMN.header.h, maxLines: 1, bold: true }, ctx)
  const rows = k.items.map((it) => ({ it, lit: wholeMark(it.value), label: fitPeriodical(it.label, { width: COLUMN.value.x - 8, size: COLUMN.label.size, lineHeight: COLUMN.rows.h, maxLines: 1 }, ctx) }))
  if (!header || rows.some((r) => !r.label || figureWidth(r.it.value, r.it.unit, { size: r.lit ? COLUMN.value.lit : COLUMN.value.size, unit: COLUMN.value.unit }, ctx) > COLUMN.w - COLUMN.value.x)) return null
  const note = p ? fitPeriodical(p.text, { width: COLUMN.w, size: COLUMN.note.size, lineHeight: COLUMN.note.h, maxLines: COLUMN.note.maxLines }, ctx) : undefined
  if (note === null) return null
  const head = placeClaim(claim, { x: rect.x, w: rect.w })
  if (head === false) return null
  const inks = periodicalInks(ctx)
  const ground = inks.ground
  const top = niceTop(Math.max(...points.map((d) => d.y)))
  const base = rect.y + PLOT.base
  const my = (v: number) => base - (v / top) * PLOT.h
  const bx = (i: number) => rect.x + PLOT.left + i * PLOT.pitch
  const centre = (i: number) => bx(i) + PLOT.bar / 2
  const crossY = my(Math.max(...points.slice(fromAt, toAt + 1).map((d) => d.y))) - BRACKET.over
  const figure = changeText(points[fromAt]!.y, points[toAt]!.y, c.axes?.y_unit, manuscriptChinese(ctx, [c.title]))
  const muted = periodicalText(inks.muted, ground, BRACKET.size)
  const bracketInk = periodicalMark(inks.muted, ground)
  const cx = rect.x + COLUMN.x
  return (
    <g {...compositionTag("bracket")}>
      {head}
      <g {...blockTag(ctx, c)}>
        {tag ? <g data-periodical-chart-tag="">{paintPeriodicalTracked({ ctx, text: tag, x: rect.x + TAG.x, y: periodicalBaseline(rect.y + TAG.top, TAG.h, TAG.size), size: TAG.size, tracking: TAG.tracking, bold: true, fill: periodicalText(inks.brick, ground, TAG.size) })}</g> : null}
        <rect x={rect.x + PLOT.rule.from} y={base - 0.5} width={PLOT.rule.to - PLOT.rule.from} height={1} fill={inks.lead} />
        {points.map((d, i) => {
          const lit = d.emphasis === true
          const ink = lit ? inks.brick : inks.lead
          return (
            <g key={i} data-periodical-bar={String(d.x)} {...(lit ? { "data-periodical-lead": "bar" } : {})}>
              <rect x={bx(i)} y={my(d.y)} width={PLOT.bar} height={base - my(d.y)} fill={periodicalMark(ink, ground)} />
              {paintPeriodicalLine(texts[i]!, { ctx, x: centre(i), baseline: my(d.y) - VALUE.gap, size: VALUE.size, anchor: "middle", bold: true, fill: periodicalText(ink, ground, VALUE.size) })}
              {paintPeriodicalLine(String(d.x), { ctx, x: centre(i), baseline: rect.y + YEAR.baseline, size: YEAR.size, anchor: "middle", fill: periodicalText(inks.muted, ground, YEAR.size) })}
            </g>
          )
        })}
        <g data-periodical-bracket={figure}>
          <rect x={centre(fromAt)} y={crossY - BRACKET.stroke / 2} width={centre(toAt) - centre(fromAt)} height={BRACKET.stroke} fill={bracketInk} />
          <rect x={centre(fromAt) - BRACKET.stroke / 2} y={crossY} width={BRACKET.stroke} height={BRACKET.tick} fill={bracketInk} />
          <rect x={centre(toAt) - BRACKET.stroke / 2} y={crossY} width={BRACKET.stroke} height={Math.max(BRACKET.tick, my(points[toAt]!.y) - BRACKET.stop - crossY)} fill={bracketInk} />
          {paintPeriodicalLine(figure, { ctx, x: (centre(fromAt) + centre(toAt)) / 2, baseline: crossY - BRACKET.gap, size: BRACKET.size, anchor: "middle", bold: true, fill: muted })}
        </g>
      </g>
      <g {...(callout ? blockTag(ctx, callout) : {})}>
        <FigCaption caption={caption} x={rect.x + CAPTION.left} top={rect.y + CAPTION.top} ctx={ctx} />
      </g>
      <g {...blockTag(ctx, k)} data-periodical-column="">
        {paintPeriodical(header, { ctx, x: cx, top: rect.y + COLUMN.header.top, bold: true, fill: periodicalText(inks.ink, ground, COLUMN.header.size) })}
        {rows.map((r, i) => {
          const y = rect.y + COLUMN.rows.top + i * COLUMN.rows.pitch
          const size = r.lit ? COLUMN.value.lit : COLUMN.value.size
          return (
            <g key={i} data-periodical-row={r.it.label} {...(r.lit ? { "data-periodical-lead": "figure" } : {})}>
              {paintPeriodical(r.label!, { ctx, x: cx, top: y, fill: periodicalText(inks.muted, ground, COLUMN.label.size) })}
              {paintFigure({ ctx, value: r.it.value, unit: r.it.unit, x: cx + COLUMN.value.x, baseline: periodicalBaseline(y, COLUMN.rows.h, size, true), spec: { size, unit: COLUMN.value.unit }, fill: periodicalText(r.lit ? inks.brick : inks.ink, ground, size), ground })}
              <rect x={cx} y={y + COLUMN.rows.rule - 0.5} width={COLUMN.w} height={1} fill={inks.line} />
            </g>
          )
        })}
        {note && p ? <g {...blockTag(ctx, p)}>{paintPeriodical(note, { ctx, x: cx, top: rect.y + COLUMN.note.top, fill: periodicalText(inks.muted, ground, COLUMN.note.size) })}</g> : null}
      </g>
    </g>
  )
}
