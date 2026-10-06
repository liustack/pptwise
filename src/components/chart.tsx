import type { Component } from "@/ir";
import {
  isShareBar,
  SERIES_EMPHASIS_TYPES,
  SINGLE_SERIES_TYPES,
} from "@/ir/components/chart";
import { drawShareBar, shareBarHeight, shareFills, shareParts } from "./share-bar";
import { fitSvgLine, measureTextUnits } from "../lib/svg-text-layout";
import {
  emphasisSeriesPalette,
  recededMarkFill,
  rotateChartPalette,
} from "../render/chart-palette";
import { accessibleInk, resolveSemanticColor } from "../render/ink";
import { StatusMark, statusGround, statusWords } from "../render/mark-status";
import { mostlyChinese } from "../lib/text-script";
import type { FigureStyle } from "../lib/quantity-format";
import { axisTitlePairHeight } from "./axis-titles";
import {
  MIN_CARTESIAN_BOX_W,
  MIN_DUAL_AXIS_BOX_W,
  PLOT_TOP_PAD,
  X_TICK_BAND,
} from "./cartesian-axis";
import { labelLinePitch } from "./label-collision";
import {
  barHorizontalMinBodyH,
  REFERENCE_STROKE,
  CHART_BODY_H,
  CHART_MIN_BODY_H,
  DIRECT_LABEL_FONT_SIZE,
  RADIAL_MIN_BODY_H,
  seriesGutterLabelsFit,
} from "./chart-svg";
import { buildChartModel } from "./chart-model";
import { withBlockTitle } from "./block-title";
import { ordinaryTagSpec, paintTag, tagInks, tagWidth } from "./tag";
import type { ComponentCtx, RenderDef, SvgComponent } from "./types";
import {
  renderArea,
  renderBar,
  renderBarHorizontal,
  renderCombo,
  renderDonut,
  renderDumbbell,
  renderGauge,
  renderLine,
  renderPie,
  renderFunnel,
  renderScatter,
  renderStacked,
  type ChartRenderFn,
} from "./chart-svg";

type ChartComponent = Extract<Component, { type: "chart" }>;

/** Re-exported name for the flat body height, which now lives beside the
 * radial geometry that has to reason about it (`chart-svg.tsx`). */
const CHART_H = CHART_BODY_H;

const renderers: Record<ChartComponent["chart_type"], ChartRenderFn> = {
  bar: renderBar,
  line: renderLine,
  pie: renderPie,
  funnel: renderFunnel,
  dumbbell: renderDumbbell,
  scatter: renderScatter,
  area: renderArea,
  // `donut` (dedicated subtype) shares renderDonut with the legacy
  // `pie`+`style:"donut"` dispatch below — renderDonut reads `component` to
  // decide whether to print the center total, so one function serves both.
  donut: renderDonut,
  gauge: renderGauge,
  // One renderer for both piles: `renderStacked` reads `component.chart_type`
  // to decide whether each column keeps its amounts or is scaled to 100%.
  stacked: renderStacked,
  percent_stacked: renderStacked,
  combo: renderCombo,
};

/** 变体分发：bar+direction=horizontal 走横条，pie+style=donut 走环形（沿用旧
 * 形态，中心总值恒显）；其余按 chart_type 直查 renderers（含新 donut/gauge/
 * scatter/area）。 */
function resolveRenderer(component: ChartComponent): ChartRenderFn {
  if (component.chart_type === "bar" && component.direction === "horizontal") {
    return renderBarHorizontal;
  }
  if (component.chart_type === "pie" && component.style === "donut") {
    return renderDonut;
  }
  return renderers[component.chart_type];
}

/**
 * `component.axes` (chart-axes feature) applicability matrix: which
 * chart_type an x_title/y_title/show_grid actually renders for. Both bar
 * directions (vertical + `direction: "horizontal"`) share `chart_type:
 * "bar"`, so this one check covers both.
 *
 *  - bar: APPLICABLE. A clear two-axis cartesian plot box (category axis +
 *    value axis) — the exact shape axis titles and gridlines describe.
 *  - line: APPLICABLE. Same cartesian plot box as bar.
 *  - scatter: APPLICABLE. A numeric x-y plot box — the most literally
 *    cartesian of them all.
 *  - area: APPLICABLE. Line's own plot box with the region under it filled.
 *  - stacked / percent_stacked: APPLICABLE. Bar's plot box with the series
 *    piled into one column per category.
 *  - combo: APPLICABLE. Bar's plot box with lines drawn over the bars, and
 *    the only type that may add a right-hand value axis (`y2_title` /
 *    `y2_unit`, refused by validate everywhere else).
 *  - pie / donut / gauge: NOT applicable. Purely radial — no axes, no plot
 *    box to title (donut is the same "no axes" case whether reached via the
 *    dedicated chart_type or the legacy `pie`+`style: "donut"` form).
 *  - funnel: NOT applicable. A single value dimension (bar width) with no
 *    second (category) axis paired against it, and no gridline reference
 *    surface (chart-svg.tsx never draws one for funnel) — a title would
 *    float disconnected from any geometric anchor.
 *  - dumbbell: NOT applicable. A two-endpoint value comparison whose value
 *    axis has no fixed zero-anchored plot box the way bar/line do (its own
 *    `vx()` domain floats to the data's real min/max, per that function's
 *    own domain-safety comment in chart-svg.tsx) — same "no anchor" reason
 *    as funnel.
 *
 * ir-quality.ts's own `AXES_APPLICABLE_CHART_TYPES` mirrors this list (a
 * local duplicate, not a cross-import — that file is a pure quality-check
 * module and this one is a React SVG renderer, same "small local list +
 * comment" precedent gantt.tsx's `vx` primitive already set rather than
 * reaching across files for two entries).
 *
 * **Axis titles (x_title / y_title) render as one horizontal line** below
 * the x-axis, outside the plot, left-aligned to the origin: y_title as
 * "名  ↑" first, then a gap, then x_title as "名  →". Character-column
 * stacking is forbidden for every script. The pair is not the legend
 * header — that row stays legend-only. `bar` + `direction: "horizontal"`
 * uses the same pair.
 * show_grid still toggles the reference lines. ir-quality.ts's
 * `chart_axes_ignored` warning still keys off this same applicability set:
 * a pie with `axes.x_title` still warns, a bar with `axes.x_title` does not.
 */
const AXES_APPLICABLE_TYPES: ReadonlySet<ChartComponent["chart_type"]> =
  new Set([
    "bar",
    "line",
    "scatter",
    "area",
    "stacked",
    "percent_stacked",
    "combo",
  ]);

function axesApplicable(component: ChartComponent): boolean {
  return AXES_APPLICABLE_TYPES.has(component.chart_type);
}

/**
 * Chart types whose renderer reads `series[0]` and nothing else: a pie, a
 * donut, a funnel and a gauge are each one series of named parts, and each
 * names those parts on the page itself (slice labels, band labels, the
 * gauge's own number). A legend on one of them would either repeat what the
 * marks already say or name a series the chart never drew.
 *
 * The list is the schema's (`ir/components/chart.ts`), which is also where
 * validate now refuses a second series on one of these types. Reading it from
 * there is what keeps "the renderer draws one series" and "the author may
 * only write one" from drifting apart.
 */
const SINGLE_SERIES: ReadonlySet<ChartComponent["chart_type"]> = new Set(
  SINGLE_SERIES_TYPES
);

/**
 * Chart types that name their own series on the plot, so a legend would
 * repeat what the marks already say.
 *
 * Line and area charts label each series where its line ends — `name value`
 * in a right-hand gutter, stacked by `stackLabelColumn` (see
 * `chart-svg.tsx`'s own `renderSeriesGutterLabels`). Identity travels with
 * the line it belongs to, which is strictly better than a swatch row the
 * reader has to look up: no color matching, no legend order to reconcile
 * with plot order, and nothing to read when two series cross. A header row
 * on top of that would be the same names twice, and it cost every line and
 * area chart 52px of plot height for the privilege.
 */
const DIRECT_LABELLED: ReadonlySet<ChartComponent["chart_type"]> = new Set([
  "line",
  "area",
]);

/**
 * Legend applicability. A legend maps a color to a series name, so it applies
 * exactly when the chart draws more than one series *and* does not already
 * name them on the plot.
 *
 * This used to read `axesApplicable(component) && series.length >= 2`, which
 * borrowed the axis-title rule for a question that is not about axes. The
 * borrowed half cost the dumbbell its names: a dumbbell is two series by
 * construction — a from and a to — and it drew both as colored dots with
 * nothing anywhere on the page saying which was which, on 26 gallery pages.
 * Axes have nothing to do with it, and `SINGLE_SERIES` above states the
 * real exclusion directly: the types that only ever draw one series.
 *
 * `series.length >= 2` is still the trigger for everything else. A single
 * series has no color to distinguish from another, and the golden pins hold
 * that boundary.
 */
function legendApplicable(component: ChartComponent): boolean {
  if (SINGLE_SERIES.has(component.chart_type)) return false;
  if (DIRECT_LABELLED.has(component.chart_type)) return false;
  // A hatched forecast or a dashed target needs a key saying so, even on a
  // chart of one series, and so does a reference line.
  return (
    component.series.length >= 2 ||
    component.series.some((s) => s.data.some((d) => d.status !== undefined)) ||
    component.reference !== undefined
  );
}

/** Legend entries a chart's point statuses add: a forecast swatch, a target swatch. */
const FORECAST_ENTRY = -1;
const TARGET_ENTRY = -2;
/** The legend entry that names the chart's reference line, drawn as a short dashed line. */
const REFERENCE_ENTRY = -3;

/** The legend entry a reference line adds, named by its label. */
function referenceEntries(component: ChartComponent): { name: string; seriesIndex: number; colorIndex: number }[] {
  return component.reference ? [{ name: component.reference.label, seriesIndex: REFERENCE_ENTRY, colorIndex: 0 }] : [];
}

/** The status every point of a series shares, when they all share one: its legend swatch is drawn that way. */
function seriesStatus(component: ChartComponent, seriesIndex: number): "forecast" | "target" | undefined {
  const data = component.series[seriesIndex]?.data ?? [];
  const first = data[0]?.status;
  return first !== undefined && data.every((d) => d.status === first) ? first : undefined;
}

/**
 * The extra legend entries for points that are not reported figures, where a
 * series mixes them with reported ones: one "Forecast" entry hatched in the
 * colour of the first such series, and one "Target" entry outlined the same
 * way. A series whose every point is a forecast or a target needs none: its
 * own swatch is hatched or outlined.
 */
function statusEntries(component: ChartComponent, figures?: FigureStyle): { name: string; seriesIndex: number; colorIndex: number }[] {
  const chinese =
    figures?.chinese ??
    mostlyChinese([
      ...component.series.map((s) => s.name),
      ...component.series.flatMap((s) => s.data.flatMap((d) => (typeof d.x === "string" ? [d.x] : []))),
    ]);
  const words = statusWords(chinese);
  const entries: { name: string; seriesIndex: number; colorIndex: number }[] = [];
  const partial = (status: "forecast" | "target") =>
    component.series.findIndex((s, i) => seriesStatus(component, i) === undefined && s.data.some((d) => d.status === status));
  const forecast = partial("forecast");
  const target = partial("target");
  if (forecast >= 0) entries.push({ name: words.forecast, seriesIndex: FORECAST_ENTRY, colorIndex: forecast });
  if (target >= 0) entries.push({ name: words.target, seriesIndex: TARGET_ENTRY, colorIndex: target });
  return entries;
}

/**
 * A combo names a line series with a line, not a square: the legend is the
 * only place that says which of its colors are bars and which are lines, and
 * a square beside a line's name describes a bar the chart never drew.
 */
function legendSwatchIsLine(
  component: ChartComponent,
  seriesIndex: number
): boolean {
  return (
    component.chart_type === "combo" &&
    component.series[seriesIndex]?.plot === "line"
  );
}

/** Thickness (px) of a line series' legend swatch (a short stroke, not a chip). */
const LEGEND_LINE_SWATCH_H = 3;

/**
 * The color a legend swatch has to be: whatever the renderer actually painted
 * that series with.
 *
 * Every cartesian renderer takes its series colors from the rotated palette
 * in order, so `palette[colorIndex]` is right for them. `renderDumbbell` does
 * not — it paints the from-dots muted and the to-dots accent, because a
 * dumbbell is one row read left to right rather than two independent series.
 * A palette swatch beside those names would be a legend describing a chart
 * that is not on the page.
 *
 * A bar chart with one bar marked (`data[].emphasis`) is the same case: the
 * marked bar keeps its series' colour and every other bar recedes to grey
 * (`markedPointFill`, `chart-svg.tsx`). A swatch then takes the fill of the
 * bars it names (`markedBarSwatch`), so it is that grey for any series with
 * a bar other than the marked one. Named in its own colour, such a series
 * left its grey bars looking like another series' bars.
 */
function legendSwatchFill(
  component: ChartComponent,
  seriesIndex: number,
  palette: string[],
  mutedColor: string,
  accentColor: string,
  receded: string
): string {
  if (component.chart_type === "dumbbell")
    return seriesIndex === 0 ? mutedColor : accentColor;
  return markedBarSwatch(component, seriesIndex, palette, receded);
}

/**
 * The fill a legend entry's bars are drawn in, in a bar chart with one bar
 * marked: the series' own colour only when every bar the entry names is the
 * marked one, and otherwise the grey every other bar steps back to. `names`
 * picks the series' bars the entry stands for: all of them for the series'
 * own swatch, the forecasts for a Forecast entry. Without a marked bar it is
 * the series' palette colour, as it always was.
 */
function markedBarSwatch(
  component: ChartComponent,
  seriesIndex: number,
  palette: readonly string[],
  receded: string,
  names: (point: ChartComponent["series"][number]["data"][number]) => boolean = () => true
): string {
  const own = palette[seriesIndex % palette.length]!;
  if (component.chart_type !== "bar") return own;
  const marked = component.series.flatMap((s, si) => s.data.filter((d) => d.emphasis === true).map(() => si))[0];
  if (marked === undefined) return own;
  const bars = component.series[seriesIndex]?.data.filter(names) ?? [];
  return bars.some((d) => !(seriesIndex === marked && d.emphasis === true)) ? receded : own;
}

/**
 * Header row (label-tuning A, 2026-08). The legend sits here, right-aligned,
 * above the plot. Axis titles sit below the x-axis, not in this row. The
 * 52px reservation and the 16px text baseline are taken from
 * LabelTuning.dc.html: the plot group is translated down by 52 relative to
 * a header baseline at 16, which is what keeps the tallest bar's value
 * label ≥ 24px clear of the legend ink.
 */
const HEADER_ROW_H = 52;
const HEADER_BASELINE_Y = 16;

/** Legend swatch (px, square) — LabelTuning.dc.html keeps the 10px chip. */
const LEGEND_SWATCH_SIZE = 10;
/** Legend name font size (px) — 11 → 12 to match the header unit caption. */
const LEGEND_FONT_SIZE = 16;
const LEGEND_MIN_FONT_SIZE = 16;
/** Gap (px) between a swatch and its own name. */
const LEGEND_SWATCH_GAP = 6;
/**
 * Minimum swatch-to-swatch pitch (px). LabelTuning.dc.html starts two
 * 2-character CJK names 72px apart and grows the slot when the fitted name
 * is wider than that.
 */
const LEGEND_ENTRY_PITCH = 100;
/**
 * Clear space (px) between a name and the next swatch once the name is too
 * wide for `LEGEND_ENTRY_PITCH`. Names are placed by estimated width, and the
 * face that finally sets them can run a few px wider (PingFang standing in
 * for Microsoft YaHei on a Mac), so the gap has to absorb that.
 */
const LEGEND_ENTRY_GAP = 20;
/**
 * Baseline-to-baseline pitch (px) of a legend that runs onto a second or
 * third row: one and a half times the names' size. Each row it adds moves
 * the plot down by this much, so the tallest bar's label keeps its clearance
 * under the last row.
 */
const LEGEND_ROW_PITCH = 24;
/**
 * The most rows a legend takes. Past three, the chart has more series than a
 * reader can match to their bars, and the names that do not fit are declared.
 */
const LEGEND_MAX_ROWS = 3;

type LegendSlot = {
  seriesIndex: number;
  colorIndex: number;
  /** The legend row the entry stands in, from 0. */
  row: number;
  /** The entry's left edge, from the left of its row's group. */
  slotX: number;
  fitted: ReturnType<typeof fitSvgLine>;
  width: number;
};

interface LegendLayout {
  slots: LegendSlot[];
  droppedCount: number;
  /** How many rows the header gives the legend, at least one. */
  rows: number;
  /** Each row's group width, which the caller right-aligns. */
  rowWidths: number[];
}

function legendNameWidth(
  fitted: ReturnType<typeof fitSvgLine>,
  fontFamily: string
): number {
  return measureTextUnits(fitted.text, { fontFamily }) * fitted.fontSize;
}

/**
 * Lays out a chart's legend entries (chart-model.ts's `ChartModel.legend`,
 * already in input series order) in rows `rowW` px wide, the first row
 * `firstRowW` wide because the chart's tag stands at its start. Within a row
 * slots pack left to right with a `LEGEND_ENTRY_PITCH` swatch-to-swatch
 * pitch, or the entry plus `LEGEND_ENTRY_GAP` when that is larger. The
 * caller right-aligns each row.
 *
 * **A name is set whole.** It takes the width it needs, up to a whole row.
 * Each name used to have 160px whatever room the row had, about eighteen
 * Latin characters, and lost the rest. A row that cannot hold the next name
 * hands it to the next row, down to `LEGEND_MAX_ROWS`, and the header grows
 * by a row's pitch for each row it adds (`headerRowH`). Only a name wider
 * than a whole row is cut, and it says so with `data-truncated`.
 *
 * **What fits is named, and the rest is declared.** A slide never carries a
 * count of what it left out: an overflow mark is bookkeeping the audience
 * did not ask for, in a vocabulary only this repo reads. So entries that do
 * not fit in the last row are simply not drawn, and every one of them is
 * declared through `data-dropped` — the marker `slideToRender` sums and
 * `checkContentDropGate` (`../pptx/generate.ts`) refuses to export. A
 * 60-series bar chart at 1120px paints the names that fit and ships nothing
 * until the author gives the chart fewer series or a wider band.
 */
function layoutChartLegend(
  legend: ReturnType<typeof buildChartModel>["legend"],
  rowW: number,
  firstRowW: number,
  fontFamily: string
): LegendLayout {
  const prepared = legend.map((entry) => {
    const fitted = fitSvgLine(entry.name, {
      maxWidth: Math.max(0, rowW - LEGEND_SWATCH_SIZE - LEGEND_SWATCH_GAP),
      fontSize: LEGEND_FONT_SIZE,
      minFontSize: LEGEND_MIN_FONT_SIZE,
      fontFamily,
    });
    return {
      seriesIndex: entry.seriesIndex,
      colorIndex: entry.colorIndex,
      fitted,
      width:
        LEGEND_SWATCH_SIZE +
        LEGEND_SWATCH_GAP +
        legendNameWidth(fitted, fontFamily),
    };
  });

  const pitchAfter = (width: number) =>
    Math.max(LEGEND_ENTRY_PITCH, width + LEGEND_ENTRY_GAP);

  const slots: LegendSlot[] = [];
  const rowWidths = [0];
  let row = 0;
  for (let i = 0; i < prepared.length; i++) {
    const e = prepared[i]!;
    for (;;) {
      const prev = slots.length > 0 && slots[slots.length - 1]!.row === row ? slots[slots.length - 1]! : undefined;
      const slotX = prev ? prev.slotX + pitchAfter(prev.width) : 0;
      if (slotX + e.width <= (row === 0 ? firstRowW : rowW)) {
        slots.push({ seriesIndex: e.seriesIndex, colorIndex: e.colorIndex, row, slotX, fitted: e.fitted, width: e.width });
        rowWidths[row] = slotX + e.width;
        break;
      }
      if (row + 1 >= LEGEND_MAX_ROWS || (!prev && row > 0)) {
        return { slots, droppedCount: prepared.length - i, rows: lastRow(slots), rowWidths: rowWidths.slice(0, lastRow(slots)) };
      }
      row += 1;
      rowWidths.push(0);
    }
  }
  return { slots, droppedCount: 0, rows: lastRow(slots), rowWidths: rowWidths.slice(0, lastRow(slots)) };
}

/** How many rows the placed slots take, at least one. */
function lastRow(slots: readonly LegendSlot[]): number {
  return slots.length > 0 ? slots[slots.length - 1]!.row + 1 : 1;
}

const SERIES_EMPHASIS: ReadonlySet<ChartComponent["chart_type"]> = new Set(
  SERIES_EMPHASIS_TYPES
);

/**
 * The series `series[].emphasis` singles out, or -1. validate holds the mark
 * to one series, on a chart type that colors its series one by one, among
 * at least two (`ir/components/chart.ts`), so the first mark is the mark.
 */
function markedSeriesIndex(component: ChartComponent): number {
  if (!SERIES_EMPHASIS.has(component.chart_type)) return -1;
  return component.series.findIndex((s) => s.emphasis === true);
}

/**
 * The series palette once each series that names a `tone` takes its tone's
 * ink: good news in the success ink, bad news in the danger ink, the way
 * every theme already colours a figure's direction. Indexed by series, the
 * array every renderer and the legend both read. With a series marked, the
 * others still recede, a toned one included, and a toned marked series keeps
 * its tone rather than the lead colour. A chart with no tone gets `palette`
 * back untouched.
 */
function tonedSeriesPalette(
  component: ChartComponent,
  palette: readonly string[],
  marked: number,
  colors: Parameters<typeof resolveSemanticColor>[1]
): string[] {
  if (!component.series.some((s) => s.tone)) return [...palette];
  return component.series.map((s, i) => {
    const own = palette[i % palette.length]!;
    if (!s.tone) return own;
    return marked < 0 || marked === i ? resolveSemanticColor(s.tone, colors) : own;
  });
}

/**
 * Whether the chart sets a header row over its plot: for its legend, or for
 * its tag (`tag`), which stands at the start of the row with the legend
 * right-aligned beside it.
 */
function hasHeaderRow(component: ChartComponent): boolean {
  return legendApplicable(component) || component.tag !== undefined;
}

/** Air between the chart's tag and the first legend entry. */
const TAG_LEGEND_GAP = 24;

function axisTitlesOf(component: ChartComponent): {
  xTitle?: string;
  yTitle?: string;
  y2Title?: string;
} {
  if (!axesApplicable(component)) return {};
  return {
    xTitle: component.axes?.x_title,
    yTitle: component.axes?.y_title,
    y2Title: component.axes?.y2_title,
  };
}

/**
 * Narrowest box this chart can draw a plot in. A combo with a series on the
 * right axis pays for a second tick gutter, so it needs more than one axis
 * does (`MIN_DUAL_AXIS_BOX_W`). Everything else keeps `MIN_CARTESIAN_BOX_W`.
 */
function minCartesianBoxW(component: ChartComponent): number {
  const dual =
    component.chart_type === "combo" &&
    component.series.some((s) => s.axis === "right");
  return dual ? MIN_DUAL_AXIS_BOX_W : MIN_CARTESIAN_BOX_W;
}

/**
 * Body height a directly-labelled chart needs so its gutters can hold one
 * line per series.
 *
 * Line and area gave up their legend row because each series is now named
 * where its own line ends. That trade only holds if there is a line's worth
 * of column for every series to be named in: at the flat 240px body, the
 * columns fit nine, and a tenth series lost both its start value and its
 * name to a declared drop — on the height the chart measured for itself,
 * not on a caller's short box. `measure()` is what a caller owes this
 * component, so the count of names it has to place belongs in it.
 *
 * The column runs the plot's own height, which is the body less the top pad
 * and the x-tick band (`layoutCartesianPlot`). Anything not directly
 * labelled keeps the flat floor.
 */
function directLabelBodyH(component: ChartComponent): number {
  if (!DIRECT_LABELLED.has(component.chart_type)) return 0;
  const columns = Math.ceil(
    component.series.length * labelLinePitch(DIRECT_LABEL_FONT_SIZE)
  );
  return columns + PLOT_TOP_PAD + X_TICK_BAND;
}

/**
 * Body height a pie or donut needs to hold its own leaders.
 *
 * Every slice hangs a `PIE_LEADER_STUB` off its arc, so the circle's ink runs
 * a stub past its own radius in every direction. `radialFullRadius` keeps
 * that inside the box by yielding the stub on whichever axis binds — which,
 * left alone, would simply draw a smaller circle in the same band. The band
 * grows by the two stubs instead, so a caller granting this minimum gets the
 * circle it always got and the leaders land inside it.
 */
function radialBodyH(component: ChartComponent): number {
  if (component.chart_type !== "pie" && component.chart_type !== "donut")
    return 0;
  return RADIAL_MIN_BODY_H;
}

/**
 * Body height a funnel needs so every stage keeps its name.
 *
 * `renderFunnel` gives each stage one band of `h / stages` and labels none of
 * them once that band is shorter than a line of text — all or nothing, so
 * that neighbouring labels can never overlap. At the flat 240px body a
 * twelve-stage funnel drew twelve bands and dropped twelve names, and did it
 * on a face that had 328px to give.
 *
 * It is the same claim `directLabelBodyH` makes for line and area: what a
 * caller owes this component depends on how many things it has to name, so
 * the count belongs in `measure()`. One line of pitch per stage is exactly
 * the threshold the renderer tests, so a caller granting this minimum gets
 * every stage named.
 */
function funnelBodyH(component: ChartComponent): number {
  if (component.chart_type !== "funnel") return 0;
  const stages = component.series[0]?.data.length ?? 0;
  if (stages === 0) return 0;
  return Math.ceil(stages * labelLinePitch(DIRECT_LABEL_FONT_SIZE));
}

/**
 * Body height a horizontal bar chart needs so every category keeps a row:
 * the same claim `funnelBodyH` makes for a funnel's stages, sized by
 * `barHorizontalMinBodyH` beside the renderer whose rows it measures.
 */
function horizontalBarBodyH(component: ChartComponent): number {
  if (component.chart_type !== "bar" || component.direction !== "horizontal")
    return 0;
  const rows = buildChartModel(component.series).categories.length;
  if (rows === 0) return 0;
  return barHorizontalMinBodyH(rows, component.series.length, (component.bands?.length ?? 0) > 0);
}

/** The header row and the axis-title band a chart stacks on its body. */
function chartFrameH(component: ChartComponent, w: number, ctx: ComponentCtx): number {
  const { xTitle, yTitle, y2Title } = axisTitlesOf(component);
  return headerRowH(component, w, ctx) + axisTitlePairHeight(xTitle, yTitle, y2Title);
}

/**
 * The legend laid out at width `w`: the rows the chart's header gives it,
 * the first one shortened by the chart's tag when there is one. Null when
 * the chart draws no legend.
 */
function chartLegendLayout(component: ChartComponent, w: number, ctx: ComponentCtx): LegendLayout | null {
  if (!legendApplicable(component)) return null;
  const tagW = component.tag ? tagWidth(component.tag.text, ordinaryTagSpec(ctx)) : 0;
  const tagFits = component.tag !== undefined && tagW <= w;
  return layoutChartLegend(
    [...buildChartModel(component.series).legend, ...statusEntries(component, ctx.figures), ...referenceEntries(component)],
    w,
    tagFits ? w - tagW - TAG_LEGEND_GAP : w,
    ctx.fonts.body
  );
}

/** The header the plot is moved down by: one row, and a row's pitch for each further legend row. */
function headerRowH(component: ChartComponent, w: number, ctx: ComponentCtx): number {
  if (!hasHeaderRow(component)) return 0;
  const rows = chartLegendLayout(component, w, ctx)?.rows ?? 1;
  return HEADER_ROW_H + (rows - 1) * LEGEND_ROW_PITCH;
}

function measureChartH(component: ChartComponent, w: number, ctx: ComponentCtx): number {
  return (
    chartFrameH(component, w, ctx) +
    Math.max(
      CHART_H,
      directLabelBodyH(component),
      funnelBodyH(component),
      radialBodyH(component),
      horizontalBarBodyH(component)
    )
  );
}

/**
 * The least height a chart draws whole in.
 *
 * A chart on a cartesian plot can draw a shorter plot than the flat body it
 * measures at, down to `CHART_MIN_BODY_H`, so long as every other claim its
 * measure makes still holds: the column of names a line or area chart sets at
 * the end of its lines, and the rows a horizontal bar chart gives its
 * categories. A pie, donut, funnel, gauge or dumbbell sizes its marks from the
 * band it measured, and keeps it.
 *
 * Without this a chart was a fixed 320px block wherever it stood, and under
 * brief's heading rule that left room for exactly one line of callout below
 * it: a callout a few words longer sent the page to the step-aside layout, or
 * at spacious pacing lost the callout, while 92px of the band stood empty.
 */
function chartMinHeight(component: ChartComponent, w: number, ctx: ComponentCtx): number {
  if (isShareBar(component)) return shareBarHeight(component, w, ctx);
  if (!axesApplicable(component)) return measureChartH(component, w, ctx);
  return (
    chartFrameH(component, w, ctx) +
    Math.max(CHART_MIN_BODY_H, directLabelBodyH(component), horizontalBarBodyH(component))
  );
}

/**
 * A share bar (`isShareBar`) in the ordinary chart: each part its palette
 * colour, or, with a run marked, the run in the lead colour and every other
 * part in the grey a marked series leaves the rest in. Declared dropped when
 * a part's name and value have nowhere to go, not even the key under the bar.
 */
function renderShare(component: ChartComponent, box: { x: number; y: number; w: number }, ctx: Parameters<SvgComponent<ChartComponent>["render"]>[2]) {
  const parts = shareParts(component);
  const palette = rotateChartPalette(ctx.colors.chartPalette, ctx.chartPaletteOffset ?? 0);
  const bg = ctx.defaultBg ?? ctx.colors.bg;
  const marked = parts?.some((part) => part.marked) ?? false;
  const fills = parts
    ? shareFills(parts, {
        mark: palette[0]!,
        others: marked ? [recededMarkFill(ctx.colors.muted, bg)] : palette,
        surface: ctx.colors.surface,
      })
    : [];
  const drawn = drawShareBar({ chart: component, ctx, x: box.x, y: box.y, w: box.w, fills, markInk: palette[0]! });
  return drawn ? drawn.node : <g data-dropped={1} data-dropped-kind="component" />;
}

export const chart: SvgComponent<ChartComponent> = {
  measure(component, w, ctx) {
    if (isShareBar(component)) return shareBarHeight(component, w, ctx);
    return measureChartH(component, w, ctx);
  },
  render(component, box, ctx) {
    if (isShareBar(component)) return renderShare(component, box, ctx);
    const renderer = resolveRenderer(component);
    // axes only applies on an applicable chart_type — on any other type
    // (pie/funnel/dumbbell) `axes` is read as if it were entirely absent, so
    // the field is honestly ignored rather than partially/silently honored.
    const axes = axesApplicable(component) ? component.axes : undefined;
    const headerH = headerRowH(component, box.w, ctx);
    const minimum = chartMinHeight(component, box.w, ctx);
    // A component draws inside the box it accepted, or it declines. This used
    // to read `Math.max(CHART_H + titleH, allocated)`: handed a box shorter
    // than its own measured minimum, the chart quietly drew that minimum
    // anyway and spilled over whatever the face had placed below it — a
    // sentence, a footnote, 16 pages of the review corpus. `measure()` is
    // what a caller hands this component while the page has room, and
    // `chartMinHeight` the least it accepts when the page has none; `render`
    // trusts `box.h` to be at least that.
    // Every chart type, not only the cartesian ones. `CHART_H` used to be
    // pinned here for funnel, pie, donut, gauge and dumbbell, so a face that
    // handed one of them a 328px band got a 240px chart and kept the
    // difference as dead air — and a twelve-stage funnel dropped all twelve
    // stage names inside a box that had room for them. `traits.stretchable`
    // says a layout may grow this component; honouring that only on four of
    // the nine chart types made the trait half true.
    const bodyH = (box.h ?? chart.measure(component, box.w, ctx)) - headerH;
    const plotX = 0;
    const plotW = box.w;

    // A box this component cannot draw in — too short for its own measured
    // minimum, or too narrow for a plot to exist at all — is a layout defect,
    // not something to paint through. Nothing paints and the loss is
    // declared, the same answer `WholeShareDeclined` (chart-svg.tsx) already
    // gives a chart handed data it cannot draw.
    //
    // What that declaration *does* is refuse the deck. `data-dropped` is the
    // attribute `slideToRender` (render-slide.tsx) counts, and that count is
    // what `checkContentDropGate` throws on, so an under-allocated chart
    // stops the export until someone fixes the band or passes
    // `--allow-dropped-content` (`generate-chart-decline-export.test.ts`
    // pins both halves). That is the point, not a regrettable side effect: a
    // chart painted through the sentence below it ships a wrong page in
    // silence, and this ships nothing until a person decides.
    //
    // A thrown error was the other candidate and is wrong here. A face's
    // content band is a fixed constant on several of them, so an
    // under-allocated box stays reachable by construction; a named marker
    // lets the page still render for preview and review, and moves the
    // refusal to the one place that ships a file.
    if ((box.h ?? Number.POSITIVE_INFINITY) + 0.5 < minimum) {
      return <g data-dropped={1} data-dropped-kind="component" />;
    }
    // Same contract on the other axis. Below `MIN_CARTESIAN_BOX_W` the y-tick
    // gutter and the right pad leave no plot to speak of, and the frame would
    // be drawn against `plotW`'s 1px floor — geometry that no longer means
    // anything and, before the gutter cap was made to bind, ink outside the
    // box.
    if (axesApplicable(component) && box.w < minCartesianBoxW(component)) {
      return <g data-dropped={1} data-dropped-kind="component" />;
    }
    // A directly-labelled chart has a second contract on this axis, and it
    // is not a width: line and area carry no legend, so the only place a
    // series is named is the end of its own line. A box that cannot host
    // those labels gets a chart with no names on it — which the old width
    // floor still allowed, because the y-tick gutter it was derived against
    // is not a constant either. `seriesGutterLabelsFit` asks the real
    // geometry the question, with the same calls the renderer will make.
    if (
      DIRECT_LABELLED.has(component.chart_type) &&
      !seriesGutterLabelsFit(component.series, box.w, component, ctx.fonts.body, ctx.figures)
    ) {
      return <g data-dropped={1} data-dropped-kind="component" />;
    }

    // P1 variety wave, task 2 (review fix round, Major finding): rotation
    // happens *here*, at the one place this palette actually feeds a chart
    // — not in `ctx.colors.chartPalette` itself, which several motifs also
    // read for unrelated decoration (see `ComponentCtx.chartPaletteOffset`'s
    // own doc comment for the leak this seam fixes). `ctx.chartPaletteOffset`
    // undefined/0 rotates to a same-values copy (`rotateChartPalette`'s own
    // doc comment) — a byte-identical multiset either way.
    const rotated = rotateChartPalette(
      ctx.colors.chartPalette,
      ctx.chartPaletteOffset ?? 0
    );
    const legendBg = ctx.defaultBg ?? ctx.colors.bg;
    // A marked series keeps the lead color and every other series recedes
    // to one grey, so the page reads as one series against its context.
    // Remapped after rotation, on the one array every renderer and the
    // legend both read, so swatch and mark cannot disagree. Unmarked charts
    // take the rotated palette untouched.
    const marked = markedSeriesIndex(component);
    const receded = recededMarkFill(ctx.colors.muted, legendBg);
    const palette = tonedSeriesPalette(
      component,
      marked < 0
        ? rotated
        : emphasisSeriesPalette(
            rotated,
            component.series.length,
            marked,
            receded
          ),
      marked,
      ctx.colors
    );
    const bodyFace = ctx.fonts.body;

    const headerW = box.w;
    // The chart's tag stands at the start of the header row, the legend
    // right-aligned in what is left. A tag wider than the whole row is
    // declared dropped, never squeezed.
    const tagSpec = ordinaryTagSpec(ctx);
    const tagW = component.tag ? tagWidth(component.tag.text, tagSpec) : 0;
    const tagFits = component.tag !== undefined && tagW <= headerW;
    // The same layout `headerRowH` measured the header with, so the rows
    // drawn are the rows the plot was moved down for.
    const legendLayout = chartLegendLayout(component, headerW, ctx);
    // A status entry is drawn in the fill of the bars it names: the Forecast
    // or Target entry in its series' forecasts or targets, a series that is
    // all one status in its own bars.
    const statusSwatch = (slot: LegendSlot): string =>
      markedBarSwatch(
        component,
        slot.colorIndex,
        palette,
        receded,
        slot.seriesIndex === FORECAST_ENTRY
          ? (d) => d.status === "forecast"
          : slot.seriesIndex === TARGET_ENTRY
            ? (d) => d.status === "target"
            : undefined
      );

    return (
      <g transform={`translate(${box.x},${box.y})`}>
        {renderer(
          component.series,
          palette,
          plotX,
          headerH,
          plotW,
          bodyH,
          ctx.colors.muted,
          ctx.colors.text,
          ctx.colors.accent,
          axes?.show_grid,
          // Threaded for the subtypes whose geometry needs component-level
          // config (donut's center_total, gauge's min/max) and for cartesian
          // axis titles / units (bar/line/area/scatter).
          component,
          // The background the marks land on, for text ink only — see
          // `ChartRenderFn`'s own `bgHex` doc comment.
          legendBg,
          ctx.colors.border ?? ctx.colors.muted,
          bodyFace,
          ctx.figures
        )}
        {component.tag
          ? tagFits
            ? paintTag({ tag: component.tag, x: 0, y: 0, spec: tagSpec, inks: tagInks(ctx, component.tag, false, legendBg, tagSpec.size) })
            : <g data-dropped={1} data-dropped-kind="tag" />
          : null}
        {legendLayout ? (
          <g>
            {legendLayout.slots.map((slot) => {
              // Each row is right-aligned on its own, a row's pitch under the last.
              const swatchX = headerW - legendLayout.rowWidths[slot.row]! + slot.slotX;
              const swatchY = HEADER_BASELINE_Y + slot.row * LEGEND_ROW_PITCH - LEGEND_SWATCH_SIZE;
              const nameFill = accessibleInk(
                ctx.colors.muted,
                legendBg,
                slot.fitted.fontSize
              );
              return (
                <g key={slot.seriesIndex}>
                  {slot.seriesIndex === REFERENCE_ENTRY ? (
                    <line
                      data-legend-reference=""
                      x1={swatchX}
                      y1={swatchY + LEGEND_SWATCH_SIZE / 2}
                      x2={swatchX + LEGEND_SWATCH_SIZE}
                      y2={swatchY + LEGEND_SWATCH_SIZE / 2}
                      stroke={ctx.colors.text}
                      strokeWidth={REFERENCE_STROKE}
                      strokeDasharray="3 2"
                    />
                  ) : slot.seriesIndex < 0 || seriesStatus(component, slot.seriesIndex) ? (
                    <StatusMark
                      status={slot.seriesIndex === FORECAST_ENTRY ? "forecast" : slot.seriesIndex === TARGET_ENTRY ? "target" : seriesStatus(component, slot.seriesIndex)!}
                      color={statusSwatch(slot)}
                      ground={statusGround(statusSwatch(slot), legendBg, 0.25)}
                      x={swatchX}
                      y={swatchY}
                      w={LEGEND_SWATCH_SIZE}
                      h={LEGEND_SWATCH_SIZE}
                    />
                  ) : (
                  <rect
                    x={swatchX}
                    y={
                      legendSwatchIsLine(component, slot.seriesIndex)
                        ? swatchY +
                          (LEGEND_SWATCH_SIZE - LEGEND_LINE_SWATCH_H) / 2
                        : swatchY
                    }
                    width={LEGEND_SWATCH_SIZE}
                    height={
                      legendSwatchIsLine(component, slot.seriesIndex)
                        ? LEGEND_LINE_SWATCH_H
                        : LEGEND_SWATCH_SIZE
                    }
                    fill={legendSwatchFill(
                      component,
                      slot.colorIndex,
                      palette,
                      ctx.colors.muted,
                      ctx.colors.accent,
                      receded
                    )}
                  />
                  )}
                  <text
                    data-truncated={slot.fitted.truncated ? "1" : undefined}
                    x={swatchX + LEGEND_SWATCH_SIZE + LEGEND_SWATCH_GAP}
                    y={HEADER_BASELINE_Y + slot.row * LEGEND_ROW_PITCH}
                    fontSize={slot.fitted.fontSize}
                    fill={nameFill}
                    fontFamily={bodyFace}
                    dominantBaseline="alphabetic"
                  >
                    {slot.fitted.text}
                  </text>
                </g>
              );
            })}
            {/* Series the rows could not name are declared, never counted
                on the page: the export refuses instead. */}
            {legendLayout.droppedCount > 0 && (
              <g
                data-dropped={legendLayout.droppedCount}
                data-dropped-kind="series-name"
              />
            )}
          </g>
        ) : null}
      </g>
    );
  },
};

// A title, when the chart carries one, is set over it as on a table.
export const renderDef: RenderDef<ChartComponent> = withBlockTitle({
  type: "chart",
  measure: chart.measure,
  render: chart.render,
  minHeight: chartMinHeight,
});
