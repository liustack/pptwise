import type React from "react"
import type { Component } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import { groupDigits } from "../../lib/quantity-format"
import { measureTextUnits } from "../../lib/svg-text-layout"
import { mostlyChinese } from "../../lib/text-script"
import { accessibleInk } from "../../render/ink"
import { StatusMark, statusGround, statusWords } from "../../render/mark-status"
import { markTint, quietMarkFill } from "./notice"

type Chart = Extract<Component, { type: "chart" }>
type Point = Chart["series"][number]["data"][number]

/*
 * What the hand-set plots share: `columns` (upright bars), `bars` (bars
 * across) and `bridge` (a waterfall). They were drawn for bulletin's 2026-10
 * board, where a chart page shows no value axis at all: the legend and the
 * unit sit over the plot on the left, every bar carries its own value, the
 * marked series is the only one in the primary colour and the rest recede to
 * a light grey. A value that is not a reported figure is drawn as what it is:
 * a forecast hatched, a target as a dashed outline over a pale tint.
 *
 * Every helper reads the theme's tokens only.
 */

/** Type sizes the plots set, from the board. */
export const PLOT_TYPE = {
  /** Legend entries, the unit line, and an axis note. */
  meta: 16,
  /** Category names under the bars. */
  category: 17,
  /** A value over one of several bars. */
  value: 18,
  /** A value over the one bar in its category, and a change bracket's figure. */
  lead: 20,
} as const

/** Whether the chart's own words are Chinese: its series names, categories and axis titles. */
export function writesChinese(texts: readonly string[]): boolean {
  return mostlyChinese(texts)
}

/** The words a chart writes, for `writesChinese`. */
export function chartTexts(chart: Chart): string[] {
  const texts = chart.series.map((s) => s.name)
  for (const s of chart.series) for (const point of s.data) if (typeof point.x === "string") texts.push(point.x)
  const axes = chart.axes
  for (const title of [axes?.x_title, axes?.y_title]) if (title) texts.push(title)
  return texts
}

/** The decimals a value was written with, read from its shortest form. */
export function decimalsOf(v: number): number {
  const text = String(Number(v.toPrecision(12)))
  const dot = text.indexOf(".")
  return dot < 0 || /e/i.test(text) ? 0 : text.length - dot - 1
}

/**
 * A value as the author wrote it, with a true minus sign for a negative one,
 * its whole part grouped the way the chart's language prints a figure
 * (`groupDigits`): "2,778" in English, 「8490」 and 「10,575」 in Chinese.
 */
export function plotNumber(v: number, chinese: boolean, decimals = decimalsOf(v), signed = false): string {
  const sign = v < 0 ? "−" : signed && v > 0 ? "+" : ""
  return groupDigits(`${sign}${Math.abs(v).toFixed(Math.min(4, decimals))}`, chinese)
}

/**
 * The decimals a plot prints its reported values with: the most any reported
 * value in the chart was written with, so 11.0 beside 12.1 reads "11.0" and
 * not "11" (JSON keeps no trailing zero, so the written form is lost by the
 * time the chart arrives). A forecast or a target prints as written: it is an
 * estimate, and a decimal it was never given would claim a precision it does
 * not have, so "约 169 万辆" stays 169.
 */
export function reportedDecimals(chart: Chart): number {
  const reported = chart.series.flatMap((s) => s.data.filter((point) => point.status === undefined).map((point) => decimalsOf(point.y)))
  return Math.min(4, Math.max(0, ...reported))
}

/** The decimals one point prints with, given the chart's `reportedDecimals`. */
export function pointDecimals(point: Point, reported: number): number {
  return point.status === undefined ? reported : decimalsOf(point.y)
}

export { changeText } from "../../lib/change-figure"

/** The words a forecast's label and the legend use. */
export function forecastWords(chinese: boolean): { suffix: string; legend: string } {
  const words = statusWords(chinese)
  return { suffix: words.forecastSuffix, legend: words.forecast }
}

/** Width of `text` at `size`, measured the way it is painted. */
export function textWidth(text: string, size: number, fontFamily: string, bold = false): number {
  return measureTextUnits(text, { fontFamily, bold }) * size
}

/** A box a piece of ink takes, for the collision checks the plots run before they commit. */
export interface InkBox {
  x0: number
  y0: number
  x1: number
  y1: number
}

/** The box a line of text takes on its baseline: cap height above, descent below. */
export function textBox(x: number, baseline: number, width: number, size: number, anchor: "start" | "middle" | "end" = "start"): InkBox {
  const left = anchor === "middle" ? x - width / 2 : anchor === "end" ? x - width : x
  return { x0: left, y0: baseline - size * 0.82, x1: left + width, y1: baseline + size * 0.2 }
}

/** Whether two boxes overlap, with `gap` of air required between them. */
export function boxesMeet(a: InkBox, b: InkBox, gap = 2): boolean {
  return a.x0 < b.x1 + gap && b.x0 < a.x1 + gap && a.y0 < b.y1 + gap && b.y0 < a.y1 + gap
}

/** Whether any two boxes in `boxes` meet. */
export function anyMeet(boxes: readonly InkBox[], gap = 2): boolean {
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) if (boxesMeet(boxes[i]!, boxes[j]!, gap)) return true
  return false
}

/** Whether every box stays inside `rect`. */
export function insideRect(boxes: readonly InkBox[], rect: { x: number; y: number; w: number; h: number }): boolean {
  return boxes.every((b) => b.x0 >= rect.x - 0.5 && b.x1 <= rect.x + rect.w + 0.5 && b.y0 >= rect.y - 0.5 && b.y1 <= rect.y + rect.h + 0.5)
}

/** The smallest of 1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6 and 8 times a power of ten at or above `v`. */
export function niceCeil(v: number): number {
  if (!(v > 0)) return 1
  const power = 10 ** Math.floor(Math.log10(v))
  for (const step of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) {
    const candidate = Number((step * power).toPrecision(12))
    if (candidate >= v - 1e-9) return candidate
  }
  return 10 * power
}

/** How a bar is filled. */
export type MarkPaint =
  | { kind: "solid"; fill: string }
  | { kind: "hatch"; ground: string; stripe: string }
  | { kind: "target"; ground: string; stroke: string }

/** The colour of a series: primary when it is the marked one or nothing is marked, the receded grey otherwise. */
export function seriesInk(ctx: ComponentCtx, index: number, marked: number): string {
  if (marked < 0) return ctx.colors.chartPalette[index % ctx.colors.chartPalette.length] ?? ctx.colors.primary
  return index === marked ? ctx.colors.primary : quietMarkFill(ctx)
}

/** Whether the chart marks one bar (`data[].emphasis`) rather than a series. */
export function marksOnePoint(chart: Chart): boolean {
  return chart.series.some((s) => s.data.some((point) => point.emphasis === true))
}

/**
 * The colour of one bar: with a bar marked, that bar in primary and every
 * other bar in the receded grey, the way a marked series sets itself apart.
 * Otherwise its series' colour (`seriesInk`).
 */
export function barInk(ctx: ComponentCtx, chart: Chart, index: number, point: Point, marked: number): string {
  if (marksOnePoint(chart)) return point.emphasis === true ? ctx.colors.primary : quietMarkFill(ctx)
  return seriesInk(ctx, index, marked)
}

/** The ground a hatched or outlined bar of `color` sits on: a pale tint of it. */
export function tintOf(ctx: ComponentCtx, color: string): string {
  if (color.toUpperCase() === ctx.colors.primary.toUpperCase()) return markTint(ctx)
  return statusGround(color, ctx.colors.surface, 0.45)
}

/** How a point of a series in `color` is painted, by its status. */
export function markPaint(ctx: ComponentCtx, color: string, status: Point["status"]): MarkPaint {
  if (status === "forecast") return { kind: "hatch", ground: tintOf(ctx, color), stripe: color }
  if (status === "target") return { kind: "target", ground: tintOf(ctx, color), stroke: color }
  return { kind: "solid", fill: color }
}

/** A bar's rectangle painted the way its status says. */
export function paintMark(
  paint: MarkPaint,
  place: { x: number; y: number; w: number; h: number },
  extra: Record<string, string> = {},
): React.ReactElement {
  const { x, y, w, h } = place
  if (paint.kind === "solid") return <rect x={x} y={y} width={w} height={h} fill={paint.fill} {...extra} />
  if (paint.kind === "hatch") return <StatusMark status="forecast" color={paint.stripe} ground={paint.ground} x={x} y={y} w={w} h={h} extra={extra} />
  return <StatusMark status="target" color={paint.stroke} ground={paint.ground} x={x} y={y} w={w} h={h} extra={extra} />
}

/** One legend entry: its swatch paint and its name. */
export interface LegendEntry {
  name: string
  paint: MarkPaint
}

const SWATCH = 14
const SWATCH_TEXT_GAP = 8
const ENTRY_GAP = 30

/** The legend laid out from `x` on `baseline`, or `null` when it does not fit `maxW` in one row. */
export function layoutLegend(
  entries: readonly LegendEntry[],
  x: number,
  baseline: number,
  maxW: number,
  fontFamily: string,
): { items: { entry: LegendEntry; x: number }[]; box: InkBox } | null {
  let cursor = x
  const items = entries.map((entry) => {
    const at = cursor
    cursor += SWATCH + SWATCH_TEXT_GAP + textWidth(entry.name, PLOT_TYPE.meta, fontFamily) + ENTRY_GAP
    return { entry, x: at }
  })
  const right = cursor - ENTRY_GAP
  if (right - x > maxW) return null
  return { items, box: { x0: x, y0: baseline - SWATCH + 2, x1: right, y1: baseline + PLOT_TYPE.meta * 0.2 } }
}

/** Paints a laid-out legend. */
export function paintLegend(
  legend: NonNullable<ReturnType<typeof layoutLegend>>,
  baseline: number,
  ctx: ComponentCtx,
): React.ReactElement {
  const bg = ctx.defaultBg ?? ctx.colors.bg
  const ink = accessibleInk(ctx.colors.muted, bg, PLOT_TYPE.meta)
  return (
    <g data-plot-legend="">
      {legend.items.map(({ entry, x }, i) => {
        const swatch = { x, y: baseline - SWATCH + 2, w: SWATCH, h: SWATCH }
        // A target's swatch is its tint alone: a dashed outline at 14px reads as noise.
        const paint: MarkPaint = entry.paint.kind === "target" ? { kind: "solid", fill: entry.paint.ground } : entry.paint
        return (
          <g key={i}>
            {paintMark(paint, swatch)}
            <text
              x={x + SWATCH + SWATCH_TEXT_GAP}
              y={baseline}
              fontFamily={ctx.fonts.body}
              fontSize={PLOT_TYPE.meta}
              fill={ink}
              dominantBaseline="alphabetic"
            >
              {entry.name}
            </text>
          </g>
        )
      })}
    </g>
  )
}

/** A line of small muted text: the unit, an axis note. */
export function MetaLine({
  text,
  x,
  y,
  ctx,
  anchor = "start",
}: {
  text: string
  x: number
  y: number
  ctx: ComponentCtx
  anchor?: "start" | "end"
}) {
  const bg = ctx.defaultBg ?? ctx.colors.bg
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor === "end" ? "end" : undefined}
      fontFamily={ctx.fonts.body}
      fontSize={PLOT_TYPE.meta}
      fill={accessibleInk(ctx.colors.muted, bg, PLOT_TYPE.meta)}
      dominantBaseline="alphabetic"
    >
      {text}
    </text>
  )
}

/** A text the plots set, with its ink and weight decided by the caller. */
export function PlotText({
  text,
  x,
  y,
  size,
  fill,
  ctx,
  bold = false,
  anchor = "middle",
}: {
  text: string
  x: number
  y: number
  size: number
  fill: string
  ctx: ComponentCtx
  bold?: boolean
  anchor?: "start" | "middle" | "end"
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor === "start" ? undefined : anchor}
      fontFamily={ctx.fonts.body}
      fontSize={size}
      fontWeight={bold ? "700" : undefined}
      fill={fill}
      dominantBaseline="alphabetic"
    >
      {text}
    </text>
  )
}
