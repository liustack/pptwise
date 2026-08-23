import type { ReactElement } from "react"
import { measureTextUnits } from "../../lib/svg-text-layout"

/**
 * Shared cartesian plot frame (scatter / bubble / line / area / bar).
 *
 * Axis titles stay in `axis-titles.tsx` — this module owns ticks, the
 * padded numeric domain, and the left+bottom axis lines. Grid charts
 * (heatmap / matrix) never call it.
 */

export const TICK_FONT_SIZE = 16
export const TICK_MIN_FONT_SIZE = 16
export const TICK_TO_AXIS_GAP = 8
/** Extra px below the x-axis before the tick baseline. L1 treats a full
 * `font-size` box above the baseline, so 2px put the box 2px from the axis
 * and tripped edge-stick. 6px keeps that box 6px clear. */
export const TICK_BELOW_AXIS = 6
export const Y_TICK_MIN_GUTTER = 36
/** Tick baseline sits `TICK_FONT_SIZE + TICK_BELOW_AXIS` below the axis.
 * Keep a few px of air before the title pair's origin. */
export const X_TICK_BAND = TICK_FONT_SIZE + TICK_BELOW_AXIS + 4
export const PLOT_TOP_PAD = 14
export const PLOT_RIGHT_PAD = 8
export const AXIS_STROKE_WIDTH = 1.5
export const DOMAIN_PAD_FRAC = 0.15
export const TARGET_TICK_COUNT = 4
export const MIN_TICK_COUNT = 3
export const MAX_TICK_COUNT = 6

export type NumericDomain = { min: number; max: number }

export type DomainPadMode =
  /** Bars: keep 0, pad the far end so the tallest bar has headroom. */
  | "zero-max"
  /** Scatter / a high line band: pad both ends, do not force 0. */
  | "fit"

const NICE_STEPS = [1, 2, 2.5, 5, 10]

function niceStep(span: number, targetIntervals: number): number {
  const raw = span / Math.max(1, targetIntervals)
  if (!(raw > 0) || !Number.isFinite(raw)) return 1
  const exp = Math.floor(Math.log10(raw))
  const pow = 10 ** exp
  const frac = raw / pow
  const nice = NICE_STEPS.find((n) => n >= frac) ?? 10
  return nice * pow
}

function nextNiceStep(step: number): number {
  const exp = Math.floor(Math.log10(step))
  const pow = 10 ** exp
  const frac = step / pow
  const idx = NICE_STEPS.findIndex((n) => n >= frac - 1e-12)
  if (idx >= 0 && idx < NICE_STEPS.length - 1) return NICE_STEPS[idx + 1]! * pow
  return 10 * pow
}

function ticksFrom(start: number, end: number, step: number): number[] {
  const n = Math.max(1, Math.round((end - start) / step))
  const ticks: number[] = []
  for (let i = 0; i <= n; i++) {
    ticks.push(Number((start + i * step).toPrecision(12)))
  }
  if (ticks[ticks.length - 1]! < end - step * 1e-9) {
    ticks.push(Number((start + (n + 1) * step).toPrecision(12)))
  }
  return ticks
}

/**
 * About four readable ticks covering `[min, max]`. Widens the range to
 * nice numbers. If the first pass is denser than {@link MAX_TICK_COUNT},
 * the step grows until the count fits.
 */
export function niceTicks(min: number, max: number, target = TARGET_TICK_COUNT): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1]
  let lo = Math.min(min, max)
  let hi = Math.max(min, max)
  if (hi === lo) {
    const pad = Math.abs(lo) || 1
    lo -= pad
    hi += pad
  }
  const intervals = Math.max(1, target - 1)
  let step = niceStep(hi - lo, intervals)
  let start = Math.floor(lo / step) * step
  if (Math.abs(start) < step * 1e-12) start = 0
  let end = Math.ceil(hi / step) * step
  let ticks = ticksFrom(start, end, step)
  let guard = 0
  while (ticks.length > MAX_TICK_COUNT && guard < 8) {
    step = nextNiceStep(step)
    start = Math.floor(lo / step) * step
    if (Math.abs(start) < step * 1e-12) start = 0
    end = Math.ceil(hi / step) * step
    ticks = ticksFrom(start, end, step)
    guard += 1
  }
  if (ticks.length < MIN_TICK_COUNT) {
    const mid = (lo + hi) / 2
    const pad = Math.max(Math.abs(mid), hi - lo, 1)
    return niceTicks(mid - pad, mid + pad, target)
  }
  return ticks
}

export function buildNumericAxis(
  values: readonly number[],
  mode: DomainPadMode,
  unit?: string,
): { domain: NumericDomain; ticks: number[]; labels: string[] } {
  const nums = values.filter((v) => Number.isFinite(v))
  const min = nums.length ? Math.min(...nums) : 0
  const max = nums.length ? Math.max(...nums) : 1
  const domain = paddedDomain(min, max, mode)
  const ticks = niceTicks(domain.min, domain.max)
  return {
    domain: { min: ticks[0]!, max: ticks[ticks.length - 1]! },
    ticks,
    labels: ticks.map((t) => formatAxisTick(t, unit)),
  }
}

export function paddedDomain(min: number, max: number, mode: DomainPadMode, padFrac = DOMAIN_PAD_FRAC): NumericDomain {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1 }
  const lo = Math.min(min, max)
  const hi = Math.max(min, max)
  if (lo === hi) {
    const pad = Math.abs(lo) * padFrac || 1
    const ticks = niceTicks(lo - pad, hi + pad)
    return { min: ticks[0]!, max: ticks[ticks.length - 1]! }
  }
  if (mode === "zero-max") {
    const start = Math.min(0, lo)
    const span = Math.max(hi - start, 1)
    const end = hi + span * padFrac
    const ticks = niceTicks(start, end)
    const tickMin = ticks[0]!
    const tickMax = ticks[ticks.length - 1]!
    return { min: Math.min(0, tickMin), max: Math.max(tickMax, hi) }
  }
  const span = hi - lo
  const pad = span * padFrac
  const ticks = niceTicks(lo - pad, hi + pad)
  return { min: ticks[0]!, max: ticks[ticks.length - 1]! }
}

export function formatNiceNumber(value: number): string {
  if (!Number.isFinite(value)) return "0"
  const rounded = Math.round(value)
  if (Math.abs(value - rounded) < 1e-9) return String(rounded)
  const abs = Math.abs(value)
  const digits = abs >= 10 ? 1 : 2
  return value.toFixed(digits).replace(/\.?0+$/, "")
}

/** `%` glues to the number. Other units sit after a space (`2 周`, `4 weeks`). */
export function formatAxisTick(value: number, unit?: string): string {
  const n = formatNiceNumber(value)
  if (!unit) return n
  if (unit === "%" || unit === "％") return `${n}%`
  return `${n} ${unit}`
}

export function yTickGutter(labels: readonly string[], fontFamily?: string): number {
  let max = 0
  for (const label of labels) {
    const w = measureTextUnits(label, { fontFamily }) * TICK_FONT_SIZE
    if (w > max) max = w
  }
  return Math.max(Y_TICK_MIN_GUTTER, Math.ceil(max + TICK_TO_AXIS_GAP))
}

export function mapToPlotY(value: number, domain: NumericDomain, plotY: number, plotH: number): number {
  const span = domain.max - domain.min
  const t = span === 0 ? 0.5 : (value - domain.min) / span
  return plotY + plotH - t * plotH
}

export function mapToPlotX(value: number, domain: NumericDomain, plotX: number, plotW: number): number {
  const span = domain.max - domain.min
  const t = span === 0 ? 0.5 : (value - domain.min) / span
  return plotX + t * plotW
}

export function layoutCartesianPlot(opts: {
  x0: number
  y0: number
  w: number
  h: number
  yTickLabels: readonly string[]
  titleH: number
  fontFamily?: string
  topPad?: number
}): {
  plotX: number
  plotY: number
  plotW: number
  plotH: number
  leftGutter: number
  xTickBaseline: number
  titleY: number
} {
  const topPad = opts.topPad ?? PLOT_TOP_PAD
  const leftGutter = yTickGutter(opts.yTickLabels, opts.fontFamily)
  const plotX = opts.x0 + leftGutter
  const plotY = opts.y0 + topPad
  const plotW = Math.max(1, opts.w - leftGutter - PLOT_RIGHT_PAD)
  const plotH = Math.max(1, opts.h - opts.titleH - topPad - X_TICK_BAND)
  return {
    plotX,
    plotY,
    plotW,
    plotH,
    leftGutter,
    xTickBaseline: plotY + plotH + TICK_FONT_SIZE + TICK_BELOW_AXIS,
    titleY: plotY + plotH + X_TICK_BAND,
  }
}

export type CartesianTick = {
  label: string
  pos: number
  truncated?: boolean
  anchor?: "start" | "middle" | "end"
  fontSize?: number
}

export function renderCartesianFrame(opts: {
  plotX: number
  plotY: number
  plotW: number
  plotH: number
  xTicks: readonly CartesianTick[]
  yTicks: readonly CartesianTick[]
  showHGrid: boolean
  showVGrid?: boolean
  axisColor: string
  mutedColor: string
  fontFamily?: string
}): ReactElement {
  const xAxisY = opts.plotY + opts.plotH
  const yAxisX = opts.plotX
  const xTickBaseline = xAxisY + TICK_FONT_SIZE + TICK_BELOW_AXIS
  return (
    <g data-axis-frame="1">
      {opts.showHGrid
        ? opts.yTicks.map((tick, i) =>
            Math.abs(tick.pos - xAxisY) < 0.5 ? null : (
              <line
                key={`hg-${i}`}
                data-grid="h"
                x1={opts.plotX}
                y1={tick.pos}
                x2={opts.plotX + opts.plotW}
                y2={tick.pos}
                stroke={opts.mutedColor}
                strokeOpacity={0.12}
                strokeWidth={1}
              />
            ),
          )
        : null}
      {opts.showVGrid
        ? opts.xTicks.map((tick, i) =>
            Math.abs(tick.pos - yAxisX) < 0.5 ? null : (
              <line
                key={`vg-${i}`}
                data-grid="v"
                x1={tick.pos}
                y1={opts.plotY}
                x2={tick.pos}
                y2={xAxisY}
                stroke={opts.mutedColor}
                strokeOpacity={0.12}
                strokeWidth={1}
              />
            ),
          )
        : null}
      <line
        data-axis="y"
        x1={yAxisX}
        y1={opts.plotY}
        x2={yAxisX}
        y2={xAxisY}
        stroke={opts.axisColor}
        strokeWidth={AXIS_STROKE_WIDTH}
      />
      <line
        data-axis="x"
        x1={yAxisX}
        y1={xAxisY}
        x2={opts.plotX + opts.plotW}
        y2={xAxisY}
        stroke={opts.axisColor}
        strokeWidth={AXIS_STROKE_WIDTH}
      />
      {opts.yTicks.map((tick, i) => (
        <text
          key={`yt-${i}`}
          data-axis-tick="y"
          data-truncated={tick.truncated ? "1" : undefined}
          x={opts.plotX - TICK_TO_AXIS_GAP}
          y={tick.pos + (tick.fontSize ?? TICK_FONT_SIZE) * 0.35}
          textAnchor="end"
          fontSize={tick.fontSize ?? TICK_FONT_SIZE}
          fill={opts.mutedColor}
          fontFamily={opts.fontFamily}
          dominantBaseline="alphabetic"
        >
          {tick.label}
        </text>
      ))}
      {opts.xTicks.map((tick, i) => {
        const textAnchor = tick.anchor ?? "middle"
        return (
          <text
            key={`xt-${i}`}
            data-axis-tick="x"
            data-truncated={tick.truncated ? "1" : undefined}
            x={tick.pos}
            y={xTickBaseline}
            textAnchor={textAnchor}
            fontSize={tick.fontSize ?? TICK_FONT_SIZE}
            fill={opts.mutedColor}
            fontFamily={opts.fontFamily}
            dominantBaseline="alphabetic"
          >
            {tick.label}
          </text>
        )
      })}
    </g>
  )
}
