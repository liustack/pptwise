import type { ReactElement } from "react"
import type { ChartSeries, Component } from "@/ir"
import { accessibleInk } from "../render/ink"
import { fitSvgLine, measureTextUnits } from "../lib/svg-text-layout"
import { axisTitlePairHeight, renderCartesianAxisTitles } from "./axis-titles"
import {
  buildNumericAxis,
  formatAxisTick,
  layoutCartesianPlot,
  mapToPlotX,
  mapToPlotY,
  renderCartesianFrame,
  TICK_FONT_SIZE,
  TICK_MIN_FONT_SIZE,
  X_TICK_BAND,
  type DomainPadMode,
} from "./cartesian-axis"
import { buildChartModel, zeroAxisRatio, type ChartDomain } from "./chart-model"
import {
  labelLinePitch,
  resolveValueLabelCollisions,
  stackLabelColumn,
  type ColumnLabelSpec,
  type ValueLabelSpec,
} from "./label-collision"

/**
 * Chart renderers for the page-coordinate SVG pipeline.
 *
 * Each function receives an absolute region (x0, y0, w, h) and returns SVG
 * elements positioned in page coordinates (no nested <svg viewBox>).
 */

/**
 * A whole-share chart handed a total it cannot divide.
 *
 * `validate` refuses a pie, donut or funnel whose points sum to zero or less
 * (`ir/components/chart.ts`), so a component reaching a renderer in this
 * state has come round the gate: a caller assembling IR in memory, a test, a
 * future chart_type added to the dispatch and not to the refinement. There is
 * nothing to draw from a total of zero, and the old answer, an empty
 * fragment, took the series name, every point name and every value off the
 * page with no error and no mark. This one paints nothing either, and says
 * how much went with it.
 */
function WholeShareDeclined({ data }: { data: readonly { x: string | number; y: number }[] }): ReactElement {
  return <g data-dropped={data.length} data-dropped-silent={data.length} />
}

/** The `chart` IR component, for the renderers whose geometry needs
 * component-level config beyond `series` (donut's `center_total`, gauge's
 * `min`/`max` range). Passed as the trailing `component` arg to every
 * renderer; the ones that don't need it simply omit the parameter and stay
 * assignable to {@link ChartRenderFn} (a function with fewer parameters is
 * assignable to one that declares more). */
type ChartInput = Extract<Component, { type: "chart" }>

/**
 * The one uniform shape `chart.tsx`'s dispatch calls every chart renderer
 * through. The trailing `component` is optional so the five original
 * renderers (which never read it) stay callable unchanged and byte-identical,
 * while `renderScatter`/`renderGauge`/`renderDonut` read it for their
 * per-subtype config.
 */
export type ChartRenderFn = (
  series: ChartSeries[],
  palette: string[],
  x0: number,
  y0: number,
  w: number,
  h: number,
  mutedColor: string,
  textColor: string,
  accentColor: string,
  showGrid?: boolean,
  component?: ChartInput,
  /**
   * The background these marks are actually painted on
   * (`ctx.defaultBg ?? colors.bg`, resolved by `chart.tsx`).
   *
   * Threaded in for *text* ink only. `accentColor` is right for bars, dots
   * and wedges — a fill has no contrast floor — but wrong for a value or
   * category label painted straight onto the page: consulting's accent is a
   * light yellow that measures 1.45:1 on its own light background, which is
   * how the 2026-08-15 visual review found unreadable value labels on
   * dumbbell, timeline and the horizontal bar. Text sites route the accent
   * through `accessibleInk` against this; shape fills keep using it raw.
   *
   * Optional and trailing so every existing positional call site keeps
   * working, the same way `showGrid` and `component` were added.
   */
  bgHex?: string,
  /** Stroke for the left+bottom axis lines. Theme `border`, falling back to muted. */
  axisColor?: string,
  fontFamily?: string,
) => ReactElement

/**
 * Category tick size (px) on cartesian plots (bar / line / area / scatter
 * extent labels). Label-tuning A (2026-08): 11 → 13, still `muted`.
 */
const CATEGORY_FONT_SIZE = TICK_FONT_SIZE
const CATEGORY_MIN_FONT_SIZE = TICK_MIN_FONT_SIZE
/**
 * Value-label size/weight on bar tops and line endpoints. Label-tuning A:
 * 11px muted → 13px / 600 / `text` (the ctx text token, never a series color).
 */
const VALUE_FONT_SIZE = 16
const VALUE_FONT_WEIGHT = 600
/**
 * Gap (px) from a vertical bar's top edge to the value label's alphabetic
 * baseline. Was 4; the LabelTuning.dc.html artboard pins ~9.
 */
const VALUE_LABEL_GAP = 9
/**
 * Gauge caption keeps 11px (classroom theme-table pages pin this size).
 * Dumbbell "from" values sit on the 16px (12pt) readable floor. The two used to share
 * one leftover 11px constant.
 */
const LABEL_FONT_SIZE = 16
const DUMBBELL_FROM_FONT_SIZE = 16
/**
 * Space (px) reserved at the bottom of `h` for category labels below the plot
 * (dumbbell row labels). Cartesian plots own their tick band via
 * `layoutCartesianPlot`.
 */
const LABEL_BOTTOM_PAD = 18

/**
 * Ceiling (px) for any single ratio-based chart geometry value —
 * `renderBar`'s `barH`, `renderBarHorizontal`'s `barW`, `renderLine`'s
 * per-point `y`, `renderFunnel`'s `barW`. All four compute an unbounded
 * `(d.y / max) * boxDimension` ratio with no ceiling of their own: legal IR
 * (chart series' `y` carries no magnitude constraint) can make one value
 * tens-to-thousands of times its series' own max, scaling that ratio
 * without bound and pushing the resulting pixel value far off-canvas.
 * `svg2pptx`'s eventual `pxToIn()` conversion of that value then crosses
 * pptxgenjs's own undocumented `getSmartParseNumber()` heuristic
 * (`node_modules/pptxgenjs`: any size `>= 100` is assumed to already be EMU,
 * not inches, and is returned completely unconverted and unrounded —
 * 100in * 96px/in = 9600px) — past that line pptxgenjs writes the raw
 * un-multiplied-by-914400, un-rounded inches float straight into
 * `a:off`/`a:ext`, which package-audit's invalid-shape-transform rule then
 * rejects as a non-integer EMU value (2026-07-22 deep-acceptance review
 * Round 3, 6th defect — `generate-chart-export.test.ts`'s own reproduction
 * has the full root-cause trace).
 *
 * 4800px (50in) sits at half that 9600px/100in danger line — a wide margin
 * below it for every other pixel offset this pipeline layers on top (label
 * padding, ascent adjustment, gridline pad), while confirmed realistic
 * mixed-sign content (this repo's own fixtures, ratios under ~3) sits
 * nowhere near it, so the clamp is a no-op for every currently-shipping
 * chart. This is a ceiling, not a domain rescale (contrast
 * `renderDumbbell`'s `vx()` fix, which extends its *domain* because it maps
 * a value straight to an absolute x-coordinate with no fixed baseline) —
 * bar/line/funnel instead scale an *extent* from a fixed anchor (a zero
 * baseline or plot edge), and a realistic negative value already extends
 * past the plot box today (a pre-existing, intentionally untouched-by-this-
 * fix cosmetic property); rescaling the domain the way dumbbell did would
 * visibly change every negative-value bar/line/funnel's geometry, not just
 * the pathological ones this ceiling targets.
 */
const MAX_CHART_GEOMETRY_PX = 4800

/** Clamp a ratio-scaled chart geometry value to `±MAX_CHART_GEOMETRY_PX` —
 * see that constant's doc comment for why. */
function clampChartExtent(px: number): number {
  return Math.max(-MAX_CHART_GEOMETRY_PX, Math.min(MAX_CHART_GEOMETRY_PX, px))
}

/** Bar gradient's lower stop keeps this fraction of the accent's original
 * per-channel brightness (0.7 → "70% 亮度变体" per the Task 8 brief). */
const BAR_GRADIENT_SHADE_FACTOR = 0.7
/** Line chart endpoint-emphasis geometry: inner solid dot / outer soft ring. */
const ENDPOINT_DOT_R = 4
const ENDPOINT_RING_R = 8
const ENDPOINT_RING_OPACITY = 0.3
/**
 * Air (px) between an endpoint marker's edge and the value label that names
 * it. Without it the number sits on its own dot at the plot's right edge.
 */
const ENDPOINT_LABEL_CLEARANCE = 2

/** Slide a value label off the marker it names, in the direction it grows. */
function clearOfMarker(x: number, anchor: "start" | "middle" | "end"): number {
  const away = ENDPOINT_DOT_R + ENDPOINT_LABEL_CLEARANCE
  if (anchor === "end") return x - away
  if (anchor === "start") return x + away
  return x
}
/**
 * Last series count at which a line chart still paints first/last value
 * labels. Dataviz discipline: labels have to be selective. When many
 * series share the same left and right edges, those numbers stack into
 * an ink blot (author screenshot, 20-series density corpus, 2026-08).
 * Past this count the legend carries identity and the endpoint numbers
 * come off. Endpoint dots stay.
 *
 * Source: Few, *Show Me the Numbers* (selective labeling) and Tufte's
 * "erase non-data-ink" — colliding labels are worse than no labels.
 */
const LINE_ENDPOINT_LABEL_MAX_SERIES = 4
/** Line-under-curve area fill: alpha at the line (top) fading to fully
 * transparent at the baseline (bottom). */
const AREA_FILL_TOP_ALPHA = 0.2
const AREA_FILL_BOTTOM_ALPHA = 0

/**
 * A center-anchored label at a series' first/last point straddles the plot's
 * left/right edge and overflows it by half its own width. Anchor the first
 * point's label to grow rightward and the last point's leftward instead —
 * interior points keep the centered anchor.
 */
function edgeAnchor(i: number, n: number): "start" | "middle" | "end" {
  if (n <= 1) return "middle"
  if (i === 0) return "start"
  if (i === n - 1) return "end"
  return "middle"
}

/**
 * djb2 string hash — deterministic and platform-independent (same algorithm
 * as `@/shared/lib/color`'s private `hash()`, re-implemented locally since
 * that one isn't exported and this file has no reason to import from it).
 */
function stableHash(seed: string): number {
  let h = 5381
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) + h + seed.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

/**
 * Deterministic id for a chart instance's gradient defs. `renderBar`/
 * `renderLine` never receive the component's page position — `chart.tsx` always
 * calls them with x0=y0=0 and translates the whole result via an outer `<g>`
 * — so there is no coordinate prop to key an id off. Hash the series data
 * actually in scope instead: stable for identical input (required for
 * preview/export to reproduce the exact same markup) and distinct whenever
 * two charts placed on the same page differ in data, which two
 * independently-authored charts always do (SVG ids are document-scoped, so
 * two chart instances on one slide must never collide).
 */
function chartGradientId(prefix: string, w: number, h: number, seed: unknown): string {
  return `${prefix}-${stableHash(`${w}x${h}:${JSON.stringify(seed)}`)}`
}

/**
 * Scale a `#RRGGBB` hex color's channels to `factor` of their original value
 * (e.g. 0.7 → a darker 70%-brightness shade). Theme tokens are always baked
 * hex by the time they reach component renderers (`themes/tokens.ts`'s
 * `StyleColors`), so no other CSS color syntax needs handling here.
 */
function scaleHexBrightness(hex: string, factor: number): string {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex)
  if (!match) return hex
  const value = parseInt(match[1], 16)
  const scale = (channel: number) => Math.round(Math.min(255, Math.max(0, channel * factor)))
  const r = scale((value >> 16) & 0xff)
  const g = scale((value >> 8) & 0xff)
  const b = scale(value & 0xff)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0").toUpperCase()}`
}

/**
 * Direct labels for the two charts that carry no axis and no legend — pie
 * and funnel (`chart.tsx`'s `legendApplicable` excludes both, and always
 * did). Until this wave they printed nothing at all: a full-page pie was
 * four colored wedges with no way to tell which segment was which. They now
 * print `name value` beside every mark, the same house idiom the rest of
 * this file follows.
 *
 * **Beside the mark, never on it.** `renderBar` prints its value above the
 * bar, `renderBarHorizontal` past the bar's end, `renderDumbbell` beside its
 * dots: every chart label in this file lands on the page background, which
 * is exactly what lets `full-matrix-contrast.test.ts` classify the whole
 * `chart` component as `"page-bg"` ("labels never sit on a
 * component-painted rect"). Printing inside a wedge or a funnel band instead
 * would put body text on a `chartPalette` fill, and the *best available* ink
 * on those fills — `readableOn(fill)` measured against the fill itself —
 * bottoms out at 4.51:1 across the 24 built-in palettes (museum's
 * `#C45A45`). That is a 0.01 margin over the 4.5:1 body floor, held up by
 * nothing: a `theme fork` or a brand-extracted palette moves those hexes
 * freely. Labeling outside the mark keeps the contrast decision out of the
 * palette's hands entirely, and keeps this component's own audit
 * classification true.
 */
const DIRECT_LABEL_FONT_SIZE = VALUE_FONT_SIZE
const DIRECT_LABEL_FONT_WEIGHT = VALUE_FONT_WEIGHT
/**
 * A label's baseline, as an offset in em below its own vertical center. An
 * ink box runs 0.72em above the baseline to 0.12em below it
 * (`render/depth-contract/geometry`'s `TEXT_INK_ASCENT`/`TEXT_INK_DESCENT`),
 * so its center sits 0.3em above the baseline. Placement math works in
 * centers — that is what a column stacks and what a band is centered on —
 * and converts to a baseline only at the `<text>` itself.
 */
const DIRECT_LABEL_CENTER_TO_BASELINE = 0.3

/**
 * One label per mark, `name value` in a single `<text>`. One node, not a
 * name node plus a value node: the anti-collision math, the audit's ink box
 * and the reader all see one label instead of two half-labels that can drift
 * apart. A point with no name prints its value alone.
 */
function directLabelText(point: ChartSeries["data"][number]): string {
  const name = String(point.x).trim()
  return name ? `${name} ${point.y}` : String(point.y)
}

function directLabelWidth(text: string, fontFamily?: string): number {
  return measureTextUnits(text, { bold: true, fontFamily }) * DIRECT_LABEL_FONT_SIZE
}

/** Widest of a chart's direct labels, the width its layout has to reserve. */
function widestDirectLabel(texts: readonly string[], fontFamily?: string): number {
  let widest = 0
  for (const text of texts) {
    const px = directLabelWidth(text, fontFamily)
    if (px > widest) widest = px
  }
  return widest
}

/**
 * Ink for a direct label. Same rule `renderDumbbell` states on its own
 * `accentInk`: the label sits on the page, so it clears a contrast floor
 * against the background it actually lands on. Without a `bgHex` (direct
 * unit-test calls) the caller's own text token is used unchanged.
 */
function directLabelInk(textColor: string | undefined, bgHex: string | undefined): string | undefined {
  if (!textColor || !bgHex) return textColor
  return accessibleInk(textColor, bgHex, DIRECT_LABEL_FONT_SIZE)
}

/**
 * Grouped/mixed-sign bar geometry (R1 evidence wave, Task T2 — roadmap
 * §6.1.2/§6.1.3). Shared by `renderBar` (vertical) and `renderBarHorizontal`
 * — both map a value to an *extent* from a fixed zero-baseline anchor within
 * a plot box, just along perpendicular pixel axes, so the fraction math is
 * identical and only the pixel-axis mapping at each call site differs.
 *
 * **Byte-compat derivation**: every one of these three helpers branches on
 * `domain.min === 0` — the exact condition `chart-model.ts`'s
 * `computeChartDomain` documents as "every contributing value is already
 * >= 0" (Global Constraint 1's "single-series positive" shape, but the
 * condition itself is series-count-agnostic: an all-non-negative multi-
 * series group also takes this branch, correctly, since the old implicit-
 * zero-baseline formula is exactly right whenever nothing is negative). That
 * branch reproduces the pre-T2 renderers' own `(value / max) * plotDimension`
 * formula **verbatim, same operation order** — not an algebraically-equal
 * rewrite — because floating-point arithmetic is not guaranteed associative
 * (`a - (a - b) === b` does not hold bit-for-bit in general), so only a
 * literal copy of the old expression is provably bit-identical to the
 * golden pins. The `domain.min < 0` branch (a negative value is present
 * somewhere — always outside byte-compat protection) instead locates the
 * true zero baseline via `zeroAxisRatio` and measures the bar as a signed
 * span from there, so a negative value extends the *correct* direction
 * instead of assuming the baseline always sits at the plot's low edge.
 */
function barExtentFraction(value: number, domain: ChartDomain): { start: number; end: number } {
  const zero = zeroAxisRatio(domain)
  const ratio = (value - domain.min) / (domain.max - domain.min)
  return value >= 0 ? { start: zero, end: ratio } : { start: ratio, end: zero }
}

/** Vertical bar's rect `y`/`height` for one value — see `barExtentFraction`'s
 * doc comment for the shared derivation and byte-compat branch. */
function verticalBarExtent(
  value: number,
  domain: ChartDomain,
  plotTop: number,
  plotH: number,
): { barY: number; barH: number } {
  if (domain.min === 0) {
    const barH = clampChartExtent((value / domain.max) * plotH)
    return { barY: plotTop + plotH - barH, barH }
  }
  const { start, end } = barExtentFraction(value, domain)
  const barTopY = plotTop + plotH - end * plotH
  const barBottomY = plotTop + plotH - start * plotH
  return { barY: barTopY, barH: clampChartExtent(barBottomY - barTopY) }
}

/** Horizontal bar's rect `x`/`width` for one value — see
 * `barExtentFraction`'s doc comment for the shared derivation and
 * byte-compat branch. */
function horizontalBarExtent(
  value: number,
  domain: ChartDomain,
  plotX: number,
  plotW: number,
): { barX: number; barW: number } {
  if (domain.min === 0) {
    const barW = clampChartExtent((value / domain.max) * plotW)
    return { barX: plotX, barW }
  }
  const { start, end } = barExtentFraction(value, domain)
  const barLeftX = plotX + start * plotW
  const barRightX = plotX + end * plotW
  return { barX: barLeftX, barW: clampChartExtent(barRightX - barLeftX) }
}

/** Vertical bar's group edge margin (px, was the inline literals `4`/`groupW
 * - 8`) — reused unchanged as the intra-group gap between sibling bars in a
 * grouped (n>=2) category, see `renderBar`'s own group-geometry comment. */
const BAR_GROUP_EDGE_GAP = 4

function cartesianMeta(component?: ChartInput) {
  return {
    xTitle: component?.axes?.x_title,
    yTitle: component?.axes?.y_title,
    xUnit: component?.axes?.x_unit,
    yUnit: component?.axes?.y_unit,
    titleH: axisTitlePairHeight(component?.axes?.x_title, component?.axes?.y_title),
  }
}

function keptValues(series: ReturnType<typeof buildChartModel>["series"]): number[] {
  const values: number[] = []
  for (const s of series) {
    for (const v of s.values) if (v != null) values.push(v)
  }
  return values
}

function valueAxisMode(values: readonly number[]): DomainPadMode {
  if (values.length === 0) return "fit"
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (min <= 0) return "zero-max"
  if (min <= Math.max(max - min, 1) * 0.2) return "zero-max"
  return "fit"
}

function baselineYFor(domain: { min: number; max: number }, plotY: number, plotH: number): number {
  if (domain.min <= 0 && domain.max >= 0) return mapToPlotY(0, domain, plotY, plotH)
  return plotY + plotH
}

export function renderBar(
  series: ChartSeries[],
  palette: string[],
  x0: number,
  y0: number,
  w: number,
  h: number,
  mutedColor: string,
  textColor: string,
  accentColor: string,
  /**
   * `axes.show_grid` wiring (chart-axes feature). Default **`false`** since
   * the round-4 review (`journal p05`, user's own words: 很多柱状图，其实可以
   * 不要横线的，简单点反而更好看). The reference lines used to be on
   * unconditionally, and on a bar chart they are redundant ink: this renderer
   * prints the value above **every** bar (the `<text>` next to each `<rect>`
   * below), so nothing on the page needs a horizontal ruler to be read — the
   * lines only cut across the bars they were meant to help measure.
   *
   * `renderBarHorizontal` already defaulted to `false` for its own reasons
   * and labels every bar the same way, so the whole bar family now agrees.
   * `renderLine`/`renderArea`/`renderScatter` keep the default **on**: line
   * labels only its first/last point, area labels none, scatter labels only
   * the two x-extents — there the gridlines are the only way to read an
   * interior value, so removing them would cost real information rather than
   * remove duplicate ink.
   *
   * Still a live opt-in either way: an author who wants the lines back sets
   * `axes.show_grid: true`.
   */
  showGrid = false,
  component?: ChartInput,
  _bgHex?: string,
  axisColor?: string,
  fontFamily?: string,
): ReactElement {
  const model = buildChartModel(series)
  const { categories } = model
  const n = model.series.length
  const meta = cartesianMeta(component)
  const yAxis = buildNumericAxis(keptValues(model.series), "zero-max", meta.yUnit)
  const domain: ChartDomain = { min: yAxis.domain.min, max: yAxis.domain.max, degenerate: yAxis.domain.max <= yAxis.domain.min }
  const geom = layoutCartesianPlot({
    x0,
    y0,
    w,
    h,
    yTickLabels: yAxis.labels,
    titleH: meta.titleH,
    fontFamily,
  })
  const groupW = geom.plotW / Math.max(categories.length, 1)
  const yTicks = yAxis.ticks.map((t) => ({
    label: formatAxisTick(t, meta.yUnit),
    pos: mapToPlotY(t, yAxis.domain, geom.plotY, geom.plotH),
  }))
  const xTicks = categories.map((cat, i) => {
    const category = fitSvgLine(String(cat.x), {
      maxWidth: Math.max(8, groupW - BAR_GROUP_EDGE_GAP * 2),
      fontSize: CATEGORY_FONT_SIZE,
      minFontSize: CATEGORY_MIN_FONT_SIZE,
      fontFamily,
    })
    return {
      label: category.text,
      pos: geom.plotX + i * groupW + groupW / 2,
      truncated: category.truncated,
      fontSize: category.fontSize,
    }
  })
  const gradientId = chartGradientId("chart-bar-grad", w, h, series)
  const gradientShade = scaleHexBrightness(accentColor, BAR_GRADIENT_SHADE_FACTOR)
  const dataMax = Math.max(...keptValues(model.series), Number.NEGATIVE_INFINITY)
  const barLabelSpecs: ValueLabelSpec[] = []
  for (let i = 0; i < categories.length; i++) {
    const groupX0 = geom.plotX + i * groupW + BAR_GROUP_EDGE_GAP
    const usableW = groupW - BAR_GROUP_EDGE_GAP * 2
    const perBarW = n <= 1 ? usableW : Math.max(1, (usableW - (n - 1) * BAR_GROUP_EDGE_GAP) / n)
    for (const s of model.series) {
      const value = s.values[i]
      if (value == null) continue
      const barX = groupX0 + s.seriesIndex * (perBarW + BAR_GROUP_EDGE_GAP)
      const { barY } = verticalBarExtent(value, domain, geom.plotY, geom.plotH)
      barLabelSpecs.push({
        id: `bar-${i}-${s.seriesIndex}`,
        text: String(value),
        x: barX + perBarW / 2,
        y: barY - VALUE_LABEL_GAP,
        anchor: "middle",
        fontSize: VALUE_FONT_SIZE,
        fontFamily,
        priority: 100 - s.seriesIndex,
      })
    }
  }
  const placedBars = new Map(resolveValueLabelCollisions(barLabelSpecs).map((label) => [label.id, label]))
  return (
    <>
      {n <= 1 && (
        <defs>
          <linearGradient id={gradientId} x1={0} y1={0} x2={0} y2={1}>
            <stop offset="0%" stopColor={accentColor} />
            <stop offset="100%" stopColor={gradientShade} />
          </linearGradient>
        </defs>
      )}
      {renderCartesianFrame({
        plotX: geom.plotX,
        plotY: geom.plotY,
        plotW: geom.plotW,
        plotH: geom.plotH,
        xTicks,
        yTicks,
        showHGrid: showGrid,
        axisColor: axisColor ?? mutedColor,
        mutedColor,
        fontFamily,
      })}
      {categories.map((cat, i) => {
        const groupX0 = geom.plotX + i * groupW + BAR_GROUP_EDGE_GAP
        const usableW = groupW - BAR_GROUP_EDGE_GAP * 2
        const perBarW = n <= 1 ? usableW : Math.max(1, (usableW - (n - 1) * BAR_GROUP_EDGE_GAP) / n)
        const barElements: ReactElement[] = []
        for (const s of model.series) {
          const value = s.values[i]
          if (value == null) continue
          const barX = groupX0 + s.seriesIndex * (perBarW + BAR_GROUP_EDGE_GAP)
          const isSingle = n <= 1
          const isMax = isSingle && value === dataMax
          const { barY, barH } = verticalBarExtent(value, domain, geom.plotY, geom.plotH)
          const fill = isSingle
            ? isMax
              ? accentColor
              : `url(#${gradientId})`
            : palette[s.seriesIndex % palette.length]
          const placed = placedBars.get(`bar-${i}-${s.seriesIndex}`)
          barElements.push(
            <rect
              key={`r-${s.seriesIndex}`}
              data-plot-mark="1"
              x={barX}
              y={barY}
              width={perBarW}
              height={barH}
              fill={fill}
              opacity={isSingle ? (isMax ? 1 : 0.75) : 1}
            />,
          )
          if (placed && !placed.hidden) {
            barElements.push(
              <text
                key={`v-${s.seriesIndex}`}
                data-value-label="1"
                x={placed.x}
                y={placed.y}
                textAnchor="middle"
                fontSize={VALUE_FONT_SIZE}
                fontWeight={VALUE_FONT_WEIGHT}
                fill={textColor}
                dominantBaseline="alphabetic"
              >
                {placed.text}
              </text>,
            )
          }
        }
        return <g key={cat.key}>{barElements}</g>
      })}
      {renderCartesianAxisTitles({
        plotX: geom.plotX,
        plotBottom: geom.titleY,
        plotW: geom.plotW,
        xTitle: meta.xTitle,
        yTitle: meta.yTitle,
        fill: mutedColor,
        fontFamily: fontFamily ?? "",
      })}
    </>
  )
}

export function renderLine(
  series: ChartSeries[],
  palette: string[],
  x0: number,
  y0: number,
  w: number,
  h: number,
  mutedColor: string,
  textColor: string,
  accentColor: string,
  /** `axes.show_grid` wiring — default **on**, unlike `renderBar`'s (which
   * the round-4 review turned off, see its own doc comment on this same
   * parameter). A line chart labels only each series' first and last point,
   * so every interior value is read off its height alone: the reference
   * lines here are the reading aid, not duplicate ink. */
  showGrid = true,
  component?: ChartInput,
  bgHex?: string,
  axisColor?: string,
  fontFamily?: string,
): ReactElement {
  const model = buildChartModel(series)
  const { categories } = model
  const n = model.series.length
  const showEndpointValues = n <= LINE_ENDPOINT_LABEL_MAX_SERIES
  const meta = cartesianMeta(component)
  const values = keptValues(model.series)
  const yAxis = buildNumericAxis(values, valueAxisMode(values), meta.yUnit)
  const geom = layoutCartesianPlot({
    x0,
    y0,
    w,
    h,
    yTickLabels: yAxis.labels,
    titleH: meta.titleH,
    fontFamily,
  })
  const baselineY = baselineYFor(yAxis.domain, geom.plotY, geom.plotH)
  const categoryMaxWidth = geom.plotW / Math.max(categories.length - 1, 1)
  const xForIndex = (i: number) =>
    geom.plotX + (i / Math.max(categories.length - 1, 1)) * geom.plotW
  const yTicks = yAxis.ticks.map((t) => ({
    label: formatAxisTick(t, meta.yUnit),
    pos: mapToPlotY(t, yAxis.domain, geom.plotY, geom.plotH),
  }))
  const xTicks = categories.map((cat, i) => {
    const category = fitSvgLine(String(cat.x), {
      maxWidth: categoryMaxWidth,
      fontSize: CATEGORY_FONT_SIZE,
      minFontSize: CATEGORY_MIN_FONT_SIZE,
      fontFamily,
    })
    return {
      label: category.text,
      pos: xForIndex(i),
      truncated: category.truncated,
      fontSize: category.fontSize,
      anchor: edgeAnchor(i, categories.length),
    }
  })

  type Resolved = { i: number; x: number; y: number; value: number }
  const seriesEnds = model.series.map((s) => {
    const resolved: Resolved[] = []
    for (let i = 0; i < categories.length; i++) {
      const value = s.values[i]
      if (value == null) continue
      resolved.push({
        i,
        x: xForIndex(i),
        y: mapToPlotY(value, yAxis.domain, geom.plotY, geom.plotH),
        value,
      })
    }
    return { s, resolved, first: resolved[0], last: resolved[resolved.length - 1] }
  })
  const endpointSpecs: ValueLabelSpec[] = []
  if (showEndpointValues) {
    for (const end of seriesEnds) {
      if (end.first) {
        const anchor = edgeAnchor(end.first.i, categories.length)
        // A single-point series' one label names the endpoint marker too.
        const carriesMarker = end.first === end.last
        endpointSpecs.push({
          id: `${end.s.seriesIndex}-first`,
          text: String(end.first.value),
          x: carriesMarker ? clearOfMarker(end.first.x, anchor) : end.first.x,
          y: end.first.y - 6,
          anchor,
          fontSize: VALUE_FONT_SIZE,
          fontFamily,
          priority: 100 - end.s.seriesIndex,
          yMin: geom.plotY + 8,
          yMax: geom.plotY + geom.plotH,
        })
      }
      if (end.last && end.last !== end.first) {
        const anchor = edgeAnchor(end.last.i, categories.length)
        endpointSpecs.push({
          id: `${end.s.seriesIndex}-last`,
          text: String(end.last.value),
          x: clearOfMarker(end.last.x, anchor),
          y: end.last.y - 6,
          anchor,
          fontSize: VALUE_FONT_SIZE,
          fontFamily,
          priority: 100 - end.s.seriesIndex,
          yMin: geom.plotY + 8,
          yMax: geom.plotY + geom.plotH,
        })
      }
    }
  }
  const placedEndpoints = new Map(resolveValueLabelCollisions(endpointSpecs).map((label) => [label.id, label]))

  /**
   * Endpoint markers, painted as two flat layers instead of one pair per
   * series (author screenshot, 2026-08). Three rules, all of them about what
   * happens when two series converge on the same corner of the plot:
   *
   *  - A marker takes its own series' line color. Painting every dot in the
   *    accent made the last series' dot look like it had swallowed the one
   *    underneath, because both were the same color.
   *  - Every ring paints below every dot. Inside the old per-series group a
   *    later series' translucent ring landed on top of an earlier series'
   *    dot and tinted it.
   *  - Rings that would overlap at all collapse to the topmost one, so a
   *    crowded endpoint shows one halo instead of a stack. The
   *    surviving ring always sits on a dot that is actually painted, so no
   *    ring is ever left without an owner.
   */
  const endpointMarkers = seriesEnds
    .filter((end) => end.last)
    .map((end) => ({
      x: end.last!.x,
      y: end.last!.y,
      color: palette[end.s.seriesIndex % palette.length]!,
      key: end.s.seriesIndex,
    }))
  const ringKeys = new Set<number>()
  const ringCenters: { x: number; y: number }[] = []
  for (let i = endpointMarkers.length - 1; i >= 0; i--) {
    const marker = endpointMarkers[i]!
    const crowded = ringCenters.some(
      (c) => Math.hypot(c.x - marker.x, c.y - marker.y) < ENDPOINT_RING_R * 2,
    )
    if (crowded) continue
    ringKeys.add(marker.key)
    ringCenters.push({ x: marker.x, y: marker.y })
  }
  /** Two dots this close read as one blob, so the upper one gets a hairline
   * of the page background between them. */
  const dotTouches = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y) < ENDPOINT_DOT_R * 2

  return (
    <>
      {renderCartesianFrame({
        plotX: geom.plotX,
        plotY: geom.plotY,
        plotW: geom.plotW,
        plotH: geom.plotH,
        xTicks,
        yTicks,
        showHGrid: showGrid,
        axisColor: axisColor ?? mutedColor,
        mutedColor,
        fontFamily,
      })}
      {seriesEnds.map((end) => {
        const s = end.s
        const sIdx = s.seriesIndex
        type Resolved = { i: number; x: number; y: number; value: number }
        const pointAt: (Resolved | null)[] = categories.map((_cat, i) => {
          const value = s.values[i]
          if (value == null) return null
          return {
            i,
            x: xForIndex(i),
            y: mapToPlotY(value, yAxis.domain, geom.plotY, geom.plotH),
            value,
          }
        })
        // "Line break" for a missing category (roadmap's model-driven rule):
        // split into contiguous runs at each gap, one <polyline> per run.
        // n<=1 never has a gap (a single series owns every category by
        // construction — chart-model.ts's own union-order rule), so this is
        // always exactly one run spanning every point, byte-identical to the
        // old always-one-polyline-per-series shape. A series with zero
        // resolved points (empty `data`) still renders one empty polyline,
        // matching the old unconditional `<polyline points={pts} .../>`.
        const runs: Resolved[][] = []
        let current: Resolved[] = []
        for (const point of pointAt) {
          if (point) {
            current.push(point)
          } else if (current.length > 0) {
            runs.push(current)
            current = []
          }
        }
        if (current.length > 0) runs.push(current)
        if (runs.length === 0) runs.push([])

        const resolved = pointAt.filter((p): p is Resolved => p !== null)
        const first = resolved[0]
        const last = resolved[resolved.length - 1]
        // Per-series area-under-curve gradient — each series gets its own
        // declared id (folding sIdx into the seed, and hashing the
        // *original* series object so the id stays byte-compat for n<=1) —
        // only emitted for a single series (n>=2: "no stacked area fills,
        // only line strokes" per the plan — transparent regions would
        // inter-blend once more than one series can be present).
        const areaId = chartGradientId(`chart-line-area-${sIdx}`, w, h, series[sIdx]!)
        return (
          <g key={sIdx}>
            {n <= 1 && first && last && (
              <>
                <defs>
                  <linearGradient id={areaId} x1={0} y1={0} x2={0} y2={1}>
                    <stop offset="0%" stopColor={accentColor} stopOpacity={AREA_FILL_TOP_ALPHA} />
                    <stop offset="100%" stopColor={accentColor} stopOpacity={AREA_FILL_BOTTOM_ALPHA} />
                  </linearGradient>
                </defs>
                <polygon
                  data-plot-mark="1"
                  points={`${runs[0]!.map((c) => `${c.x},${c.y}`).join(" ")} ${last.x},${baselineY} ${first.x},${baselineY}`}
                  fill={`url(#${areaId})`}
                  stroke="none"
                />
              </>
            )}
            {runs.map((run, runIdx) => (
              <polyline
                key={`ln-${runIdx}`}
                data-plot-mark="1"
                points={run.map((c) => `${c.x},${c.y}`).join(" ")}
                fill="none"
                stroke={palette[sIdx % palette.length]}
                strokeWidth={2}
              />
            ))}
            {/* Value labels only at each series' endpoints — every point would
                clutter a many-point line, unlike bar's one-label-per-bar.
                "Endpoints" now means the first/last *non-null* point (a
                trailing/leading gap has no coordinate to be first or last
                at), but the edge-anchor direction still reads off that
                point's real position in the shared category axis.
                Dropped entirely past LINE_ENDPOINT_LABEL_MAX_SERIES: the
                numbers collide into an ink blot, so the legend carries
                identity instead. */}
            {(["first", "last"] as const).map((kind) => {
              const placed = placedEndpoints.get(`${sIdx}-${kind}`)
              if (!placed || placed.hidden) return null
              return (
                <text
                  key={kind}
                  data-value-label="1"
                  x={placed.x}
                  y={placed.y}
                  textAnchor={placed.anchor}
                  fontSize={placed.fontSize}
                  fontWeight={VALUE_FONT_WEIGHT}
                  fill={textColor}
                  dominantBaseline="alphabetic"
                >
                  {placed.text}
                </text>
              )
            })}
          </g>
        )
      })}
      {endpointMarkers
        .filter((marker) => ringKeys.has(marker.key))
        .map((marker) => (
          <circle
            key={`ring-${marker.key}`}
            data-plot-mark="1"
            cx={marker.x}
            cy={marker.y}
            r={ENDPOINT_RING_R}
            fill="none"
            stroke={marker.color}
            strokeOpacity={ENDPOINT_RING_OPACITY}
          />
        ))}
      {endpointMarkers.map((marker, i) => {
        const crowded = endpointMarkers.some((other, j) => j !== i && dotTouches(marker, other))
        return (
          <circle
            key={`dot-${marker.key}`}
            data-plot-mark="1"
            cx={marker.x}
            cy={marker.y}
            r={ENDPOINT_DOT_R}
            fill={marker.color}
            {...(crowded && bgHex ? { stroke: bgHex, strokeWidth: 1 } : {})}
          />
        )
      })}
      {renderCartesianAxisTitles({
        plotX: geom.plotX,
        plotBottom: geom.titleY,
        plotW: geom.plotW,
        xTitle: meta.xTitle,
        yTitle: meta.yTitle,
        fill: mutedColor,
        fontFamily: fontFamily ?? "",
      })}
    </>
  )
}

/** Radial stub a leader travels out from the arc before it turns horizontal. */
const PIE_LEADER_STUB = 10
/** Air between a leader's end and the first glyph of the label it points at. */
const PIE_LEADER_GAP = 6
/**
 * Floor on how much radius the pie gives up to make room for its label
 * gutters. Wide labels shrink the circle; past this the circle stops
 * shrinking and the labels are fitted (to the 16px floor, then clipped)
 * instead. A pie reduced to a small disc in a field of text has stopped
 * being a pie, which is the same trade `renderDumbbell`'s own
 * `DUMBBELL_PLOT_MIN_W` makes for its plot band.
 */
const PIE_MIN_RADIUS_RATIO = 0.55

/** One slice's label geometry, plus the two angles its own path is drawn from. */
interface RadialSlice {
  readonly key: number
  readonly startA: number
  readonly endA: number
  readonly right: boolean
  readonly textX: number
  readonly fitted: ReturnType<typeof fitSvgLine>
  readonly arcX: number
  readonly arcY: number
  readonly stubX: number
  readonly stubY: number
  readonly value: number
}

/**
 * The radial label gutter, shared by the pie and the donut.
 *
 * Both charts are one series of named slices with no axis and no legend, so
 * the only thing that can name a slice is a label beside it. The pie grew
 * that mechanism first; the donut drew nameless rings for another wave, its
 * centre carrying a total and a series name while the slices themselves said
 * nothing — 100 gallery pages of colored arcs a reader could not read.
 *
 * Extracted verbatim rather than reimplemented: the arithmetic, and the order
 * it runs in, is what keeps `EXPECTED_PIE`'s wedges byte-identical.
 *
 * Returns the radius the circle keeps after yielding what the gutters need,
 * and one entry per slice. The caller builds its own `d` from `startA`/`endA`
 * — a wedge for the pie, an annulus sector for the donut.
 */
function layoutRadialSlices(
  data: ChartSeries["data"],
  total: number,
  cx: number,
  cy: number,
  x0: number,
  w: number,
  fullR: number,
  fontFamily?: string,
): { r: number; slices: RadialSlice[] } {
  // One authoritative label budget, used both to size the circle and to fit
  // the text. Measuring the leftover geometry back out instead costs a float
  // bit at exactly the point where reservation and budget are meant to be
  // equal, and `fitSvgLine`'s `floor(available / units)` turns that bit into
  // a whole dropped size step, so the label that set the reservation is the
  // one that gets truncated. Caught on the funnel, whose widest band's label
  // is usually also its longest: it shipped as "田野采集 " with its own value
  // clipped off, on 18 gallery pages. Geometry may grant a label *more* room
  // than the budget (a narrow band, a small slice); it never grants less.
  const texts = data.map(directLabelText)
  const labelBudget = Math.max(
    0,
    Math.min(
      widestDirectLabel(texts, fontFamily),
      w / 2 - PIE_LEADER_STUB - PIE_LEADER_GAP - fullR * PIE_MIN_RADIUS_RATIO,
    ),
  )
  const r = Math.max(
    fullR * PIE_MIN_RADIUS_RATIO,
    Math.min(fullR, w / 2 - (PIE_LEADER_STUB + PIE_LEADER_GAP + labelBudget)),
  )

  let acc = 0
  const slices = data.map((d, i) => {
    const startA = (acc / total) * Math.PI * 2 - Math.PI / 2
    acc += d.y
    const endA = (acc / total) * Math.PI * 2 - Math.PI / 2
    // Where the label hangs off: the slice's own middle, carried one stub
    // out past the arc. A slice on the right half labels rightward, one on
    // the left labels leftward, so a leader never crosses the circle.
    const midA = (startA + endA) / 2
    const right = Math.cos(midA) >= 0
    const textX = right ? cx + r + PIE_LEADER_STUB + PIE_LEADER_GAP : cx - r - PIE_LEADER_STUB - PIE_LEADER_GAP
    return {
      key: i,
      startA,
      endA,
      right,
      textX,
      // Truncation is the last resort, after the circle has already given up
      // what radius it can: fit to the room that is actually left.
      fitted: fitSvgLine(texts[i]!, {
        maxWidth: Math.max(labelBudget, right ? x0 + w - textX : textX - x0),
        fontSize: DIRECT_LABEL_FONT_SIZE,
        minFontSize: DIRECT_LABEL_FONT_SIZE,
        bold: true,
        fontFamily,
      }),
      arcX: cx + Math.cos(midA) * r,
      arcY: cy + Math.sin(midA) * r,
      stubX: cx + Math.cos(midA) * (r + PIE_LEADER_STUB),
      stubY: cy + Math.sin(midA) * (r + PIE_LEADER_STUB),
      value: d.y,
    }
  })
  return { r, slices }
}

/**
 * Leader lines and labels for a laid-out radial chart.
 *
 * Each gutter is stacked on its own: a thin slice's label slides off its
 * neighbour's line instead of landing on it, and a gutter too short to hold
 * every label drops its smallest slices rather than overlapping.
 */
function radialSliceLabels(
  slices: readonly RadialSlice[],
  y0: number,
  h: number,
  mutedColor: string | undefined,
  labelFill: string | undefined,
): ReactElement {
  const pitch = labelLinePitch(DIRECT_LABEL_FONT_SIZE)
  const bounds = { top: y0, bottom: y0 + h }
  const columnSpec = (slice: RadialSlice): ColumnLabelSpec => ({
    id: String(slice.key),
    y: slice.stubY,
    pitch,
    priority: slice.value,
  })
  const placed = new Map(
    [true, false].flatMap((side) =>
      stackLabelColumn(slices.filter((s) => s.right === side).map(columnSpec), bounds).map(
        (label) => [label.id, label] as const,
      ),
    ),
  )
  return (
    <>
      {slices.map((slice) => {
        const label = placed.get(String(slice.key))
        if (!label || label.hidden || !slice.fitted.text) return null
        const elbowX = slice.right ? slice.textX - PIE_LEADER_GAP : slice.textX + PIE_LEADER_GAP
        return (
          <g key={`label-${slice.key}`}>
            <polyline
              points={`${slice.arcX},${slice.arcY} ${slice.stubX},${slice.stubY} ${elbowX},${label.y}`}
              fill="none"
              stroke={mutedColor}
              strokeWidth={1}
              strokeOpacity={0.55}
            />
            <text
              data-value-label="1"
              data-truncated={slice.fitted.truncated ? "1" : undefined}
              x={slice.textX}
              y={label.y + DIRECT_LABEL_FONT_SIZE * DIRECT_LABEL_CENTER_TO_BASELINE}
              textAnchor={slice.right ? "start" : "end"}
              fontSize={slice.fitted.fontSize}
              fontWeight={DIRECT_LABEL_FONT_WEIGHT}
              fill={labelFill}
              dominantBaseline="alphabetic"
            >
              {slice.fitted.text}
            </text>
          </g>
        )
      })}
    </>
  )
}

export function renderPie(
  series: ChartSeries[],
  palette: string[],
  x0: number,
  y0: number,
  w: number,
  h: number,
  mutedColor?: string,
  textColor?: string,
  _accentColor?: string,
  /** Unused — pie has no axes (radial, not applicable per chart.tsx's
   * `AXES_APPLICABLE_TYPES`). Kept for signature parity with bar/line/
   * barHorizontal so `chart.tsx`'s `renderers` record dispatches through one
   * uniform call shape (same convention `_accentColor` above already
   * established for this function). */
  _showGrid?: boolean,
  _component?: ChartInput,
  bgHex?: string,
  _axisColor?: string,
  fontFamily?: string,
): ReactElement {
  const data = series[0]?.data ?? []
  const total = data.reduce((s, d) => s + d.y, 0)
  if (total <= 0) return <WholeShareDeclined data={data} />
  const cx = x0 + w / 2
  const cy = y0 + h / 2
  const fullR = Math.min(w, h) / 2 - 4
  // The circle gives up radius to the two label gutters, down to the floor.
  // A pie wide enough for its labels (the common case: `chart.tsx` hands
  // this renderer the full component width against a fixed 240px band) keeps
  // its full radius, so the wedge geometry is untouched there.
  const { r, slices } = layoutRadialSlices(data, total, cx, cy, x0, w, fullR, fontFamily)
  const labelFill = directLabelInk(textColor, bgHex)

  return (
    <>
      {slices.map((slice) => {
        const large = slice.endA - slice.startA > Math.PI ? 1 : 0
        const x1 = cx + Math.cos(slice.startA) * r
        const y1 = cy + Math.sin(slice.startA) * r
        const x2 = cx + Math.cos(slice.endA) * r
        const y2 = cy + Math.sin(slice.endA) * r
        return (
          <path
            key={slice.key}
            d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`}
            fill={palette[slice.key % palette.length]}
          />
        )
      })}
      {radialSliceLabels(slices, y0, h, mutedColor, labelFill)}
    </>
  )
}

/** Air between a funnel band's end and the label naming it. */
const FUNNEL_LABEL_GAP = 10
/**
 * Floor on the width the funnel keeps for its own bands. Labels take their
 * measured width out of `w`; past this the bands stop narrowing and the
 * labels are fitted into what is left, same trade as `PIE_MIN_RADIUS_RATIO`.
 */
const FUNNEL_MIN_BANDS_RATIO = 0.5

export function renderFunnel(
  series: ChartSeries[],
  palette: string[],
  x0: number,
  y0: number,
  w: number,
  h: number,
  _mutedColor?: string,
  textColor?: string,
  _accentColor?: string,
  /** Unused — funnel is not `AXES_APPLICABLE_TYPES` (chart.tsx): a single
   * value dimension with no second (category) axis and no plot-box gridline
   * surface to anchor a title against. Kept for signature parity, same as
   * `renderPie`'s own `_showGrid`. */
  _showGrid?: boolean,
  _component?: ChartInput,
  bgHex?: string,
  _axisColor?: string,
  fontFamily?: string,
): ReactElement {
  const data = series[0]?.data ?? []
  const max = Math.max(...data.map((d) => d.y), 1)
  const stepH = h / Math.max(data.length, 1)
  const texts = data.map(directLabelText)
  // One label per band, so the bands themselves are the anti-collision
  // mechanism — until a row is shorter than a line of text, at which point
  // no placement inside this component can keep neighbouring labels apart
  // and the whole chart goes back to bands only. All or nothing, rather than
  // labeling whichever rows happen to win a race.
  const labeled = data.length > 0 && stepH >= labelLinePitch(DIRECT_LABEL_FONT_SIZE)
  // One authoritative label budget, capped so the funnel keeps the wider
  // half of the box — see `renderPie`'s own note on why the fit budget reads
  // this number rather than measuring the leftover geometry back.
  const labelBudget = labeled
    ? Math.max(
        0,
        Math.min(
          widestDirectLabel(texts, fontFamily),
          w * (1 - FUNNEL_MIN_BANDS_RATIO) - FUNNEL_LABEL_GAP,
        ),
      )
    : 0
  const bandsW = labeled ? w - FUNNEL_LABEL_GAP - labelBudget : w
  const labelFill = directLabelInk(textColor, bgHex)
  return (
    <>
      {data.map((d, i) => {
        const ratio = d.y / max
        const barW = clampChartExtent(bandsW * ratio)
        const barX = x0 + (bandsW - barW) / 2
        const bandCy = y0 + i * stepH + stepH / 2
        // `Math.max(0, barW)` for the same reason `clampChartExtent` exists:
        // a negative `y` is legal IR and already yields a degenerate band, so
        // the label anchors to the band's real right edge rather than riding
        // that geometry off the page.
        const labelX = barX + Math.max(0, barW) + FUNNEL_LABEL_GAP
        const fitted = labeled
          ? fitSvgLine(texts[i]!, {
              maxWidth: Math.max(labelBudget, x0 + w - labelX),
              fontSize: DIRECT_LABEL_FONT_SIZE,
              minFontSize: DIRECT_LABEL_FONT_SIZE,
              bold: true,
              fontFamily,
            })
          : null
        return (
          <g key={i}>
            <rect
              data-plot-mark="1"
              x={barX}
              y={y0 + i * stepH + 2}
              width={barW}
              height={stepH - 4}
              fill={palette[i % palette.length]}
            />
            {fitted && fitted.text && (
              <text
                data-value-label="1"
                data-truncated={fitted.truncated ? "1" : undefined}
                x={labelX}
                y={bandCy + DIRECT_LABEL_FONT_SIZE * DIRECT_LABEL_CENTER_TO_BASELINE}
                fontSize={fitted.fontSize}
                fontWeight={DIRECT_LABEL_FONT_WEIGHT}
                fill={labelFill}
                dominantBaseline="alphabetic"
              >
                {fitted.text}
              </text>
            )}
          </g>
        )
      })}
    </>
  )
}

/**
 * dumbbell 哑铃变化图（2026-07-12 借鉴财经简报）：series[0]=起点值、
 * series[1]=终点值（等长同 x），每行「muted 起点●——线——accent 终点●」+
 * 双端数值标签，行标签左侧右对齐。表达「从 A 到 B 的变化」。
 *
 * 左侧类目带宽不再钉死在 96px：按全部行标签实测字宽，优先按可读字号
 * 把带宽涨到刚好放下，plot 留 floor。空间不够再降到 minFontSize。
 * 还装不下也不画省略号，末路丢字。
 */
const DUMBBELL_LABEL_W_MIN = 96
const DUMBBELL_DOT_R = 5
/** Floor (px) reserved past the plot's right edge for the to.y label. Grows
 * with the widest to-value the same way the left category band grows. */
const DUMBBELL_VALUE_LABEL_W_MIN = 56
const DUMBBELL_LABEL_GAP = 12
const DUMBBELL_LABEL_FONT_SIZE = 16
const DUMBBELL_LABEL_MIN_FONT_SIZE = 16
const DUMBBELL_TO_FONT_SIZE = 16
const DUMBBELL_TO_MIN_FONT_SIZE = 16
/** Keep the connector + both endpoint dots readable when the label band grows. */
const DUMBBELL_PLOT_MIN_W = 240
const DUMBBELL_TO_LABEL_INSET = DUMBBELL_DOT_R + 8

function dumbbellTextWidth(text: string, fontSize: number, bold?: boolean): number {
  return measureTextUnits(text, { bold }) * fontSize
}

function maxDumbbellTextWidth(texts: string[], fontSize: number, bold?: boolean): number {
  let widest = 0
  for (const text of texts) {
    const px = dumbbellTextWidth(text, fontSize, bold)
    if (px > widest) widest = px
  }
  return widest
}

/** Drop overflow glyphs with no ellipsis mark (cover-vertical-title pattern). */
function clipDumbbellText(
  text: string,
  maxWidth: number,
  fontSize: number,
  bold?: boolean,
): string {
  if (maxWidth <= 0 || fontSize <= 0) return ""
  const weight = { bold }
  const maxUnits = maxWidth / fontSize
  if (measureTextUnits(text, weight) <= maxUnits) return text
  let out = ""
  for (const ch of Array.from(text)) {
    const next = out + ch
    if (measureTextUnits(next, weight) > maxUnits) break
    out = next
  }
  return out
}

function fitDumbbellLine(
  text: string,
  opts: { maxWidth: number; fontSize: number; minFontSize: number; bold?: boolean },
): { text: string; fontSize: number; clipped: boolean } {
  const weightBold = opts.bold
  const units = measureTextUnits(text, { bold: weightBold })
  if (units <= 0) return { text, fontSize: opts.fontSize, clipped: false }
  if (opts.maxWidth <= 0) {
    return { text: "", fontSize: opts.minFontSize, clipped: text.length > 0 }
  }
  if (units * opts.fontSize <= opts.maxWidth) {
    return { text, fontSize: opts.fontSize, clipped: false }
  }
  const fitted = Math.min(opts.fontSize, Math.floor(opts.maxWidth / units))
  if (fitted >= opts.minFontSize) {
    return { text, fontSize: fitted, clipped: false }
  }
  const clipped = clipDumbbellText(text, opts.maxWidth, opts.minFontSize, weightBold)
  return { text: clipped, fontSize: opts.minFontSize, clipped: clipped !== text }
}

function allocateDumbbellBands(
  w: number,
  categoryTexts: string[],
  toValueTexts: string[],
): { labelW: number; valueW: number; plotW: number } {
  const gap = DUMBBELL_LABEL_GAP
  const plotFloor = Math.min(DUMBBELL_PLOT_MIN_W, Math.max(1, Math.floor(w * 0.4)))
  const maxBands = Math.max(0, w - gap - plotFloor)

  const labelPreferred = Math.max(
    DUMBBELL_LABEL_W_MIN,
    Math.ceil(maxDumbbellTextWidth(categoryTexts, DUMBBELL_LABEL_FONT_SIZE, true)),
  )
  const labelAtMin = Math.max(
    DUMBBELL_LABEL_W_MIN,
    Math.ceil(maxDumbbellTextWidth(categoryTexts, DUMBBELL_LABEL_MIN_FONT_SIZE, true)),
  )
  const valuePreferred = Math.max(
    DUMBBELL_VALUE_LABEL_W_MIN,
    Math.ceil(DUMBBELL_TO_LABEL_INSET + maxDumbbellTextWidth(toValueTexts, DUMBBELL_TO_FONT_SIZE, true)),
  )
  const valueAtMin = Math.max(
    DUMBBELL_VALUE_LABEL_W_MIN,
    Math.ceil(DUMBBELL_TO_LABEL_INSET + maxDumbbellTextWidth(toValueTexts, DUMBBELL_TO_MIN_FONT_SIZE, true)),
  )

  // Prefer the readable (13px / 12.5px) band. If that would eat the plot
  // floor, fall back to minFontSize widths, then cap at maxBands so
  // fitDumbbellLine can clip glyphs as a last resort.
  let labelNeed = labelPreferred
  let valueNeed = valuePreferred
  if (labelNeed + valueNeed > maxBands) {
    labelNeed = labelAtMin
    valueNeed = valueAtMin
  }

  const labelW = Math.min(labelNeed, maxBands)
  const valueW = Math.min(valueNeed, Math.max(0, maxBands - labelW))
  const plotW = Math.max(1, w - labelW - gap - valueW)
  return { labelW, valueW, plotW }
}

export function renderDumbbell(
  series: ChartSeries[],
  _palette: string[],
  x0: number,
  y0: number,
  w: number,
  h: number,
  mutedColor: string,
  textColor: string,
  accentColor: string,
  /** Unused — dumbbell is not `AXES_APPLICABLE_TYPES` (chart.tsx): a
   * two-endpoint value comparison with no fixed zero-anchored plot box (its
   * own `vx()` domain floats to the data's actual min/max, see this
   * function's own domain-safety comment above), so no gridline surface to
   * anchor a title against either. Kept for signature parity, same as
   * `renderPie`'s own `_showGrid`. */
  _showGrid?: boolean,
  _component?: ChartInput,
  bgHex?: string,
): ReactElement {
  // Value labels sit on the page, not on a mark, so the accent has to clear
  // a contrast floor here even though the endpoint dots painted in the same
  // color do not. See `ChartRenderFn`'s `bgHex` doc comment.
  const accentInk = bgHex ? accessibleInk(accentColor, bgHex, 16) : accentColor
  const fromData = series[0]?.data ?? []
  const toData = series[1]?.data ?? []
  const rows = Math.min(fromData.length, toData.length)
  if (rows === 0) return <></>
  const all = [...fromData, ...toData].map((d) => d.y)
  // Value domain must cover the data's real minimum, not just its positive
  // side — a negative value otherwise has no left bound and `vx()` can push
  // it arbitrarily far off-canvas (2026-07-21 fix: a mixed-sign series, e.g.
  // from:-5/to:10, degenerated through svg2pptx/text.ts's `align==="center"`
  // branch — `half = Math.min(xPx, CANVAS_W_PX - xPx)` goes negative once
  // `xPx < 0` — into a negative-width text op, which the package-audit gate
  // then rejected outright). `max` keeps its pre-existing +1 floor and `min`
  // mirrors it on the low side with a 0 floor, so `max >= 1` and `min <= 0`
  // always hold and `max > min` is structurally guaranteed for every input —
  // the same "provably non-degenerate" guarantee gantt.tsx's `axisBounds`
  // documents for its own vx() domain. `min` collapses to exactly 0 whenever
  // every value is already >= 0, so a positive-only or all-zero series (the
  // only cases this component shipped with before) renders byte-identically
  // to the old `v / max` formula.
  const min = Math.min(0, ...all)
  const max = Math.max(...all, 1)
  const categoryTexts = fromData.slice(0, rows).map((d) => String(d.x))
  const toValueTexts = toData.slice(0, rows).map((d) => String(d.y))
  const { labelW, valueW, plotW } = allocateDumbbellBands(w, categoryTexts, toValueTexts)
  const plotX = x0 + labelW + DUMBBELL_LABEL_GAP
  const rowH = h / rows
  const vx = (v: number) => plotX + ((v - min) / (max - min)) * plotW
  const toLabelMaxWidth = Math.max(0, valueW - DUMBBELL_TO_LABEL_INSET)
  const fromLabelMaxWidth = Math.max(plotW, valueW)
  return (
    <>
      {Array.from({ length: rows }, (_, i) => {
        const from = fromData[i]
        const to = toData[i]
        const cy = y0 + i * rowH + rowH / 2
        const label = fitDumbbellLine(String(from.x), {
          maxWidth: labelW,
          fontSize: DUMBBELL_LABEL_FONT_SIZE,
          minFontSize: DUMBBELL_LABEL_MIN_FONT_SIZE,
          bold: true,
        })
        const fromValueLabel = fitDumbbellLine(String(from.y), {
          maxWidth: fromLabelMaxWidth,
          fontSize: DUMBBELL_FROM_FONT_SIZE,
          minFontSize: DUMBBELL_FROM_FONT_SIZE,
        })
        const toValueLabel = fitDumbbellLine(String(to.y), {
          maxWidth: toLabelMaxWidth,
          fontSize: DUMBBELL_TO_FONT_SIZE,
          minFontSize: DUMBBELL_TO_MIN_FONT_SIZE,
          bold: true,
        })
        const x1 = vx(from.y)
        const x2 = vx(to.y)
        return (
          <g key={i}>
            <text
              data-truncated={label.clipped ? "1" : undefined}
              x={x0 + labelW}
              y={cy + 4}
              textAnchor="end"
              fontSize={label.fontSize}
              fontWeight="600"
              fill={textColor}
              dominantBaseline="alphabetic"
            >
              {label.text}
            </text>
            <line data-plot-mark="1" x1={x1} y1={cy} x2={x2} y2={cy} stroke={mutedColor} strokeWidth={2} strokeOpacity={0.55} />
            <circle data-plot-mark="1" cx={x1} cy={cy} r={DUMBBELL_DOT_R} fill={mutedColor} />
            <circle data-plot-mark="1" cx={x2} cy={cy} r={DUMBBELL_DOT_R + 1.5} fill={accentColor} />
            <text
              data-truncated={fromValueLabel.clipped ? "1" : undefined}
              x={x1}
              y={cy - 11}
              textAnchor="middle"
              fontSize={fromValueLabel.fontSize}
              fill={mutedColor}
              dominantBaseline="alphabetic"
            >
              {fromValueLabel.text}
            </text>
            <text
              data-truncated={toValueLabel.clipped ? "1" : undefined}
              x={x2 + DUMBBELL_TO_LABEL_INSET}
              y={cy + 4}
              fontSize={toValueLabel.fontSize}
              fontWeight="bold"
              fill={accentInk}
              dominantBaseline="alphabetic"
            >
              {toValueLabel.text}
            </text>
          </g>
        )
      })}
    </>
  )
}

/**
 * bar 横向模式（2026-07-12 借鉴）：行式横条排名——类目标签左侧右对齐、
 * 条自左起、端值标签在条右。长标签（公司名/条目名）比竖柱友好。
 * 最大条实色 accent，其余同竖版走渐变（横向）。
 */
const BAR_H_LABEL_W = 110
/**
 * Fit budget headroom for the horizontal bar's category labels.
 *
 * The label band is flush against the chart's own left edge and the label
 * is right-anchored at the band's right edge, so any width the estimator
 * underestimates spills *left*, straight out of the component's box —
 * there is no margin on that side to absorb it. `measureTextUnits` is an
 * estimator with known signed error (see `svg-audit.ts`'s own notes on
 * per-character weights), and lowercase hyphenated Latin is exactly where
 * it runs short: the 2026-08-15 visual review caught "ArgoCD app-of-apps"
 * rendering 10px past the box edge after fitting "successfully" to 110.
 *
 * Fitting to a slightly smaller budget than the band keeps that drift
 * inside the band instead of outside the chart. Preferred over switching
 * the label to a left anchor, which would send the spill into the plot
 * gap but cost the flush-right alignment against the bars that makes a
 * horizontal bar chart readable in the first place.
 */
const BAR_H_LABEL_FIT_MARGIN = 8
/** Row edge margin (px, was the inline literals `5`/`rowH - 10`) — reused as
 * the intra-group gap between sibling sub-rows in a grouped (n>=2) category,
 * same rationale as `renderBar`'s own `BAR_GROUP_EDGE_GAP`. */
const BAR_H_ROW_EDGE_GAP = 5
/** Row thickness floor (px, was the inline literal `4` in `Math.max(4, rowH
 * - 10)`) — reused unchanged as the floor for each sub-row in a grouped
 * category too, rather than inventing a second minimum. */
const BAR_H_MIN_THICKNESS = 4

export function renderBarHorizontal(
  series: ChartSeries[],
  palette: string[],
  x0: number,
  y0: number,
  w: number,
  h: number,
  mutedColor: string,
  textColor: string,
  accentColor: string,
  /**
   * `axes.show_grid` wiring — default `false`. This component never drew
   * gridlines in the first place (no pre-existing always-on behavior to
   * preserve), and since the round-4 review `renderBar` agrees with it for
   * the reason spelled out on that function's own `showGrid` parameter:
   * both bar directions print the value beside every bar, so a reference
   * ruler adds nothing. Only an explicit `axes.show_grid: true` draws them.
   */
  showGrid = false,
  component?: ChartInput,
  _bgHex?: string,
  axisColor?: string,
  fontFamily?: string,
): ReactElement {
  const model = buildChartModel(series)
  const { categories } = model
  if (categories.length === 0) return <></>
  const n = model.series.length
  const meta = cartesianMeta(component)
  const values = keptValues(model.series)
  const xAxis = buildNumericAxis(values, "zero-max", meta.xUnit ?? meta.yUnit)
  const domain: ChartDomain = { min: xAxis.domain.min, max: xAxis.domain.max, degenerate: false }
  const dataMax = Math.max(...values, Number.NEGATIVE_INFINITY)
  const plotX = x0 + BAR_H_LABEL_W + 12
  const plotW = Math.max(1, w - BAR_H_LABEL_W - 12 - 64)
  const plotY = y0 + 4
  const plotH = Math.max(1, h - meta.titleH - X_TICK_BAND - 4)
  const rowH = plotH / categories.length
  const gradientId = chartGradientId("chart-barh-grad", w, h, series)
  const gradientShade = scaleHexBrightness(accentColor, BAR_GRADIENT_SHADE_FACTOR)
  const xTicks = xAxis.ticks.map((t, i) => ({
    label: formatAxisTick(t, meta.xUnit ?? meta.yUnit),
    pos: mapToPlotX(t, xAxis.domain, plotX, plotW),
    anchor: edgeAnchor(i, xAxis.ticks.length),
  }))
  const hBarSpecs: ValueLabelSpec[] = []
  for (let i = 0; i < categories.length; i++) {
    const rowY0 = plotY + i * rowH + BAR_H_ROW_EDGE_GAP
    const usableH = rowH - BAR_H_ROW_EDGE_GAP * 2
    const perBarH =
      n <= 1
        ? Math.max(BAR_H_MIN_THICKNESS, usableH)
        : Math.max(BAR_H_MIN_THICKNESS, (usableH - (n - 1) * BAR_H_ROW_EDGE_GAP) / n)
    for (const s of model.series) {
      const value = s.values[i]
      if (value == null) continue
      const barY = rowY0 + s.seriesIndex * (perBarH + BAR_H_ROW_EDGE_GAP)
      const { barX, barW } = horizontalBarExtent(value, domain, plotX, plotW)
      hBarSpecs.push({
        id: `hbar-${i}-${s.seriesIndex}`,
        text: String(value),
        x: barX + barW + 8,
        y: barY + perBarH / 2 + 4,
        anchor: "start",
        fontSize: VALUE_FONT_SIZE,
        fontFamily,
        priority: 100 - s.seriesIndex,
      })
    }
  }
  const placedHBars = new Map(resolveValueLabelCollisions(hBarSpecs).map((label) => [label.id, label]))
  const yTicks = categories.map((cat, i) => {
    const label = fitSvgLine(String(cat.x), {
      maxWidth: BAR_H_LABEL_W - BAR_H_LABEL_FIT_MARGIN,
      fontSize: TICK_FONT_SIZE,
      minFontSize: TICK_MIN_FONT_SIZE,
      fontFamily,
    })
    return {
      label: label.text,
      pos: plotY + i * rowH + rowH / 2,
      truncated: label.truncated,
      fontSize: label.fontSize,
    }
  })
  return (
    <>
      {n <= 1 && (
        <defs>
          <linearGradient id={gradientId} x1={0} y1={0} x2={1} y2={0}>
            <stop offset="0%" stopColor={gradientShade} />
            <stop offset="100%" stopColor={accentColor} />
          </linearGradient>
        </defs>
      )}
      {renderCartesianFrame({
        plotX,
        plotY,
        plotW,
        plotH,
        xTicks,
        yTicks,
        showHGrid: showGrid,
        showVGrid: false,
        axisColor: axisColor ?? mutedColor,
        mutedColor,
        fontFamily,
      })}
      {categories.map((cat, i) => {
        // Row geometry, mirrors renderBar's group geometry comment: n<=1
        // keeps the old unconditional `Math.max(4, rowH - 10)` floor
        // (`perBarH === Math.max(BAR_H_MIN_THICKNESS, usableH)`, same
        // expression, byte-identical); n>=2 splits the row into n sub-rows
        // with (n-1) intra-group gaps of the same BAR_H_ROW_EDGE_GAP unit.
        const rowY0 = plotY + i * rowH + BAR_H_ROW_EDGE_GAP
        const usableH = rowH - BAR_H_ROW_EDGE_GAP * 2
        const perBarH =
          n <= 1
            ? Math.max(BAR_H_MIN_THICKNESS, usableH)
            : Math.max(BAR_H_MIN_THICKNESS, (usableH - (n - 1) * BAR_H_ROW_EDGE_GAP) / n)
        const barElements: ReactElement[] = []
        for (const s of model.series) {
          const value = s.values[i]
          if (value == null) continue
          const barY = rowY0 + s.seriesIndex * (perBarH + BAR_H_ROW_EDGE_GAP)
          const isSingle = n <= 1
          const isMax = isSingle && value === dataMax
          const { barX, barW } = horizontalBarExtent(value, domain, plotX, plotW)
          const fill = isSingle
            ? isMax
              ? accentColor
              : `url(#${gradientId})`
            : palette[s.seriesIndex % palette.length]
          barElements.push(
            <rect
              key={`r-${s.seriesIndex}`}
              data-plot-mark="1"
              x={barX}
              y={barY}
              width={barW}
              height={perBarH}
              fill={fill}
              opacity={isSingle ? (isMax ? 1 : 0.75) : 1}
            />,
          )
          const placed = placedHBars.get(`hbar-${i}-${s.seriesIndex}`)
          if (placed && !placed.hidden) {
            barElements.push(
              <text
                key={`v-${s.seriesIndex}`}
                data-value-label="1"
                x={placed.x}
                y={placed.y}
                fontSize={VALUE_FONT_SIZE}
                fontWeight={VALUE_FONT_WEIGHT}
                fill={textColor}
                dominantBaseline="alphabetic"
              >
                {placed.text}
              </text>,
            )
          }
        }
        return <g key={cat.key}>{barElements}</g>
      })}
      {renderCartesianAxisTitles({
        plotX,
        plotBottom: plotY + plotH + X_TICK_BAND,
        plotW,
        xTitle: meta.xTitle,
        yTitle: meta.yTitle,
        fill: mutedColor,
        fontFamily: fontFamily ?? "",
      })}
    </>
  )
}

/**
 * donut 环形图（2026-07-12 借鉴）：pie 的环形变体——环形扇区 path
 * （外弧+内弧，不依赖背景色圆覆盖）+ 中心总值大字 +「总计」小字。
 */
const DONUT_HOLE_RATIO = 0.62

/**
 * One annulus (ring) sector as `renderDonut`'s own wedge idiom — the exact
 * 23-token `M outer A ... L inner A ... Z` `d` string deck-audit's
 * `parseWedgePath` recognizes (`svg/audit/deck-audit.ts`). Emitting it verbatim
 * is what lets `renderGauge`'s progress arc be attributed as a *ring band*
 * (hole excluded), not its bounding box — a bbox would swallow the centered
 * gauge number and misattribute its contrast. `startA`/`endA` in radians,
 * `atan2` convention; `large-arc-flag` derived exactly as the old inline donut
 * code did (`endA - startA > π ? 1 : 0`) so the pinned donut goldens stay
 * byte-identical. */
function annulusSectorPath(cx: number, cy: number, r: number, ri: number, startA: number, endA: number): string {
  const large = endA - startA > Math.PI ? 1 : 0
  const ox1 = cx + Math.cos(startA) * r
  const oy1 = cy + Math.sin(startA) * r
  const ox2 = cx + Math.cos(endA) * r
  const oy2 = cy + Math.sin(endA) * r
  const ix1 = cx + Math.cos(endA) * ri
  const iy1 = cy + Math.sin(endA) * ri
  const ix2 = cx + Math.cos(startA) * ri
  const iy2 = cy + Math.sin(startA) * ri
  return `M ${ox1} ${oy1} A ${r} ${r} 0 ${large} 1 ${ox2} ${oy2} L ${ix1} ${iy1} A ${ri} ${ri} 0 ${large} 0 ${ix2} ${iy2} Z`
}

export function renderDonut(
  series: ChartSeries[],
  palette: string[],
  x0: number,
  y0: number,
  w: number,
  h: number,
  mutedColor?: string,
  textColor?: string,
  _accentColor?: string,
  /** Unused — donut is radial (`chart_type: "donut"`, or the legacy
   * `chart_type: "pie"` + `style: "donut"` form), so it's covered by the same
   * not-`AXES_APPLICABLE_TYPES` rationale as `renderPie`'s own `_showGrid`.
   * Kept for signature parity with `resolveRenderer`'s other branches. */
  _showGrid?: boolean,
  /** Center-total gate (chart-depth wave). The legacy `pie`+`style:"donut"`
   * form and the byte-compat golden call it with `component` undefined and
   * MUST keep the center total — so `undefined` reads as "show it". The
   * dedicated `chart_type: "donut"` subtype instead defaults the center to
   * empty and only prints the total when its own `center_total` is set. */
  component?: ChartInput,
  bgHex?: string,
  /** Unused — the donut draws no axis. Signature parity, see `_showGrid`. */
  _axisColor?: string,
  fontFamily?: string,
): ReactElement {
  const showCenter = component?.chart_type === "donut" ? component.center_total === true : true
  const data = series[0]?.data ?? []
  const total = data.reduce((s, d) => s + d.y, 0)
  if (total <= 0) return <WholeShareDeclined data={data} />
  const cx = x0 + w / 2
  const cy = y0 + h / 2
  const fullR = Math.min(w, h) / 2 - 4
  // Same gutter the pie yields radius to, for the same reason: a ring of
  // colored arcs with a total in the middle names none of its own slices.
  const { r, slices } = layoutRadialSlices(data, total, cx, cy, x0, w, fullR, fontFamily)
  const ri = r * DONUT_HOLE_RATIO
  const labelFill = directLabelInk(textColor, bgHex)
  const totalLabel = Number.isInteger(total) ? String(total) : total.toFixed(1)
  const fitted = fitSvgLine(totalLabel, { maxWidth: ri * 1.5, fontSize: 30, minFontSize: 16 })
  // The caption under the centre number used to be the literal word "Total",
  // printed on every deck in every language — a maintainer's word arriving on
  // a customer's slide, and the one thing on this chart that was not the
  // author's. It is now the series' own name, which the author wrote and
  // which nothing else on a donut ever paints (`legendApplicable` needs two
  // series, and a donut has one). No name, no caption: a bare number reads
  // fine, an English label on a Chinese deck does not.
  const centerCaption = series[0]?.name?.trim()
    ? fitSvgLine(series[0].name.trim(), { maxWidth: ri * 1.7, fontSize: 16, minFontSize: 16 })
    : null
  return (
    <>
      {slices.map((slice) => (
        <path
          key={slice.key}
          d={annulusSectorPath(cx, cy, r, ri, slice.startA, slice.endA)}
          fill={palette[slice.key % palette.length]}
        />
      ))}
      {radialSliceLabels(slices, y0, h, mutedColor, labelFill)}
      {showCenter && (
        <>
          <text
            data-truncated={fitted.truncated ? "1" : undefined}
            x={cx}
            y={cy + fitted.fontSize * 0.15}
            textAnchor="middle"
            fontSize={fitted.fontSize}
            fontWeight="bold"
            fill={textColor}
            dominantBaseline="alphabetic"
          >
            {fitted.text}
          </text>
          {centerCaption && (
            <text
              data-truncated={centerCaption.truncated ? "1" : undefined}
              x={cx}
              y={cy + fitted.fontSize * 0.15 + 18}
              textAnchor="middle"
              fontSize={centerCaption.fontSize}
              fill={mutedColor}
              dominantBaseline="alphabetic"
            >
              {centerCaption.text}
            </text>
          )}
        </>
      )}
    </>
  )
}

/**
 * scatter 散点/气泡图：数值 x/y 点集。两个轴都走拟合域（不强制含 0），
 * 刻度在绘图区外，轴线相交于原点。点可选 size：有则半径按面积（sqrt）缩放
 * 为气泡，无则统一小圆点。
 */
const SCATTER_DOT_R = 5
const SCATTER_MIN_BUBBLE_R = 6
const SCATTER_MAX_BUBBLE_R = 26

export function renderScatter(
  series: ChartSeries[],
  palette: string[],
  x0: number,
  y0: number,
  w: number,
  h: number,
  mutedColor: string,
  _textColor: string,
  _accentColor: string,
  /** `axes.show_grid` wiring — default **on**, for the same reason
   * `renderLine` keeps it: a scatter prints no per-point value at all, so
   * the reference lines are the only way to read a point's height. */
  showGrid = true,
  component?: ChartInput,
  _bgHex?: string,
  axisColor?: string,
  fontFamily?: string,
): ReactElement {
  const meta = cartesianMeta(component)
  const numX = (x: string | number): number => (typeof x === "number" ? x : Number(x))
  const xsAll = series.flatMap((s) => s.data.map((d) => numX(d.x)))
  const ysAll = series.flatMap((s) => s.data.map((d) => d.y))
  const xAxis = buildNumericAxis(xsAll, "fit", meta.xUnit)
  const yAxis = buildNumericAxis(ysAll, "fit", meta.yUnit)
  const geom = layoutCartesianPlot({
    x0,
    y0,
    w,
    h,
    yTickLabels: yAxis.labels,
    titleH: meta.titleH,
    fontFamily,
  })
  const xForVal = (v: number) => mapToPlotX(v, xAxis.domain, geom.plotX, geom.plotW)
  const sizes = series.flatMap((s) => s.data.map((d) => d.size)).filter((s): s is number => s != null)
  const sizeMax = sizes.length ? Math.max(...sizes) : 0
  const radiusFor = (size: number | undefined): number => {
    if (size == null || sizeMax <= 0) return SCATTER_DOT_R
    const t = Math.sqrt(Math.max(0, size) / sizeMax)
    return SCATTER_MIN_BUBBLE_R + t * (SCATTER_MAX_BUBBLE_R - SCATTER_MIN_BUBBLE_R)
  }
  const yTicks = yAxis.ticks.map((t) => ({
    label: formatAxisTick(t, meta.yUnit),
    pos: mapToPlotY(t, yAxis.domain, geom.plotY, geom.plotH),
  }))
  const xTicks = xAxis.ticks.map((t, i) => ({
    label: formatAxisTick(t, meta.xUnit),
    pos: xForVal(t),
    anchor: edgeAnchor(i, xAxis.ticks.length),
  }))
  return (
    <>
      {renderCartesianFrame({
        plotX: geom.plotX,
        plotY: geom.plotY,
        plotW: geom.plotW,
        plotH: geom.plotH,
        xTicks,
        yTicks,
        showHGrid: showGrid,
        axisColor: axisColor ?? mutedColor,
        mutedColor,
        fontFamily,
      })}
      {series.map((s, sIdx) => (
        <g key={sIdx}>
          {s.data.map((d, di) => {
            const color = palette[sIdx % palette.length]
            return (
              <circle
                key={di}
                data-plot-mark="1"
                cx={xForVal(numX(d.x))}
                cy={mapToPlotY(d.y, yAxis.domain, geom.plotY, geom.plotH)}
                r={radiusFor(d.size)}
                fill={color}
                fillOpacity={0.6}
                stroke={color}
                strokeWidth={1}
              />
            )
          })}
        </g>
      ))}
      {renderCartesianAxisTitles({
        plotX: geom.plotX,
        plotBottom: geom.titleY,
        plotW: geom.plotW,
        xTitle: meta.xTitle,
        yTitle: meta.yTitle,
        fill: mutedColor,
        fontFamily: fontFamily ?? "",
      })}
    </>
  )
}

/**
 * area 面积图（chart-depth wave）：line 渲染路径的填充分支，不是新图元——复用
 * buildChartModel 的共享类目并集与零锚定域、xForIndex 等距 x、lineValueY、
 * renderGridlines。每条 series 的曲线下方按基线闭合成半透明填充，多 series 按
 * 输入次序叠放（非堆叠，各自独立基线，避免误报绝对值），填充半透明以透出彼此。
 */
const AREA_FILL_ALPHA = 0.22

export function renderArea(
  series: ChartSeries[],
  palette: string[],
  x0: number,
  y0: number,
  w: number,
  h: number,
  mutedColor: string,
  _textColor: string,
  _accentColor: string,
  /** `axes.show_grid` wiring — default **on**, same reason as `renderLine`. */
  showGrid = true,
  component?: ChartInput,
  _bgHex?: string,
  axisColor?: string,
  fontFamily?: string,
): ReactElement {
  const model = buildChartModel(series)
  const { categories } = model
  const meta = cartesianMeta(component)
  const values = keptValues(model.series)
  const yAxis = buildNumericAxis(values, valueAxisMode(values), meta.yUnit)
  const geom = layoutCartesianPlot({
    x0,
    y0,
    w,
    h,
    yTickLabels: yAxis.labels,
    titleH: meta.titleH,
    fontFamily,
  })
  const baselineY = baselineYFor(yAxis.domain, geom.plotY, geom.plotH)
  const categoryMaxWidth = geom.plotW / Math.max(categories.length - 1, 1)
  const xForIndex = (i: number) =>
    geom.plotX + (i / Math.max(categories.length - 1, 1)) * geom.plotW
  const yTicks = yAxis.ticks.map((t) => ({
    label: formatAxisTick(t, meta.yUnit),
    pos: mapToPlotY(t, yAxis.domain, geom.plotY, geom.plotH),
  }))
  const xTicks = categories.map((cat, i) => {
    const category = fitSvgLine(String(cat.x), {
      maxWidth: categoryMaxWidth,
      fontSize: CATEGORY_FONT_SIZE,
      minFontSize: CATEGORY_MIN_FONT_SIZE,
      fontFamily,
    })
    return {
      label: category.text,
      pos: xForIndex(i),
      truncated: category.truncated,
      fontSize: category.fontSize,
      anchor: edgeAnchor(i, categories.length),
    }
  })
  return (
    <>
      {renderCartesianFrame({
        plotX: geom.plotX,
        plotY: geom.plotY,
        plotW: geom.plotW,
        plotH: geom.plotH,
        xTicks,
        yTicks,
        showHGrid: showGrid,
        axisColor: axisColor ?? mutedColor,
        mutedColor,
        fontFamily,
      })}
      {model.series.map((s) => {
        const sIdx = s.seriesIndex
        const color = palette[sIdx % palette.length]
        type Pt = { x: number; y: number }
        const pointAt: (Pt | null)[] = categories.map((_c, i) => {
          const value = s.values[i]
          if (value == null) return null
          return { x: xForIndex(i), y: mapToPlotY(value, yAxis.domain, geom.plotY, geom.plotH) }
        })
        const runs: Pt[][] = []
        let cur: Pt[] = []
        for (const p of pointAt) {
          if (p) cur.push(p)
          else if (cur.length > 0) {
            runs.push(cur)
            cur = []
          }
        }
        if (cur.length > 0) runs.push(cur)
        return (
          <g key={sIdx}>
            {runs.map((run, ri) => (
              <polygon
                key={`fill-${ri}`}
                data-plot-mark="1"
                points={`${run.map((c) => `${c.x},${c.y}`).join(" ")} ${run[run.length - 1]!.x},${baselineY} ${run[0]!.x},${baselineY}`}
                fill={color}
                fillOpacity={AREA_FILL_ALPHA}
                stroke="none"
              />
            ))}
            {runs.map((run, ri) => (
              <polyline
                key={`ln-${ri}`}
                data-plot-mark="1"
                points={run.map((c) => `${c.x},${c.y}`).join(" ")}
                fill="none"
                stroke={color}
                strokeWidth={2}
              />
            ))}
          </g>
        )
      })}
      {renderCartesianAxisTitles({
        plotX: geom.plotX,
        plotBottom: geom.titleY,
        plotW: geom.plotW,
        xTitle: meta.xTitle,
        yTitle: meta.yTitle,
        fill: mutedColor,
        fontFamily: fontFamily ?? "",
      })}
    </>
  )
}

/**
 * gauge 进度半环（chart-depth wave）：单值对目标的完成度。上半环 [π, 2π]（y 轴
 * 向下坐标里经 3π/2＝12 点方向），muted 轨道 + accent 进度弧按 frac 填充，大数值
 * 居中。进度弧走 annulusSectorPath 的 donut 惯用形，deck-audit 的 parseWedgePath
 * 因此按环带（含内孔）精确归属——居中大字落在内孔（距圆心 < ri），归属到页面
 * 背景而非弧带，杜绝误归属。非指针式表盘（与体系气质不合）。
 */
const GAUGE_HOLE_RATIO = 0.6
/** Track opacity kept below deck-audit's `MIN_BG_OPACITY` (0.5) so the muted
 * background ring never even registers as a text-background candidate. */
const GAUGE_TRACK_OPACITY = 0.18

export function renderGauge(
  series: ChartSeries[],
  _palette: string[],
  x0: number,
  y0: number,
  w: number,
  h: number,
  mutedColor: string,
  textColor: string,
  accentColor: string,
  _showGrid = false,
  component?: ChartInput,
): ReactElement {
  const value = series[0]?.data[0]?.y
  if (value == null) return <></>
  const min = component?.chart_type === "gauge" ? component.gauge?.min ?? 0 : 0
  const max = component?.chart_type === "gauge" ? component.gauge?.max ?? 100 : 100
  const range = max - min
  const frac = range > 0 ? Math.max(0, Math.min(1, (value - min) / range)) : 0
  const cx = x0 + w / 2
  // Outer radius bounded by half-width and the height above the caption band;
  // the semicircle's [cy-ro, cy] span is centered vertically in the plot area.
  const availH = h - LABEL_BOTTOM_PAD
  const ro = Math.max(1, Math.min(w / 2 - 8, availH - 8))
  const cy = y0 + (availH + ro) / 2
  const ri = ro * GAUGE_HOLE_RATIO
  const startA = Math.PI
  const endValue = Math.PI + frac * Math.PI
  const valueLabel = String(value)
  const numFit = fitSvgLine(valueLabel, { maxWidth: ri * 1.6, fontSize: Math.min(44, ro * 0.55), minFontSize: 16 })
  const caption = series[0]?.data[0]?.x
  const captionText = caption == null ? "" : String(caption)
  return (
    <>
      {/* full half-ring track (below the candidate-opacity floor) */}
      <path d={annulusSectorPath(cx, cy, ro, ri, startA, 2 * Math.PI)} fill={mutedColor} fillOpacity={GAUGE_TRACK_OPACITY} />
      {/* filled progress arc (annulus idiom → hole-excluding attribution) */}
      {frac > 0 && <path d={annulusSectorPath(cx, cy, ro, ri, startA, endValue)} fill={accentColor} />}
      <text
        data-truncated={numFit.truncated ? "1" : undefined}
        x={cx}
        y={cy - ro * 0.06}
        textAnchor="middle"
        fontSize={numFit.fontSize}
        fontWeight="bold"
        fill={textColor}
        dominantBaseline="alphabetic"
      >
        {numFit.text}
      </text>
      {captionText.length > 0 && (
        <text
          x={cx}
          y={cy + LABEL_FONT_SIZE + 4}
          textAnchor="middle"
          fontSize={LABEL_FONT_SIZE}
          fill={mutedColor}
          dominantBaseline="alphabetic"
        >
          {fitSvgLine(captionText, { maxWidth: w * 0.9, fontSize: LABEL_FONT_SIZE, minFontSize: 16 }).text}
        </text>
      )}
    </>
  )
}
