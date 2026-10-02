import type { Component } from "@/ir"
import { joinUnit } from "../../lib/quantity-format"
import { emphasisSeriesPalette, recededMarkFill, rotateChartPalette } from "../../render/chart-palette"
import { headingEmphasisPaint, renderEmphasisText } from "../../render/emphasis"
import { accessibleInk } from "../../render/ink"
import { SvgContent } from "../../render/svg-content"
import { bodySlotDropsContent } from "../../render/step-aside"
import { blockTag, compositionTag, ruleInk, type Composition } from "./shared"
import { fitFixed, paintLines } from "./type"

type Chart = Extract<Component, { type: "chart" }>
type Series = Chart["series"][number]

/*
 * rail: a trend chart with a column of figures beside it. The chart keeps the
 * left of the band, and a column right of a hairline states what each series
 * did from its first category to its last: the series' swatch and name, the
 * change as a whole-number percentage, and the two values it ran between.
 * Every number in the column is computed from the series, so nothing is
 * written twice. A series marked `emphasis` sets its change in `primary` over
 * the theme's emphasis stroke and the others recede to `muted`. Brief's trend
 * page (p03).
 *
 * Takes: one `chart`, alone on the page, on a category axis (upright bars,
 * lines, areas, stacks or a combo), with one to three series, where every
 * series has a value at the first and the last category and its first value
 * is above zero.
 *
 * Declines: any other chart type, a horizontal bar, a numeric x axis, more
 * than three series, a series that starts at zero or below or misses either
 * end, a change too large to state, anything beside the chart, a series name
 * past one line of the column at 16px, a chart that would drop content in the
 * narrower plot, and a column that does not fit the band's height even with
 * its figures at 36px. The face then draws the chart across the full width.
 *
 * Band: the column and its divider take the right 280px, and the plot keeps
 * at least 400px left of them, so the band needs 720px. The figures step down
 * from 56px to 44px to 36px until the column fits the height. At 36px with
 * one-line spans the column needs 267px for two series and 406px for three.
 * The board's two series stand at 56px in 353px.
 *
 * Reads: the chart palette as the face hands it (rotated by
 * `chartPaletteOffset`, with the marked series kept and the others receded,
 * the same palette the plot draws with), `primary` (changes), `text` (spans),
 * `muted` (names, unmarked changes and spans), `border` or `muted` (the
 * divider), `bg` or `defaultBg`, `fonts.heading` (the changes), `fonts.body`.
 */

const RAIL_TYPES: ReadonlySet<Chart["chart_type"]> = new Set(["bar", "line", "area", "stacked", "combo"])
const MAX_SERIES = 3

/** The divider stands this far left of the band's right edge (x904 on the board). */
const DIVIDER_INSET = 280
/** The chart stops this far short of the divider. */
const CHART_GAP = 40
/** The narrowest plot the column leaves. */
const MIN_CHART_W = 400
/** The column starts this far right of the divider (x944 on the board). */
const RAIL_GAP = 40
/** The divider stops this far above the band's foot. */
const DIVIDER_FOOT = 28
/** The first block's label line starts 18px into the band. */
const FIRST_BLOCK = 18
const BLOCK_GAP = 29

const SWATCH_W = 24
/** The series name starts this far right of the column's left edge, past its swatch (x976 on the board). */
const LABEL_INSET = 32
const LABEL_SIZE = 16
const LABEL_BASELINE = 18
/** The value line's box starts here, below the block's top. */
const VALUE_BOX = 34
/** Value sizes tried in turn until every block fits the band. */
const VALUE_SIZES = [56, 44, 36] as const
const NOTE_SIZE = 18
const NOTE_LINE_HEIGHT = 26
const NOTE_MAX_LINES = 2
/** From the value's baseline to the note's first. */
const VALUE_TO_NOTE = 35
const NOTE_DESCENT = 6

/** The most decimals a value in the note prints. */
const MAX_DECIMALS = 4

/**
 * Georgia's ascent and descent, which the board's line boxes were resolved
 * with. Every font gets the baselines they give, as in `waves`.
 */
const ASCENT = 0.917
const DESCENT = 0.219

function valueBaseline(size: number): number {
  return VALUE_BOX + Math.round((size + 8 - size * (ASCENT + DESCENT)) / 2 + size * ASCENT)
}

function decimalsOf(v: number): number {
  const text = String(Number(v.toPrecision(12)))
  const dot = text.indexOf(".")
  return dot < 0 || /e/i.test(text) ? 0 : text.length - dot - 1
}

interface RailEntry {
  series: Series
  first: number
  last: number
}

function railShape(components: readonly Component[]): { chart: Chart; entries: RailEntry[] } | null {
  if (components.length !== 1) return null
  const chart = components[0]!
  if (chart.type !== "chart" || !RAIL_TYPES.has(chart.chart_type)) return null
  if (chart.chart_type === "bar" && chart.direction === "horizontal") return null
  if (chart.series.length < 1 || chart.series.length > MAX_SERIES) return null
  if (chart.series.some((s) => s.data.some((point) => typeof point.x !== "string"))) return null
  // The category axis runs in first-seen order across the series, the order
  // the chart draws it in.
  const categories: string[] = []
  for (const s of chart.series) for (const point of s.data) if (!categories.includes(point.x as string)) categories.push(point.x as string)
  if (categories.length < 2) return null
  const head = categories[0]!
  const tail = categories[categories.length - 1]!
  const entries: RailEntry[] = []
  for (const series of chart.series) {
    const first = series.data.find((point) => point.x === head)?.y
    const last = series.data.find((point) => point.x === tail)?.y
    if (first === undefined || last === undefined || !(first > 0) || !Number.isFinite(last)) return null
    // A first value near zero makes the ratio overflow: 5e-324 to -1e163 is
    // -Infinity percent, and no column should print that.
    if (!Number.isFinite((last - first) / first)) return null
    entries.push({ series, first, last })
  }
  return { chart, entries }
}

/** "+22%", "-8%" or "0%": the change from first to last, rounded to a whole percent. */
export function changeLabel(first: number, last: number): string {
  const pct = Math.round(((last - first) / first) * 100)
  if (pct === 0) return "0%"
  return `${pct > 0 ? "+" : "-"}${Math.abs(pct)}%`
}

/** "$4.10 → $5.35": the two values in the axis's unit, at the decimals the series was written with. */
export function spanLabel(series: Series, first: number, last: number, unit: string | undefined): string {
  const decimals = Math.min(MAX_DECIMALS, Math.max(0, ...series.data.map((point) => decimalsOf(point.y))))
  const format = (v: number) => joinUnit(v.toFixed(decimals), unit, " ")
  return `${format(first)} → ${format(last)}`
}

function swatchIsLine(chart: Chart, series: Series): boolean {
  if (chart.chart_type === "line" || chart.chart_type === "area") return true
  return chart.chart_type === "combo" && series.plot === "line"
}

export const railComposition: Composition = ({ components, ctx, rect }) => {
  const shape = railShape(components)
  if (!shape) return null
  const { chart, entries } = shape
  const right = rect.x + rect.w
  const dividerX = right - DIVIDER_INSET
  const railX = dividerX + RAIL_GAP
  const railW = right - railX
  const labelX = railX + LABEL_INSET
  const chartRect = { x: rect.x, y: rect.y, w: dividerX - CHART_GAP - rect.x, h: rect.h }
  if (chartRect.w < MIN_CHART_W) return null
  if (bodySlotDropsContent([chart], chartRect, ctx)) return null

  const { colors, fonts } = ctx
  const body = fonts.body
  const bg = ctx.defaultBg ?? colors.bg
  const marked = chart.series.findIndex((s) => s.emphasis === true)
  // The same palette the chart draws with, so each swatch is its series' colour.
  const rotated = rotateChartPalette(colors.chartPalette, ctx.chartPaletteOffset ?? 0)
  const palette =
    marked < 0
      ? rotated
      : emphasisSeriesPalette(rotated, chart.series.length, marked, recededMarkFill(colors.muted, bg))

  const labels = []
  for (const entry of entries) {
    const unit = entry.series.axis === "right" ? chart.axes?.y2_unit : chart.axes?.y_unit
    const name = fitFixed(entry.series.name, {
      width: right - labelX,
      size: LABEL_SIZE,
      lineHeight: LABEL_SIZE,
      maxLines: 1,
      fontFamily: body,
      bold: false,
    })
    const note = fitFixed(spanLabel(entry.series, entry.first, entry.last, unit), {
      width: railW,
      size: NOTE_SIZE,
      lineHeight: NOTE_LINE_HEIGHT,
      maxLines: NOTE_MAX_LINES,
      fontFamily: body,
      bold: false,
    })
    if (name === null || note === null) return null
    labels.push({ name, note, change: changeLabel(entry.first, entry.last) })
  }

  // The largest value size at which every block fits. Each block keeps room
  // for a two-line note when the band has it, so the blocks stand on the
  // same rhythm whatever their notes run to.
  let layout: { size: number; pitches: number[] } | null = null
  for (const size of VALUE_SIZES) {
    if (labels.some((label) => fitFixed(label.change, { width: railW, size, lineHeight: size, maxLines: 1, fontFamily: fonts.heading, bold: false }) === null)) continue
    const noteAt = valueBaseline(size) + VALUE_TO_NOTE
    for (const reserve of [NOTE_MAX_LINES, 0]) {
      const heights = labels.map((label) => noteAt + (Math.max(reserve, label.note.lines.length) - 1) * NOTE_LINE_HEIGHT + NOTE_DESCENT)
      const total = FIRST_BLOCK + heights.reduce((a, b) => a + b, 0) + BLOCK_GAP * (heights.length - 1)
      if (total <= rect.h) {
        layout = { size, pitches: heights.map((h) => h + BLOCK_GAP) }
        break
      }
    }
    if (layout) break
  }
  if (!layout) return null
  const fit = layout

  const nameInk = accessibleInk(colors.muted, bg, LABEL_SIZE)
  const leadInk = accessibleInk(colors.primary, bg, fit.size)
  const quietInk = accessibleInk(colors.muted, bg, fit.size)
  const noteInk = accessibleInk(colors.text, bg, NOTE_SIZE)
  const quietNoteInk = accessibleInk(colors.muted, bg, NOTE_SIZE)
  const valueY = valueBaseline(fit.size)
  let cursor = rect.y + FIRST_BLOCK

  return (
    <g {...compositionTag("rail")}>
      <SvgContent components={[chart]} rect={chartRect} ctx={ctx} />
      {/* The plot is tagged where it is drawn. The column is part of the
          same chart, so it enters with it. */}
      <g {...blockTag(ctx, chart)}>
      <line
        x1={dividerX}
        y1={rect.y}
        x2={dividerX}
        y2={rect.y + rect.h - DIVIDER_FOOT}
        stroke={ruleInk(ctx)}
        strokeWidth={1}
      />
      {labels.map((label, i) => {
        const top = cursor
        cursor += fit.pitches[i]!
        const color = palette[i % palette.length]!
        const lead = marked === i
        const quiet = marked >= 0 && !lead
        const valueText = (
          <text
            x={railX}
            y={top + valueY}
            fontFamily={fonts.heading}
            fontSize={fit.size}
            fill={quiet ? quietInk : leadInk}
            dominantBaseline="alphabetic"
          />
        )
        return (
          <g key={i}>
            {swatchIsLine(chart, entries[i]!.series) ? (
              <rect x={railX} y={top + 10} width={SWATCH_W} height={3} fill={color} />
            ) : (
              <rect x={railX} y={top + 6} width={SWATCH_W} height={12} fill={color} />
            )}
            {paintLines(label.name, { ctx, x: labelX, y: top + LABEL_BASELINE, fill: nameInk, fontFamily: body, fontWeight: "400" })}
            {renderEmphasisText(
              [{ text: label.change, emphasized: lead }],
              headingEmphasisPaint(ctx, { fontSize: fit.size }, {
                baseFill: quiet ? quietInk : leadInk,
                fontWeight: "400",
                fontFamily: fonts.heading,
                bold: false,
              }),
              valueText,
            )}
            {paintLines(label.note, {
              ctx,
              x: railX,
              y: top + valueY + VALUE_TO_NOTE,
              fill: quiet ? quietNoteInk : noteInk,
              fontFamily: body,
              fontWeight: "400",
            })}
          </g>
        )
      })}
      </g>
    </g>
  )
}
