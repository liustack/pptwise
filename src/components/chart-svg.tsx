import type { ReactElement } from "react"
import type { ChartSeries, Component } from "@/ir"
import { CHART_AXIS_LIMIT } from "@/ir/components/chart"
import { accessibleInk } from "../render/ink"
import { fitSvgLine, layoutSvgText, measureTextUnits } from "../lib/svg-text-layout"
import { joinUnit } from "../lib/quantity-format"
import { changeText } from "../lib/change-figure"
import { mostlyChinese } from "../lib/text-script"
import { StatusMark, statusGround, type PointStatus } from "../render/mark-status"
import { axisTitlePairHeight, renderCartesianAxisTitles } from "./axis-titles"
import {
  buildAlignedNumericAxis,
  buildNumericAxis,
  formatAxisTick,
  layoutCartesianPlot,
  mapToPlotX,
  mapToPlotY,
  renderCartesianFrame,
  TICK_FONT_SIZE,
  TICK_MIN_FONT_SIZE,
  TICK_TO_AXIS_GAP,
  X_TICK_BAND,
  Y_TICK_MAX_W_RATIO,
  type DomainPadMode,
} from "./cartesian-axis"
import { buildChartModel, zeroAxisRatio, type ChartDomain } from "./chart-model"
import { boxesIntersect, TEXT_INK_DESCENT, type DepthBox } from "../render/depth-contract/geometry"
import {
  labelLinePitch,
  resolveValueLabelCollisions,
  stackLabelColumn,
  valueLabelBox,
  type ColumnLabelSpec,
  type PlacedValueLabel,
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
 * that the component went with it.
 *
 * Every cartesian renderer gives the same answer to its case of the same
 * trouble: a value, or a stacked pile, past `CHART_AXIS_LIMIT` that no axis
 * can be built for (`pastAxisLimit`).
 */
function WholeShareDeclined(): ReactElement {
  // One component, because one component is what went: the chart draws
  // nothing at all. The count used to be `Math.max(1, data.length)`, so two
  // cancelling pie points declared two lost content blocks on a page that
  // holds one chart. The old zero-length case is why the floor existed —
  // an empty `data` is refused at the schema now, but the in-memory route
  // this function exists for could still write `data-dropped="0"`, a count
  // `slideToRender` sums and `checkContentDropGate` reads as no loss at all.
  // A constant of one is both the floor and the truth.
  return <g data-dropped={1} data-dropped-kind="component" />
}

/**
 * True when a value lies past `CHART_AXIS_LIMIT`, where no axis can be built.
 *
 * validate refuses such a value on every cartesian chart, so one reaching a
 * renderer has come round the gate. The axis builder would throw on it, so the
 * renderer declines first and says so, with `WholeShareDeclined`.
 */
function pastAxisLimit(values: readonly number[]): boolean {
  return values.some((v) => Math.abs(v) > CHART_AXIS_LIMIT)
}

/** The `chart` IR component, for the renderers whose geometry needs
 * component-level config beyond `series` (donut's `center_total`, gauge's
 * `min`/`max` range). Passed as the trailing `component` arg to every
 * renderer; the ones that don't need it simply omit the parameter and stay
 * assignable to {@link ChartRenderFn} (a function with fewer parameters is
 * assignable to one that declares more). */
type ChartInput = Extract<Component, { type: "chart" }>

/** How much of a status bar's colour tints the ground under its hatching or outline. */
const STATUS_GROUND_SHARE = 0.25

/** The status the author gave the point a bar draws, if any (`chart` point `status`). */
function pointStatusAt(series: readonly ChartSeries[], seriesIndex: number, x: string | number): PointStatus | undefined {
  return series[seriesIndex]?.data.find((d) => d.x === x)?.status
}

/** Whether any point of the chart carries a status. */
function hasPointStatus(series: readonly ChartSeries[]): boolean {
  return series.some((s) => s.data.some((d) => d.status !== undefined))
}

/**
 * A bar as its point's status says: a plain rectangle, a hatched forecast, or
 * a dashed target (`render/mark-status.tsx`), tagged as a plot mark either way.
 */
function barMark(opts: {
  key: string | number
  x: number
  y: number
  w: number
  h: number
  fill: string
  status: PointStatus | undefined
  bg: string
  opacity?: number
  stroke?: { color: string; width: number }
}): ReactElement {
  if (opts.status) {
    return (
      <StatusMark
        key={opts.key}
        status={opts.status}
        color={opts.fill}
        ground={statusGround(opts.fill, opts.bg, STATUS_GROUND_SHARE)}
        x={opts.x}
        y={opts.y}
        w={opts.w}
        h={opts.h}
        extra={{ "data-plot-mark": "1" }}
      />
    )
  }
  return (
    <rect
      key={opts.key}
      data-plot-mark="1"
      x={opts.x}
      y={opts.y}
      width={opts.w}
      height={opts.h}
      fill={opts.fill}
      {...(opts.opacity !== undefined ? { opacity: opts.opacity } : {})}
      {...(opts.stroke ? { stroke: opts.stroke.color, strokeWidth: opts.stroke.width } : {})}
    />
  )
}

/** One bracket's reach over the bars, before the bars are placed: category indices and its stacking level. */
interface ChangeRun {
  change: NonNullable<ChartInput["changes"]>[number]
  lo: number
  hi: number
  level: number
}

/** The space one level of change brackets takes over the plot, and the air under the lowest. */
const BRACKET_LEVEL_H = 34
const BRACKET_PAD = 6
const BRACKET_FONT_SIZE = 16

/**
 * The changes an upright bar or stacked chart draws as brackets, each with
 * the categories it spans and a level, so two brackets that would cross
 * stand one over the other. A change validate would refuse is left out.
 */
function changeRuns(component: ChartInput | undefined, categoryIndex: (x: string) => number): ChangeRun[] {
  const runs: ChangeRun[] = []
  for (const change of component?.changes ?? []) {
    const a = categoryIndex(change.at ?? change.from)
    const b = categoryIndex(change.at ?? change.to)
    if (a < 0 || b < 0) continue
    const lo = Math.min(a, b)
    const hi = Math.max(a, b)
    let level = 0
    while (runs.some((r) => r.level === level && r.lo <= hi && lo <= r.hi)) level += 1
    runs.push({ change, lo, hi, level })
  }
  return runs
}

/** The band brackets take over the plot: one level per stacked bracket. */
function bracketBand(runs: readonly ChangeRun[]): number {
  if (runs.length === 0) return 0
  return (Math.max(...runs.map((r) => r.level)) + 1) * BRACKET_LEVEL_H + BRACKET_PAD
}

/** Whether a chart's own words are Chinese: its series names and categories. */
function chartChinese(series: readonly ChartSeries[]): boolean {
  const texts = series.map((s) => s.name)
  for (const s of series) for (const d of s.data) if (typeof d.x === "string") texts.push(d.x)
  return mostlyChinese(texts)
}

/** One end of a bracket: where its leg stands, how high it reaches, and the value it reads. */
interface BracketEnd {
  x: number
  /** The leg stops here, over the bar's own value. */
  legTop: number
  value: number
  seriesIndex: number
}

/** Paints a change bracket whose crossbar stands on `crossY`, in the marked series' colour when it ends on it. */
function changeBracket(opts: {
  key: string
  ends: [BracketEnd, BracketEnd]
  crossY: number
  text: string
  strongColor: string | null
  mutedColor: string
  bg: string
  fontFamily?: string
}): ReactElement {
  const [a, b] = opts.ends
  const color = opts.strongColor ?? opts.mutedColor
  return (
    <g key={opts.key} data-chart-change="">
      <path
        d={`M ${a.x} ${Math.max(a.legTop, opts.crossY)} V ${opts.crossY} H ${b.x} V ${Math.max(b.legTop, opts.crossY)}`}
        fill="none"
        stroke={color}
        strokeWidth={opts.strongColor ? 2 : 1}
      />
      <text
        x={(a.x + b.x) / 2}
        y={opts.crossY - 6}
        textAnchor="middle"
        fontSize={BRACKET_FONT_SIZE}
        fontWeight={opts.strongColor ? 700 : undefined}
        fontFamily={opts.fontFamily}
        fill={accessibleInk(color, opts.bg, BRACKET_FONT_SIZE)}
        dominantBaseline="alphabetic"
      >
        {opts.text}
      </text>
    </g>
  )
}

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
   * category label painted straight onto the page: brief's accent is a
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
 * Gauge caption keeps 11px (homeroom theme-table pages pin this size).
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
 * Where category `i` of `n` sits inside the data span, and how much width its
 * tick label may claim.
 *
 * `i / (n - 1)` spreads n categories from the span's left edge to its right
 * edge, which is right for every n above one and degenerate at exactly one:
 * `Math.max(n - 1, 1)` turned the fraction into `0 / 1`, so the lone point
 * was pinned to the y-axis and its tick — anchored `middle` by
 * {@link edgeAnchor} — hung half its width off the left of the component. A
 * 20-character category name overflowed the box by 116px.
 *
 * One point has no span to spread across, so it takes the middle of the one
 * it has. The tick is then centred on the data span, and the width it may
 * claim is whichever is smaller: the plot it belongs to, or twice its
 * distance to the nearer edge of the box — a centred label grows both ways,
 * so that is the widest it can be and still land inside the box the
 * component accepted. Past that it is cut, and says so with `data-truncated`.
 */
function categorySpan(
  n: number,
  dataX: number,
  dataW: number,
  x0: number,
  w: number,
  plotW: number,
): { xForIndex: (i: number) => number; maxWidth: number } {
  if (n <= 1) {
    const centre = dataX + dataW / 2
    return {
      xForIndex: () => centre,
      maxWidth: Math.max(0, Math.min(plotW, 2 * Math.min(centre - x0, x0 + w - centre))),
    }
  }
  return {
    xForIndex: (i: number) => dataX + (i / (n - 1)) * dataW,
    maxWidth: dataW / (n - 1),
  }
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
 * Whether a single bar series highlights its tallest bar: that bar solid in
 * the accent, the rest in a gradient of it.
 *
 * The highlight is the accent, so it is drawn only where the accent is one of
 * the colours this chart was handed. Every built-in theme's chart palette
 * carries its accent, and there nothing changes. A face that keeps the accent
 * for what the author marks takes it out of the palette it hands its charts
 * (brief's sheet, `paletteWithoutAccent`), and its unmarked single series is
 * drawn flat in the lead colour, the way every series of a grouped chart is.
 * Reading `accentColor` here regardless was how one unmarked series of three
 * bars came out in brief's highlight yellow.
 */
function highlightsTallestBar(palette: readonly string[], accentColor: string): boolean {
  const accent = accentColor.toUpperCase()
  return palette.some((color) => color.toUpperCase() === accent)
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
export const DIRECT_LABEL_FONT_SIZE = VALUE_FONT_SIZE
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
 * Series-label gutter geometry for line and area charts.
 *
 * A line chart used to print its endpoint values *on* the plot and settle
 * the crowding pair by pair (`resolveValueLabelCollisions`). That cannot be
 * made safe. A pairwise nudger only knows about other labels, so a number
 * pushed clear of its neighbour lands on the line, on the endpoint dot or
 * inside its ring instead — every one of the 27 line-chart pages in the
 * review corpus had a value label sitting on a data mark — and two series
 * converging on the same corner defeat it outright.
 *
 * So the labels come off the plot. The plot yields width at both ends, the
 * way `layoutRadialSlices` makes the pie yield radius, and each series is
 * named where its own line ends: `series name + value`, one line per series,
 * stacked by {@link stackLabelColumn} so the column is solved as a whole
 * rather than pair by pair. Identity now travels with the line, which is why
 * line and area charts no longer draw a legend header row
 * (`legendApplicable` in chart.tsx).
 *
 * `SERIES_GUTTER_STUB` is the leader's own run out of the endpoint before it
 * reaches for the label, `SERIES_GUTTER_GAP` the air before the first glyph.
 * Both are the pie's numbers, for the same job.
 */
const SERIES_GUTTER_STUB = 10
const SERIES_GUTTER_GAP = 6
/**
 * Floor on how much of its width the plot gives up to the two gutters.
 * Wide series names shrink the plot; past this the plot stops shrinking and
 * the labels are fitted (to the 16px readable floor, then cut) instead — the
 * same trade `PIE_MIN_RADIUS_RATIO` makes for the circle and
 * `DUMBBELL_PLOT_MIN_W` for its band. A line squeezed into a third of the
 * page beside two columns of text has stopped being a line chart.
 */
const SERIES_PLOT_MIN_W_RATIO = 0.55

/** One series' end label: `name value`, or the bare value when unnamed. */
function seriesEndLabelText(name: string | undefined, value: number): string {
  const trimmed = (name ?? "").trim()
  return trimmed ? `${trimmed} ${value}` : String(value)
}

/** One aligned series' first and last non-null value, plus how many it kept. */
function endsOf(values: readonly (number | null)[]): { first?: number; last?: number; count: number } {
  const kept = values.filter((v): v is number => v != null)
  return { first: kept[0], last: kept[kept.length - 1], count: kept.length }
}

/** The end-gutter texts a line/area chart has to reserve room for. */
function endLabelTexts(
  series: readonly { name: string; values: readonly (number | null)[] }[],
  ): string[] {
  return series
    .map((s) => {
      const { last } = endsOf(s.values)
      return last == null ? null : seriesEndLabelText(s.name, last)
    })
    .filter((text): text is string => text !== null)
}

/** The start-gutter texts (bare values) a line/area chart has to reserve room for. */
function firstValueTexts(
  series: readonly { values: readonly (number | null)[] }[],
): string[] {
  return series
    .map((s) => {
      const { first, count } = endsOf(s.values)
      return count < 2 || first == null ? null : String(first)
    })
    .filter((text): text is string => text !== null)
}

/** Fixed cost of one gutter's leader, whatever the label says. */
export const SERIES_GUTTER_OVERHEAD = SERIES_GUTTER_STUB + SERIES_GUTTER_GAP

/** How wide one gutter's widest label wants to be, leader excluded. */
function gutterTextRequest(texts: readonly string[], fontFamily?: string): number {
  if (texts.length === 0) return 0
  return widestDirectLabel(texts, fontFamily)
}

/**
 * Split a plot band into a left gutter, the data span, and a right gutter.
 *
 * Two rules, and the order between them is the whole point:
 *
 *  1. **The leader is paid for first.** Each side that has a label at all
 *     keeps its full `SERIES_GUTTER_OVERHEAD` off the top. Scaling a request
 *     that had the leader folded into it, and then subtracting the leader
 *     again at paint time, is how a 40-character series name on the right
 *     drove the left gutter's *text* budget to zero and made a chart that
 *     only needed its right label truncated into one that dropped content
 *     and refused to export.
 *  2. **What is left is shared max-min fair, not proportionally.** The
 *     smaller request is satisfied in full while it fits within an equal
 *     share, and only the greedy side is cut. A start value is three glyphs
 *     next to a series name that can be forty; proportional sharing cuts
 *     both by the same fraction, which takes nothing off the name that
 *     matters and everything off the number that was already minimal.
 *
 * The plot keeps at least `SERIES_PLOT_MIN_W_RATIO` of the band throughout.
 */
export function splitSeriesGutters(
  plotW: number,
  leftText: number,
  rightText: number,
): { leftW: number; rightW: number; dataW: number; leftBudget: number; rightBudget: number } {
  const overhead = (leftText > 0 ? SERIES_GUTTER_OVERHEAD : 0) + (rightText > 0 ? SERIES_GUTTER_OVERHEAD : 0)
  const grantable = Math.max(0, plotW * (1 - SERIES_PLOT_MIN_W_RATIO))
  if (overhead === 0 || overhead > grantable) {
    return { leftW: 0, rightW: 0, dataW: plotW, leftBudget: 0, rightBudget: 0 }
  }
  const textGrantable = grantable - overhead

  const half = textGrantable / 2
  let leftGrant: number
  let rightGrant: number
  if (leftText + rightText <= textGrantable) {
    leftGrant = leftText
    rightGrant = rightText
  } else if (Math.min(leftText, rightText) <= half) {
    const smallIsLeft = leftText <= rightText
    const small = Math.min(leftText, rightText)
    const big = textGrantable - small
    leftGrant = smallIsLeft ? small : big
    rightGrant = smallIsLeft ? big : small
  } else {
    leftGrant = half
    rightGrant = half
  }

  const leftBudget = leftText > 0 ? leftGrant : 0
  const rightBudget = rightText > 0 ? rightGrant : 0
  const leftW = leftText > 0 ? leftGrant + SERIES_GUTTER_OVERHEAD : 0
  const rightW = rightText > 0 ? rightGrant + SERIES_GUTTER_OVERHEAD : 0
  // The text budgets travel with the widths rather than being subtracted
  // back out of them. `(grant + overhead) - overhead` is not `grant` in
  // floating point, and a budget one ulp under its own request is a label
  // that does not fit the room reserved for it: the start value `-9000` was
  // measured at exactly the width it was granted, came back a bit short, and
  // was declared a drop that refused the export of a full-width chart. This
  // is the same re-derivation `layoutRadialSlices` already refuses to do for
  // the pie's label budget, for the same reason.
  return { leftW, rightW, dataW: plotW - leftW - rightW, leftBudget, rightBudget }
}

/**
 * Whether a line or area chart of this width can name every series it draws.
 *
 * A directly-labelled chart has no legend: the only place a series is named
 * is the label at the end of its own line. So the box contract for these two
 * types is not "is there a plot" (that is `MIN_CARTESIAN_BOX_W`, and bar and
 * scatter still stop there) but "can every series be named" — draw with the
 * names, or decline and let the face hear about it.
 *
 * This used to be a constant, `MIN_DIRECT_LABEL_BOX_W = 178`, derived from
 * the gutter arithmetic against a *typical* y-tick gutter. The gutter is not
 * typical: it grows with the tick labels and is capped at a share of the box,
 * so the same 178px box holds a full label column for `0..4` and none at all
 * for values in the hundreds of millions. At 178 with short ticks the chart
 * painted `"2","1","4","3"` — four numbers, no series name anywhere, no
 * silent marker, and an export that passed. With big ticks it painted six
 * marks, zero labels and a silent drop: drawing and declaring at once, the
 * exact shape the width floor existed to remove.
 *
 * So the question is asked of the real geometry instead, with the same calls
 * the renderer itself will make: the axis this data produces, the gutter that
 * axis takes, the split those gutters get, and the fit each label would come
 * back with. It is answered before anything is painted.
 */
export function seriesGutterLabelsFit(
  series: ChartSeries[],
  w: number,
  component?: ChartInput,
  fontFamily?: string,
): boolean {
  const model = buildChartModel(series)
  const meta = cartesianMeta(component)
  const values = keptValues(model.series)
  // No axis can be laid out for a value past the ceiling. The renderer
  // declines the whole chart for that, so the labels are not the question.
  if (pastAxisLimit(values)) return true
  const yAxis = buildNumericAxis(values, valueAxisMode(values), meta.yUnit)
  // Only `plotW` matters here, and it does not depend on the height or the
  // axis-title band — see `layoutCartesianPlot`.
  const geom = layoutCartesianPlot({ x0: 0, y0: 0, w, h: 0, yTickLabels: yAxis.labels, titleH: 0, fontFamily })
  const leftTexts = firstValueTexts(model.series)
  const rightTexts = endLabelTexts(model.series)
  const gutters = splitSeriesGutters(
    geom.plotW,
    gutterTextRequest(leftTexts, fontFamily),
    gutterTextRequest(rightTexts, fontFamily),
  )
  const avail = (side: "left" | "right") => (side === "left" ? gutters.leftBudget : gutters.rightBudget)

  // A start value is its own protected part: it prints whole or not at all.
  for (const text of leftTexts) {
    if (fitProtectedLabel(text, text, avail("left"), fontFamily).text === "") return false
  }
  // And every series' end label has to carry at least part of its own name.
  for (const s of model.series) {
    const { last } = endsOf(s.values)
    if (last == null) continue
    const fit = fitProtectedLabel(seriesEndLabelText(s.name, last), String(last), avail("right"), fontFamily)
    if (fit.text === "" || !fit.named) return false
  }
  return true
}

/** One label wanting a place in a series gutter. */
interface GutterLabel {
  readonly id: string
  readonly side: "left" | "right"
  readonly text: string
  /**
   * The tail of `text` that has to survive a cut — a series' own end value.
   *
   * `name value` was fitted as one string from the front, so the part that
   * fell off the end was the number: a 12-character series name beside
   * `1234` in a 400px box painted `战略业务单元` and left `1234` off the page
   * entirely. The reader was handed half a name and no figure, with
   * `data-truncated` promising only that something had been cut.
   *
   * A name is a thing a reader can recognize from a fragment, and often from
   * the line's own colour and position. A value is not: four digits cut to
   * three is a different number, and cut to nothing is no number at all. So
   * the value is reserved first and the name is fitted into what is left —
   * the same order the pie already keeps for its direct labels.
   */
  readonly keep?: string
  /** The plot point this label names, in page coordinates. */
  readonly endX: number
  readonly endY: number
  /** Higher survives when the column cannot hold every label. */
  readonly priority: number
}

/**
 * One direct label fitted to the room it has, with its value kept whole.
 *
 * Shared by the line/area gutter and by the pie and donut, which had the
 * same defect for the same reason: `name value` was fitted as one string
 * from the front, so the part that fell off the end was the number.
 *
 * Four outcomes, in the order they are tried:
 *
 *  1. **The whole string fits** — returned untouched, so every label that
 *     was never crowded paints exactly what it always did.
 *  2. **The name has to give** — the value's own width (with the space
 *     before it) comes off the budget first and the name is fitted into the
 *     remainder. Marked cut, and still `named`.
 *  3. **The name has no room at all** — the value keeps the column alone.
 *     Marked cut, and no longer `named`, which is what lets a caller decline
 *     rather than paint a chart whose series have no names.
 *  4. **Not even the value fits** — nothing is painted and the caller
 *     declares the drop. A value is never cut: `123456789` truncated to `1`
 *     is not a shorter number, it is a wrong one, and no reader can tell the
 *     difference. That was the one case this function used to get wrong.
 */
interface ProtectedFit {
  readonly text: string
  readonly fontSize: number
  readonly truncated: boolean
  /** False when the label lost its name entirely and prints a bare value. */
  readonly named: boolean
}

function fitProtectedLabel(
  text: string,
  keep: string,
  maxWidth: number,
  fontFamily?: string,
): ProtectedFit {
  const shared = {
    fontSize: DIRECT_LABEL_FONT_SIZE,
    minFontSize: DIRECT_LABEL_FONT_SIZE,
    bold: true,
    fontFamily,
  } as const
  // A value that does not fit whole is a declared drop, never a shorter
  // number — for the bare-value label too, which is all a start value is.
  const valueFits = directLabelWidth(keep, fontFamily) <= maxWidth
  if (text === keep) {
    return valueFits
      ? { text, fontSize: DIRECT_LABEL_FONT_SIZE, truncated: false, named: true }
      : { text: "", fontSize: DIRECT_LABEL_FONT_SIZE, truncated: true, named: true }
  }

  const whole = fitSvgLine(text, { ...shared, maxWidth })
  if (!whole.truncated) return { ...whole, named: true }
  if (!valueFits) {
    return { text: "", fontSize: DIRECT_LABEL_FONT_SIZE, truncated: true, named: false }
  }

  const name = text.slice(0, Math.max(0, text.length - keep.length - 1))
  const fittedName = fitSvgLine(name, {
    ...shared,
    maxWidth: Math.max(0, maxWidth - directLabelWidth(` ${keep}`, fontFamily)),
  })
  if (fittedName.text === "") {
    return { text: keep, fontSize: DIRECT_LABEL_FONT_SIZE, truncated: true, named: false }
  }
  return {
    text: `${fittedName.text} ${keep}`,
    fontSize: fittedName.fontSize,
    truncated: true,
    named: true,
  }
}

/** {@link fitProtectedLabel} for one gutter label. A label with no `keep` is
 * a bare start value, which is its own protected part. */
function fitGutterLabel(label: GutterLabel, avail: number, fontFamily?: string): ProtectedFit {
  return fitProtectedLabel(label.text, label.keep ?? label.text, avail, fontFamily)
}

/**
 * Paint one chart's gutter labels: fit each to the room its own side has,
 * stack each column with {@link stackLabelColumn}, then draw a leader from
 * the point to the label that names it.
 *
 * A leader is a single straight run — a `<line>`, not the pie's three-point
 * `<polyline>` elbow — so when a label keeps its own endpoint's y it reads as
 * a short horizontal tick and only a displaced label slopes.
 * Nothing is nudged: a label the column cannot hold is dropped and declared,
 * the same last resort the pie's own gutter ends on.
 */
function renderSeriesGutterLabels(opts: {
  labels: readonly GutterLabel[]
  /** Left edge of the data span — the inner edge of the left gutter. */
  dataX: number
  /** Width of the data span. */
  dataW: number
  leftW: number
  rightW: number
  /** The text budget each gutter was granted — see {@link splitSeriesGutters}. */
  leftBudget: number
  rightBudget: number
  plotY: number
  plotH: number
  markerR: number
  leaderColor?: string
  fill?: string
  fontFamily?: string
}): ReactElement {
  const pitch = labelLinePitch(DIRECT_LABEL_FONT_SIZE)
  const bounds = { top: opts.plotY, bottom: opts.plotY + opts.plotH }
  // The gutter is a column, so every label in it starts on the same
  // vertical. Anchoring each label to its own series' last point instead
  // put a short series' label back inside the plot, on top of the lines it
  // was supposed to sit beside — a series that stops at Q2 of Q3 ends
  // nowhere near the gutter. The label goes where the gutter is; the leader
  // is what reaches back to the point that owns it, however far that is.
  const rightTextX = opts.dataX + opts.dataW + SERIES_GUTTER_OVERHEAD
  const leftTextX = opts.dataX - SERIES_GUTTER_OVERHEAD
  const textX = (side: "left" | "right") => (side === "right" ? rightTextX : leftTextX)
  const avail = (side: "left" | "right") => (side === "left" ? opts.leftBudget : opts.rightBudget)
  const prepared = opts.labels.map((label) => ({
    label,
    fitted: fitGutterLabel(label, avail(label.side), opts.fontFamily),
  }))
  const placed = new Map(
    (["left", "right"] as const).flatMap((side) =>
      stackLabelColumn(
        prepared
          .filter((entry) => entry.label.side === side && entry.fitted.text !== "")
          .map((entry) => ({
            id: entry.label.id,
            y: entry.label.endY,
            pitch,
            priority: entry.label.priority,
          })),
        bounds,
      ).map((label) => [label.id, label] as const),
    ),
  )
  // A gutter with no room for a name paints nothing rather than an ink blot,
  // and says how many names went with it — validate forbids an ellipsis and
  // `checkContentDropGate` refuses to export a deck carrying the mark.
  const hidden = prepared.filter(
    (entry) => entry.fitted.text === "" || (placed.get(entry.label.id)?.hidden ?? true),
  ).length
  return (
    <>
      {hidden > 0 && <g data-dropped={hidden} data-dropped-kind="value-label" />}
      {prepared.map(({ label, fitted }) => {
        const slot = placed.get(label.id)
        if (!slot || slot.hidden) return null
        const dir = label.side === "right" ? 1 : -1
        const leaderStart = label.endX + dir * opts.markerR
        const leaderEnd = textX(label.side) - dir * SERIES_GUTTER_GAP
        return (
          <g key={label.id}>
            <line
              data-label-leader="1"
              x1={leaderStart}
              y1={label.endY}
              x2={leaderEnd}
              y2={slot.y}
              stroke={opts.leaderColor}
              strokeWidth={1}
              strokeOpacity={0.55}
            />
            <text
              data-value-label="1"
              data-truncated={fitted.truncated ? "1" : undefined}
              x={textX(label.side)}
              y={slot.y + DIRECT_LABEL_FONT_SIZE * DIRECT_LABEL_CENTER_TO_BASELINE}
              textAnchor={label.side === "right" ? "start" : "end"}
              fontSize={fitted.fontSize}
              fontWeight={DIRECT_LABEL_FONT_WEIGHT}
              // Declared, not inherited: the gutter width was reserved by
              // measuring this text in this family, and `svg-audit` measures
              // the painted element in whatever family the element names. An
              // element that names none is measured against a different
              // envelope than the one that sized its own gutter, and the two
              // disagree by exactly the width that then runs past the box.
              fontFamily={opts.fontFamily}
              fill={opts.fill}
              dominantBaseline="alphabetic"
            >
              {fitted.text}
            </text>
          </g>
        )
      })}
    </>
  )
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

/**
 * Where each series' bar sits along one category's band: the offset from the
 * band's start, keyed by series index, for the series that have a value here.
 *
 * Bars keep one thickness across the chart, the share of the band a full
 * group of `n` gives each one, so every category reads at the same weight.
 * A category only some series reach lays out just those bars, side by side,
 * centred in the band. Each bar used to keep the slot its series held in a
 * full group, so two series over different categories (a year's figures
 * beside two half-years') stood every bar off to one side of the category
 * name printed under the band's centre. A full group has nothing to centre
 * and keeps its offsets exactly, so its geometry is unchanged.
 */
/**
 * How many bars the fullest category holds: the group size every bar's
 * thickness is cut from. A chart whose series each cover their own
 * categories (a year's figures beside two half-years') holds one bar per
 * category and draws each one as wide as a single series would, instead of
 * as thin as a pair it never shows. Every series in every category is `n`,
 * exactly what the thickness was cut from before.
 */
function fullestGroup(series: readonly { values: readonly (number | null)[] }[], categories: number): number {
  let fullest = 0
  for (let i = 0; i < categories; i++) {
    fullest = Math.max(fullest, series.filter((s) => s.values[i] != null).length)
  }
  return fullest
}

function barSlots(
  series: readonly { seriesIndex: number; values: readonly (number | null)[] }[],
  category: number,
  usable: number,
  thickness: number,
  gap: number,
): Map<number, number> {
  const present = series.filter((s) => s.values[category] != null)
  const lead =
    present.length === series.length
      ? 0
      : (usable - (present.length * thickness + Math.max(0, present.length - 1) * gap)) / 2
  return new Map(present.map((s, slot) => [s.seriesIndex, lead + slot * (thickness + gap)]))
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
    // Right-hand axis, combo only. validate refuses both anywhere else, so
    // every other chart type reads them as undefined and lays out as before.
    y2Title: component?.axes?.y2_title,
    y2Unit: component?.axes?.y2_unit,
    titleH: axisTitlePairHeight(component?.axes?.x_title, component?.axes?.y_title, component?.axes?.y2_title),
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

/**
 * Where a change's bracket stands on an upright bar chart: over the one bar
 * each of its categories carries, or over two series' bars in the one
 * category `at` names. Each leg stops over its bar's printed value.
 */
function barBracketEnds(
  run: ChangeRun,
  modelSeries: ReturnType<typeof buildChartModel>["series"],
  categories: ReturnType<typeof buildChartModel>["categories"],
  barEnds: ReadonlyMap<string, BracketEnd>,
  placed: ReadonlyMap<string, { y: number }>,
): [BracketEnd, BracketEnd] | null {
  const end = (category: string, seriesName: string | undefined): BracketEnd | null => {
    const i = categories.findIndex((cat) => cat.x === category)
    if (i < 0) return null
    const s = seriesName === undefined ? modelSeries.find((m) => m.values[i] != null) : modelSeries.find((m) => m.name === seriesName)
    if (!s) return null
    const bar = barEnds.get(`${i}-${s.seriesIndex}`)
    if (!bar) return null
    const label = placed.get(`bar-${i}-${s.seriesIndex}`)
    return { ...bar, legTop: (label ? label.y - VALUE_FONT_SIZE : bar.legTop) - 4 }
  }
  const { change } = run
  const a = change.at === undefined ? end(change.from, undefined) : end(change.at, change.from)
  const b = change.at === undefined ? end(change.to, undefined) : end(change.at, change.to)
  return a && b ? [a, b] : null
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
  if (pastAxisLimit(keptValues(model.series))) return <WholeShareDeclined />
  const yAxis = buildNumericAxis(keptValues(model.series), "zero-max", meta.yUnit)
  const domain: ChartDomain = { min: yAxis.domain.min, max: yAxis.domain.max, degenerate: yAxis.domain.max <= yAxis.domain.min }
  // Brackets for the author's `changes` take a band over the plot, so the
  // plot and its value labels start under them.
  const runs = changeRuns(component, (x) => categories.findIndex((cat) => cat.x === x))
  const band = bracketBand(runs)
  const top = y0 + band
  const geom = layoutCartesianPlot({
    x0,
    y0: top,
    w,
    h: h - band,
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
  // A forecast or a target is drawn in its series' colour, never in the tallest-bar highlight.
  const highlight = n <= 1 && highlightsTallestBar(palette, accentColor) && !hasPointStatus(series)
  const group = fullestGroup(model.series, categories.length)
  const gradientShade = scaleHexBrightness(accentColor, BAR_GRADIENT_SHADE_FACTOR)
  const dataMax = Math.max(...keptValues(model.series), Number.NEGATIVE_INFINITY)
  // Every bar prints its value above itself, all of them or none: see
  // `placeValueLabelsTogether`. The labels may use the chart body between the
  // legend row and the x-axis, across the plot's own width.
  const barLabelSpecs: ValueLabelSpec[] = []
  const barBoxes: DepthBox[] = []
  const barEnds = new Map<string, BracketEnd>()
  for (let i = 0; i < categories.length; i++) {
    const groupX0 = geom.plotX + i * groupW + BAR_GROUP_EDGE_GAP
    const usableW = groupW - BAR_GROUP_EDGE_GAP * 2
    const perBarW = group <= 1 ? usableW : Math.max(1, (usableW - (group - 1) * BAR_GROUP_EDGE_GAP) / group)
    const slots = barSlots(model.series, i, usableW, perBarW, BAR_GROUP_EDGE_GAP)
    for (const s of model.series) {
      const value = s.values[i]
      if (value == null) continue
      const barX = groupX0 + slots.get(s.seriesIndex)!
      const { barY, barH } = verticalBarExtent(value, domain, geom.plotY, geom.plotH)
      barBoxes.push({ x: barX, y: barY, w: perBarW, h: barH })
      barLabelSpecs.push(
        risingBand(
          {
            id: `bar-${i}-${s.seriesIndex}`,
            text: String(value),
            x: barX + perBarW / 2,
            y: barY - VALUE_LABEL_GAP,
            anchor: "middle",
            fontSize: VALUE_FONT_SIZE,
            fontFamily,
            priority: 100 - s.seriesIndex,
          },
          top,
        ),
      )
      barEnds.set(`${i}-${s.seriesIndex}`, { x: barX + perBarW / 2, legTop: barY, value, seriesIndex: s.seriesIndex })
    }
  }
  const placedLabels = placeValueLabelsTogether(barLabelSpecs, barBoxes, {
    left: geom.plotX,
    right: geom.plotX + geom.plotW,
    top,
    bottom: geom.plotY + geom.plotH,
  })
  const placedBars = new Map((placedLabels ?? []).map((label) => [label.id, label]))
  return (
    <>
      {highlight && (
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
        yTickMaxW: Math.max(0, geom.leftGutter - TICK_TO_AXIS_GAP),
        axisColor: axisColor ?? mutedColor,
        mutedColor,
        fontFamily,
      })}
      {categories.map((cat, i) => {
        const groupX0 = geom.plotX + i * groupW + BAR_GROUP_EDGE_GAP
        const usableW = groupW - BAR_GROUP_EDGE_GAP * 2
        const perBarW = group <= 1 ? usableW : Math.max(1, (usableW - (group - 1) * BAR_GROUP_EDGE_GAP) / group)
        const slots = barSlots(model.series, i, usableW, perBarW, BAR_GROUP_EDGE_GAP)
        const barElements: ReactElement[] = []
        for (const s of model.series) {
          const value = s.values[i]
          if (value == null) continue
          const barX = groupX0 + slots.get(s.seriesIndex)!
          const isMax = highlight && value === dataMax
          const { barY, barH } = verticalBarExtent(value, domain, geom.plotY, geom.plotH)
          const fill = highlight
            ? isMax
              ? accentColor
              : `url(#${gradientId})`
            : palette[s.seriesIndex % palette.length]
          const placed = placedBars.get(`bar-${i}-${s.seriesIndex}`)
          barElements.push(
            barMark({
              key: `r-${s.seriesIndex}`,
              x: barX,
              y: barY,
              w: perBarW,
              h: barH,
              fill,
              status: pointStatusAt(series, s.seriesIndex, cat.x),
              bg: _bgHex ?? "#FFFFFF",
              opacity: highlight ? (isMax ? 1 : 0.75) : 1,
            }),
          )
          if (placed) {
            barElements.push(
              <text
                key={`v-${s.seriesIndex}`}
                data-value-label="1"
                x={placed.x}
                y={placed.y}
                textAnchor="middle"
                fontSize={VALUE_FONT_SIZE}
                fontWeight={VALUE_FONT_WEIGHT}
                fontFamily={fontFamily}
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
      {placedLabels === null ? <g data-dropped={barLabelSpecs.length} data-dropped-kind="value-label" /> : null}
      {runs.map((run, k) => {
        const ends = runs.length > 0 ? barBracketEnds(run, model.series, categories, barEnds, placedBars) : null
        if (!ends) return null
        const markedIndex = (component?.series ?? []).findIndex((s) => s.emphasis === true)
        return changeBracket({
          key: `change-${k}`,
          ends,
          crossY: top - BRACKET_PAD - run.level * BRACKET_LEVEL_H,
          text: changeText(ends[0].value, ends[1].value, meta.yUnit, chartChinese(series)),
          strongColor: markedIndex >= 0 && ends[1].seriesIndex === markedIndex ? palette[markedIndex % palette.length]! : null,
          mutedColor,
          bg: _bgHex ?? "#FFFFFF",
          fontFamily,
        })
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
  const meta = cartesianMeta(component)
  const values = keptValues(model.series)
  if (pastAxisLimit(values)) return <WholeShareDeclined />
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
  // The data span is inset from the axis frame by whatever the two label
  // gutters need — see `splitSeriesGutters`. The frame, the gridlines and
  // the x-axis still run the full plot width; only the points move in.
  const gutters = splitSeriesGutters(
    geom.plotW,
    gutterTextRequest(firstValueTexts(model.series), fontFamily),
    gutterTextRequest(endLabelTexts(model.series), fontFamily),
  )
  const dataX = geom.plotX + gutters.leftW
  const { xForIndex, maxWidth: categoryMaxWidth } = categorySpan(
    categories.length,
    dataX,
    gutters.dataW,
    x0,
    w,
    geom.plotW,
  )
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
  // Every series is named, whatever the series count. The old cap
  // (`LINE_ENDPOINT_LABEL_MAX_SERIES`) existed because past four series the
  // on-plot numbers stacked into an ink blot and the legend was left to
  // carry identity. There is no legend on a line chart any more, and the
  // column solver below answers crowding by dropping the labels a gutter
  // genuinely cannot hold and declaring the loss — a rule that scales,
  // unlike a hard-coded series count.
  const gutterLabels: GutterLabel[] = []
  for (const end of seriesEnds) {
    if (end.last) {
      gutterLabels.push({
        id: `${end.s.seriesIndex}-last`,
        side: "right",
        text: seriesEndLabelText(end.s.name, end.last.value),
        keep: String(end.last.value),
        endX: end.last.x,
        endY: end.last.y,
        priority: n - end.s.seriesIndex,
      })
    }
    // The start value only, never the name: the end label already carries
    // identity, and printing the series name twice on one line is ink that
    // says nothing new.
    if (end.first && end.first !== end.last) {
      gutterLabels.push({
        id: `${end.s.seriesIndex}-first`,
        side: "left",
        text: String(end.first.value),
        endX: end.first.x,
        endY: end.first.y,
        priority: n - end.s.seriesIndex,
      })
    }
  }

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
        yTickMaxW: Math.max(0, geom.leftGutter - TICK_TO_AXIS_GAP),
        gridX: dataX,
        gridW: gutters.dataW,
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
      {renderSeriesGutterLabels({
        labels: gutterLabels,
        dataX,
        dataW: gutters.dataW,
        leftW: gutters.leftW,
        rightW: gutters.rightW,
        leftBudget: gutters.leftBudget,
        rightBudget: gutters.rightBudget,
        plotY: geom.plotY,
        plotH: geom.plotH,
        markerR: ENDPOINT_DOT_R + ENDPOINT_LABEL_CLEARANCE,
        leaderColor: mutedColor,
        fill: directLabelInk(textColor, bgHex),
        fontFamily,
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
export const PIE_LEADER_STUB = 10
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

/**
 * Flat body height every chart type is measured at before its own content
 * adds to it (`chart.tsx`'s `measure`). Declared here because the radial
 * geometry below has to reason about the band the component asked for, not
 * only the one it was handed.
 */
export const CHART_BODY_H = 240

/**
 * The shortest body a chart on a cartesian plot draws in, when a page cannot
 * give it {@link CHART_BODY_H}: a 160px plot under the same top pad and tick
 * band, still five ticks a comfortable line apart. `chart.tsx`'s `minHeight`
 * offers the 40px between the two to a layout that would otherwise drop a
 * block or step aside (`layoutContentFit`).
 */
export const CHART_MIN_BODY_H = 200

/**
 * The band a pie or donut measures for itself: the flat body plus the two
 * leader stubs its slices hang off the arc (`chart.tsx`'s `radialBodyH`).
 * This is the circle the chart is designed around, and the anchor for how
 * small it is willing to get — see {@link layoutRadialSlices}.
 */
export const RADIAL_MIN_BODY_H = CHART_BODY_H + 2 * PIE_LEADER_STUB

/**
 * The radius a pie or donut may use before its labels start reaching.
 *
 * Every slice hangs a `PIE_LEADER_STUB` off its own arc, so the circle's
 * real ink runs to `r + PIE_LEADER_STUB` in every direction. The horizontal
 * side was already paid for — `layoutRadialSlices` subtracts the stub, the
 * gap and the label budget out of `w / 2` — but the vertical side had only
 * the flat 4px inset the arc alone needed, so a slice near six o'clock put
 * its leader 6px below the box the chart was handed. Invisible until the
 * geometry gate started measuring a component against its own allocated
 * height rather than the whole content rect: it was 6px into the block
 * below, on 46 pages of the review corpus.
 */
function radialFullRadius(w: number, h: number): number {
  return Math.min(w / 2, h / 2 - PIE_LEADER_STUB) - 4
}

/** One slice's label geometry, plus the two angles its own path is drawn from. */
interface RadialSlice {
  readonly key: number
  readonly startA: number
  readonly endA: number
  readonly right: boolean
  readonly textX: number
  readonly fitted: ProtectedFit
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
  const widest = widestDirectLabel(texts, fontFamily)
  // **The circle never grows past what the width can host beside it.**
  // `fullR` is the disc the *box* would hold, and once a radial chart
  // started taking the height it was allocated that number grew with the
  // band: a taller box made a bigger disc, the disc pushed the label budget
  // down, and a three-slice pie with long names lost its values at 328px in
  // a box that kept them all at 260px. Height beyond what the width can pair
  // with a full label column is vertical whitespace, not more radius.
  const labelBoundR = w / 2 - PIE_LEADER_STUB - PIE_LEADER_GAP - widest
  // How small the circle is willing to get, anchored on the band the chart
  // measured for itself ({@link RADIAL_MIN_BODY_H}) rather than on the band
  // it happened to be handed. Reading it off the allocated height instead is
  // what let extra height raise the floor, which raised the disc, which took
  // the width back from the label column.
  const baseR = Math.max(0, Math.min(w / 2, RADIAL_MIN_BODY_H / 2 - PIE_LEADER_STUB) - 4)
  const floorR = baseR * PIE_MIN_RADIUS_RATIO
  const discR = Math.min(fullR, Math.max(labelBoundR, floorR))
  // One authoritative label budget, used both to size the circle and to fit
  // the text — see the note below on why this is not measured back out of
  // the geometry.
  const labelBudget = Math.max(
    0,
    Math.min(widest, w / 2 - PIE_LEADER_STUB - PIE_LEADER_GAP - floorR),
  )
  const r = Math.max(
    floorR,
    Math.min(discR, w / 2 - (PIE_LEADER_STUB + PIE_LEADER_GAP + labelBudget)),
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
      // what radius it can: fit to the room that is actually left — and cut
      // the name rather than the value, the same protection the line and
      // area gutters keep. A slice label is `name value` in one node, so
      // fitting it from the front took the number off first.
      fitted: fitProtectedLabel(
        texts[i]!,
        String(d.y),
        Math.max(labelBudget, right ? x0 + w - textX : textX - x0),
        fontFamily,
      ),
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
  fontFamily?: string,
): ReactElement {
  const pitch = labelLinePitch(DIRECT_LABEL_FONT_SIZE)
  const bounds = { top: y0, bottom: y0 + h }
  const columnSpec = (slice: RadialSlice): ColumnLabelSpec => ({
    id: String(slice.key),
    y: slice.stubY,
    pitch,
    priority: slice.value,
  })
  // A fit that came back with nothing is a drop, not a label, and it never
  // reaches the column.
  //
  // `fitProtectedLabel` returns an empty string for the one case it refuses
  // to fake: a slice whose own value will not fit whole, where a shortened
  // number would be a wrong number. `renderSeriesGutterLabels` has always
  // read that as a drop — it filters the empty ones out before stacking and
  // counts them into its own declared loss. The radial path sent them into
  // the column anyway, where each took a slot away from a slice that had
  // something to say and then painted `<text data-value-label="1"
  // data-truncated="1"></text>`: an empty node, carrying a marker the export
  // gate does not read, on a page whose wedge was still there and whose
  // value was not. Three of those and `generatePptx` still shipped the file.
  const painted = slices.filter((slice) => slice.fitted.text !== "")
  const placed = new Map(
    [true, false].flatMap((side) =>
      stackLabelColumn(painted.filter((s) => s.right === side).map(columnSpec), bounds).map(
        (label) => [label.id, label] as const,
      ),
    ),
  )
  // A gutter too short for every label drops the smallest slices, which is
  // the right trade (a name on the biggest wedge is worth more than five
  // names in a pile), but it used to be an invisible one: the wedge stayed,
  // the author's name for it left, and nothing on the page or in the audit
  // said so. The count is declared here, silent because the page itself
  // cannot show it. A slice whose value would not fit is counted the same
  // way — it is absent from `placed` entirely, so it lands in this count.
  const hidden = slices.filter((slice) => placed.get(String(slice.key))?.hidden ?? true).length
  return (
    <>
      {hidden > 0 && <g data-dropped={hidden} data-dropped-kind="value-label" />}
      {slices.map((slice) => {
        const label = placed.get(String(slice.key))
        if (!label || label.hidden) return null
        const elbowX = slice.right ? slice.textX - PIE_LEADER_GAP : slice.textX + PIE_LEADER_GAP
        return (
          <g key={`label-${slice.key}`}>
            {/* No leader without a label at the end of it — a line pointing
                at empty air is a defect a reader can see. Nothing reaching
                here has an empty fit any more (those are dropped above), so
                this is a leader for a label that really is painted. */}
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
              fontFamily={fontFamily}
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
  if (total <= 0) return <WholeShareDeclined />
  const cx = x0 + w / 2
  const cy = y0 + h / 2
  const fullR = radialFullRadius(w, h)
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
            data-plot-mark="1"
            d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`}
            fill={palette[slice.key % palette.length]}
          />
        )
      })}
      {radialSliceLabels(slices, y0, h, mutedColor, labelFill, fontFamily)}
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
      {/* Bands only, because no placement inside this component keeps
          neighbouring labels apart at this row height. Every stage name the
          author wrote is off the page and the bands say nothing about it, so
          the count is declared here. */}
      {!labeled && data.length > 0 && <g data-dropped={data.length} data-dropped-kind="stage-name" />}
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
            {/* A fit that came back with nothing still says so on its own
                element. Deleting the node took the only trace of the cut
                with it. */}
            {fitted && (
              <text
                data-value-label="1"
                data-truncated={fitted.truncated ? "1" : undefined}
                x={labelX}
                y={bandCy + DIRECT_LABEL_FONT_SIZE * DIRECT_LABEL_CENTER_TO_BASELINE}
                fontSize={fitted.fontSize}
                fontWeight={DIRECT_LABEL_FONT_WEIGHT}
                fontFamily={fontFamily}
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
  _axisColor?: string,
  fontFamily?: string,
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
  if (pastAxisLimit(all)) return <WholeShareDeclined />
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
        // The end value sits after the end dot. A row that fell has its end
        // dot left of the start dot, so a label after it would run over the
        // start dot and its value: it sits before the end dot when the plot
        // has room there, and after the start dot when it does not.
        const toW = measureTextUnits(toValueLabel.text, { bold: true, fontFamily }) * toValueLabel.fontSize
        const fell = x2 < x1
        const before = fell && x2 - DUMBBELL_TO_LABEL_INSET - toW >= plotX
        const toX = !fell ? x2 + DUMBBELL_TO_LABEL_INSET : before ? x2 - DUMBBELL_TO_LABEL_INSET : x1 + DUMBBELL_TO_LABEL_INSET
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
              fontFamily={fontFamily}
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
              fontFamily={fontFamily}
              dominantBaseline="alphabetic"
            >
              {fromValueLabel.text}
            </text>
            <text
              data-truncated={toValueLabel.clipped ? "1" : undefined}
              x={toX}
              y={cy + 4}
              textAnchor={before ? "end" : undefined}
              fontSize={toValueLabel.fontSize}
              fontWeight="bold"
              fill={accentInk}
              fontFamily={fontFamily}
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
 *
 * The category band is at least this wide, and grows with the widest
 * category name up to `Y_TICK_MAX_W_RATIO` of the chart, the share any
 * value-axis gutter may take. It used to stay at 110px whatever the names, so
 * every name past about seven CJK glyphs or a dozen Latin letters was cut, on
 * charts that had hundreds of pixels of plot to give. See `barHorizontalBands`.
 */
const BAR_H_LABEL_W = 110
/**
 * Room past the plot for the value label of a bar that runs its full length:
 * at least this, and more when the widest value label needs it, up to
 * `BAR_H_VALUE_MAX_W_RATIO` of the chart. A fixed 64px let a long figure run
 * off the right edge of the chart.
 */
const BAR_H_VALUE_W = 64
const BAR_H_VALUE_MAX_W_RATIO = 0.25
/** Gap between a bar's end and its value label. */
const BAR_H_VALUE_GAP = 8
/** Gap between the category band and the plot. */
const BAR_H_BAND_GAP = 12
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
/** Space `renderBarHorizontal` keeps above its first row. */
const BAR_H_PLOT_TOP_PAD = 4

/**
 * Body height a horizontal bar chart needs so every category keeps a row of
 * its own.
 *
 * Rows share the plot's height. Each has to hold its category name, one line
 * of tick text, and its bars, each at least `BAR_H_MIN_THICKNESS` thick with
 * the usual gaps. Below that the bars were drawn at their floor anyway and ran
 * into the next row and out through the bottom of the plot, and the names sat
 * on top of each other. The plot is the body less the top pad and the x-tick
 * band (`renderBarHorizontal`), so this is what `chart.measure` asks for.
 */
export function barHorizontalMinBodyH(categories: number, seriesCount: number): number {
  const n = Math.max(1, seriesCount)
  const barsH = 2 * BAR_H_ROW_EDGE_GAP + n * BAR_H_MIN_THICKNESS + (n - 1) * BAR_H_ROW_EDGE_GAP
  const rowH = Math.max(labelLinePitch(TICK_FONT_SIZE), barsH)
  return Math.ceil(categories * rowH) + BAR_H_PLOT_TOP_PAD + X_TICK_BAND
}

/**
 * Widths of a horizontal bar chart's two bands: the category names on the
 * left, and the room past the plot on the right for the longest bar's value.
 *
 * Each band is its floor, or what its widest text needs, whichever is more,
 * capped at its share of the chart. Text wider than its capped band is fitted
 * the usual way: the category name is cut and marked `data-truncated`, and a
 * value label that no longer fits is dropped with its row and declared
 * (`placeValueLabelsTogether`).
 */
function barHorizontalBands(
  categoryTexts: readonly string[],
  valueTexts: readonly string[],
  w: number,
  fontFamily?: string,
): { labelW: number; valueW: number } {
  const widest = (texts: readonly string[], bold: boolean) =>
    Math.max(0, ...texts.map((t) => measureTextUnits(t, { fontFamily, bold }) * TICK_FONT_SIZE))
  const labelWant = Math.ceil(widest(categoryTexts, false) + BAR_H_LABEL_FIT_MARGIN)
  const valueWant = Math.ceil(widest(valueTexts, true) + BAR_H_VALUE_GAP)
  return {
    labelW: Math.max(BAR_H_LABEL_W, Math.min(labelWant, Math.floor(w * Y_TICK_MAX_W_RATIO))),
    valueW: Math.max(BAR_H_VALUE_W, Math.min(valueWant, Math.floor(w * BAR_H_VALUE_MAX_W_RATIO))),
  }
}

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
  if (pastAxisLimit(values)) return <WholeShareDeclined />
  const xAxis = buildNumericAxis(values, "zero-max", meta.xUnit ?? meta.yUnit)
  const domain: ChartDomain = { min: xAxis.domain.min, max: xAxis.domain.max, degenerate: false }
  const dataMax = Math.max(...values, Number.NEGATIVE_INFINITY)
  // A change the author asked for at a category is printed after the later
  // bar's own value, so its text widens that bar's label.
  const chinese = chartChinese(series)
  const changeAfter = new Map<string, string>()
  for (const change of component?.changes ?? []) {
    if (change.at === undefined) continue
    const i = categories.findIndex((cat) => cat.x === change.at)
    const from = model.series.find((m) => m.name === change.from)
    const to = model.series.find((m) => m.name === change.to)
    const a = from?.values[i]
    const b = to?.values[i]
    if (i < 0 || !to || a == null || b == null) continue
    changeAfter.set(`${i}-${to.seriesIndex}`, changeText(a, b, meta.xUnit ?? meta.yUnit, chinese))
  }
  const labelText = (i: number, seriesIndex: number, value: number) => {
    const change = changeAfter.get(`${i}-${seriesIndex}`)
    return change ? `${value}  ${change}` : String(value)
  }
  const labelTexts =
    changeAfter.size === 0
      ? values.map((v) => String(v))
      : categories.flatMap((_cat, i) =>
          model.series.flatMap((m) => (m.values[i] == null ? [] : [labelText(i, m.seriesIndex, m.values[i]!)])),
        )
  const { labelW, valueW } = barHorizontalBands(
    categories.map((cat) => String(cat.x)),
    labelTexts,
    w,
    fontFamily,
  )
  const plotX = x0 + labelW + BAR_H_BAND_GAP
  const plotW = Math.max(1, w - labelW - BAR_H_BAND_GAP - valueW)
  const plotY = y0 + BAR_H_PLOT_TOP_PAD
  const plotH = Math.max(1, h - meta.titleH - X_TICK_BAND - BAR_H_PLOT_TOP_PAD)
  const rowH = plotH / categories.length
  const gradientId = chartGradientId("chart-barh-grad", w, h, series)
  const highlight = n <= 1 && highlightsTallestBar(palette, accentColor) && !hasPointStatus(series)
  const group = fullestGroup(model.series, categories.length)
  const gradientShade = scaleHexBrightness(accentColor, BAR_GRADIENT_SHADE_FACTOR)
  const xTicks = xAxis.ticks.map((t, i) => ({
    label: formatAxisTick(t, meta.xUnit ?? meta.yUnit),
    pos: mapToPlotX(t, xAxis.domain, plotX, plotW),
    anchor: edgeAnchor(i, xAxis.ticks.length),
  }))
  // Every bar prints its value past its end, all of them or none: see
  // `placeValueLabelsTogether`. A label keeps to its own row, so it may not
  // step up or down, and it stays inside the chart.
  const hBarSpecs: ValueLabelSpec[] = []
  const hBarBoxes: DepthBox[] = []
  for (let i = 0; i < categories.length; i++) {
    const rowY0 = plotY + i * rowH + BAR_H_ROW_EDGE_GAP
    const usableH = rowH - BAR_H_ROW_EDGE_GAP * 2
    const perBarH =
      group <= 1
        ? Math.max(BAR_H_MIN_THICKNESS, usableH)
        : Math.max(BAR_H_MIN_THICKNESS, (usableH - (group - 1) * BAR_H_ROW_EDGE_GAP) / group)
    const slots = barSlots(model.series, i, usableH, perBarH, BAR_H_ROW_EDGE_GAP)
    for (const s of model.series) {
      const value = s.values[i]
      if (value == null) continue
      const barY = rowY0 + slots.get(s.seriesIndex)!
      const { barX, barW } = horizontalBarExtent(value, domain, plotX, plotW)
      hBarBoxes.push({ x: barX, y: barY, w: barW, h: perBarH })
      const labelY = barY + perBarH / 2 + 4
      hBarSpecs.push({
        id: `hbar-${i}-${s.seriesIndex}`,
        text: labelText(i, s.seriesIndex, value),
        x: barX + barW + BAR_H_VALUE_GAP,
        y: labelY,
        anchor: "start",
        fontSize: VALUE_FONT_SIZE,
        fontFamily,
        priority: 100 - s.seriesIndex,
        yMin: labelY,
        yMax: labelY,
      })
    }
  }
  const placedHLabels = placeValueLabelsTogether(hBarSpecs, hBarBoxes, {
    left: plotX,
    right: x0 + w,
    top: y0,
    bottom: plotY + plotH,
  })
  const placedHBars = new Map((placedHLabels ?? []).map((label) => [label.id, label]))
  const yTicks = categories.map((cat, i) => {
    const label = fitSvgLine(String(cat.x), {
      maxWidth: labelW - BAR_H_LABEL_FIT_MARGIN,
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
      {highlight && (
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
        yTickMaxW: Math.max(0, labelW + BAR_H_BAND_GAP - TICK_TO_AXIS_GAP),
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
          group <= 1
            ? Math.max(BAR_H_MIN_THICKNESS, usableH)
            : Math.max(BAR_H_MIN_THICKNESS, (usableH - (group - 1) * BAR_H_ROW_EDGE_GAP) / group)
        const slots = barSlots(model.series, i, usableH, perBarH, BAR_H_ROW_EDGE_GAP)
        const barElements: ReactElement[] = []
        for (const s of model.series) {
          const value = s.values[i]
          if (value == null) continue
          const barY = rowY0 + slots.get(s.seriesIndex)!
          const isMax = highlight && value === dataMax
          const { barX, barW } = horizontalBarExtent(value, domain, plotX, plotW)
          const fill = highlight
            ? isMax
              ? accentColor
              : `url(#${gradientId})`
            : palette[s.seriesIndex % palette.length]
          barElements.push(
            barMark({
              key: `r-${s.seriesIndex}`,
              x: barX,
              y: barY,
              w: barW,
              h: perBarH,
              fill,
              status: pointStatusAt(series, s.seriesIndex, cat.x),
              bg: _bgHex ?? "#FFFFFF",
              opacity: highlight ? (isMax ? 1 : 0.75) : 1,
            }),
          )
          const placed = placedHBars.get(`hbar-${i}-${s.seriesIndex}`)
          if (placed) {
            barElements.push(
              <text
                key={`v-${s.seriesIndex}`}
                data-value-label="1"
                x={placed.x}
                y={placed.y}
                fontSize={VALUE_FONT_SIZE}
                fontWeight={VALUE_FONT_WEIGHT}
                fontFamily={fontFamily}
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
      {placedHLabels === null ? <g data-dropped={hBarSpecs.length} data-dropped-kind="value-label" /> : null}
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
/** Size of the caption under a donut's centre total. */
const DONUT_CAPTION_FONT_SIZE = 16
/** Baseline of the caption's first line, below the total's baseline. */
const DONUT_CAPTION_GAP = 18
/** Baseline to baseline between the caption's two lines. */
const DONUT_CAPTION_LINE_H = 19

/**
 * The series name under a donut's centre total, on one line or two.
 *
 * One line first, fitted to the width it has always had. A name too long for
 * that line used to be cut ("Workspace headcount" came out as "Workspace")
 * inside a hole with room below for a second line. It now wraps onto two, no
 * wider than that one line and no wider than the hole at the second line's
 * foot, the narrowest point the caption reaches, and the total moves up by
 * half a line so the block stays centred. A name too long for two lines is
 * cut and marked `data-truncated`.
 */
function donutCaption(
  name: string,
  ri: number,
  totalFontSize: number,
): { lines: string[]; truncated: boolean; shift: number } {
  const lineW = ri * 1.7
  const one = fitSvgLine(name, {
    maxWidth: lineW,
    fontSize: DONUT_CAPTION_FONT_SIZE,
    minFontSize: DONUT_CAPTION_FONT_SIZE,
  })
  if (!one.truncated) return { lines: [one.text], truncated: false, shift: 0 }
  const shift = DONUT_CAPTION_LINE_H / 2
  // The second line's ink foot, measured down from the centre.
  const foot =
    totalFontSize * 0.15 -
    shift +
    DONUT_CAPTION_GAP +
    DONUT_CAPTION_LINE_H +
    DONUT_CAPTION_FONT_SIZE * TEXT_INK_DESCENT
  if (foot >= ri) return { lines: [one.text], truncated: true, shift: 0 }
  // Never wider than the one line that did not fit, so the name always
  // takes both lines.
  const two = layoutSvgText(name, {
    maxWidth: Math.min(lineW, 2 * Math.sqrt(ri * ri - foot * foot)),
    fontSize: DONUT_CAPTION_FONT_SIZE,
    minPt: DONUT_CAPTION_FONT_SIZE,
    maxLines: 2,
  })
  return { lines: two.lines, truncated: two.truncated, shift }
}

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
  if (total <= 0) return <WholeShareDeclined />
  const cx = x0 + w / 2
  const cy = y0 + h / 2
  const fullR = radialFullRadius(w, h)
  // Same gutter the pie yields radius to, for the same reason: a ring of
  // colored arcs with a total in the middle names none of its own slices.
  const { r, slices } = layoutRadialSlices(data, total, cx, cy, x0, w, fullR, fontFamily)
  const ri = r * DONUT_HOLE_RATIO
  const labelFill = directLabelInk(textColor, bgHex)
  const totalLabel = formatStackTotal(total)
  const fitted = fitSvgLine(totalLabel, { maxWidth: ri * 1.5, fontSize: 30, minFontSize: 16 })
  // The caption under the centre number used to be the literal word "Total",
  // printed on every deck in every language — a maintainer's word arriving on
  // a customer's slide, and the one thing on this chart that was not the
  // author's. It is now the series' own name, which the author wrote and
  // which nothing else on a donut ever paints (`legendApplicable` needs two
  // series, and a donut has one). No name, no caption: a bare number reads
  // fine, an English label on a Chinese deck does not.
  const centerCaption = series[0]?.name?.trim() ? donutCaption(series[0].name.trim(), ri, fitted.fontSize) : null
  const totalY = cy + fitted.fontSize * 0.15 - (centerCaption?.shift ?? 0)
  return (
    <>
      {slices.map((slice) => (
        <path
          key={slice.key}
          data-plot-mark="1"
          d={annulusSectorPath(cx, cy, r, ri, slice.startA, slice.endA)}
          fill={palette[slice.key % palette.length]}
        />
      ))}
      {radialSliceLabels(slices, y0, h, mutedColor, labelFill, fontFamily)}
      {showCenter && (
        <>
          <text
            data-truncated={fitted.truncated ? "1" : undefined}
            x={cx}
            y={totalY}
            textAnchor="middle"
            fontSize={fitted.fontSize}
            fontWeight="bold"
            fill={textColor}
            dominantBaseline="alphabetic"
          >
            {fitted.text}
          </text>
          {centerCaption?.lines.map((line, i) => (
            <text
              key={`caption-${i}`}
              data-truncated={centerCaption.truncated && i === centerCaption.lines.length - 1 ? "1" : undefined}
              x={cx}
              y={totalY + DONUT_CAPTION_GAP + i * DONUT_CAPTION_LINE_H}
              textAnchor="middle"
              fontSize={DONUT_CAPTION_FONT_SIZE}
              fill={mutedColor}
              dominantBaseline="alphabetic"
            >
              {line}
            </text>
          ))}
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
  if (pastAxisLimit(xsAll) || pastAxisLimit(ysAll)) return <WholeShareDeclined />
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
        yTickMaxW: Math.max(0, geom.leftGutter - TICK_TO_AXIS_GAP),
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
  textColor: string,
  _accentColor: string,
  /** `axes.show_grid` wiring — default **on**, same reason as `renderLine`. */
  showGrid = true,
  component?: ChartInput,
  bgHex?: string,
  axisColor?: string,
  fontFamily?: string,
): ReactElement {
  const model = buildChartModel(series)
  const { categories } = model
  const meta = cartesianMeta(component)
  const values = keptValues(model.series)
  if (pastAxisLimit(values)) return <WholeShareDeclined />
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
  // Same end-gutter labelling as `renderLine` — an area chart is a line
  // chart with the region under it filled, and it carried no series names
  // at all before this (no legend now, and never any endpoint values).
  const gutters = splitSeriesGutters(
    geom.plotW,
    gutterTextRequest(firstValueTexts(model.series), fontFamily),
    gutterTextRequest(endLabelTexts(model.series), fontFamily),
  )
  const dataX = geom.plotX + gutters.leftW
  const { xForIndex, maxWidth: categoryMaxWidth } = categorySpan(
    categories.length,
    dataX,
    gutters.dataW,
    x0,
    w,
    geom.plotW,
  )
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
  const gutterLabels: GutterLabel[] = []
  for (const s of model.series) {
    const { first, last, count } = endsOf(s.values)
    const yFor = (v: number) => mapToPlotY(v, yAxis.domain, geom.plotY, geom.plotH)
    const kept = s.values.map((v, i) => (v == null ? null : i)).filter((i): i is number => i !== null)
    if (last != null) {
      gutterLabels.push({
        id: `${s.seriesIndex}-last`,
        side: "right",
        text: seriesEndLabelText(s.name, last),
        keep: String(last),
        endX: xForIndex(kept[kept.length - 1]!),
        endY: yFor(last),
        priority: model.series.length - s.seriesIndex,
      })
    }
    if (count >= 2 && first != null) {
      gutterLabels.push({
        id: `${s.seriesIndex}-first`,
        side: "left",
        text: String(first),
        endX: xForIndex(kept[0]!),
        endY: yFor(first),
        priority: model.series.length - s.seriesIndex,
      })
    }
  }
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
        yTickMaxW: Math.max(0, geom.leftGutter - TICK_TO_AXIS_GAP),
        gridX: dataX,
        gridW: gutters.dataW,
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
      {renderSeriesGutterLabels({
        labels: gutterLabels,
        dataX,
        dataW: gutters.dataW,
        leftW: gutters.leftW,
        rightW: gutters.rightW,
        leftBudget: gutters.leftBudget,
        rightBudget: gutters.rightBudget,
        plotY: geom.plotY,
        plotH: geom.plotH,
        markerR: ENDPOINT_LABEL_CLEARANCE,
        leaderColor: mutedColor,
        fill: directLabelInk(textColor, bgHex),
        fontFamily,
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
      <path data-plot-mark="1" d={annulusSectorPath(cx, cy, ro, ri, startA, 2 * Math.PI)} fill={mutedColor} fillOpacity={GAUGE_TRACK_OPACITY} />
      {/* filled progress arc (annulus idiom → hole-excluding attribution) */}
      {frac > 0 && <path data-plot-mark="1" d={annulusSectorPath(cx, cy, ro, ri, startA, endValue)} fill={accentColor} />}
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

/**
 * stacked / percent_stacked: each category's series piled into one column.
 *
 * `stacked` keeps the amounts, so a column's height is the category total and
 * its segments are the parts. Positive values pile up from the zero line and
 * negative values pile down from it, each in series order, so a loss inside a
 * category hangs below the axis instead of eating into the gains above it.
 * `percent_stacked` divides every value by its category's total first, so
 * every column reaches 100% and only the make-up is compared.
 *
 * **Labels follow the house rule: beside the mark, never on it.** A segment
 * is a `chartPalette` fill, and body text on a palette fill has no contrast
 * floor that holds across forked or brand-extracted palettes (see
 * `DIRECT_LABEL_FONT_SIZE`'s own note on why pie and funnel label outside
 * their marks). So `stacked` prints one total per column, above the positive
 * pile or, for a pile with no positive part, above the zero line, which is
 * exactly where `renderBar` puts a negative bar's value. Segment values are
 * not printed. The axis reads them. `percent_stacked` prints no total at all,
 * since every column would say 100%.
 *
 * Gridlines follow what the chart already prints. `stacked` has a number
 * over every column, so it defaults to no lines, the same call `renderBar`
 * makes. `percent_stacked` prints nothing on the plot and its shares are read
 * off the axis, so it defaults to lines at every quarter, the same call
 * `renderLine` makes. Columns take `STACK_COLUMN_RATIO` of their band so the
 * lines show between them.
 *
 * Adjacent segments are parted by a 1px stroke in the page background, so
 * two neighbouring palette colors that sit close in lightness still read as
 * two parts.
 *
 * When a pile hangs below zero, the x-axis sits at the bottom of the negative
 * range and nothing marks where "up" meets "down". A zero line in the axis
 * color is drawn over the columns there, on the seam between the two piles.
 * All-positive piles stand on the x-axis itself and get none.
 */
const STACK_COLUMN_RATIO = 0.6
const STACK_SEPARATOR_W = 1
const PERCENT_TICKS = [0, 25, 50, 75, 100] as const

/**
 * The factor a percent_stacked column is divided by before its values are
 * added up: a power of two near its largest value.
 *
 * Finite values can add up to more than a double holds (`1e308 + 1e308` is
 * `Infinity`), and every share of an infinite total is 0. Divided by this
 * first, a column's values add up to less than twice its series count.
 *
 * The exponent is held to the doubles' own range. `Math.log2` rounds, and at
 * the top it rounds up: `log2(Number.MAX_VALUE)` is exactly 1024, `2 ** 1024`
 * is `Infinity`, and the factor that was there to stop an overflow caused
 * one. 1023 is the largest exponent a finite power of two can have and -1074
 * the smallest a positive one can.
 */
function shareScale(peak: number): number {
  return 2 ** Math.min(1023, Math.max(-1074, Math.floor(Math.log2(peak))))
}

/**
 * Each value's share of its column, in percent, for a column of values that
 * are zero or more. `null` stays `null` (a series with no point there). The
 * whole result is `null` when nothing in the column is above zero, which is
 * a column with no shares to draw.
 *
 * The values are divided by `shareScale` before they are summed, so no column
 * of finite values can overflow. Dividing by a power of two is exact, so the
 * scaled sum is the true sum over the same factor, bit for bit, and each share
 * comes out exactly as `(v / total) * 100` does, as long as that total is
 * finite and no value is so much smaller than the largest (by 2^1022 or more)
 * that scaling pushes it into the subnormal range, where a division loses bits.
 * `chart-stacked.test.tsx` holds both halves of that claim.
 */
export function percentShares(values: readonly (number | null)[]): (number | null)[] | null {
  let peak = 0
  for (const v of values) if (v != null && v > peak) peak = v
  if (!(peak > 0)) return null
  const scale = shareScale(peak)
  // Summed in the order the values come, over the same positive values a
  // plain total would add, so it is that total over `scale` exactly.
  let sum = 0
  for (const v of values) if (v != null && v > 0) sum += v / scale
  return values.map((v) => (v == null ? null : (v / scale / sum) * 100))
}

/** A column total as a person writes it: `0.1 + 0.2` prints `0.3`. */
function formatStackTotal(value: number): string {
  return String(Number(value.toPrecision(12)))
}

/**
 * Place a row of value labels together, or not at all.
 *
 * A value label belongs on the page background beside its own mark: above a
 * bar or a stacked column, past the end of a horizontal bar. The pairwise
 * resolver may move a label only inside the band its spec allows
 * (`yMin`/`yMax`, and sideways by an indent), and what it cannot settle it
 * hides. What it settles by stepping a label sideways can still land on a
 * neighbouring mark. So the result is checked against the real geometry:
 * every label shown, none on a mark, none on another label, all inside
 * `bounds`. One failure and no label is painted. A row of numbers with gaps in
 * it reads as marks that have no value, and a reader cannot tell which gap is
 * which, so the whole row goes and the caller declares every one of them.
 *
 * Stacked charts place their column totals this way, and bar charts their
 * values. The pairwise resolver alone used to push a crowded bar chart's
 * labels down onto its bars and past the chart's edges, with nothing to say
 * anything was lost.
 */
function placeValueLabelsTogether(
  specs: readonly ValueLabelSpec[],
  marks: readonly DepthBox[],
  bounds: LabelBounds,
): PlacedValueLabel[] | null {
  const placed = resolveValueLabelCollisions(specs)
  if (placed.some((label) => label.hidden)) return null
  return labelsClear(placed.map(valueLabelBox), marks, bounds) ? placed : null
}

type LabelBounds = { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number }

/**
 * True when every label box, exactly where it stands, sits inside `bounds`,
 * off every mark and off every other label box. The check
 * `placeValueLabelsTogether` applies after its resolver has moved what it
 * could.
 */
function labelsClear(boxes: readonly DepthBox[], marks: readonly DepthBox[], bounds: LabelBounds): boolean {
  for (let i = 0; i < boxes.length; i++) {
    const box = boxes[i]!
    if (box.x < bounds.left || box.x + box.w > bounds.right) return false
    if (box.y < bounds.top || box.y + box.h > bounds.bottom) return false
    if (marks.some((mark) => boxesIntersect(box, mark))) return false
    for (let j = i + 1; j < boxes.length; j++) {
      if (boxesIntersect(box, boxes[j]!)) return false
    }
  }
  return true
}

/**
 * The band a label above its mark may move in: up from where it starts, never
 * down onto the mark under it, and never above `top` (the legend row, or the
 * top of the chart).
 */
function risingBand(spec: ValueLabelSpec, top: number): ValueLabelSpec {
  return { ...spec, yMin: top + spec.fontSize * 0.75, yMax: spec.y }
}

export function renderStacked(
  series: ChartSeries[],
  palette: string[],
  x0: number,
  y0: number,
  w: number,
  h: number,
  mutedColor: string,
  textColor: string,
  _accentColor: string,
  showGrid?: boolean,
  component?: ChartInput,
  bgHex?: string,
  axisColor?: string,
  fontFamily?: string,
): ReactElement {
  const percent = component?.chart_type === "percent_stacked"
  const model = buildChartModel(series)
  const { categories } = model
  const meta = cartesianMeta(component)

  const piles = categories.map((_cat, i) => {
    let total = 0
    let up = 0
    let down = 0
    for (const s of model.series) {
      const v = s.values[i]
      if (v == null) continue
      total += v
      if (v > 0) up += v
      else down += v
    }
    return { total, up, down }
  })
  // validate refuses both (`ir/components/chart.ts`): a share of a negative
  // amount means nothing, and a zero total has no shares to draw. Past the
  // schema there is nothing honest to paint, so the whole chart declines and
  // says so, the same answer a pie with a zero total gets.
  const shares = percent ? categories.map((_cat, i) => percentShares(model.series.map((s) => s.values[i]!))) : []
  if (percent && piles.some((p, i) => shares[i] === null || p.down < 0)) return <WholeShareDeclined />
  // validate refuses a pile past `CHART_AXIS_LIMIT`, since no axis can be
  // built for it. Past the schema, the old answer was a column, an axis and a
  // total of `Infinity` and `NaN`. Nothing honest can be drawn, so the chart
  // declines and says so, the same way.
  if (!percent && piles.some((p) => p.up > CHART_AXIS_LIMIT || -p.down > CHART_AXIS_LIMIT)) {
    return <WholeShareDeclined />
  }

  const scaled = (i: number, seriesIndex: number, v: number) => (percent ? shares[i]![seriesIndex]! : v)
  const yUnit = percent ? "%" : meta.yUnit
  const yAxis = percent
    ? {
        domain: { min: 0, max: 100 },
        ticks: [...PERCENT_TICKS],
        labels: PERCENT_TICKS.map((t) => formatAxisTick(t, "%")),
      }
    : buildNumericAxis([...piles.map((p) => p.up), ...piles.map((p) => p.down)], "zero-max", yUnit)
  // Brackets for the author's `changes` take a band over the plot.
  const runs = percent ? [] : changeRuns(component, (x) => categories.findIndex((cat) => cat.x === x))
  const band = bracketBand(runs)
  const top = y0 + band
  const geom = layoutCartesianPlot({
    x0,
    y0: top,
    w,
    h: h - band,
    yTickLabels: yAxis.labels,
    titleH: meta.titleH,
    fontFamily,
  })
  const yOf = (v: number) => mapToPlotY(v, yAxis.domain, geom.plotY, geom.plotH)
  const groupW = geom.plotW / Math.max(categories.length, 1)
  const colW = groupW * STACK_COLUMN_RATIO
  const yTicks = yAxis.ticks.map((t) => ({ label: formatAxisTick(t, yUnit), pos: yOf(t) }))
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

  const segmentBoxes: DepthBox[] = []
  const columns = categories.map((cat, i) => {
    const colX = geom.plotX + i * groupW + (groupW - colW) / 2
    let up = 0
    let down = 0
    const rects: ReactElement[] = []
    for (const s of model.series) {
      const raw = s.values[i]
      if (raw == null || raw === 0) continue
      const v = scaled(i, s.seriesIndex, raw)
      const from = v > 0 ? up : down
      const to = from + v
      if (v > 0) up = to
      else down = to
      const segTop = yOf(Math.max(from, to))
      const bottom = yOf(Math.min(from, to))
      segmentBoxes.push({ x: colX, y: segTop, w: colW, h: bottom - segTop })
      rects.push(
        barMark({
          key: s.seriesIndex,
          x: colX,
          y: segTop,
          w: colW,
          h: bottom - segTop,
          fill: palette[s.seriesIndex % palette.length]!,
          status: pointStatusAt(series, s.seriesIndex, cat.x),
          bg: bgHex ?? "#FFFFFF",
          ...(bgHex ? { stroke: { color: bgHex, width: STACK_SEPARATOR_W } } : {}),
        }),
      )
    }
    return { key: cat.key, x: cat.x, colX, rects, labelBaseY: up > 0 ? yOf(up) : yOf(0) }
  })

  const totals: ValueLabelSpec[] = percent
    ? []
    : columns.map((col, i) => ({
        id: `stack-${i}`,
        text: formatStackTotal(piles[i]!.total),
        x: col.colX + colW / 2,
        y: col.labelBaseY - VALUE_LABEL_GAP,
        anchor: "middle" as const,
        fontSize: VALUE_FONT_SIZE,
        fontFamily,
        priority: 100,
      }))
  // The totals may use the chart body between the legend row and the x-axis,
  // across the plot's own width. The y-tick labels sit left of it.
  const placedTotals = placeValueLabelsTogether(
    totals.map((spec) => risingBand(spec, top)),
    segmentBoxes,
    { left: geom.plotX, right: geom.plotX + geom.plotW, top, bottom: geom.plotY + geom.plotH },
  )
  const placedById = new Map((placedTotals ?? []).map((label) => [label.id, label]))
  const markedIndex = (component?.series ?? []).findIndex((s) => s.emphasis === true)
  /** A column's end of a bracket: its middle, over its printed total, reading its total. */
  const columnEnd = (category: string): BracketEnd | null => {
    const i = columns.findIndex((col) => col.x === category)
    if (i < 0) return null
    const label = placedById.get(`stack-${i}`)
    const lead = [...model.series].reverse().find((m) => m.values[i] != null)
    return {
      x: columns[i]!.colX + colW / 2,
      legTop: (label ? label.y - VALUE_FONT_SIZE : columns[i]!.labelBaseY) - 4,
      value: piles[i]!.total,
      seriesIndex: lead?.seriesIndex ?? -1,
    }
  }
  const totalInk = directLabelInk(textColor, bgHex)

  return (
    <>
      {renderCartesianFrame({
        plotX: geom.plotX,
        plotY: geom.plotY,
        plotW: geom.plotW,
        plotH: geom.plotH,
        xTicks,
        yTicks,
        showHGrid: showGrid ?? percent,
        yTickMaxW: Math.max(0, geom.leftGutter - TICK_TO_AXIS_GAP),
        axisColor: axisColor ?? mutedColor,
        mutedColor,
        fontFamily,
      })}
      {columns.map((col) => (
        <g key={col.key}>{col.rects}</g>
      ))}
      {yAxis.domain.min < 0 ? (
        <line
          data-zero-line="1"
          x1={geom.plotX}
          y1={yOf(0)}
          x2={geom.plotX + geom.plotW}
          y2={yOf(0)}
          stroke={axisColor ?? mutedColor}
          strokeWidth={1}
        />
      ) : null}
      {placedTotals === null ? (
        <g data-dropped={totals.length} data-dropped-kind="value-label" />
      ) : null}
      {runs.map((run, k) => {
        const a = columnEnd(run.change.from)
        const b = columnEnd(run.change.to)
        if (!a || !b) return null
        return changeBracket({
          key: `change-${k}`,
          ends: [a, b],
          crossY: top - BRACKET_PAD - run.level * BRACKET_LEVEL_H,
          text: changeText(a.value, b.value, meta.yUnit, chartChinese(series)),
          strongColor: markedIndex >= 0 && b.seriesIndex === markedIndex ? palette[markedIndex % palette.length]! : null,
          mutedColor,
          bg: bgHex ?? "#FFFFFF",
          fontFamily,
        })
      })}
      {(placedTotals ?? []).map((label) => (
        <text
          key={label.id}
          data-value-label="1"
          x={label.x}
          y={label.y}
          textAnchor="middle"
          fontSize={VALUE_FONT_SIZE}
          fontWeight={VALUE_FONT_WEIGHT}
          fill={totalInk}
          fontFamily={fontFamily}
          dominantBaseline="alphabetic"
        >
          {label.text}
        </text>
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
 * combo: bars and lines on one category axis.
 *
 * Series marked `plot: "line"` are drawn as lines through the centers of the
 * category bands. The rest are bars, grouped side by side in the middle
 * `COMBO_CLUSTER_RATIO` of each band, so a line point always sits over the
 * middle of its own category's bars. Colors follow series order through the
 * palette whatever the mark, so the legend reads in the order the author
 * wrote.
 *
 * **Two value axes, one set of rows.** Series on `axis: "right"` are read
 * against a right-hand axis with its own range, unit and title. Its ticks
 * are built by `buildAlignedNumericAxis` on the left axis's rows, so the one
 * set of gridlines serves both sides and zero shares a row when it can. An
 * axis that carries a bar keeps zero in range, because a bar is measured from
 * zero. An axis of lines alone picks its range the way `renderLine` does.
 *
 * **No value labels, except on a marked line.** A line crossing the bars
 * leaves no place above a bar that the line cannot also pass through, which is
 * exactly the trap that took `renderLine`'s own labels off the plot. The axes
 * carry the numbers, and gridlines default to on for the same reason
 * `renderLine` keeps them: they are the only way to read an interior value.
 * The one exception is a line series the author marked with `emphasis`: that
 * line is what the page is about, so each of its points prints its value just
 * above itself, with the unit of the axis it reads against. The labels are
 * not moved to make room. If any one of them would touch a bar, a dot, a line
 * or another label, or leave the plot, none of them is painted
 * (`comboPointLabels`), and the axis still carries every value.
 *
 * Each line runs over a halo in the page background, so where it crosses a
 * bar of a similar color it still reads as a line. A point with no neighbour
 * on either side (a gap in the series) is still shown by its dot.
 */
const COMBO_CLUSTER_RATIO = 0.6
const COMBO_LINE_W = 2.5
const COMBO_LINE_HALO_W = 6
const COMBO_DOT_R = 4
/** A combo dot's own stroke, the halo ring drawn round it. */
const COMBO_DOT_STROKE = 1.5
/** The most decimals a marked line's point label prints. */
const POINT_LABEL_MAX_DECIMALS = 4
/** Side margin of the background plate under a point label. */
const POINT_PLATE_PAD_X = 3

/** The box a combo dot paints, its stroke included. */
function dotBox(p: { x: number; y: number }): DepthBox {
  const r = COMBO_DOT_R + COMBO_DOT_STROKE / 2
  return { x: p.x - r, y: p.y - r, w: r * 2, h: r * 2 }
}

/** Decimal places `v` was written with, read from its shortest form. */
function decimalsOf(v: number): number {
  const text = String(Number(v.toPrecision(12)))
  const dot = text.indexOf(".")
  return dot < 0 || /e/i.test(text) ? 0 : text.length - dot - 1
}

/** True when the segment from `a` to `b` passes through `box` (Liang-Barsky). */
function segmentCrossesBox(a: { x: number; y: number }, b: { x: number; y: number }, box: DepthBox): boolean {
  const dx = b.x - a.x
  const dy = b.y - a.y
  let t0 = 0
  let t1 = 1
  const edges: [number, number][] = [
    [-dx, a.x - box.x],
    [dx, box.x + box.w - a.x],
    [-dy, a.y - box.y],
    [dy, box.y + box.h - a.y],
  ]
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return false
      continue
    }
    const t = q / p
    if (p < 0) t0 = Math.max(t0, t)
    else t1 = Math.min(t1, t)
    if (t0 > t1) return false
  }
  return true
}

/**
 * The background plate under a point label: its ink box widened to every
 * row a gridline could strike it through (from 0.9em above the baseline to
 * 0.2em below), so a gridline running under the label stops at its edge
 * instead of crossing its letters.
 */
function pointPlateBox(label: ValueLabelSpec): DepthBox {
  const ink = valueLabelBox(label)
  return {
    x: ink.x - POINT_PLATE_PAD_X,
    y: label.y - label.fontSize * 0.9,
    w: ink.w + POINT_PLATE_PAD_X * 2,
    h: label.fontSize * 1.1,
  }
}

/**
 * A marked combo line's point labels, every one of them or none.
 *
 * Each value sits centered just above its own dot, printed with the decimals
 * the series was written with (4.10 beside 4.45, never 4.1) and the unit of
 * the axis the line reads against, a currency sign leading (`joinUnit`). The
 * labels are not nudged: a label moved off its dot reads as some other
 * point's value. So the check is plain. If any label would leave the plot,
 * touch a bar, a dot, a line segment or another label, none is painted. No
 * drop is declared, because nothing the author wrote leaves the page: the
 * axis still carries every value.
 *
 * Each label stands on a plate in the page background (`pointPlateBox`), so
 * a gridline behind it breaks at the label rather than striking it through.
 * The checks run on the plate, which is what the label covers.
 */
function comboPointLabels(opts: {
  points: readonly { x: number; y: number; value: number }[]
  unit?: string
  fontFamily?: string
  bars: readonly DepthBox[]
  dots: readonly DepthBox[]
  segments: readonly (readonly [{ x: number; y: number }, { x: number; y: number }])[]
  bounds: LabelBounds
}): { label: ValueLabelSpec; plate: DepthBox }[] {
  const decimals = Math.min(POINT_LABEL_MAX_DECIMALS, Math.max(0, ...opts.points.map((p) => decimalsOf(p.value))))
  const labels: ValueLabelSpec[] = opts.points.map((p, i) => ({
    id: `point-${i}`,
    text: joinUnit(p.value.toFixed(decimals), opts.unit, " "),
    x: p.x,
    y: p.y - COMBO_DOT_R - VALUE_LABEL_GAP,
    anchor: "middle",
    fontSize: VALUE_FONT_SIZE,
    fontFamily: opts.fontFamily,
    priority: 100,
  }))
  const plates = labels.map(pointPlateBox)
  if (!labelsClear(plates, [...opts.bars, ...opts.dots], opts.bounds)) return []
  // A line is drawn over a halo, so its ink runs half the halo's width
  // either side of the segment.
  const reach = COMBO_LINE_HALO_W / 2
  const crossed = plates.some((plate) => {
    const box = { x: plate.x - reach, y: plate.y - reach, w: plate.w + reach * 2, h: plate.h + reach * 2 }
    return opts.segments.some(([a, b]) => segmentCrossesBox(a, b, box))
  })
  return crossed ? [] : labels.map((label, i) => ({ label, plate: plates[i]! }))
}

export function renderCombo(
  series: ChartSeries[],
  palette: string[],
  x0: number,
  y0: number,
  w: number,
  h: number,
  mutedColor: string,
  textColor: string,
  _accentColor: string,
  showGrid = true,
  component?: ChartInput,
  bgHex?: string,
  axisColor?: string,
  fontFamily?: string,
): ReactElement {
  const model = buildChartModel(series)
  const { categories } = model
  const meta = cartesianMeta(component)
  // validate refuses a combo value past `CHART_AXIS_LIMIT`, since neither axis
  // can be built for it (`buildAlignedNumericAxis` throws rather than return
  // a range that misses it). Handed one around validate, the chart declines
  // and says so, as a stacked pile past the same ceiling does.
  if (pastAxisLimit(keptValues(model.series))) return <WholeShareDeclined />
  const isLine = (seriesIndex: number) => series[seriesIndex]?.plot === "line"
  const onRight = (seriesIndex: number) => series[seriesIndex]?.axis === "right"

  const axisSeries = (right: boolean) => model.series.filter((s) => onRight(s.seriesIndex) === right)
  const axisMode = (right: boolean): DomainPadMode => {
    const members = axisSeries(right)
    if (members.some((s) => !isLine(s.seriesIndex))) return "zero-max"
    return valueAxisMode(keptValues(members))
  }
  const hasRight = axisSeries(true).length > 0
  // A bar is measured from zero, and "zero-max" keeps zero in range whatever
  // the values, so a left axis that carries a bar holds zero.
  const yAxis = buildNumericAxis(keptValues(axisSeries(false)), axisMode(false), meta.yUnit)
  const y2Axis = hasRight
    ? buildAlignedNumericAxis(keptValues(axisSeries(true)), axisMode(true), yAxis.ticks, meta.y2Unit)
    : null
  const geom = layoutCartesianPlot({
    x0,
    y0,
    w,
    h,
    yTickLabels: yAxis.labels,
    y2TickLabels: y2Axis?.labels,
    titleH: meta.titleH,
    fontFamily,
  })
  const domainOf = (seriesIndex: number) => (onRight(seriesIndex) && y2Axis ? y2Axis.domain : yAxis.domain)
  const yOf = (v: number, seriesIndex: number) => mapToPlotY(v, domainOf(seriesIndex), geom.plotY, geom.plotH)
  const groupW = geom.plotW / Math.max(categories.length, 1)
  const centerOf = (i: number) => geom.plotX + i * groupW + groupW / 2

  const yTicks = yAxis.ticks.map((t) => ({
    label: formatAxisTick(t, meta.yUnit),
    pos: mapToPlotY(t, yAxis.domain, geom.plotY, geom.plotH),
  }))
  // The right-hand ticks sit on the left axis's rows by construction, so they
  // take those rows' positions rather than recomputing them from a second
  // domain and landing a rounding error away.
  const y2Ticks = y2Axis?.ticks.map((t, i) => ({ label: formatAxisTick(t, meta.y2Unit), pos: yTicks[i]!.pos }))
  const xTicks = categories.map((cat, i) => {
    const category = fitSvgLine(String(cat.x), {
      maxWidth: Math.max(8, groupW - BAR_GROUP_EDGE_GAP * 2),
      fontSize: CATEGORY_FONT_SIZE,
      minFontSize: CATEGORY_MIN_FONT_SIZE,
      fontFamily,
    })
    return { label: category.text, pos: centerOf(i), truncated: category.truncated, fontSize: category.fontSize }
  })

  const barSeries = model.series.filter((s) => !isLine(s.seriesIndex))
  const lineSeries = model.series.filter((s) => isLine(s.seriesIndex))
  const clusterW = groupW * COMBO_CLUSTER_RATIO
  const nb = fullestGroup(barSeries, categories.length)
  const perBarW = nb <= 1 ? clusterW : Math.max(1, (clusterW - (nb - 1) * BAR_GROUP_EDGE_GAP) / nb)

  const barBoxes: DepthBox[] = []
  const bars = categories.map((cat, i) => {
    const clusterX = centerOf(i) - clusterW / 2
    const slots = barSlots(barSeries, i, clusterW, perBarW, BAR_GROUP_EDGE_GAP)
    const rects: ReactElement[] = []
    barSeries.forEach((s) => {
      const v = s.values[i]
      if (v == null || v === 0) return
      const top = yOf(Math.max(v, 0), s.seriesIndex)
      const bottom = yOf(Math.min(v, 0), s.seriesIndex)
      const barX = clusterX + slots.get(s.seriesIndex)!
      barBoxes.push({ x: barX, y: top, w: perBarW, h: bottom - top })
      rects.push(
        <rect
          key={s.seriesIndex}
          data-plot-mark="1"
          x={barX}
          y={top}
          width={perBarW}
          height={bottom - top}
          fill={palette[s.seriesIndex % palette.length]}
        />,
      )
    })
    return <g key={cat.key}>{rects}</g>
  })

  type Pt = { x: number; y: number }
  const lineGeoms = lineSeries.map((s) => {
    const runs: Pt[][] = []
    let run: Pt[] = []
    const points: (Pt & { value: number })[] = []
    categories.forEach((_cat, i) => {
      const v = s.values[i]
      if (v == null) {
        if (run.length > 0) runs.push(run)
        run = []
        return
      }
      const p = { x: centerOf(i), y: yOf(v, s.seriesIndex) }
      run.push(p)
      points.push({ ...p, value: v })
    })
    if (run.length > 0) runs.push(run)
    return { s, points, drawn: runs.filter((r) => r.length >= 2) }
  })
  const marked = lineGeoms.find((g) => series[g.s.seriesIndex]?.emphasis === true)
  const pointLabels = marked
    ? comboPointLabels({
        points: marked.points,
        unit: onRight(marked.s.seriesIndex) ? meta.y2Unit : meta.yUnit,
        fontFamily,
        bars: barBoxes,
        dots: lineGeoms.flatMap((g) => g.points.map((p) => dotBox(p))),
        segments: lineGeoms.flatMap((g) => g.drawn.flatMap((r) => r.slice(1).map((p, k) => [r[k]!, p] as const))),
        bounds: { left: geom.plotX, right: geom.plotX + geom.plotW, top: y0, bottom: geom.plotY + geom.plotH },
      })
    : []
  const pointLabelInk = directLabelInk(textColor, bgHex)

  const lines = lineGeoms.map(({ s, points, drawn }) => {
    const color = palette[s.seriesIndex % palette.length]
    const pts = (r: Pt[]) => r.map((p) => `${p.x},${p.y}`).join(" ")
    return (
      <g key={s.seriesIndex}>
        {bgHex
          ? drawn.map((r, ri) => (
              <polyline
                key={`halo-${ri}`}
                data-plot-mark="1"
                points={pts(r)}
                fill="none"
                stroke={bgHex}
                strokeWidth={COMBO_LINE_HALO_W}
              />
            ))
          : null}
        {drawn.map((r, ri) => (
          <polyline
            key={`ln-${ri}`}
            data-plot-mark="1"
            points={pts(r)}
            fill="none"
            stroke={color}
            strokeWidth={COMBO_LINE_W}
          />
        ))}
        {points.map((p, pi) => (
          <circle
            key={`dot-${pi}`}
            data-plot-mark="1"
            cx={p.x}
            cy={p.y}
            r={COMBO_DOT_R}
            fill={color}
            {...(bgHex ? { stroke: bgHex, strokeWidth: COMBO_DOT_STROKE } : {})}
          />
        ))}
      </g>
    )
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
        yTickMaxW: Math.max(0, geom.leftGutter - TICK_TO_AXIS_GAP),
        y2Ticks,
        y2TickMaxW: y2Axis ? Math.max(0, geom.rightGutter - TICK_TO_AXIS_GAP) : undefined,
        axisColor: axisColor ?? mutedColor,
        mutedColor,
        fontFamily,
      })}
      {bars}
      {lines}
      {pointLabels.map(({ label, plate }) => (
        <g key={label.id}>
          {bgHex ? <rect x={plate.x} y={plate.y} width={plate.w} height={plate.h} fill={bgHex} /> : null}
          <text
            data-value-label="1"
            x={label.x}
            y={label.y}
            textAnchor="middle"
            fontSize={VALUE_FONT_SIZE}
            fontWeight={VALUE_FONT_WEIGHT}
            fill={pointLabelInk}
            fontFamily={fontFamily}
            dominantBaseline="alphabetic"
          >
            {label.text}
          </text>
        </g>
      ))}
      {renderCartesianAxisTitles({
        plotX: geom.plotX,
        plotBottom: geom.titleY,
        plotW: geom.plotW,
        xTitle: meta.xTitle,
        yTitle: meta.yTitle,
        y2Title: y2Axis ? meta.y2Title : undefined,
        fill: mutedColor,
        fontFamily: fontFamily ?? "",
      })}
    </>
  )
}
