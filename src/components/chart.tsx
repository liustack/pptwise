import type { Component } from "@/ir"
import { SINGLE_SERIES_TYPES } from "@/ir/components/chart"
import { fitSvgLine, measureTextUnits } from "../lib/svg-text-layout"
import { rotateChartPalette } from "../render/chart-palette"
import { accessibleInk } from "../render/ink"
import { axisTitlePairHeight } from "./axis-titles"
import { buildChartModel } from "./chart-model"
import type { RenderDef, SvgComponent } from "./types"
import {
  renderArea,
  renderBar,
  renderBarHorizontal,
  renderDonut,
  renderDumbbell,
  renderGauge,
  renderLine,
  renderPie,
  renderFunnel,
  renderScatter,
  type ChartRenderFn,
} from "./chart-svg"

type ChartComponent = Extract<Component, { type: "chart" }>

const CHART_H = 240

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
}

/** 变体分发：bar+direction=horizontal 走横条，pie+style=donut 走环形（沿用旧
 * 形态，中心总值恒显）；其余按 chart_type 直查 renderers（含新 donut/gauge/
 * scatter/area）。 */
function resolveRenderer(component: ChartComponent): ChartRenderFn {
  if (component.chart_type === "bar" && component.direction === "horizontal") {
    return renderBarHorizontal
  }
  if (component.chart_type === "pie" && component.style === "donut") {
    return renderDonut
  }
  return renderers[component.chart_type]
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
const AXES_APPLICABLE_TYPES: ReadonlySet<ChartComponent["chart_type"]> = new Set([
  "bar",
  "line",
  "scatter",
  "area",
])

function axesApplicable(component: ChartComponent): boolean {
  return AXES_APPLICABLE_TYPES.has(component.chart_type)
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
const SINGLE_SERIES: ReadonlySet<ChartComponent["chart_type"]> = new Set(SINGLE_SERIES_TYPES)

/**
 * Legend applicability. A legend maps a color to a series name, so it applies
 * exactly when the chart draws more than one series.
 *
 * This used to read `axesApplicable(component) && series.length >= 2`, which
 * borrowed the axis-title rule for a question that is not about axes. The
 * borrowed half cost the dumbbell its names: a dumbbell is two series by
 * construction — a from and a to — and it drew both as colored dots with
 * nothing anywhere on the page saying which was which, on 26 gallery pages.
 * Axes have nothing to do with it, and `SINGLE_SERIES` above states the
 * real exclusion directly: the types that only ever draw one series.
 *
 * `series.length >= 2` is still the trigger. A single series has no color to
 * distinguish from another, and the golden pins hold that boundary.
 */
function legendApplicable(component: ChartComponent): boolean {
  return !SINGLE_SERIES.has(component.chart_type) && component.series.length >= 2
}

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
 */
function legendSwatchFill(
  component: ChartComponent,
  seriesIndex: number,
  palette: string[],
  mutedColor: string,
  accentColor: string,
): string {
  if (component.chart_type === "dumbbell") return seriesIndex === 0 ? mutedColor : accentColor
  return palette[seriesIndex % palette.length]!
}

/**
 * Header row (label-tuning A, 2026-08). The legend sits here, right-aligned,
 * above the plot. Axis titles sit below the x-axis, not in this row. The
 * 52px reservation and the 16px text baseline are taken from
 * LabelTuning.dc.html: the plot group is translated down by 52 relative to
 * a header baseline at 16, which is what keeps the tallest bar's value
 * label ≥ 24px clear of the legend ink.
 */
const HEADER_ROW_H = 52
const HEADER_BASELINE_Y = 16

/** Legend swatch (px, square) — LabelTuning.dc.html keeps the 10px chip. */
const LEGEND_SWATCH_SIZE = 10
/** Legend name font size (px) — 11 → 12 to match the header unit caption. */
const LEGEND_FONT_SIZE = 16
const LEGEND_MIN_FONT_SIZE = 16
/** Per-entry name budget (px) before `fitSvgLine` shrinks/truncates it. */
const LEGEND_NAME_MAX_W = 160
/** Gap (px) between a swatch and its own name. */
const LEGEND_SWATCH_GAP = 6
/**
 * Minimum swatch-to-swatch pitch (px). LabelTuning.dc.html starts two
 * 2-character CJK names 72px apart and grows the slot when the fitted name
 * is wider than that.
 */
const LEGEND_ENTRY_PITCH = 100

type LegendSlot = {
  seriesIndex: number
  colorIndex: number
  slotX: number
  fitted: ReturnType<typeof fitSvgLine>
  width: number
}

function legendNameWidth(
  fitted: ReturnType<typeof fitSvgLine>,
  fontFamily: string,
): number {
  return measureTextUnits(fitted.text, { fontFamily }) * fitted.fontSize
}

/**
 * Lays out a chart's legend entries (chart-model.ts's `ChartModel.legend`,
 * already in input series order) against `availW` px. Slots pack left to
 * right with a ≥72px swatch-to-swatch pitch (or the fitted name width when
 * that is larger). The caller right-aligns the group by offsetting
 * `slotX` with `availW - groupW`. Entries that do not fit are omitted and
 * recorded on a silent `data-dropped` marker.
 */
function layoutChartLegend(
  legend: ReturnType<typeof buildChartModel>["legend"],
  availW: number,
  fontFamily: string,
): { slots: LegendSlot[]; droppedCount: number; groupW: number; droppedX: number } {
  const prepared = legend.map((entry) => {
    const fitted = fitSvgLine(entry.name, {
      maxWidth: LEGEND_NAME_MAX_W,
      fontSize: LEGEND_FONT_SIZE,
      minFontSize: LEGEND_MIN_FONT_SIZE,
      fontFamily,
    })
    return {
      seriesIndex: entry.seriesIndex,
      colorIndex: entry.colorIndex,
      fitted,
      width: LEGEND_SWATCH_SIZE + LEGEND_SWATCH_GAP + legendNameWidth(fitted, fontFamily),
    }
  })

  const pitchAfter = (width: number) => Math.max(LEGEND_ENTRY_PITCH, width)

  function pack(count: number) {
    const slots: LegendSlot[] = []
    for (let i = 0; i < count; i++) {
      const e = prepared[i]!
      const slotX = i === 0 ? 0 : slots[i - 1]!.slotX + pitchAfter(prepared[i - 1]!.width)
      slots.push({
        seriesIndex: e.seriesIndex,
        colorIndex: e.colorIndex,
        slotX,
        fitted: e.fitted,
        width: e.width,
      })
    }
    if (count === 0) {
      return { slots, groupW: 0, droppedX: 0 }
    }
    const last = slots[count - 1]!
    return { slots, groupW: last.slotX + last.width, droppedX: last.slotX + last.width }
  }

  let visible = prepared.length
  while (visible >= 0) {
    const droppedCount = prepared.length - visible
    const packed = pack(visible)
    if (packed.groupW <= availW || visible === 0) {
      return { ...packed, droppedCount }
    }
    visible -= 1
  }
  return { slots: [], droppedCount: prepared.length, groupW: 0, droppedX: 0 }
}

function hasHeaderRow(component: ChartComponent): boolean {
  return legendApplicable(component)
}

function axisTitlesOf(component: ChartComponent): { xTitle?: string; yTitle?: string } {
  if (!axesApplicable(component)) return {}
  return { xTitle: component.axes?.x_title, yTitle: component.axes?.y_title }
}

export const chart: SvgComponent<ChartComponent> = {
  measure(component) {
    const { xTitle, yTitle } = axisTitlesOf(component)
    return (hasHeaderRow(component) ? HEADER_ROW_H : 0) + axisTitlePairHeight(xTitle, yTitle) + CHART_H
  },
  render(component, box, ctx) {
    const renderer = resolveRenderer(component)
    // axes only applies on an applicable chart_type — on any other type
    // (pie/funnel/dumbbell) `axes` is read as if it were entirely absent, so
    // the field is honestly ignored rather than partially/silently honored.
    const axes = axesApplicable(component) ? component.axes : undefined
    const headerH = hasHeaderRow(component) ? HEADER_ROW_H : 0
    const titleH = axisTitlePairHeight(axes?.x_title, axes?.y_title)
    const allocated = (box.h ?? headerH + CHART_H + titleH) - headerH
    const bodyH = axesApplicable(component)
      ? Math.max(CHART_H + titleH, allocated)
      : CHART_H
    const plotX = 0
    const plotW = box.w

    // P1 variety wave, task 2 (review fix round, Major finding): rotation
    // happens *here*, at the one place this palette actually feeds a chart
    // — not in `ctx.colors.chartPalette` itself, which several motifs also
    // read for unrelated decoration (see `ComponentCtx.chartPaletteOffset`'s
    // own doc comment for the leak this seam fixes). `ctx.chartPaletteOffset`
    // undefined/0 rotates to a same-values copy (`rotateChartPalette`'s own
    // doc comment) — a byte-identical multiset either way.
    const palette = rotateChartPalette(ctx.colors.chartPalette, ctx.chartPaletteOffset ?? 0)
    const legendBg = ctx.defaultBg ?? ctx.colors.bg
    const bodyFace = ctx.fonts.body

    const hasLegend = legendApplicable(component)
    const headerW = box.w
    const legendLayout = hasLegend
      ? layoutChartLegend(buildChartModel(component.series).legend, headerW, bodyFace)
      : null
    const legendLeft = legendLayout ? headerW - legendLayout.groupW : headerW

    const swatchY = HEADER_BASELINE_Y - LEGEND_SWATCH_SIZE

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
        )}
        {legendLayout ? (
          <g>
            {legendLayout.slots.map((slot) => {
              const swatchX = legendLeft + slot.slotX
              const nameFill = accessibleInk(ctx.colors.muted, legendBg, slot.fitted.fontSize)
              return (
                <g key={slot.seriesIndex}>
                  <rect
                    x={swatchX}
                    y={swatchY}
                    width={LEGEND_SWATCH_SIZE}
                    height={LEGEND_SWATCH_SIZE}
                    fill={legendSwatchFill(
                      component,
                      slot.colorIndex,
                      palette,
                      ctx.colors.muted,
                      ctx.colors.accent,
                    )}
                  />
                  <text
                    data-truncated={slot.fitted.truncated ? "1" : undefined}
                    x={swatchX + LEGEND_SWATCH_SIZE + LEGEND_SWATCH_GAP}
                    y={HEADER_BASELINE_Y}
                    fontSize={slot.fitted.fontSize}
                    fill={nameFill}
                    fontFamily={bodyFace}
                    dominantBaseline="alphabetic"
                  >
                    {slot.fitted.text}
                  </text>
                </g>
              )
            })}
            {legendLayout.droppedCount > 0 && <g data-dropped={legendLayout.droppedCount} />}
          </g>
        ) : null}
      </g>
    )
  },
}

export const renderDef: RenderDef<ChartComponent> = { type: "chart", measure: chart.measure, render: chart.render }
