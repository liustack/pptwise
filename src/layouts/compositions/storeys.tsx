import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { groupDigits } from "../../lib/quantity-format"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  DrawnBox,
  boardY,
  crayonInks,
  crayonMark,
  crayonText,
  crayonTint,
  crayonWidth,
  fitCrayon,
  paintCrayon,
  paintCrayonFigure,
  paintCrayonIcon,
  paintCrayonLine,
  crayonBaseline,
  crayonFigureWidth,
  placeCrayonClaim,
  placeCrayonSource,
} from "./crayonbox"

type Chart = Extract<Component, { type: "chart" }>
type Kpi = Extract<Component, { type: "kpi_cards" }>

/*
 * storeys: a count in bars with a rate over it on a storey of its own, and
 * two figures beside them, crayon's 2026-10 board (p05). The bars stand in
 * sky blue on a lower storey, each with an outline traced a little off and
 * its value over it; the rate runs as a thick tangerine line on an upper
 * storey of its own, so the two never cross, every point named with its
 * value in burnt orange and the last one larger. A key under the bars names
 * the two. Beside them two cards drawn by hand, each a figure with its
 * symbol and what it counts.
 *
 * Takes, in the crayonbox setting: an untitled combo `chart` of one bar
 * series and one line series on the right axis over the same three to eight
 * categories, every value at zero or above, then a `kpi_cards` of two with
 * symbols and labels.
 *
 * Declines: a chart with a tag, a reference, statuses, notes, marks,
 * changes or axis titles (the units alone are printed), a card with a note, a tag, a delta, a tone or a source, a value or
 * a figure past its room.
 *
 * Reads: the crayonbox inks (`./crayonbox.tsx`).
 */

const PLOT = { x: 56, pitch: 110, w: 70, base: 480, h: 190, r: 12, value: { gap: 10, size: 13 }, year: { y: 502, size: 13 } } as const
const LINE = { top: 196, h: 58.5, stroke: 5, dot: 7, label: { gap: 14, size: 12, last: 15 } } as const
const KEY = { top: 530, swatch: 14, size: 13, gap: 8, between: 30 } as const
const CARDS = { x: 796, w: 300, h: 150, top: 196, pitch: 170 } as const
const CARD = { icon: { x: 24, y: 22, size: 24 }, figure: { top: 52, lineHeight: 56, size: 44 }, label: { top: 110, size: 13, lineHeight: 22 } } as const

/** How many decimals the most precise value of a series was written with, so a run of rates prints alike (92.0%, not 92%). */
function decimalsOf(values: readonly number[]): number {
  return Math.max(0, ...values.map((v) => (String(v).split(".")[1] ?? "").length))
}

/** A value as a label prints it: its digits grouped the deck's way, with `decimals` decimals. */
function valueText(v: number, chinese: boolean, decimals: number): string {
  const [whole, frac] = v.toFixed(decimals).split(".")
  return frac ? `${groupDigits(whole!, chinese)}.${frac}` : groupDigits(whole!, chinese)
}

/** The round top of the value axis: the first of 1, 2, 2.5 or 5 times a power of ten at or over the tallest bar. */
function niceTop(max: number): number {
  const power = 10 ** Math.floor(Math.log10(max))
  for (const step of [1, 2, 2.5, 5, 10]) if (step * power >= max) return step * power
  return 10 * power
}

export const storeysComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "crayonbox") return null
  const [chart, kpi, ...rest] = components
  if (chart?.type !== "chart" || kpi?.type !== "kpi_cards" || rest.length > 0) return null
  const c = chart as Chart
  if (c.chart_type !== "combo" || c.title?.trim() || c.tag || c.reference || c.changes || c.markers || c.gaps || c.bands || c.style || c.series.length !== 2) return null
  if (c.axes?.x_title || c.axes?.y_title || c.axes?.y2_title) return null
  const bars = c.series.find((s) => s.plot !== "line")
  const line = c.series.find((s) => s.plot === "line" && s.axis === "right")
  if (!bars || !line || bars.emphasis || line.emphasis || bars.tone || line.tone) return null
  const xs = bars.data.map((d) => String(d.x))
  if (xs.length < 3 || xs.length > 8 || line.data.length !== xs.length || line.data.some((d, i) => String(d.x) !== xs[i])) return null
  if ([...bars.data, ...line.data].some((d) => d.y < 0 || d.status || d.note || d.emphasis || d.icon || d.upper !== undefined)) return null
  const cards = (kpi as Kpi).items
  if (cards.length !== 2 || cards.some((it) => !it.icon || !it.label.trim() || it.note || it.tag || it.delta || it.tone || it.source)) return null
  const chinese = /\p{Script=Han}/u.test([bars.name, line.name, ...xs].join(""))
  const pitch = Math.min(PLOT.pitch, (CARDS.x - PLOT.x - 40 - PLOT.w) / (xs.length - 1))
  const barUnit = c.axes?.y_unit?.trim()
  const lineUnit = c.axes?.y2_unit?.trim() ?? ""
  const barDecimals = decimalsOf(bars.data.map((d) => d.y))
  const lineDecimals = decimalsOf(line.data.map((d) => d.y))
  const barLabels = bars.data.map((d) => (barUnit ? `${valueText(d.y, chinese, barDecimals)} ${barUnit}` : valueText(d.y, chinese, barDecimals)))
  const lineLabels = line.data.map((d) => `${valueText(d.y, chinese, lineDecimals)}${lineUnit}`)
  if (barLabels.some((l) => crayonWidth(l, PLOT.value.size, ctx, { weight: 800 }) > pitch - 6)) return null
  if (lineLabels.some((l, i) => crayonWidth(l, i === lineLabels.length - 1 ? LINE.label.last : LINE.label.size, ctx, { weight: 900 }) > pitch - 4)) return null
  if (xs.some((x) => crayonWidth(x, PLOT.year.size, ctx, { weight: 700 }) > pitch - 6)) return null
  const keyW = KEY.swatch + KEY.gap + crayonWidth(bars.name, KEY.size, ctx, { weight: 700 }) + KEY.between + 28 + KEY.gap + crayonWidth(line.name, KEY.size, ctx, { weight: 700 })
  if (keyW > CARDS.x - PLOT.x - 20) return null
  const labels = cards.map((it) => fitCrayon(it.label, { width: CARDS.w - CARD.icon.x * 2, size: CARD.label.size, lineHeight: CARD.label.lineHeight, maxLines: 1, weight: 700 }, ctx))
  if (labels.some((l) => !l)) return null
  if (cards.some((it) => crayonFigureWidth(it.value, it.unit, CARD.figure.size, 18, ctx) > CARDS.w - CARD.icon.x * 2)) return null
  if (rect.w < CARDS.x + CARDS.w) return null
  const head = placeCrayonClaim(claim, { x: rect.x, w: 1080 })
  if (head === false) return null
  const foot = placeCrayonSource(source, { x: rect.x, w: rect.w - 52 })
  if (foot === false) return null

  const inks = crayonInks(ctx)
  const ground = inks.ground
  const top = niceTop(Math.max(...bars.data.map((d) => d.y)))
  const base = boardY(rect, PLOT.base)
  const x0 = rect.x + PLOT.x
  const rates = line.data.map((d) => d.y)
  const hi = Math.ceil(Math.max(...rates))
  const lo = Math.min(...rates)
  const k = hi > lo ? LINE.h / (hi - lo) : 0
  const lineY = (v: number) => boardY(rect, LINE.top) + (hi - v) * k
  const cx = (i: number) => x0 + PLOT.w / 2 + i * pitch
  const barInk = inks.sky
  const lineInk = inks.orange
  const traced = crayonMark(inks.blue, ground)
  const keyY = boardY(rect, KEY.top)
  const lineKeyX = x0 + KEY.swatch + KEY.gap + crayonWidth(bars.name, KEY.size, ctx, { weight: 700 }) + KEY.between
  return (
    <g {...compositionTag("storeys")}>
      {head}
      <g {...blockTag(ctx, chart)}>
        {bars.data.map((d, i) => {
          const h = (d.y / top) * PLOT.h
          const x = x0 + i * pitch
          return (
            <g key={i} data-crayon-bar={String(d.x)}>
              <rect data-plot-mark="1" x={x} y={base - h} width={PLOT.w} height={h} rx={PLOT.r} fill={barInk} />
              <rect x={x + 2} y={base - h + 1} width={PLOT.w} height={h} rx={PLOT.r} fill="none" stroke={traced} strokeWidth={2} opacity={0.4} />
              {paintCrayonLine(barLabels[i]!, { ctx, x: x + PLOT.w / 2, baseline: Math.round(base - h - PLOT.value.gap), size: PLOT.value.size, weight: 800, anchor: "middle", fill: crayonText(inks.ink, ground, PLOT.value.size) })}
              {paintCrayonLine(xs[i]!, { ctx, x: x + PLOT.w / 2, baseline: boardY(rect, PLOT.year.y), size: PLOT.year.size, weight: 700, anchor: "middle", fill: crayonText(inks.muted, ground, PLOT.year.size) })}
            </g>
          )
        })}
        <g data-crayon-rate={line.name}>
          <polyline points={rates.map((v, i) => `${cx(i).toFixed(1)},${lineY(v).toFixed(1)}`).join(" ")} fill="none" stroke={lineInk} strokeWidth={LINE.stroke} strokeLinecap="round" strokeLinejoin="round" />
          {rates.map((v, i) => {
            const last = i === rates.length - 1
            const size = last ? LINE.label.last : LINE.label.size
            return (
              <g key={i}>
                <circle cx={cx(i)} cy={lineY(v)} r={LINE.dot} fill={lineInk} stroke={inks.card} strokeWidth={2} />
                {paintCrayonLine(lineLabels[i]!, { ctx, x: cx(i), baseline: Math.round(lineY(v) - LINE.label.gap), size, weight: last ? 900 : 800, anchor: "middle", fill: crayonText(inks.rust, ground, size) })}
              </g>
            )
          })}
        </g>
        <g data-crayon-key="">
          <rect x={x0} y={keyY} width={KEY.swatch} height={KEY.swatch} rx={4} fill={barInk} />
          {paintCrayonLine(bars.name, { ctx, x: x0 + KEY.swatch + KEY.gap, baseline: keyY + 12, size: KEY.size, weight: 700, fill: crayonText(inks.ink, ground, KEY.size) })}
          <line x1={lineKeyX} y1={keyY + 7} x2={lineKeyX + 28} y2={keyY + 7} stroke={lineInk} strokeWidth={LINE.stroke} strokeLinecap="round" />
          {paintCrayonLine(line.name, { ctx, x: lineKeyX + 28 + KEY.gap, baseline: keyY + 12, size: KEY.size, weight: 700, fill: crayonText(inks.ink, ground, KEY.size) })}
        </g>
      </g>
      <g {...blockTag(ctx, kpi)}>
        {cards.map((it, i) => {
          const color = inks.box[i % 2]!
          const fill = crayonTint(color, inks)
          const x = rect.x + CARDS.x
          const y = boardY(rect, CARDS.top + i * CARDS.pitch)
          return (
            <g key={i} data-crayon-figure={stripEmphasis(it.value).trim()}>
              <DrawnBox box={{ x, y, w: CARDS.w, h: CARDS.h }} color={color} fill={fill} />
              {paintCrayonIcon(it.icon!, x + CARD.icon.x, y + CARD.icon.y, CARD.icon.size, inks.ink, fill)}
              {paintCrayonFigure({ ctx, value: it.value, unit: it.unit, x: x + CARD.icon.x, baseline: crayonBaseline(y + CARD.figure.top, CARD.figure.lineHeight, CARD.figure.size), size: CARD.figure.size, unitSize: 18, fill: crayonText(inks.ink, fill, CARD.figure.size) })}
              {paintCrayon(labels[i]!, { ctx, x: x + CARD.icon.x, top: y + CARD.label.top, weight: 700, fill: crayonText(inks.ink, fill, CARD.label.size), ground: fill })}
            </g>
          )
        })}
      </g>
      {foot}
    </g>
  )
}
