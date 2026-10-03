import type React from "react"
import type { Component } from "@/ir"
import { isShareBar } from "@/ir/components/chart"

export { isShareBar }
import { groupDigits, joinUnit } from "../lib/quantity-format"
import { measureTextUnits } from "../lib/svg-text-layout"
import { mostlyChinese } from "../lib/text-script"
import { accessibleInk, blendOver, readableOn } from "../render/ink"
import type { ComponentCtx } from "./types"

type Chart = Extract<Component, { type: "chart" }>

/*
 * A share bar: one whole drawn as a single bar across the width, cut into
 * its parts in the order the author lists them. A stacked chart turned on
 * its side with one category is this bar (`isShareBar`), so the author
 * writes it the way a stacked column is written: one series per part, each
 * with its one value at the one category, whose name is the bar's caption.
 *
 * Each part carries its name and its value inside it, set in whichever ink
 * reads on its fill. A part too narrow for them gets them over the bar,
 * right-aligned to its own end, on the caption's line, with a short tick
 * down to it. When the author marks a run of adjacent parts (`emphasis` on
 * each series in it), a line under the bar states the run's total and share
 * of the whole, under the run's own left end, and beside it the largest
 * other part's, under its own: the comparison a page marks a run to make.
 * The totals are computed, so a line with no room for the second leaves it
 * out. Everything the author wrote is drawn whole, or the bar is not drawn.
 *
 * Geometry is swiss's 2026-10 board (p08), from the bar's top: the caption
 * at 16px on a 24px line, the bar 72px tall 36px down, names at 17px bold
 * and values at 16px inside it, the totals at 18px bold 30px under it.
 *
 * The fills are the caller's, one per part: a face sets its own (swiss's
 * grid setting, `../layouts/compositions/share.tsx`), the ordinary chart
 * hands its palette. The share bar reads only `text` and `muted` besides,
 * for the caption, the totals and a part's ink.
 */

/** One part of the whole: a series' one value. */
export interface SharePart {
  name: string
  value: number
  /** Index of the series it comes from. */
  seriesIndex: number
  marked: boolean
}

const CAPTION = { size: 16, box: 24 }
/** The bar's top under the caption's line box, and its height. */
const BAR_TOP = 36
const BAR_H = 72
/** Parts stand this far apart: each part's fill stops short of the next. */
const PART_GAP = 2
const LABEL_INSET = 14
const LABEL_TRAIL = 8
const NAME = { size: 17, baseline: 30 }
const VALUE = { size: 16, baseline: 56 }
/** The totals' baseline under the bar's foot. */
const TOTALS = { size: 18, drop: 30 }
/** Air between two labels on one line. */
const LABEL_AIR = 24
/** The tick from an outside label down toward its part stops this short of the bar. */
const TICK_GAP = 2
/** How far ink reaches below a baseline, as a share of the size. */
const DESCENT = 0.22

/** The bar's natural height from its top: the caption, the bar and the totals line. */
export const SHARE_BAR_H = BAR_TOP + BAR_H + TOTALS.drop + Math.ceil(TOTALS.size * DESCENT)

/** The parts of a share bar, in the author's order, or `null` for a chart that is not one. */
export function shareParts(chart: Chart): SharePart[] | null {
  if (!isShareBar(chart)) return null
  const parts: SharePart[] = []
  for (const [seriesIndex, s] of chart.series.entries()) {
    const point = s.data[0]
    if (!point || s.data.length !== 1) return null
    parts.push({ name: s.name, value: point.y, seriesIndex, marked: s.emphasis === true })
  }
  return parts
}

/** The bar's caption: the name of its one category, as the author wrote it. */
export function shareCaption(chart: Chart): string {
  const x = chart.series[0]?.data[0]?.x
  return x === undefined ? "" : String(x).trim()
}

function decimalsOf(v: number): number {
  const text = String(Number(v.toPrecision(12)))
  const dot = text.indexOf(".")
  return dot < 0 || /e/i.test(text) ? 0 : text.length - dot - 1
}

/** Whether the bar's words are Chinese: its parts' names and its caption. */
function shareChinese(chart: Chart): boolean {
  return mostlyChinese([shareCaption(chart), ...chart.series.map((s) => s.name)])
}

/** A part's value with the chart's unit, at the decimals the parts were written with. */
function figure(value: number, decimals: number, unit: string | undefined, chinese: boolean): string {
  return joinUnit(groupDigits(value.toFixed(decimals), chinese), unit, " ")
}

/** "太阳能和风电" or "Solar and Wind": the names of a run, joined the way the chart's language lists them. */
function runName(names: readonly string[], chinese: boolean): string {
  if (names.length <= 1) return names[0] ?? ""
  const head = names.slice(0, -1).join(chinese ? "、" : ", ")
  return `${head}${chinese ? "和" : " and "}${names[names.length - 1]}`
}

/** "太阳能和风电 18.42 亿千瓦，占 47.3%" or "Solar and Wind 1,842 GW, 47.3%". */
function totalText(name: string, sum: string, share: number, chinese: boolean): string {
  const pct = `${share.toFixed(1)}%`
  return chinese ? `${name} ${sum}，占 ${pct}` : `${name} ${sum}, ${pct}`
}

function width(text: string, size: number, fontFamily: string, bold = false): number {
  return measureTextUnits(text, { fontFamily, bold }) * size
}

export interface ShareBarSpec {
  chart: Chart
  ctx: ComponentCtx
  /** Left edge, top and width of the bar. */
  x: number
  y: number
  w: number
  /** The fill of each part, by part index. */
  fills: readonly string[]
  /** The ink of the marked run's total. */
  markInk: string
}

interface Placed {
  x0: number
  x1: number
}

const meets = (a: Placed, b: Placed) => a.x0 < b.x1 + LABEL_AIR && b.x0 < a.x1 + LABEL_AIR

/**
 * The share bar drawn whole in its band, with its height, or `null` when a
 * part's name and value cannot be set either inside it or over the bar.
 */
export function drawShareBar(spec: ShareBarSpec): { node: React.ReactElement; height: number } | null {
  const { chart, ctx, x, y, w, fills } = spec
  const parts = shareParts(chart)
  if (!parts || parts.length < 2) return null
  const total = parts.reduce((sum, p) => sum + p.value, 0)
  if (!(total > 0) || parts.some((p) => !(p.value >= 0))) return null
  const { colors, fonts } = ctx
  const body = fonts.body
  const bg = ctx.defaultBg ?? colors.bg
  const chinese = shareChinese(chart)
  const unit = chart.axes?.y_unit?.trim() || undefined
  const decimals = Math.min(4, Math.max(0, ...parts.map((p) => decimalsOf(p.value))))
  const caption = shareCaption(chart)
  const captionBaseline = y + Math.round(CAPTION.box / 2 + CAPTION.size * 0.385)
  const barTop = y + BAR_TOP
  const captionInk = accessibleInk(colors.muted, bg, CAPTION.size)

  // Each part's span, then its labels inside it or over the bar.
  let cursor = x
  const spans = parts.map((part) => {
    const span = (part.value / total) * w
    const placed = { x0: cursor, x1: cursor + span }
    cursor += span
    return placed
  })
  const captionBox: Placed = { x0: x, x1: x + (caption ? width(caption, CAPTION.size, body) : 0) }
  const outside: { index: number; text: string; box: Placed; tickX: number }[] = []
  const inside: { index: number; value: string }[] = []
  for (const [i, part] of parts.entries()) {
    const value = figure(part.value, decimals, unit, chinese)
    const room = spans[i]!.x1 - spans[i]!.x0 - PART_GAP - LABEL_INSET - LABEL_TRAIL
    const fitsInside = width(part.name, NAME.size, body, true) <= room && width(value, VALUE.size, body) <= room
    if (fitsInside) {
      inside.push({ index: i, value })
      continue
    }
    const text = `${part.name} ${value}`
    const right = Math.min(x + w, spans[i]!.x1 - PART_GAP / 2)
    outside.push({ index: i, text, box: { x0: right - width(text, CAPTION.size, body), x1: right }, tickX: (spans[i]!.x0 + spans[i]!.x1 - PART_GAP) / 2 })
  }
  // Labels over the bar stand clear of the caption and of each other.
  const overhead = [captionBox, ...outside.map((o) => o.box)]
  for (let i = 0; i < overhead.length; i++) {
    if (overhead[i]!.x0 < x - 0.5) return null
    for (let j = i + 1; j < overhead.length; j++) if (meets(overhead[i]!, overhead[j]!)) return null
  }

  // The totals line: the marked run's, then the largest other part's, each
  // under its own left end. Computed, so a second total with no room is left out.
  const marked = parts.flatMap((p, i) => (p.marked ? [i] : []))
  const totals: { text: string; x: number; ink: string }[] = []
  if (marked.length > 0) {
    const sum = marked.reduce((s, i) => s + parts[i]!.value, 0)
    const text = totalText(runName(marked.map((i) => parts[i]!.name), chinese), figure(sum, decimals, unit, chinese), (sum / total) * 100, chinese)
    const at = spans[marked[0]!]!.x0
    if (at + width(text, TOTALS.size, body, true) <= x + w) {
      totals.push({ text, x: at, ink: accessibleInk(spec.markInk, bg, TOTALS.size) })
      const others = parts.flatMap((p, i) => (p.marked ? [] : [i]))
      const rival = others.reduce<number | null>((best, i) => (best === null || parts[i]!.value > parts[best]!.value ? i : best), null)
      if (rival !== null) {
        const other = parts[rival]!
        const otherText = totalText(other.name, figure(other.value, decimals, unit, chinese), (other.value / total) * 100, chinese)
        const otherW = width(otherText, TOTALS.size, body, true)
        const otherX = Math.min(spans[rival]!.x0, x + w - otherW)
        const first: Placed = { x0: at, x1: at + width(text, TOTALS.size, body, true) }
        if (!meets(first, { x0: otherX, x1: otherX + otherW })) totals.push({ text: otherText, x: otherX, ink: accessibleInk(colors.text, bg, TOTALS.size) })
      }
    }
  }
  const height = totals.length > 0 ? SHARE_BAR_H : BAR_TOP + BAR_H

  const nodes: React.ReactNode[] = []
  for (const [i, span] of spans.entries()) {
    const fill = fills[i]!
    nodes.push(
      <rect
        key={`part-${i}`}
        data-plot-mark="1"
        data-share-part={parts[i]!.name}
        x={span.x0}
        y={barTop}
        width={Math.max(0, span.x1 - span.x0 - (i < spans.length - 1 ? PART_GAP : 0))}
        height={BAR_H}
        fill={fill}
      />,
    )
  }
  for (const { index, value } of inside) {
    const fill = fills[index]!
    const ink = (size: number) => accessibleInk(readableOn(fill), fill, size)
    const tx = spans[index]!.x0 + LABEL_INSET
    nodes.push(
      <g key={`label-${index}`}>
        <text x={tx} y={barTop + NAME.baseline} fontFamily={body} fontSize={NAME.size} fontWeight="700" fill={ink(NAME.size)} dominantBaseline="alphabetic">
          {parts[index]!.name}
        </text>
        <text x={tx} y={barTop + VALUE.baseline} fontFamily={body} fontSize={VALUE.size} fill={ink(VALUE.size)} dominantBaseline="alphabetic">
          {value}
        </text>
      </g>,
    )
  }
  for (const label of outside) {
    nodes.push(
      <g key={`over-${label.index}`} data-share-over="">
        <text x={label.box.x1} y={captionBaseline} textAnchor="end" fontFamily={body} fontSize={CAPTION.size} fill={captionInk} dominantBaseline="alphabetic">
          {label.text}
        </text>
        <line
          x1={label.tickX}
          y1={captionBaseline + 8}
          x2={label.tickX}
          y2={barTop - TICK_GAP}
          stroke={accessibleInk(colors.muted, bg, CAPTION.size)}
          strokeWidth={1}
        />
      </g>,
    )
  }
  for (const [k, t] of totals.entries()) {
    nodes.push(
      <text key={`total-${k}`} data-share-total="" x={t.x} y={barTop + BAR_H + TOTALS.drop} fontFamily={body} fontSize={TOTALS.size} fontWeight="700" fill={t.ink} dominantBaseline="alphabetic">
        {t.text}
      </text>,
    )
  }
  return {
    height,
    node: (
      <g data-share-bar="">
        {caption && (
          <text x={x} y={captionBaseline} fontFamily={body} fontSize={CAPTION.size} fill={captionInk} dominantBaseline="alphabetic">
            {caption}
          </text>
        )}
        {nodes}
      </g>
    ),
  }
}

/** How far each further part of a marked run steps from the lead colour toward the surface. */
const RUN_STEP = 0.4

/**
 * Fills for a share bar's parts. With a run marked, the run takes `mark`,
 * each further part of it a step lighter toward `surface`, and the other
 * parts `others` in turn. With nothing marked, every part takes `others` in
 * turn.
 */
export function shareFills(
  parts: readonly SharePart[],
  inks: { mark: string; others: readonly string[]; surface: string },
): string[] {
  let inRun = 0
  let other = 0
  return parts.map((part) => {
    if (part.marked) return blendOver(inks.mark, inks.surface, Math.max(0, 1 - RUN_STEP * inRun++))
    return inks.others[other++ % inks.others.length]!
  })
}
