import type { Component } from "@/ir"
import { groupDigits, isPercentUnit, joinUnit } from "../../lib/quantity-format"
import { measureTextUnits } from "../../lib/svg-text-layout"
import { mostlyChinese } from "../../lib/text-script"
import { emphasisSeriesPalette, recededMarkFill, rotateChartPalette } from "../../render/chart-palette"
import { headingEmphasisPaint, renderEmphasisText } from "../../render/emphasis"
import { accessibleInk } from "../../render/ink"
import { SvgContent } from "../../render/svg-content"
import { bodySlotDropsContent } from "../../render/step-aside"
import { barsComposition } from "./bars"
import { bridgeComposition } from "./bridge"
import { columnsComposition } from "./columns"
import { railFigures, railFiguresNotice } from "./rail-figures"
import { blockTag, compositionTag, ruleInk, type Composition } from "./shared"
import { fitFixed, paintLines } from "./type"

type Chart = Extract<Component, { type: "chart" }>
type Series = Chart["series"][number]

/*
 * rail: a trend chart with a column of figures beside it. The figures are
 * the author's when the page writes them: a chart followed by one or two
 * `kpi_cards` items, and optionally a closing callout or quote, is set by
 * `railFigures` (`./rail-figures.tsx`, the tea board's p03, p06 and p07),
 * which has its own contract. A chart alone gets the column computed here.
 *
 * The computed column: the chart keeps the
 * left of the band, and a column right of a hairline states what each series
 * did from its first category to its last: the series' swatch and name, the
 * change, and the two values it ran between. The change is a whole-number
 * percentage, except for a series whose axis is itself in percent, which
 * changes by points: 80.1% to 91.0% is "+10.9 pts", or 「+10.9 个百分点」 on a
 * chart written in Chinese, to one decimal, with the unit set smaller beside
 * the figure. Every number in the column is computed from the series, so
 * nothing is written twice. A series marked `emphasis` sets its change in
 * `primary` over the theme's emphasis stroke and the others recede to
 * `muted`. Brief's trend page (p03).
 *
 * Takes: one `chart`, alone on the page, on a category axis (upright bars,
 * lines, areas, stacks or a combo), with one to three series, where every
 * series has a value at the first and the last category and, unless its axis
 * is in percent, its first value is above zero.
 *
 * Declines: any other chart type, a horizontal bar, a numeric x axis, more
 * than three series, a series that misses either end, a series not in percent
 * that starts at zero or below, a change too large to state, anything beside
 * the chart, a series name past one line of the column at 16px, a chart that
 * would drop content in the narrower plot, and a column that does not fit the
 * band's height even with its figures at 36px. The face then draws the chart
 * across the full width.
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
 * A change in points carries its unit smaller than the figure, the way the
 * gauge figure sets its unit, and never under the column's 16px label size.
 * The gap clears the highlight a marked figure sits on, which runs past the
 * figure's last glyph by up to about a third of its size.
 */
const POINTS_UNIT_RATIO = 0.35
const POINTS_UNIT_GAP_RATIO = 0.32
const POINTS_UNIT_EN = "pts"
const POINTS_UNIT_ZH = "个百分点"

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
  /** The unit of the axis this series is read against. */
  unit: string | undefined
}

function axisUnit(chart: Chart, series: Series): string | undefined {
  return series.axis === "right" ? chart.axes?.y2_unit : chart.axes?.y_unit
}

function railShape(components: readonly Component[]): { chart: Chart; entries: RailEntry[] } | null {
  if (components.length !== 1) return null
  const chart = components[0]!
  if (chart.type !== "chart" || !RAIL_TYPES.has(chart.chart_type)) return null
  // A horizontal bar has no trend to read, and a stacked chart on its side is a share bar.
  if (chart.direction === "horizontal") return null
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
    if (first === undefined || last === undefined || !Number.isFinite(first) || !Number.isFinite(last)) return null
    const unit = axisUnit(chart, series)
    // A change in points is a difference, and any two percentages have one.
    // A relative change divides by the first value, so it needs one above
    // zero, and one near zero makes the ratio overflow: 5e-324 to -1e163 is
    // -Infinity percent, and no column should print that.
    if (isPercentUnit(unit)) {
      if (!Number.isFinite(last - first)) return null
    } else if (!(first > 0) || !Number.isFinite((last - first) / first)) return null
    entries.push({ series, first, last, unit })
  }
  return { chart, entries }
}

/** "+22%", "-8%" or "0%": the change from first to last, rounded to a whole percent. */
export function changeLabel(first: number, last: number): string {
  const pct = Math.round(((last - first) / first) * 100)
  if (pct === 0) return "0%"
  return `${pct > 0 ? "+" : "-"}${Math.abs(pct)}%`
}

/** "+10.9", "-3.5" or "0.0": the difference from first to last, to one decimal. */
function pointsLabel(first: number, last: number): string {
  const tenths = Math.round((last - first) * 10)
  if (tenths === 0) return "0.0"
  return `${tenths > 0 ? "+" : "-"}${(Math.abs(tenths) / 10).toFixed(1)}`
}

/**
 * The change the column prints for one series: a relative change for most
 * units, and a change in points, with its unit, when the axis is in percent.
 * A rate that went from 80.1% to 91.0% grew by 10.9 points, and "+14%" would
 * read as the rate itself moving by fourteen points.
 */
export function changeFigure(
  first: number,
  last: number,
  unit: string | undefined,
  chinese: boolean,
): { figure: string; unit?: string } {
  if (!isPercentUnit(unit)) return { figure: changeLabel(first, last) }
  return { figure: pointsLabel(first, last), unit: chinese ? POINTS_UNIT_ZH : POINTS_UNIT_EN }
}

/** Whether the chart's own words are Chinese: its series names, categories and axis titles. */
function chartWritesChinese(chart: Chart): boolean {
  const texts = chart.series.map((s) => s.name)
  for (const s of chart.series) for (const point of s.data) if (typeof point.x === "string") texts.push(point.x)
  const axes = chart.axes
  for (const title of [axes?.x_title, axes?.y_title, axes?.y2_title]) if (title) texts.push(title)
  return mostlyChinese(texts)
}

/**
 * "$4.10 → $5.35": the two values in the axis's unit, at the decimals the
 * series was written with, grouped the way the chart's language prints a
 * figure (`groupDigits`).
 */
export function spanLabel(series: Series, first: number, last: number, unit: string | undefined, chinese: boolean): string {
  const decimals = Math.min(MAX_DECIMALS, Math.max(0, ...series.data.map((point) => decimalsOf(point.y))))
  const format = (v: number) => joinUnit(groupDigits(v.toFixed(decimals), chinese), unit, " ")
  return `${format(first)} → ${format(last)}`
}

/** Where a points unit sits after its figure, and how large it is set. */
function pointsUnitMark(figure: string, size: number, fontFamily: string): { dx: number; fontSize: number } {
  const figureW = measureTextUnits(figure, { fontFamily }) * size
  return {
    dx: figureW + Math.round(size * POINTS_UNIT_GAP_RATIO),
    fontSize: Math.max(LABEL_SIZE, Math.round(size * POINTS_UNIT_RATIO)),
  }
}

/** Whether a change, with its unit when it has one, fits one line of the column at `size`. */
function changeFits(change: { figure: string; unit?: string }, size: number, width: number, fontFamily: string): boolean {
  const figure = fitFixed(change.figure, { width, size, lineHeight: size, maxLines: 1, fontFamily, bold: false })
  if (figure === null) return false
  if (!change.unit) return true
  const mark = pointsUnitMark(change.figure, size, fontFamily)
  return mark.dx + measureTextUnits(change.unit, { fontFamily }) * mark.fontSize <= width
}

function swatchIsLine(chart: Chart, series: Series): boolean {
  if (chart.chart_type === "line" || chart.chart_type === "area") return true
  return chart.chart_type === "combo" && series.plot === "line"
}

export const railComposition: Composition = ({ components, ctx, rect, setting }) => {
  // The notice setting sets only the author's figures, beside a hand-set
  // plot when one takes the chart. A chart alone goes to the plots.
  if (setting === "notice") {
    return railFiguresNotice({
      components,
      ctx,
      rect,
      plot: (component, band) => {
        for (const draw of [columnsComposition, barsComposition, bridgeComposition]) {
          const drawn = draw({ components: [component], ctx, rect: band, setting })
          if (drawn) return drawn
        }
        return null
      },
    })
  }
  const authored = railFigures({ components, ctx, rect })
  if (authored) return authored
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

  const chinese = chartWritesChinese(chart)
  const labels = []
  for (const entry of entries) {
    const unit = entry.unit
    const name = fitFixed(entry.series.name, {
      width: right - labelX,
      size: LABEL_SIZE,
      lineHeight: LABEL_SIZE,
      maxLines: 1,
      fontFamily: body,
      bold: false,
    })
    const note = fitFixed(spanLabel(entry.series, entry.first, entry.last, unit, chinese), {
      width: railW,
      size: NOTE_SIZE,
      lineHeight: NOTE_LINE_HEIGHT,
      maxLines: NOTE_MAX_LINES,
      fontFamily: body,
      bold: false,
    })
    if (name === null || note === null) return null
    labels.push({ name, note, change: changeFigure(entry.first, entry.last, unit, chinese) })
  }

  // The largest value size at which every block fits. Each block keeps room
  // for a two-line note when the band has it, so the blocks stand on the
  // same rhythm whatever their notes run to.
  let layout: { size: number; pitches: number[] } | null = null
  for (const size of VALUE_SIZES) {
    if (labels.some((label) => !changeFits(label.change, size, railW, fonts.heading))) continue
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
        const unitMark = label.change.unit ? pointsUnitMark(label.change.figure, fit.size, fonts.heading) : null
        return (
          <g key={i}>
            {swatchIsLine(chart, entries[i]!.series) ? (
              <rect x={railX} y={top + 10} width={SWATCH_W} height={3} fill={color} />
            ) : (
              <rect x={railX} y={top + 6} width={SWATCH_W} height={12} fill={color} />
            )}
            {paintLines(label.name, { ctx, x: labelX, y: top + LABEL_BASELINE, fill: nameInk, fontFamily: body, fontWeight: "400" })}
            {renderEmphasisText(
              [{ text: label.change.figure, emphasized: lead }],
              headingEmphasisPaint(ctx, { fontSize: fit.size }, {
                baseFill: quiet ? quietInk : leadInk,
                fontWeight: "400",
                fontFamily: fonts.heading,
                bold: false,
              }),
              valueText,
            )}
            {unitMark && (
              <text
                x={railX + unitMark.dx}
                y={top + valueY}
                fontFamily={fonts.heading}
                fontSize={unitMark.fontSize}
                fill={accessibleInk(colors.muted, bg, unitMark.fontSize)}
                dominantBaseline="alphabetic"
              >
                {label.change.unit}
              </text>
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
