import type { ReactElement } from "react"
import { fitSvgLine, measureTextUnits } from "../lib/svg-text-layout"

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
 * What every tick list has to be: finite, each tick above the last, and
 * reaching both ends of the range it was asked to cover.
 */
function ticksCover(ticks: readonly number[], lo: number, hi: number): boolean {
  return (
    ticks.length >= MIN_TICK_COUNT &&
    ticks.every((t, i) => Number.isFinite(t) && (i === 0 || t > ticks[i - 1]!)) &&
    ticks[0]! <= lo &&
    ticks[ticks.length - 1]! >= hi
  )
}

/**
 * About four readable ticks covering `[min, max]`. Widens the range to
 * nice numbers. If the first pass is denser than {@link MAX_TICK_COUNT},
 * the step grows until the count fits.
 *
 * A range the nice-number walk cannot cover is widened around its middle, to
 * the larger of its own size, its span and 1, and walked again. That was
 * always the answer for a range too narrow to give {@link MIN_TICK_COUNT}
 * ticks. It is now also the answer for a range whose step is finer than the 12
 * significant digits ticks are rounded to: 100 to 100.0000000001 came back as
 * `[99.9999999999, 99.9999999999, 100, 100, 100]`, two values five times
 * over, short of the top of the range.
 *
 * The widened range holds zero and spans at least twice its own middle, so its
 * step is a third of its size and its ticks cannot round together.
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
  if (!ticksCover(ticks, lo, hi)) {
    // Halves are added rather than the sum halved, so the middle of two large
    // values cannot overflow.
    const mid = lo / 2 + hi / 2
    const pad = Math.max(Math.abs(mid), hi - lo, 1)
    return niceTicks(mid - pad, mid + pad, target)
  }
  return ticks
}

/**
 * A value axis for `values`: its ticks, the domain they span, and a label per
 * tick.
 *
 * The contract every chart is built on: finite ticks, each above the last,
 * covering every value, and zero as well in "zero-max" mode, since a bar is
 * measured from zero. `paddedDomain` and `niceTicks` keep it. A range they
 * cannot cover throws rather than hand back an axis that misses the data, and
 * so does a value that is not a finite number.
 *
 * Stacked and combo charts used to go through a second builder that checked
 * this one's result and widened it where it fell short. The shortfall is fixed
 * where it arose, in `niceTicks` and `paddedDomain`, so every chart type now
 * gets the same axis from the one builder.
 */
export function buildNumericAxis(
  values: readonly number[],
  mode: DomainPadMode,
  unit?: string,
): { domain: NumericDomain; ticks: number[]; labels: string[] } {
  const invalid = values.find((v) => !Number.isFinite(v))
  if (invalid !== undefined) {
    throw new Error(`buildNumericAxis: every value must be a finite number, got ${invalid}`)
  }
  const min = values.length ? Math.min(...values) : 0
  const max = values.length ? Math.max(...values) : 1
  const domain = paddedDomain(min, max, mode)
  const ticks = niceTicks(domain.min, domain.max)
  const needLo = mode === "zero-max" ? Math.min(0, min) : min
  const needHi = mode === "zero-max" ? Math.max(0, max) : max
  if (!ticksCover(ticks, needLo, needHi)) {
    throw new Error(`buildNumericAxis: cannot cover ${min} to ${max} with finite, increasing ticks`)
  }
  return {
    domain: { min: ticks[0]!, max: ticks[ticks.length - 1]! },
    ticks,
    labels: ticks.map((t) => formatAxisTick(t, unit)),
  }
}

/**
 * A second value axis whose ticks land on the rows the first axis already
 * drew, for a combo chart's right-hand axis.
 *
 * Two independent `buildNumericAxis` calls would give each side its own tick
 * count and its own rows, so the gridlines would belong to the left axis and
 * the right-hand numbers would float between them. This keeps the right
 * axis's range, unit and step its own and borrows only the row count: the
 * step is the smallest nice step whose `primaryTicks.length - 1` intervals
 * cover the padded values, so one set of gridlines reads against both sides.
 *
 * When both ranges hold zero, zero goes on the same row as the primary's
 * zero, so the two zero lines are one line. That is not always possible: a
 * primary whose zero is its bottom row cannot share it with a range that dips
 * below zero. Then the axis starts on its own nice multiple instead.
 *
 * The result is checked before it is returned: finite ticks, each above the
 * last, covering every value. A range too narrow for that is widened the way
 * `niceTicks` widens one, and searched again. What still cannot be covered
 * (padding 1.7e308 overflows to `Infinity`) throws rather than handing back
 * an axis that misses the data, and so does a value that is not a finite
 * number. validate keeps both off every combo (`CHART_AXIS_LIMIT`), so a
 * throw here is a caller that went around it, and every finite value set
 * within that ceiling gets an axis (`chart-numeric-range.test.tsx`).
 */
export function buildAlignedNumericAxis(
  values: readonly number[],
  mode: DomainPadMode,
  primaryTicks: readonly number[],
  unit?: string,
): { domain: NumericDomain; ticks: number[]; labels: string[] } {
  const intervals = Math.max(1, primaryTicks.length - 1)
  const invalid = values.find((v) => !Number.isFinite(v))
  if (invalid !== undefined) {
    throw new Error(`buildAlignedNumericAxis: every value must be a finite number, got ${invalid}`)
  }
  let lo = values.length ? Math.min(...values) : 0
  let hi = values.length ? Math.max(...values) : 1
  if (mode === "zero-max") {
    lo = Math.min(0, lo)
    hi = Math.max(0, hi)
  }
  // What the ticks have to reach, before any headroom is added.
  const needLo = lo
  const needHi = hi
  if (hi === lo) {
    const pad = Math.abs(lo) * DOMAIN_PAD_FRAC || 1
    lo -= mode === "zero-max" && lo === 0 ? 0 : pad
    hi += pad
  }
  // The same headroom `paddedDomain` gives: the top always, the bottom too
  // when the axis is not pinned to zero. In "zero-max" mode the span is
  // floored at 1, as `paddedDomain` floors it, so a range of 1e-323 gets the
  // axis the left side would give it instead of a step too small to form.
  const span = mode === "zero-max" ? Math.max(hi - lo, 1) : hi - lo
  hi += span * DOMAIN_PAD_FRAC
  if (mode === "fit") lo -= span * DOMAIN_PAD_FRAC

  const zeroRow = primaryTicks.findIndex((t) => t === 0)

  /**
   * The nice-number search over [from, to], checked: finite ticks, each above
   * the last, covering what the values need. `null` when the search cannot
   * give that.
   */
  const solve = (from: number, to: number): number[] | null => {
    const alignZero =
      zeroRow >= 0 && from <= 0 && to >= 0 && (from === 0 || zeroRow > 0) && (to === 0 || zeroRow < intervals)
    let step = niceStep(to - from, intervals)
    let start = 0
    let covered = false
    for (let guard = 0; guard < 40; guard++) {
      if (alignZero) {
        start = -zeroRow * step
      } else {
        start = Math.floor(from / step) * step
        if (Math.abs(start) < step * 1e-12) start = 0
      }
      if (start <= from + step * 1e-9 && start + intervals * step >= to - step * 1e-9) {
        covered = true
        break
      }
      step = nextNiceStep(step)
    }
    const ticks = Array.from({ length: intervals + 1 }, (_, i) => Number((start + i * step).toPrecision(12)))
    const increasing = ticks.every((t, i) => Number.isFinite(t) && (i === 0 || t > ticks[i - 1]!))
    return covered && increasing && ticks[0]! <= needLo && ticks[ticks.length - 1]! >= needHi ? ticks : null
  }

  // Ticks are rounded to 12 significant digits, so values a hair apart
  // (1e11 and 1e11 + 0.01, or 1 and 1 + 1e-14) round their ticks together
  // and the search above comes back empty. `niceTicks` meets the same
  // trouble on the left axis by widening the range around its middle, out to
  // the larger of its own size, its span and 1, and so does this: the right
  // axis then reads on the same kind of scale the left one would have drawn.
  // Halves are added rather than the sum halved, so the middle of two large
  // values cannot overflow.
  const mid = needLo / 2 + needHi / 2
  const pad = Math.max(Math.abs(mid), needHi - needLo, 1)
  const ticks = solve(lo, hi) ?? solve(mid - pad, mid + pad)
  if (ticks === null) {
    throw new Error(
      `buildAlignedNumericAxis: cannot cover ${needLo} to ${needHi} with ${intervals + 1} finite, increasing ticks`,
    )
  }
  return {
    domain: { min: ticks[0]!, max: ticks[ticks.length - 1]! },
    ticks,
    labels: ticks.map((t) => formatAxisTick(t, unit)),
  }
}

/**
 * The range an axis spans before it is rounded out to nice ticks.
 *
 * "zero-max" always holds zero, whatever the values: it runs from the lower
 * of zero and the lowest value to the higher of zero and the highest value,
 * plus headroom above. It used to hold zero only by luck. Values that were all
 * the same took the "fit" branch (a lone bar of 42 got a 35 to 50 axis and hung
 * below the x-axis), and values all below zero padded their own top and
 * stopped short of it (-1e11 and -1e11 - 0.01 got an axis with no zero on it).
 * The headroom sits above zero when every value is below it, which is where a
 * negative bar prints its value.
 */
export function paddedDomain(min: number, max: number, mode: DomainPadMode, padFrac = DOMAIN_PAD_FRAC): NumericDomain {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1 }
  const lo = Math.min(min, max)
  const hi = Math.max(min, max)
  if (mode === "zero-max") {
    const start = Math.min(0, lo)
    const top = Math.max(0, hi)
    const span = Math.max(top - start, 1)
    const end = top + span * padFrac
    const ticks = niceTicks(start, end)
    const tickMin = ticks[0]!
    const tickMax = ticks[ticks.length - 1]!
    return { min: Math.min(0, tickMin), max: Math.max(tickMax, top) }
  }
  if (lo === hi) {
    const pad = Math.abs(lo) * padFrac || 1
    const ticks = niceTicks(lo - pad, hi + pad)
    return { min: ticks[0]!, max: ticks[ticks.length - 1]! }
  }
  const span = hi - lo
  const pad = span * padFrac
  const ticks = niceTicks(lo - pad, hi + pad)
  return { min: ticks[0]!, max: ticks[ticks.length - 1]! }
}

/**
 * A tick's value as the axis prints it: every digit the tick has, to the 12
 * significant digits ticks are rounded to, and no trailing zeros.
 *
 * It used to keep one or two decimals, whatever the step between ticks. Ticks
 * a millionth apart all printed as "1", and 10.25 printed as "10.3", a value
 * the axis does not mark. Ticks are nice multiples of their step, so the
 * digits they have are the digits their step needs: whole numbers stay whole,
 * 0.5 stays 0.5, and two different ticks never share a label.
 */
export function formatNiceNumber(value: number): string {
  if (!Number.isFinite(value)) return "0"
  // `String` gives the shortest form that reads back as the same number, and
  // turns -0 into "0".
  return String(Number(value.toPrecision(12)))
}

/** `%` glues to the number. Other units sit after a space (`2 周`, `4 weeks`). */
export function formatAxisTick(value: number, unit?: string): string {
  const n = formatNiceNumber(value)
  if (!unit) return n
  if (unit === "%" || unit === "％") return `${n}%`
  return `${n} ${unit}`
}

/**
 * Ceiling on the share of a plot's width the y-tick labels may claim.
 *
 * `y_unit` and the tick values it decorates are author strings with no
 * length bound in the schema, and this gutter used to grow with them without
 * limit. `plotW` was floored at 1px, which kept the *width* positive while
 * saying nothing about the origin: a 200-character unit pushed `plotX` clean
 * past the component's right edge, and the chart drew 1752px outside the box
 * it was handed. A gutter is a share of the box, never more, and a label too
 * wide for its share is cut and says so.
 */
export const Y_TICK_MAX_W_RATIO = 0.32

/**
 * Room the y-axis tick labels need, bounded by `maxGutter` when given.
 * Callers that own a fixed box always give one — see
 * {@link Y_TICK_MAX_W_RATIO}.
 */
export function yTickGutter(labels: readonly string[], fontFamily?: string, maxGutter?: number): number {
  let max = 0
  for (const label of labels) {
    const w = measureTextUnits(label, { fontFamily }) * TICK_FONT_SIZE
    if (w > max) max = w
  }
  const want = Math.max(Y_TICK_MIN_GUTTER, Math.ceil(max + TICK_TO_AXIS_GAP))
  if (maxGutter == null) return want
  // The cap is applied last, so it is actually a cap. `Y_TICK_MIN_GUTTER` used
  // to be re-applied *outside* it, which let the gutter take more than its
  // declared share on any narrow plot and, below ~31px, put `plotX` outside
  // the box the chart was handed — the exact contract this file states,
  // broken on the line that states it. A comfortable minimum is a preference;
  // the box is not, so the floor yields to it.
  return Math.min(want, Math.max(0, Math.floor(maxGutter)))
}

/**
 * Plot width below which a cartesian chart has nothing left to draw in.
 *
 * Two ticks and a mark need somewhere to go. Under this, the frame is all
 * there is and `plotW`'s own 1px floor is doing the only work — which is not
 * a chart, it is a rounding artefact with axes.
 */
export const MIN_PLOT_W = 24

/**
 * Narrowest box a cartesian chart can be drawn in at all.
 *
 * Derived, not chosen: the gutter never takes more than
 * `Y_TICK_MAX_W_RATIO` of the box, so the plot always keeps at least
 * `(1 - ratio) * w - PLOT_RIGHT_PAD`, and this is the width at which that
 * reaches {@link MIN_PLOT_W}. A caller handing less is handing an impossible
 * box, which `chart.render` declines rather than paints its way out of.
 */
export const MIN_CARTESIAN_BOX_W = Math.ceil((MIN_PLOT_W + PLOT_RIGHT_PAD) / (1 - Y_TICK_MAX_W_RATIO))

/**
 * Narrowest box a chart with a value axis on both sides can be drawn in.
 *
 * Same derivation as {@link MIN_CARTESIAN_BOX_W}, with two gutters each
 * capped at `Y_TICK_MAX_W_RATIO` of the box. The right gutter takes the place
 * of `PLOT_RIGHT_PAD`, so the plot keeps at least `(1 - 2 * ratio) * w`.
 */
export const MIN_DUAL_AXIS_BOX_W = Math.ceil(MIN_PLOT_W / (1 - 2 * Y_TICK_MAX_W_RATIO))

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
  /**
   * Tick labels of a right-hand value axis, when the chart has one. The
   * right gutter is sized and capped exactly like the left one and takes the
   * place of `PLOT_RIGHT_PAD`. Omitted, the layout is the one-axis layout.
   */
  y2TickLabels?: readonly string[]
}): {
  plotX: number
  plotY: number
  plotW: number
  plotH: number
  leftGutter: number
  /** Width of the right-hand axis gutter, 0 without a right-hand axis. */
  rightGutter: number
  xTickBaseline: number
  titleY: number
} {
  const topPad = opts.topPad ?? PLOT_TOP_PAD
  const leftGutter = yTickGutter(opts.yTickLabels, opts.fontFamily, opts.w * Y_TICK_MAX_W_RATIO)
  const rightGutter = opts.y2TickLabels
    ? yTickGutter(opts.y2TickLabels, opts.fontFamily, opts.w * Y_TICK_MAX_W_RATIO)
    : 0
  const plotX = opts.x0 + leftGutter
  const plotY = opts.y0 + topPad
  const plotW = Math.max(1, opts.w - leftGutter - (opts.y2TickLabels ? rightGutter : PLOT_RIGHT_PAD))
  const plotH = Math.max(1, opts.h - opts.titleH - topPad - X_TICK_BAND)
  return {
    plotX,
    plotY,
    plotW,
    plotH,
    leftGutter,
    rightGutter,
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
  /**
   * Where the reference lines start and how far they run, when that is
   * narrower than the frame itself.
   *
   * Line and area charts inset their points from the frame to make room for
   * the series-label gutters (`splitSeriesGutters` in chart-svg.tsx). A
   * gridline drawn the full width of the frame then runs straight under
   * those labels — which reads as a rule struck through a number, and which
   * `l1.ts` reports as exactly that. Reference lines belong under the data
   * they are a reference for, so a caller with gutters passes the data span
   * here and gets its gutters left clean. Omitted, the lines span the frame,
   * which is what bar and scatter (no gutters) still want.
   */
  gridX?: number
  gridW?: number
  /**
   * Room a y-axis tick label has before the axis. Passed by every caller
   * that owns a fixed box, because the gutter it sits in is capped
   * ({@link Y_TICK_MAX_W_RATIO}) and a label wider than the cap would run
   * out through the left edge of that box. Cut labels say so.
   */
  yTickMaxW?: number
  /**
   * Ticks of a right-hand value axis. When given, a second axis line is
   * drawn up the plot's right edge and these labels sit outside it, start
   * anchored, fitted to `y2TickMaxW` the way the left labels are fitted to
   * `yTickMaxW`. Omitted, nothing on the right is drawn.
   */
  y2Ticks?: readonly CartesianTick[]
  y2TickMaxW?: number
  axisColor: string
  mutedColor: string
  fontFamily?: string
}): ReactElement {
  const xAxisY = opts.plotY + opts.plotH
  const yAxisX = opts.plotX
  const gridX = opts.gridX ?? opts.plotX
  const gridW = opts.gridW ?? opts.plotW
  const xTickBaseline = xAxisY + TICK_FONT_SIZE + TICK_BELOW_AXIS
  return (
    <g data-axis-frame="1">
      {opts.showHGrid
        ? opts.yTicks.map((tick, i) =>
            Math.abs(tick.pos - xAxisY) < 0.5 ? null : (
              <line
                key={`hg-${i}`}
                data-grid="h"
                x1={gridX}
                y1={tick.pos}
                x2={gridX + gridW}
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
      {opts.yTicks.map((tick, i) => {
        const fitted =
          opts.yTickMaxW == null
            ? { text: tick.label, fontSize: tick.fontSize ?? TICK_FONT_SIZE, truncated: tick.truncated ?? false }
            : fitSvgLine(tick.label, {
                maxWidth: opts.yTickMaxW,
                fontSize: tick.fontSize ?? TICK_FONT_SIZE,
                minFontSize: TICK_MIN_FONT_SIZE,
                fontFamily: opts.fontFamily,
              })
        return (
          <text
            key={`yt-${i}`}
            data-axis-tick="y"
            data-truncated={fitted.truncated || tick.truncated ? "1" : undefined}
            x={opts.plotX - TICK_TO_AXIS_GAP}
            y={tick.pos + fitted.fontSize * 0.35}
            textAnchor="end"
            fontSize={fitted.fontSize}
            fill={opts.mutedColor}
            fontFamily={opts.fontFamily}
            dominantBaseline="alphabetic"
          >
            {fitted.text}
          </text>
        )
      })}
      {opts.y2Ticks ? (
        <line
          data-axis="y2"
          x1={opts.plotX + opts.plotW}
          y1={opts.plotY}
          x2={opts.plotX + opts.plotW}
          y2={xAxisY}
          stroke={opts.axisColor}
          strokeWidth={AXIS_STROKE_WIDTH}
        />
      ) : null}
      {opts.y2Ticks?.map((tick, i) => {
        const fitted =
          opts.y2TickMaxW == null
            ? { text: tick.label, fontSize: tick.fontSize ?? TICK_FONT_SIZE, truncated: tick.truncated ?? false }
            : fitSvgLine(tick.label, {
                maxWidth: opts.y2TickMaxW,
                fontSize: tick.fontSize ?? TICK_FONT_SIZE,
                minFontSize: TICK_MIN_FONT_SIZE,
                fontFamily: opts.fontFamily,
              })
        return (
          <text
            key={`y2t-${i}`}
            data-axis-tick="y2"
            data-truncated={fitted.truncated || tick.truncated ? "1" : undefined}
            x={opts.plotX + opts.plotW + TICK_TO_AXIS_GAP}
            y={tick.pos + fitted.fontSize * 0.35}
            textAnchor="start"
            fontSize={fitted.fontSize}
            fill={opts.mutedColor}
            fontFamily={opts.fontFamily}
            dominantBaseline="alphabetic"
          >
            {fitted.text}
          </text>
        )
      })}
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
