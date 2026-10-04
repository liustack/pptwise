import type React from "react"
import type { Component } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import type { ContentRect } from "../../render/layout"
import { measureTextUnits } from "../../lib/svg-text-layout"
import { chartFigures, plotNumber, reportedDecimals, textWidth, valueDecimals } from "./plot"
import { SEAL_TYPE, sealInks, sealSeriesInk, sealSmall, sealText } from "./seal"
import { fitFixed, paintLines } from "./type"

type Chart = Extract<Component, { type: "chart" }>

/*
 * The seal setting's hand-set plots, vermilion's 2026-10 fiscal, growth and
 * indicators pages (p05, p09, p10). They draw no frame: a legend and the unit
 * over the plot, every value printed on its mark, the marked series in the
 * mark and the others stepping back in the chart palette after its lead,
 * nearest the mark first.
 *
 * - Columns: grouped upright bars on a baseline, negative values hanging
 *   below it with their values under them. A bar the author marks
 *   (`data[].emphasis`) puts its whole series in the mark and its category's
 *   name in the mark too: the period and the measure the page is about.
 * - A trend: one series as a line in the mark over its value axis, the axis's
 *   ticks small on the left and its rows dashed, a marked value range
 *   (`bands`) tinted with the accent behind it and labelled, every point
 *   printing its value, the last point filled.
 *
 * Each returns `null` for a chart it does not draw, and the composition that
 * asked hands the chart to the ordinary renderer.
 */

const MAX_SERIES = 3
const MIN_CATEGORIES = 2
const MAX_CATEGORIES = 6
const LEGEND = { swatch: 14, gap: 6, after: 25, baselineDrop: 18 }
const CATEGORY = { size: 16 }
const UNIT_GAP = "，"

/** The legend's entries and the unit line over a plot, both at 15px. */
function legendAndUnit(opts: {
  ctx: ComponentCtx
  rect: ContentRect
  entries: { name: string; ink: string; marked: boolean }[]
  unit: string | undefined
  unitRight: number
}): React.ReactElement | null {
  const { ctx, rect } = opts
  const inks = sealInks(ctx)
  const baseline = rect.y + LEGEND.baselineDrop
  let x = rect.x
  const parts: React.ReactNode[] = []
  for (const [i, entry] of opts.entries.entries()) {
    const textW = measureTextUnits(entry.name, { fontFamily: ctx.fonts.body, bold: entry.marked }) * SEAL_TYPE.label
    parts.push(
      <g key={`legend-${i}`}>
        <rect x={x} y={baseline - 12} width={LEGEND.swatch} height={LEGEND.swatch} fill={entry.ink} />
        <text
          {...sealSmall(SEAL_TYPE.label)}
          x={x + LEGEND.swatch + LEGEND.gap}
          y={baseline}
          fontFamily={ctx.fonts.body}
          fontSize={SEAL_TYPE.label}
          fontWeight={entry.marked ? "700" : undefined}
          fill={sealText(entry.marked ? inks.mark : inks.muted, inks.ground, SEAL_TYPE.label)}
          dominantBaseline="alphabetic"
        >
          {entry.name}
        </text>
      </g>,
    )
    x += LEGEND.swatch + LEGEND.gap + textW + LEGEND.after
  }
  if (x - LEGEND.after > opts.unitRight) return null
  return (
    <g data-seal-legend="">
      {parts}
      {opts.unit && (
        <text
          {...sealSmall(SEAL_TYPE.label)}
          x={opts.unitRight}
          y={baseline}
          textAnchor="end"
          fontFamily={ctx.fonts.body}
          fontSize={SEAL_TYPE.label}
          fill={sealText(inks.muted, inks.ground, SEAL_TYPE.label)}
          dominantBaseline="alphabetic"
        >
          {opts.unit}
        </text>
      )}
    </g>
  )
}

/** The unit line: the value axis's title and unit, joined the way the deck writes. */
function unitLine(chart: Chart, chinese: boolean): string | undefined {
  const parts = [chart.axes?.y_title?.trim(), chart.axes?.y_unit?.trim()].filter((part): part is string => Boolean(part))
  return parts.length > 0 ? parts.join(chinese ? UNIT_GAP : ", ") : undefined
}

/** The series the page is about: the marked one, or the one holding the marked bar. */
function markedSeries(chart: Chart): { series: number; category: string | undefined } {
  const point = chart.series.flatMap((s, si) => s.data.flatMap((d) => (d.emphasis === true ? [{ si, x: String(d.x) }] : [])))[0]
  if (point) return { series: point.si, category: point.x }
  return { series: chart.series.findIndex((s) => s.emphasis === true), category: undefined }
}

/** Each series' ink: the mark for the marked one, the palette after its lead for the rest, nearest the mark first. */
function seriesInks(ctx: ComponentCtx, chart: Chart, marked: number): string[] {
  const inks = sealInks(ctx)
  if (marked < 0) return chart.series.map((_s, i) => (i === 0 ? inks.mark : sealSeriesInk(ctx, i - 1)))
  return chart.series.map((_s, i) => (i === marked ? inks.mark : sealSeriesInk(ctx, Math.abs(marked - i) - 1)))
}

/**
 * Grouped upright bars, one to three series over two to six categories,
 * values below zero hanging under the baseline. `unitRight` is where the unit
 * line ends: the plot's right edge beside a figure column, the band's alone.
 */
export function columnsSeal(chart: Chart, rect: ContentRect, ctx: ComponentCtx): React.ReactElement | null {
  if (chart.chart_type !== "bar" || chart.direction === "horizontal" || chart.bands) return null
  if (chart.series.length < 1 || chart.series.length > MAX_SERIES) return null
  if (chart.axes?.x_title) return null
  if (chart.series.some((s) => s.data.some((d) => typeof d.x !== "string" || d.status !== undefined))) return null
  const categories: string[] = []
  for (const s of chart.series) for (const d of s.data) if (!categories.includes(String(d.x))) categories.push(String(d.x))
  if (categories.length < MIN_CATEGORIES || categories.length > MAX_CATEGORIES) return null
  const inks = sealInks(ctx)
  const figures = chartFigures(chart, ctx)
  const { series: marked, category: markedCategory } = markedSeries(chart)
  const colors = seriesInks(ctx, chart, marked)
  const legend = legendAndUnit({
    ctx,
    rect,
    entries: chart.series.map((s, i) => ({ name: s.name, ink: colors[i]!, marked: i === marked })),
    unit: unitLine(chart, figures.chinese),
    unitRight: rect.x + rect.w,
  })
  if (!legend) return null

  const values = chart.series.flatMap((s) => s.data.map((d) => d.y))
  const maxPos = Math.max(0, ...values)
  const maxNeg = Math.max(0, ...values.map((v) => -v))
  const n = chart.series.length
  const slot = rect.w / categories.length
  const barW = Math.min(66, (slot * (n <= 2 ? 0.8 : 0.75) - 6 * (n - 1)) / n)
  if (barW < 24) return null
  const big = n <= 2
  const valueSize = { marked: big ? 18 : 17, other: big ? 18 : 15 }
  const plotTop = rect.y + 60
  const bottom = rect.y + rect.h
  // A plot with no negative value stands on a baseline 50px over the band's
  // foot, its categories 28px under it. One with negatives hangs them from a
  // zero line set so the lowest value clears the categories, 30px over the foot.
  const categoryY = maxNeg > 0 ? bottom - 30 : bottom - 22
  const k = maxNeg > 0 ? (categoryY - 40 - plotTop) / ((maxPos + maxNeg) * 1.13) : (bottom - 50 - plotTop) / (Math.max(maxPos, 1e-9) * 1.18)
  const zeroY = maxNeg > 0 ? categoryY - 40 - maxNeg * k : bottom - 50
  if (!(k > 0) || zeroY - maxPos * k < plotTop - 1) return null
  const decimals = reportedDecimals(chart)
  const textOn = (size: number, ink: string) => sealText(ink, inks.ground, size)

  const categoryFits = categories.map((name) =>
    fitFixed(name, { width: slot - 12, size: CATEGORY.size, lineHeight: 22, maxLines: 1, fontFamily: ctx.fonts.body, bold: name === markedCategory }),
  )
  if (categoryFits.some((fit) => fit === null)) return null

  return (
    <g data-seal-plot="columns">
      {legend}
      <rect x={rect.x} y={zeroY} width={rect.w} height={1} fill={sealSeriesInk(ctx, 0)} />
      {categories.map((name, ci) => {
        const cx = rect.x + slot * (ci + 0.5)
        return (
          <g key={`cat-${ci}`}>
            {chart.series.map((s, si) => {
              const point = s.data.find((d) => String(d.x) === name)
              if (!point) return null
              const x = cx - (n * barW + 6 * (n - 1)) / 2 + si * (barW + 6)
              const h = Math.max(2, Math.abs(point.y) * k)
              const y = point.y >= 0 ? zeroY - h : zeroY
              const isMarked = si === marked
              const size = isMarked ? valueSize.marked : valueSize.other
              const label = plotNumber(point.y, figures, valueDecimals(point.y, decimals))
              const labelY = point.y >= 0 ? y - 10 : y + h + size + 4
              return (
                <g key={`bar-${si}`}>
                  <rect x={x} y={y} width={barW} height={h} fill={colors[si]!} />
                  <text
                    {...sealSmall(size)}
                    x={x + barW / 2}
                    y={labelY}
                    textAnchor="middle"
                    fontFamily={ctx.fonts.body}
                    fontSize={size}
                    fontWeight={isMarked ? "700" : undefined}
                    fill={textOn(size, isMarked ? inks.mark : inks.muted)}
                    dominantBaseline="alphabetic"
                  >
                    {label}
                  </text>
                </g>
              )
            })}
            {paintLines(categoryFits[ci]!, {
              ctx,
              x: cx,
              y: categoryY,
              fill: textOn(CATEGORY.size, name === markedCategory ? inks.mark : inks.ink),
              fontFamily: ctx.fonts.body,
              fontWeight: name === markedCategory ? "700" : "400",
              anchor: "middle",
            })}
          </g>
        )
      })}
    </g>
  )
}

/** The trend's measures, from the board: ticks on a 40px gutter, categories 28px under the plot. */
const TREND = { gutter: 40, inset: 30, top: 34, categoryDrop: 28, dot: 5, lastDot: 7, stroke: 3, value: 16, lastValue: 18 }

/**
 * One series as a line over its value axis, a marked value range behind it.
 * Two to twelve points.
 */
export function trendSeal(chart: Chart, rect: ContentRect, ctx: ComponentCtx): React.ReactElement | null {
  if (chart.chart_type !== "line" || chart.series.length !== 1) return null
  const series = chart.series[0]!
  const points = series.data
  if (points.length < 2 || points.length > 12 || points.some((d) => typeof d.x !== "string" || d.status !== undefined)) return null
  if ((chart.bands?.length ?? 0) > 1) return null
  const inks = sealInks(ctx)
  const figures = chartFigures(chart, ctx)
  const body = ctx.fonts.body
  const band = chart.bands?.[0]
  const values = [...points.map((d) => d.y), ...(band ? [band.from, band.to] : [])]
  const lo0 = Math.min(...values)
  const hi0 = Math.max(...values)
  const step = niceStep((hi0 - lo0) / 3)
  const lo = Math.floor((lo0 - step * 0.2) / step) * step
  const lastTick = Math.ceil((hi0 + step * 0.1) / step) * step
  const ticks: number[] = []
  for (let t = lo; t <= lastTick + 1e-9; t += step) ticks.push(Number(t.toPrecision(12)))
  const hi = ticks[ticks.length - 1]! + step * 0.2
  const unit = chart.axes?.y_unit?.trim()
  const title = chart.axes?.y_title?.trim() || series.name
  const x0 = rect.x + TREND.gutter
  const x1 = rect.x + rect.w
  const y0 = rect.y + TREND.top
  const y1 = rect.y + rect.h - TREND.categoryDrop - 40
  const yv = (v: number) => y1 - ((v - lo) / (hi - lo)) * (y1 - y0)
  const stepX = (x1 - x0 - TREND.inset * 2) / (points.length - 1)
  const xs = points.map((_d, i) => x0 + TREND.inset + i * stepX)
  const decimals = reportedDecimals(chart)
  const tickLabel = (t: number) => `${plotNumber(t, figures, valueDecimals(t, 0))}${unit === "%" ? "%" : ""}`
  const titleFit = fitFixed(title, { width: rect.w, size: SEAL_TYPE.label, lineHeight: 22, maxLines: 1, fontFamily: body, bold: false })
  const bandLabel = band?.label?.trim()
    ? fitFixed(band.label, { width: x1 - x0 - 24, size: SEAL_TYPE.label, lineHeight: 22, maxLines: 1, fontFamily: body, bold: true })
    : undefined
  if (!titleFit || bandLabel === null) return null
  const categoryW = stepX - 8
  if (points.some((d) => textWidth(String(d.x), SEAL_TYPE.label, body) > categoryW)) return null

  return (
    <g data-seal-plot="trend">
      {paintLines(titleFit, {
        ctx,
        x: x0,
        y: rect.y + LEGEND.baselineDrop,
        fill: sealText(inks.muted, inks.ground, SEAL_TYPE.label),
        fontFamily: body,
        fontWeight: "400",
        attrs: sealSmall(SEAL_TYPE.label),
      })}
      {band && (
        <g data-chart-band="">
          <rect x={x0} y={yv(Math.max(band.from, band.to))} width={x1 - x0} height={yv(Math.min(band.from, band.to)) - yv(Math.max(band.from, band.to))} fill={inks.band} />
          {bandLabel &&
            paintLines(bandLabel, {
              ctx,
              x: x0 + 12,
              y: yv(Math.min(band.from, band.to)) - 10,
              fill: inks.bandText,
              fontFamily: body,
              fontWeight: "700",
              bg: inks.band,
              attrs: sealSmall(SEAL_TYPE.label),
            })}
        </g>
      )}
      {ticks.map((t, i) => (
        <g key={`tick-${i}`}>
          <line x1={x0} y1={yv(t)} x2={x1} y2={yv(t)} stroke={inks.rule} strokeWidth={1} strokeDasharray={i === 0 ? undefined : "3 4"} />
          <text
            {...SEAL_SMALL_14}
            x={x0 - 12}
            y={yv(t) + 5}
            textAnchor="end"
            fontFamily={body}
            fontSize={14}
            fill={sealText(inks.muted, inks.ground, 14)}
            dominantBaseline="alphabetic"
          >
            {tickLabel(t)}
          </text>
        </g>
      ))}
      <polyline points={xs.map((x, i) => `${x.toFixed(1)},${yv(points[i]!.y).toFixed(1)}`).join(" ")} fill="none" stroke={inks.mark} strokeWidth={TREND.stroke} />
      {points.map((d, i) => {
        const last = i === points.length - 1
        const x = xs[i]!
        const y = yv(d.y)
        const size = last ? TREND.lastValue : TREND.value
        return (
          <g key={`pt-${i}`}>
            <circle cx={x} cy={y} r={last ? TREND.lastDot : TREND.dot} fill={last ? inks.mark : inks.ground} stroke={inks.mark} strokeWidth={2} />
            <text x={x} y={y - 14} textAnchor="middle" fontFamily={body} fontSize={size} fontWeight="700" fill={sealText(last ? inks.mark : inks.ink, inks.ground, size)} dominantBaseline="alphabetic">
              {plotNumber(d.y, figures, valueDecimals(d.y, decimals))}
            </text>
            <text {...sealSmall(SEAL_TYPE.label)} x={x} y={y1 + TREND.categoryDrop} textAnchor="middle" fontFamily={body} fontSize={SEAL_TYPE.label} fill={sealText(inks.ink, inks.ground, SEAL_TYPE.label)} dominantBaseline="alphabetic">
              {String(d.x)}
            </text>
          </g>
        )
      })}
    </g>
  )
}

const SEAL_SMALL_14 = sealSmall(14)

/** A nice step of 1, 2 or 5 times a power of ten at or above `v`, half steps included. */
function niceStep(v: number): number {
  if (!(v > 0)) return 1
  const power = 10 ** Math.floor(Math.log10(v))
  for (const m of [1, 2, 2.5, 5, 10]) if (m * power >= v - 1e-12) return Number((m * power).toPrecision(12))
  return 10 * power
}

