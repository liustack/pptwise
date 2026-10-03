import type { Component } from "@/ir"
import { CHART_AXIS_LIMIT } from "@/ir/components/chart"
import type React from "react"
import { fitSvgLine, layoutSvgText, measureTextUnits } from "../lib/svg-text-layout"
import { recededMarkFill } from "../render/chart-palette"
import { DroppedContentMarker } from "../render/drop-marker"
import { accessibleInk, graphicInk } from "../render/ink"
import { mixHex } from "./color-mix"
import type { ComponentCtx, RenderDef, SvgComponent } from "./types"
import { mostlyChinese } from "../lib/text-script"
import { figureStyleOf, groupDigits, joinUnit, type FigureStyle } from "../lib/quantity-format"

type WaterfallComponent = Extract<Component, { type: "waterfall" }>
type WaterfallItem = WaterfallComponent["items"][number]

/**
 * Waterfall bridge chart (structure-components wave task 2, decision 5): a
 * full-body component (`FULL_BODY_TYPES`, `component-traits.ts`) — the sole
 * component `svg-content.tsx` ever hands this to fills the whole content rect,
 * no sibling components on the same slide (`checkFullBodyExclusivity`,
 * `api.ts`).
 *
 * Deliberately its own component, not folded into `chart`'s `ChartSeries`
 * union (recon finding: `chart.tsx`'s `measure()` hardcodes `CHART_H=240`
 * for every chart subtype — a fixed height a full-body component, which must
 * fill whatever `box.h` it's handed, would just inherit as dead weight). The
 * vertical floating-bar geometry below is adapted from `chart-svg.tsx`'s
 * `renderBarHorizontal` (the only existing proportional-*value* positioning
 * primitive in this codebase) rotated to a vertical axis and given a running-
 * total baseline instead of a fixed zero baseline per bar.
 *
 * **Running-total derivation** (`computeBars`, pure function of `items`,
 * deterministic): each item's `value` is a signed delta added to the
 * previous bar's running total — the bar floats from the old total to the
 * new one. An item explicitly marked `kind: "total"` is instead a grounded
 * checkpoint: its bar always spans `[0, value]` (baseline to the declared
 * absolute total) and *resets* the running total to `value`, rather than
 * adding to it — the classic "subtotal so far" bar a real waterfall chart
 * uses mid-sequence. When the *last* item isn't itself `kind: "total"`, one
 * more bar is appended automatically (`AUTO_TOTAL_LABEL`, "Total"), grounded
 * the same way, at whatever the running total ended up being — every
 * waterfall this component renders visually resolves to a final total bar,
 * with zero authored input required for the common case.
 *
 * **Color policy** (decision 7: theme tokens only, no hardcoded semantic red/
 * green): rise = `colors.accent` (the conventional "up" read), fall =
 * `colors.primary` (this repo's theme tokens skew primary toward the darker
 * brand color and accent toward the brighter highlight — see `swot.tsx`'s
 * own ctx fixture, `primary:"#051C2C"` navy vs `accent:"#FFC72C"` gold — so a
 * flat `primary` fill reads as the visually "heavier"/darker bar next to a
 * bright rise, without inventing a non-token color), total =
 * `mixHex(colors.primary, colors.accent, 0.5)` (a third, visually distinct
 * blend of the same two tokens — the "涨/跌/合计三色" mandate reads as
 * "accent, primary, and a mix of the two", not a fourth free token; there is
 * no 4th semantic slot to spend, same reasoning `swot.tsx`'s `badgeFill`
 * documents for its own primary/muted Threats blend).
 *
 * **Text never sits on a painted bar** (deliberate, sidesteps a whole class
 * of contrast bookkeeping): value labels sit just above a bar whose far tip
 * reads positive, or just below one whose far tip reads negative; category
 * labels sit in the reserved band below the whole plot. Every text element
 * therefore renders on the *page* background, the same "page-bg" surface
 * `chart.tsx`/`chart-svg.tsx`'s own category/value labels already use raw
 * `colors.text` on ("no-muted-fill"/`chart`'s "page-bg" precedent,
 * `MUTED_SURFACE_CLASS`) — but this file threads every one of them through
 * `accessibleInk` regardless (against the real resolved page background,
 * `ctx.defaultBg ?? ctx.colors.bg`) since a full-body component renders
 * without any surrounding layout branding to fall back on. The zero-baseline
 * reference line and inter-bar dashed connectors are strokes, never a text
 * fill, using `colors.muted` — the same "stroke-only, not a muted *fill*"
 * carve-out `bullets.tsx`/`rings.tsx`/`comparison.tsx` already rely on
 * (`MUTED_SURFACE_CLASS`'s "no-muted-fill" class), so this component still
 * classifies "no-muted-fill" there despite touching the token.
 *
 * **Emphasis** (`items[].emphasis`, `emphasis_label`): an author who marks the
 * bars the page is about gets a second color policy. The marked bars take
 * `colors.accent`, every total takes `colors.primary`, and every other bar
 * recedes to one grey (`recededMarkFill`) with its value printed in `muted`.
 * A bracket in `primary` spans the outer edges of the first and last marked
 * bar, its ends hooked down, and `emphasis_label` sits centered over it, in
 * a band reserved above the plot so neither can meet a value label. validate
 * keeps the marked bars side by side and off the totals, so one bracket
 * always covers exactly them. A bridge with nothing marked keeps the policy
 * above, byte for byte.
 *
 * **Truncated axis** (every theme): a bridge whose every level is positive
 * and whose lowest level is at least half its highest spends most of its
 * height on the stretch below the lowest level, where every total bar is the
 * same solid block and no movement happens. Such a bridge starts its axis at
 * a floor instead (`truncatedFloor`), so the movements get the height. Every
 * total bar then stands on the floor rather than on zero, so it is marked as
 * cut: two strokes in the page background across its foot, the way a broken
 * axis is drawn by hand. The strokes sit inside the bar's own lower stretch,
 * where no text is, and a box too short to keep them clear of the bar's top
 * draws the bridge from zero instead.
 */

const LABEL_TOP_PAD = 32
/** emphasis_label: size, weight and the baseline it sits on from the box top. */
const EMPHASIS_LABEL_FONT = 18
const EMPHASIS_LABEL_MIN_FONT = 16
/** Label baseline down to the bracket's crossbar. */
const BRACKET_GAP = 12
/** How far each end of the bracket hooks down toward the bars. */
const BRACKET_HOOK = 10
const BRACKET_STROKE = 1.5
/** Air between the bracket's hooks and the value labels' band below them. */
const BRACKET_AIR = 4
/** The band the label and bracket take above the plot's own top pad. */
const EMPHASIS_BAND_H = EMPHASIS_LABEL_FONT + BRACKET_GAP + BRACKET_HOOK + BRACKET_AIR
/** Truncated axis: the floor sits this share of the levels' span below the lowest level, before rounding down. */
const FLOOR_SPAN_SHARE = 0.8
/** Truncated axis: the lowest level must be at least this share of the highest. */
const TRUNCATE_MIN_RATIO = 0.5
/** Cut marks: centers above the bar foot, stroke, and rise across the bar. */
const BREAK_MARK_OFFSETS = [30, 39] as const
const BREAK_MARK_STROKE = 3
const BREAK_MARK_RISE = 12
/** Cut marks reach past the bar's sides so the cut reads across its whole width. */
const BREAK_MARK_OVERHANG = 4
/** Shortest total bar the cut marks fit on with clear bar above them. */
const BREAK_MIN_BAR_H = BREAK_MARK_OFFSETS[1] + BREAK_MARK_RISE / 2 + 12
const LABEL_BOTTOM_PAD = 50
const BAR_INSET_RATIO = 0.18
const BAR_INSET_MAX = 22
const MIN_BAR_H = 3
const VALUE_GAP = 6
const VALUE_FONT = 16
const VALUE_MIN_FONT = 16
const CATEGORY_FONT = 16
const CATEGORY_MIN_FONT = 16
const CATEGORY_BOTTOM_MARGIN = 10
/** Baseline to baseline between a category name's two lines (`layoutSvgText`'s own line height at 16px). */
const CATEGORY_LINE_H = Math.round(CATEGORY_FONT * 1.08)
const CONNECTOR_DASH = "4 3"
/** Natural (unstretched) height — full-body geometry is always driven by the
 * given `box.h` at render time (`checkFullBodyExclusivity` guarantees this is
 * always the slide's sole component), so this only matters as a fallback for
 * a caller that invokes `measure`/`render` without going through the
 * full-body path (e.g. a direct component-level test). */
const NATURAL_H = 420

const AUTO_TOTAL_LABEL = "Total"
/** The automatic total when the bars are labelled in Chinese (`mostlyChinese`). */
const AUTO_TOTAL_LABEL_ZH = "合计"

export type BarKind = "rise" | "fall" | "total"

export interface Bar {
  label: string
  start: number
  end: number
  kind: BarKind
  /** Signed delta for a delta bar, absolute total for a total bar — exactly
   * what the value label displays. */
  displayValue: number
  /** The author marked this bar (`items[].emphasis`). Never a total. */
  emphasis: boolean
}

/** Deterministic running-total derivation — see file header. Pure function of
 * `items`, no `Date`/`random` anywhere in this file. */
export function computeBars(items: readonly WaterfallItem[]): Bar[] {
  let running = 0
  const bars: Bar[] = items.map((item) => {
    const emphasis = item.emphasis === true
    if (item.kind === "total") {
      running = item.value
      return { label: item.label, start: 0, end: item.value, kind: "total", displayValue: item.value, emphasis }
    }
    const start = running
    running = running + item.value
    return {
      label: item.label,
      start,
      end: running,
      kind: item.value < 0 ? "fall" : "rise",
      displayValue: item.value,
      emphasis,
    }
  })
  const last = items[items.length - 1]
  if (!last || last.kind !== "total") {
    const label = mostlyChinese(items.map((item) => item.label)) ? AUTO_TOTAL_LABEL_ZH : AUTO_TOTAL_LABEL
    bars.push({ label, start: 0, end: running, kind: "total", displayValue: running, emphasis: false })
  }
  return bars
}

/** `v` rounded down to its own leading digit: 3.1 to 3, 3312 to 3000, 0.95 to 0.9. */
function niceFloor(v: number): number {
  const step = 10 ** Math.floor(Math.log10(v))
  return Number((Math.floor(Number((v / step).toPrecision(12))) * step).toPrecision(12))
}

/**
 * Where a truncated axis starts, or null when the bridge draws from zero.
 *
 * The levels are every running total a bar starts or ends at, and every total.
 * A bridge truncates when all of them are positive and the lowest is at least
 * half the highest: from 4.10 to 5.35, 4.10 of every bar's height would be
 * the same solid block under the movements. The floor sits 0.8 of the levels'
 * span below the lowest level, rounded down to a leading digit, so the lowest
 * total keeps a visible stretch of its own: 4.10 to 5.35 starts at 3.00.
 * Levels that never move leave nothing to stretch and draw from zero.
 */
export function truncatedFloor(bars: readonly Bar[]): number | null {
  const levels = bars.flatMap((b) => (b.kind === "total" ? [b.end] : [b.start, b.end]))
  if (!levels.every((v) => v > 0)) return null
  const low = Math.min(...levels)
  const high = Math.max(...levels)
  if (high === low || low < TRUNCATE_MIN_RATIO * high) return null
  return niceFloor(low - FLOOR_SPAN_SHARE * (high - low))
}

/** Y-domain spanning every bar's real extent, always including 0 (the
 * baseline) even when every bar sits entirely above or below it (an
 * all-rises or all-falls deck). A truncated axis spans from its floor
 * instead, and the bars that stand on zero are drawn from the floor. */
function yDomain(bars: readonly Bar[], floor: number | null): { min: number; max: number } {
  const values = bars.flatMap((b) => [b.start, b.end])
  if (floor !== null) return { min: floor, max: Math.max(...values) }
  const min = Math.min(0, ...values)
  const max = Math.max(0, ...values)
  return min === max ? { min: min - 1, max: max + 1 } : { min, max }
}

function fillFor(kind: BarKind, ctx: ComponentCtx): string {
  switch (kind) {
    case "rise":
      return ctx.colors.accent
    case "fall":
      return ctx.colors.primary
    case "total":
      return mixHex(ctx.colors.primary, ctx.colors.accent, 0.5)
  }
}

/** Bar fill once the author has marked bars: see the file header's Emphasis. */
function emphasisFillFor(bar: Bar, ctx: ComponentCtx, receded: string): string {
  if (bar.kind === "total") return ctx.colors.primary
  return bar.emphasis ? ctx.colors.accent : receded
}

/** The most decimals any label prints, past which a bridge is not read. */
const MAX_DECIMALS = 4

/** Decimal places `v` was written with, read from its shortest form. */
function decimalsOf(v: number): number {
  const text = String(Number(v.toPrecision(12)))
  const dot = text.indexOf(".")
  return dot < 0 || /e/i.test(text) ? 0 : text.length - dot - 1
}

/**
 * Every bar prints the same number of decimals, the most any authored value
 * was written with: a bridge from 4.10 by 0.48 and 0.05 reads 4.10, +0.48,
 * +0.05, never 4.1 and +0.1. The whole part is grouped the way the bars'
 * language prints a figure (`groupDigits`): "+2,050" in English, 「+2050」 and
 * 「+10,575」 in Chinese. A unit follows after a space ("382.1 万辆"), a
 * percent sign or a magnitude glues on ("12%", "3.8m"), and a currency sign
 * leads.
 */
function formatValue(v: number, unit: string | undefined, signed: boolean, decimals: number, figures: FigureStyle): string {
  const sign = v < 0 ? "-" : signed && v > 0 ? "+" : ""
  return joinUnit(groupDigits(`${sign}${Math.abs(v).toFixed(decimals)}`, figures), unit, " ")
}

interface CategoryLabel {
  lines: string[]
  truncated: boolean
}

/**
 * A bar's category name, on one line or two.
 *
 * One line first, fitted to its column. A name too long for that used to be
 * cut ("Seat expansion in existing accounts" came out as "Seat expansion in")
 * with the page's whole bottom band to spare. It now wraps onto a second line
 * under the first, and only a name too long for two lines is cut and marked
 * `data-truncated`.
 */
function categoryLabel(label: string, maxWidth: number): CategoryLabel {
  const one = fitSvgLine(label, { maxWidth, fontSize: CATEGORY_FONT, minFontSize: CATEGORY_MIN_FONT })
  if (!one.truncated) return { lines: [one.text], truncated: false }
  const two = layoutSvgText(label, { maxWidth, fontSize: CATEGORY_FONT, minPt: CATEGORY_MIN_FONT, maxLines: 2 })
  return { lines: two.lines, truncated: two.truncated }
}

interface Geom {
  bars: Bar[]
  colW: number
  barInset: number
  plotTop: number
  plotH: number
  valueToY: (v: number) => number
  categories: CategoryLabel[]
  /** Lines the tallest category name takes, and so the band every name hangs in. */
  categoryLines: number
  /** Where the axis starts when it is truncated, else null. */
  floor: number | null
}

/**
 * True when a bar starts or ends past `CHART_AXIS_LIMIT`, or at a running
 * total that is no longer a finite number. validate refuses both, so one
 * reaching the renderer has come round the gate. The scale would divide
 * Infinity by Infinity and draw every bar at NaN, so the renderer declines
 * first and says so.
 */
function pastAxisLimit(bars: readonly Bar[]): boolean {
  return bars.some((bar) => !(Math.abs(bar.start) <= CHART_AXIS_LIMIT && Math.abs(bar.end) <= CHART_AXIS_LIMIT))
}

function geom(bars: Bar[], w: number, h: number, topBand: number): Geom {
  const colW = w / bars.length
  const categories = bars.map((bar) => categoryLabel(bar.label, colW - 4))
  const categoryLines = Math.max(1, ...categories.map((c) => c.lines.length))
  // A second line of names takes its height from the plot, so the bars and
  // the value labels under a falling bar keep the clearance they had above a
  // single line.
  const plotTop = topBand + LABEL_TOP_PAD
  const plotH = Math.max(1, h - plotTop - LABEL_BOTTOM_PAD - (categoryLines - 1) * CATEGORY_LINE_H)
  const barInset = Math.min(BAR_INSET_MAX, colW * BAR_INSET_RATIO)
  const scale = (floor: number | null) => {
    const { min, max } = yDomain(bars, floor)
    return (v: number) => plotTop + plotH - ((v - min) / (max - min)) * plotH
  }
  // The cut marks need a stretch of every total bar to themselves. A plot
  // too short to give them one draws the bridge from zero.
  let floor = truncatedFloor(bars)
  if (floor !== null) {
    const y = scale(floor)
    const shortest = Math.min(...bars.filter((b) => b.kind === "total").map((b) => y(floor!) - y(b.end)))
    if (shortest < BREAK_MIN_BAR_H) floor = null
  }
  return { bars, colW, barInset, plotTop, plotH, valueToY: scale(floor), categories, categoryLines, floor }
}

/** The two background strokes across a total bar's foot that say it is cut. */
function breakMarks(barX: number, barW: number, yBot: number, bg: string): React.ReactElement[] {
  return BREAK_MARK_OFFSETS.map((offset) => (
    <line
      key={`break-${offset}`}
      data-axis-break="1"
      x1={barX - BREAK_MARK_OVERHANG}
      y1={yBot - offset + BREAK_MARK_RISE / 2}
      x2={barX + barW + BREAK_MARK_OVERHANG}
      y2={yBot - offset - BREAK_MARK_RISE / 2}
      stroke={bg}
      strokeWidth={BREAK_MARK_STROKE}
    />
  ))
}

export const waterfall: SvgComponent<WaterfallComponent> = {
  measure() {
    return NATURAL_H
  },
  render(component, box, ctx) {
    const h = box.h ?? NATURAL_H
    const bars = computeBars(component.items)
    const decimals = Math.min(MAX_DECIMALS, Math.max(0, ...component.items.map((item) => decimalsOf(item.value))))
    const figures = ctx.figures ?? figureStyleOf(mostlyChinese(component.items.map((item) => item.label)))
    if (pastAxisLimit(bars)) return <DroppedContentMarker count={1} kind="component" />
    const emphasized = bars.some((bar) => bar.emphasis)
    const emphasisLabel = emphasized ? component.emphasis_label : undefined
    const g = geom(bars, box.w, h, emphasisLabel === undefined ? 0 : EMPHASIS_BAND_H)
    const bg = ctx.defaultBg ?? ctx.colors.bg
    const baselineY = box.y + g.valueToY(g.floor ?? 0)
    const receded = emphasized ? recededMarkFill(ctx.colors.muted, bg) : ""

    return (
      <g>
        <line
          x1={box.x}
          y1={baselineY}
          x2={box.x + box.w}
          y2={baselineY}
          stroke={ctx.colors.muted}
          strokeOpacity={0.3}
          strokeWidth={1}
        />
        {g.bars.map((bar, i) => {
          if (i === 0) return null
          const prev = g.bars[i - 1]
          const y = box.y + g.valueToY(prev.end)
          const x1 = box.x + i * g.colW - g.barInset
          const x2 = box.x + i * g.colW + g.barInset
          return (
            <line
              key={`connector-${i}`}
              x1={x1}
              y1={y}
              x2={x2}
              y2={y}
              stroke={ctx.colors.muted}
              strokeOpacity={0.55}
              strokeDasharray={CONNECTOR_DASH}
              strokeWidth={1.25}
            />
          )
        })}
        {g.bars.map((bar, i) => {
          const barX = box.x + i * g.colW + g.barInset
          const barW = Math.max(1, g.colW - g.barInset * 2)
          const topVal = Math.max(bar.start, bar.end)
          // A truncated axis has nothing below its floor: a bar that stands
          // on zero stands on the floor instead.
          const botVal = g.floor === null ? Math.min(bar.start, bar.end) : Math.max(g.floor, Math.min(bar.start, bar.end))
          let yTop = box.y + g.valueToY(topVal)
          let yBot = box.y + g.valueToY(botVal)
          if (yBot - yTop < MIN_BAR_H) {
            const mid = (yTop + yBot) / 2
            yTop = mid - MIN_BAR_H / 2
            yBot = mid + MIN_BAR_H / 2
          }
          const barH = yBot - yTop
          const above = bar.displayValue >= 0
          const valueText = fitSvgLine(formatValue(bar.displayValue, component.unit, bar.kind !== "total", decimals, figures), {
            maxWidth: g.colW - 4,
            fontSize: VALUE_FONT,
            minFontSize: VALUE_MIN_FONT,
          })
          const valueY = above
            ? yTop - VALUE_GAP
            : yBot + VALUE_GAP + valueText.fontSize * 0.85
          const category = g.categories[i]!
          // Names hang from one line across every column: the first line of
          // each sits where the first line of the tallest one does.
          const categoryY = box.y + h - CATEGORY_BOTTOM_MARGIN - (g.categoryLines - 1) * CATEGORY_LINE_H
          // A receded bar's value recedes with it.
          const valueInk = accessibleInk(
            emphasized && !bar.emphasis && bar.kind !== "total" ? ctx.colors.muted : ctx.colors.text,
            bg,
            valueText.fontSize,
          )
          const categoryInk = accessibleInk(ctx.colors.text, bg, CATEGORY_FONT)
          return (
            <g key={i}>
              <rect
                x={barX}
                y={yTop}
                width={barW}
                height={barH}
                fill={emphasized ? emphasisFillFor(bar, ctx, receded) : fillFor(bar.kind, ctx)}
              />
              {g.floor !== null && bar.kind === "total" ? breakMarks(barX, barW, yBot, bg) : null}
              <text
                data-truncated={valueText.truncated ? "1" : undefined}
                x={barX + barW / 2}
                y={valueY}
                textAnchor="middle"
                fontSize={valueText.fontSize}
                fontWeight="700"
                fill={valueInk}
                fontFamily={ctx.fonts.body}
                dominantBaseline="alphabetic"
              >
                {valueText.text}
              </text>
              {category.lines.map((line, k) => (
                <text
                  key={`category-${k}`}
                  data-truncated={category.truncated && k === category.lines.length - 1 ? "1" : undefined}
                  x={barX + barW / 2}
                  y={categoryY + k * CATEGORY_LINE_H}
                  textAnchor="middle"
                  fontSize={CATEGORY_FONT}
                  fill={categoryInk}
                  fontFamily={ctx.fonts.body}
                  dominantBaseline="alphabetic"
                >
                  {line}
                </text>
              ))}
            </g>
          )
        })}
        {emphasisLabel !== undefined ? renderBracket(g, box, emphasisLabel, ctx, bg) : null}
      </g>
    )
  },
}

/**
 * The bracket over the marked bars and the label over the bracket, in the
 * band `geom` reserved above the plot. The bracket spans the outer edges of
 * the first and last marked bar. The label centers on it, and slides along
 * only as far as it must to stay inside the box.
 */
function renderBracket(
  g: Geom,
  box: { x: number; y: number; w: number },
  label: string,
  ctx: ComponentCtx,
  bg: string,
): React.ReactElement {
  const first = g.bars.findIndex((bar) => bar.emphasis)
  const last = g.bars.length - 1 - [...g.bars].reverse().findIndex((bar) => bar.emphasis)
  const x0 = box.x + first * g.colW + g.barInset
  const x1 = box.x + (last + 1) * g.colW - g.barInset
  const labelY = box.y + EMPHASIS_LABEL_FONT
  const barY = labelY + BRACKET_GAP
  const fitted = fitSvgLine(label, {
    maxWidth: box.w,
    fontSize: EMPHASIS_LABEL_FONT,
    minFontSize: EMPHASIS_LABEL_MIN_FONT,
    bold: true,
    fontFamily: ctx.fonts.body,
  })
  const half = (measureTextUnits(fitted.text, { bold: true, fontFamily: ctx.fonts.body }) * fitted.fontSize) / 2
  const center = Math.min(Math.max((x0 + x1) / 2, box.x + half), box.x + box.w - half)
  return (
    <g data-emphasis-bracket="1">
      <path
        d={`M ${x0} ${barY + BRACKET_HOOK} V ${barY} H ${x1} V ${barY + BRACKET_HOOK}`}
        fill="none"
        stroke={graphicInk(ctx.colors.primary, bg)}
        strokeWidth={BRACKET_STROKE}
      />
      <text
        data-truncated={fitted.truncated ? "1" : undefined}
        x={center}
        y={labelY}
        textAnchor="middle"
        fontSize={fitted.fontSize}
        fontWeight="700"
        fill={accessibleInk(ctx.colors.primary, bg, fitted.fontSize)}
        fontFamily={ctx.fonts.body}
        dominantBaseline="alphabetic"
      >
        {fitted.text}
      </text>
    </g>
  )
}


export const renderDef: RenderDef<WaterfallComponent> = { type: "waterfall", measure: waterfall.measure, render: waterfall.render }
