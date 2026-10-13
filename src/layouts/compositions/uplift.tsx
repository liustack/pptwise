import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitPortrait,
  paintPortrait,
  paintPortraitFigure,
  paintPortraitLine,
  paintPortraitRule,
  placePortraitHead,
  placePortraitSource,
  portraitBaseline,
  portraitChinese,
  portraitFigureWidth,
  portraitInks,
  portraitMark,
  portraitText,
  portraitWidth,
  splitFigure,
  wholePage,
} from "./portrait"
import { wholeLit } from "./lineup"
import { keynoteDecimals, keynoteNumber } from "./keynote"
import type { Recipe } from "./recipe"

type Chart = Extract<Component, { type: "chart" }>
type Kpis = Extract<Component, { type: "kpi_cards" }>

/*
 * uplift: what a change did against a control group, as bars on their side
 * beside the result in figures, profile's 2026-10 board (p07). Under the
 * section line and the claim, from x80 to x760: the chart's title at 15px
 * and its unit at the right in the grey (「单位：%」), over a hairline of the
 * ink, and a bar a row, 28px thick in rows 58px apart, its category at 16px
 * at the left and its value in the heading serif at 20px in a column after the track. The
 * bar the page is about (the point its author marked) in the ink, the rest
 * in the palette's pale grey. The control (the chart's `reference`) a dashed
 * line of the ink down all the rows, named under them at 13px. From x840 to
 * x1200 the figures: the first under a 3px rule of the accent, set at 104px,
 * in the accent when its author marked all of it, its label at 17px and its
 * note at 14px in the grey; a second under a pale hairline at 48px.
 *
 * Takes, in the portrait setting: a horizontal `bar` chart of one series of
 * two to eight points, with or without a reference, and a `kpi_cards` of one
 * or two items.
 *
 * Declines: a category name wider than 200px, a second series, a note, a range, an estimate, a tone, an icon
 * on a point, negative values, a figure too wide for its column, rows that
 * run into the source.
 *
 * Reads: the portrait inks (`./portrait.tsx`), the heading and body faces,
 * the chart's own number format.
 */

const HEAD = { x: 80, top: 64, w: 1120 } as const
const PLOT = { x: 80, w: 680, top: 200, title: { size: 15, lineHeight: 22 }, unit: 13, pad: 10, gap: 18, label: 110, labelMax: 200, colGap: 20, track: 480, row: 58, bar: 28, value: 20, ref: { stroke: 1.5, dash: "6 4", over: 6, gap: 8, size: 13, lineHeight: 19, pad: 8 } } as const
const SIDE = { x: 840, w: 360, top: 200, lit: 3, pad: 16, gap: 8, hero: { size: 104, lineHeight: 104, unit: 36, gap: 6, weight: 900 as const }, second: { size: 48, lineHeight: 48, unit: 18, gap: 6 }, label: { size: 17, lineHeight: 25 }, note: { size: 14, lineHeight: 21, maxLines: 2 }, between: 28, rulePad: 18 } as const
const BOTTOM = 630

/** The scale's end: the largest value rounded up to a fifth of its power of ten (11.2 runs to 12). */
export function upliftScale(max: number): number {
  if (max <= 0) return 1
  const step = 10 ** Math.floor(Math.log10(max)) / 5
  return Math.ceil(max / step - 1e-9) * step
}

/** What an author writes to get this drawing (`./recipe.ts`). */
export const upliftRecipe: Recipe = {
  look: "What a change did against a control group, as bars on their side beside the result in figures",
  kinds: ["data"],
  shapes: [{ parts: [{ type: "chart", count: [2, 6], needs: ["chart_type=bar", "direction=horizontal"] }, { type: "kpi_cards", count: [1, 2] }] }],
}

export const upliftComposition: Composition = ({ components, ctx, setting, rect, claim, source, kicker }) => {
  if (setting !== "portrait" || !wholePage(rect) || components.length !== 2) return null
  const chart = components.find((c): c is Chart => c.type === "chart")
  const kpis = components.find((c): c is Kpis => c.type === "kpi_cards")
  if (!chart || !kpis || chart.chart_type !== "bar" || chart.direction !== "horizontal" || chart.series.length !== 1) return null
  if (chart.tag || chart.markers || chart.gaps || chart.bands?.length || chart.emphasis_label) return null
  const series = chart.series[0]!
  if (series.tone || series.steps) return null
  const points = series.data
  if (points.length < 2 || points.length > 8) return null
  if (points.some((p) => typeof p.y !== "number" || p.y < 0 || p.note || p.upper !== undefined || p.status || p.icon)) return null
  if (kpis.items.length < 1 || kpis.items.length > 2 || kpis.items.some((it) => it.icon || it.delta || it.tag || it.tone || it.source)) return null
  const values = points.map((p) => p.y as number)
  const ref = chart.reference
  const scale = upliftScale(Math.max(...values, ref?.value ?? 0))
  const unit = chart.axes?.y_unit?.trim()
  const chinese = portraitChinese(ctx, [chart.title ?? "", ...points.map((p) => String(p.x))])
  const unitText = unit ? `${chinese ? "单位：" : "Unit: "}${unit}` : ""
  const title = stripEmphasis(chart.title ?? "").trim()
  if (title && portraitWidth(title, PLOT.title.size, ctx) + (unitText ? portraitWidth(unitText, PLOT.unit, ctx) + 24 : 0) > PLOT.w) return null
  const labels = points.map((p) => String(p.x))
  // The categories' column is 110px, wider for a longer name (up to 200px), the track giving way.
  const labelW = Math.max(PLOT.label, ...labels.map((l) => Math.ceil(portraitWidth(l, 16, ctx))))
  if (labelW > PLOT.labelMax) return null
  const track = PLOT.track - (labelW - PLOT.label)
  const per = track / scale
  const decimals = keynoteDecimals(values)
  const fmt = (v: number) => keynoteNumber(v, decimals)
  const valueX = PLOT.x + labelW + PLOT.colGap
  // The values in a column of their own after the track.
  const figuresX = valueX + track + PLOT.colGap
  if (points.some((p) => figuresX + portraitWidth(fmt(p.y as number), PLOT.value, ctx, { serif: true, bold: true }) > PLOT.x + PLOT.w)) return null
  const marked = points.some((p) => p.emphasis)
  const items = kpis.items.map((it, i) => {
    const spec = i === 0 ? SIDE.hero : SIDE.second
    return {
      it,
      spec,
      figure: splitFigure(it.value, it.unit),
      lit: wholeLit(it.value),
      label: fitPortrait(it.label, { width: SIDE.w, size: SIDE.label.size, lineHeight: SIDE.label.lineHeight, maxLines: 1 }, ctx),
      note: it.note?.trim() ? fitPortrait(it.note, { width: SIDE.w, size: SIDE.note.size, lineHeight: SIDE.note.lineHeight, maxLines: SIDE.note.maxLines }, ctx) : undefined,
    }
  })
  if (items.some((x) => !x.label || x.note === null || portraitFigureWidth(x.figure.value, x.figure.unit, x.spec, ctx) > SIDE.w)) return null
  const refLabel = ref ? stripEmphasis(ref.label ?? "").trim() : ""
  const head = placePortraitHead(kicker, claim, HEAD)
  if (!head) return null
  const top = Math.max(PLOT.top, head.bottom + 50)
  const ruleY = top + PLOT.title.lineHeight + PLOT.pad
  const rowsTop = ruleY + 1 + PLOT.gap
  const rowsEnd = rowsTop + points.length * PLOT.row
  const plotEnd = rowsEnd + (refLabel ? PLOT.ref.pad + PLOT.ref.lineHeight : 0)
  let sideY = top
  const sideAt = items.map((x, i) => {
    const at = sideY
    const lead = i === 0 ? SIDE.lit + SIDE.pad : SIDE.between + 1 + SIDE.rulePad
    sideY += lead + x.spec.lineHeight + SIDE.gap + SIDE.label.lineHeight + (x.note ? SIDE.gap + x.note.lines.length * SIDE.note.lineHeight : 0)
    return at
  })
  if (Math.max(plotEnd, sideY) > BOTTOM) return null
  const foot = placePortraitSource(source, { x: HEAD.x, w: HEAD.w })
  if (foot === false) return null
  const inks = portraitInks(ctx)
  const ground = inks.ground
  const refX = ref ? valueX + ref.value * per : 0
  return (
    <g {...compositionTag("uplift")}>
      {head.node}
      <g {...blockTag(ctx, chart)} data-portrait-uplift="">
        {title ? paintPortraitLine(title, { ctx, x: PLOT.x, baseline: portraitBaseline(top, PLOT.title.lineHeight, PLOT.title.size), size: PLOT.title.size, fill: portraitText(inks.ink, ground, PLOT.title.size) }) : null}
        {unitText ? paintPortraitLine(unitText, { ctx, x: PLOT.x + PLOT.w, anchor: "end", baseline: portraitBaseline(top, PLOT.title.lineHeight, PLOT.title.size), size: PLOT.unit, fill: portraitText(inks.muted, ground, PLOT.unit) }) : null}
        {paintPortraitRule(PLOT.x, PLOT.x + PLOT.w, ruleY + 0.5, inks.ink, 1)}
        {points.map((p, i) => {
          const y = rowsTop + i * PLOT.row
          const mid = y + PLOT.row / 2
          const lit = !marked || p.emphasis === true
          const w = (p.y as number) * per
          return (
            <g key={i} data-portrait-bar={String(p.x)} data-lit={marked && lit ? "" : undefined}>
              {paintPortraitLine(String(p.x), { ctx, x: PLOT.x, baseline: portraitBaseline(mid - 12, 24, 16), size: 16, fill: portraitText(inks.ink, ground, 16) })}
              <rect x={valueX} y={mid - PLOT.bar / 2} width={Math.max(1, w)} height={PLOT.bar} fill={lit ? portraitMark(inks.ink, ground) : inks.bar} />
              {paintPortraitLine(fmt(p.y as number), { ctx, x: figuresX, baseline: portraitBaseline(mid - 14, 28, PLOT.value, true), size: PLOT.value, serif: true, bold: marked && lit, fill: portraitText(inks.ink, ground, PLOT.value) })}
            </g>
          )
        })}
        {ref ? (
          <g data-portrait-control={refLabel}>
            <line x1={refX} y1={rowsTop - PLOT.ref.over} x2={refX} y2={rowsEnd} stroke={portraitMark(inks.ink, ground)} strokeWidth={PLOT.ref.stroke} strokeDasharray={PLOT.ref.dash} />
            {refLabel ? paintPortraitLine(refLabel, { ctx, x: refX + PLOT.ref.gap, top: rowsEnd + PLOT.ref.pad, lineHeight: PLOT.ref.lineHeight, size: PLOT.ref.size, fill: portraitText(inks.ink, ground, PLOT.ref.size) }) : null}
          </g>
        ) : null}
      </g>
      <g {...blockTag(ctx, kpis)} data-portrait-outcome="">
        {items.map((x, i) => {
          const at = sideAt[i]!
          const figTop = at + (i === 0 ? SIDE.lit + SIDE.pad : SIDE.between + 1 + SIDE.rulePad)
          const labelTop = figTop + x.spec.lineHeight + SIDE.gap
          return (
            <g key={i} data-portrait-figure-row={stripEmphasis(x.it.label)}>
              {i === 0 ? paintPortraitRule(SIDE.x, SIDE.x + SIDE.w, at + SIDE.lit / 2, portraitMark(inks.lead, ground), SIDE.lit) : paintPortraitRule(SIDE.x, SIDE.x + SIDE.w, at + SIDE.between + 0.5, inks.line, 1)}
              {paintPortraitFigure({ ctx, value: x.figure.value, unit: x.figure.unit, x: SIDE.x, baseline: portraitBaseline(figTop, x.spec.lineHeight, x.spec.size, true), spec: x.spec, fill: portraitText(x.lit ? inks.lead : inks.ink, ground, x.spec.unit) })}
              {paintPortrait(x.label!, { ctx, x: SIDE.x, top: labelTop, fill: portraitText(inks.ink, ground, SIDE.label.size) })}
              {x.note ? paintPortrait(x.note, { ctx, x: SIDE.x, top: labelTop + SIDE.label.lineHeight + SIDE.gap, fill: portraitText(inks.muted, ground, SIDE.note.size) }) : null}
            </g>
          )
        })}
      </g>
      {foot}
    </g>
  )
}
