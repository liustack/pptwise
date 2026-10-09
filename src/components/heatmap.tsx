import type { Component } from "@/ir"
import { fitSvgLine, measureTextUnits } from "../lib/svg-text-layout"
import { mixHex } from "./color-mix"
import { axisTitlePairHeight, renderAxisTitlePair } from "./axis-titles"
import { accessibleInk, graphicInk, liftedInk } from "../render/ink"
import { Icon } from "../render/icons"
import type { ComponentCtx, RenderDef, SvgComponent } from "./types"

type HeatmapComponent = Extract<Component, { type: "heatmap" }>

/**
 * Value-driven color grid (structure-components wave 2 task 2): shape comes
 * straight from `x_labels`/`y_labels` (cols = x_labels.length, rows =
 * y_labels.length — no separate numeric `cols`/`rows` field to drift out of
 * sync, `ir/index.ts`'s own `.refine` chain enforces `values` stays exactly
 * that rectangle). Every cell's fill is a deterministic single-hue
 * luminance interpolation from `colors.surface` toward `colors.primary`
 * (`cellFill` below) — the same `mixHex` primitive `matrix.tsx`'s `toneFill`
 * already uses, not a new color system (plan ruling 5: "禁止自造脱离主题的
 * 色系"). Optional per-cell value text (`show_values`), when on, measures
 * its ink against *that cell's own computed fill* via `accessibleInk`
 * (`contrast-system.md`'s self-painted-surface discipline) — three
 * deterministic links, value → color → ink, each independently verifiable.
 *
 * Two geometry precedents this file explicitly reuses rather than
 * reinventing:
 *  - `axis-titles.tsx`'s horizontal pair (y_title "  ↑" then x_title
 *    "  →" on one line, **below** the grid). Reserve a band's height when
 *    either field is present, and subtract it from whichever one of
 *    measure()'s-own-fallback/box.h *actually includes it* — never both
 *    (matrix.tsx's own `render` doc comment has the full incident writeup).
 *    `x_title`/`y_title` here describe the *whole* axis (optional, e.g.
 *    "Quarter") — a distinct field from `x_labels`/`y_labels`, which are the
 *    mandatory per-column/per-row headers themselves.
 *  - `chart.tsx`/`chart-svg.tsx`'s box.h-independent category-label
 *    treatment: `x_labels`/`y_labels` render with `colors.muted` (the same
 *    token `chart-svg.tsx`'s category ticks use) directly on the ambient
 *    page background — pre-verified 4.5:1-safe in every theme
 *    (`MUTED_SURFACE_CLASS`'s "page-bg" class) — while the *cell* value text
 *    is the one surface here that actually needs a fresh `accessibleInk`
 *    measurement, because unlike a category tick it sits on a self-painted,
 *    per-cell computed fill, not the page background.
 *
 * Degenerate domain (`domain.min === domain.max`, either explicit or every
 * value in `values` happening to be equal): `valueT` returns a flat 0.5 for
 * every cell instead of dividing by a zero range — deterministic, no
 * NaN/Infinity, matching the "provably non-degenerate domain floor"
 * discipline `gantt.tsx`'s `axisBounds`/`chart-svg.tsx`'s `renderDumbbell`
 * `vx()` fix already established for this codebase's other value→geometry
 * mappings. Values feed *color* here, never geometry (cell rect extents come
 * from `x_labels.length`/`y_labels.length` alone, schema-capped at 24 columns by 10 rows) —
 * so `MAX_CHART_GEOMETRY_PX`'s own EMU-overflow trap has no analog to guard
 * here; `generate-heatmap-export.test.ts` verifies an extreme-magnitude
 * value (feeding only `valueT`'s ratio, clamped to [0,1]) exports cleanly
 * through the real `generatePptx`, confirming this by construction rather
 * than only asserting it in prose.
 *
 * A run of columns the author marks (`bands`, such as the season a plan is
 * built around) is framed across every row by a dashed outline in the
 * accent, and named under the grid, centred under its run with its icon
 * before the name, before the axis titles. A name wider than the grid is cut
 * and marked.
 *
 * Named steps (`steps`, such as a day's tariff bands) replace the continuous
 * ramp: every cell takes the colour of the step its value falls in, the
 * steps spaced evenly along the same surface-to-primary ramp, each cell
 * prints its step's short name (or its value with `show_values`), and a key
 * under the grid names every step beside its swatch. A grid of many columns
 * may print its labels every few columns (`label_every`, every six of a
 * day's 24 hours); the others still name their columns for `bands`.
 */

const CELL_GAP = 3
const CELL_RADIUS = 3
const NATURAL_CELL_H = 36
/** Row label column (px) when every row name fits in it. */
const ROW_LABEL_W = 96
/** Widest the row label column grows to, as a share of the component width. */
const ROW_LABEL_MAX_SHARE = 0.25
const ROW_LABEL_PAD = 8
const COL_LABEL_H = 26
const COL_LABEL_PAD = 4
const CELL_PAD = 4
const ROW_LABEL_FONT = 16
const ROW_LABEL_MIN_FONT = 16
const COL_LABEL_FONT = 16
const COL_LABEL_MIN_FONT = 16
const VALUE_FONT = 16
const VALUE_MIN_FONT = 16
/** A marked run of columns (`bands`): its dashed frame, and its name in a line under the grid, an icon before it when it has one. */
const BAND = { pad: 4, stroke: 2, dash: "6 5", r: 8, line: 30, size: 16, icon: { size: 18, gap: 6 } } as const
/** The key under a grid of named steps (`steps`): a swatch and the step's name each, in one line. */
const KEY = { line: 30, swatch: 14, gap: 8, itemGap: 24, size: 16 } as const

/**
 * Floor on the ramp's interpolation fraction (`valueT`'s output is always
 * remapped through this before `mixHex`) — without it, the lowest-value
 * cell (`t=0`) would paint exactly `colors.surface`, which in several
 * themes is indistinguishable from (or identical to) the ambient page
 * background a full-body component renders directly onto, silently erasing
 * that cell's own boundary. 0.12 keeps every cell — including the coolest
 * one in an otherwise-uniform grid — at a faint but real, visually distinct
 * tint, the same "never fully transparent into the page" concern
 * `matrix.tsx`'s default `toneFill` (`mixHex(surface, muted, 0.08)`, always
 * at least an 8% tint) already encodes for its own neutral tone.
 */
const RAMP_MIN_T = 0.12

/**
 * Normalize `v` into [0,1] against `domain`. A degenerate domain
 * (`max <= min` — every value equal, or an explicit same-value override)
 * returns a flat 0.5 rather than dividing by zero: every cell in that grid
 * reads as one uniform mid-tone, the honest visual answer for "no variance
 * to show." An in-domain value outside an explicit narrower `domain`
 * override clamps to [0,1] rather than overshooting the ramp.
 */
function valueT(v: number, domain: { min: number; max: number }): number {
  const range = domain.max - domain.min
  if (range <= 0) return 0.5
  return Math.max(0, Math.min(1, (v - domain.min) / range))
}

/** The step a value falls in: the first whose max it does not pass, the last otherwise. */
export function heatmapStepOf(v: number, steps: NonNullable<HeatmapComponent["steps"]>): number {
  const i = steps.findIndex((step) => step.max !== undefined && v <= step.max)
  return i < 0 ? steps.length - 1 : i
}

/** Where step `i` of `n` sits on the ramp: evenly spaced from its light end to its dark one. */
export function heatmapStepT(i: number, n: number): number {
  return n <= 1 ? 0.5 : i / (n - 1)
}

/** Whether column `col`'s label is printed: every one, or every `label_every`th from the first. */
export function heatmapLabelShown(component: Pick<HeatmapComponent, "label_every">, col: number): boolean {
  return component.label_every === undefined || col % component.label_every === 0
}

function resolveDomain(component: HeatmapComponent): { min: number; max: number } {
  if (component.domain) return component.domain
  const flat = component.values.flat()
  return { min: Math.min(...flat), max: Math.max(...flat) }
}

/** Deterministic value → color: single-hue luminance interpolation from
 * `colors.surface` toward `colors.primary`, floored at `RAMP_MIN_T` (see
 * that constant's own doc comment). A value painted on its cell reads on
 * any fill the ramp lands on: `readableOn` gives every ground an ink that
 * clears 4.5:1, a mid-tone one included, so the ramp is never bent to
 * make room for the value's text. */
function cellFill(t: number, ctx: ComponentCtx): string {
  const eased = RAMP_MIN_T + (1 - RAMP_MIN_T) * t
  return mixHex(ctx.colors.surface, ctx.colors.primary, eased)
}

/** The row label column: `ROW_LABEL_W` when every name fits it, otherwise as
 *  wide as the widest name, up to `ROW_LABEL_MAX_SHARE` of `w`. A name past
 *  that is cut by `fitSvgLine` and marked. */
function rowLabelColumnW(labels: readonly string[], w: number): number {
  const widest = Math.max(0, ...labels.map((label) => measureTextUnits(label) * ROW_LABEL_FONT))
  const wanted = Math.ceil(widest) + ROW_LABEL_PAD * 2
  return Math.max(ROW_LABEL_W, Math.min(wanted, Math.floor(w * ROW_LABEL_MAX_SHARE)))
}

/** The columns each marked run covers, as indices into `x_labels`. */
function bandSpans(component: HeatmapComponent): { from: number; to: number; label: string; icon?: string }[] {
  const at = (label: string) => component.x_labels.findIndex((x) => x.trim() === label.trim())
  return (component.bands ?? []).map((band) => ({ from: at(band.from), to: at(band.to), label: band.label.trim(), icon: band.icon }))
}

function gridGeom(component: HeatmapComponent, w: number) {
  const cols = component.x_labels.length
  const rows = component.y_labels.length
  // The band names and the steps' key take a line each under the grid, above the titles.
  const titleH = axisTitlePairHeight(component.x_title, component.y_title) + (component.bands?.length ? BAND.line : 0) + (component.steps ? KEY.line : 0)
  const gridX0 = rowLabelColumnW(component.y_labels, w)
  const gridW = Math.max(1, w - gridX0)
  const cellW = (gridW - CELL_GAP * (cols - 1)) / cols
  const gridH = rows * NATURAL_CELL_H + (rows - 1) * CELL_GAP
  return { cols, rows, gridX0, cellW, gridH, titleH }
}

export const heatmap: SvgComponent<HeatmapComponent> = {
  measure(component, w) {
    const { gridH, titleH } = gridGeom(component, w)
    return titleH + COL_LABEL_H + gridH
  },
  render(component, box, ctx) {
    const { rows, gridX0, cellW, gridH, titleH } = gridGeom(component, box.w)
    const topBandsH = COL_LABEL_H
    const gridTop = box.y + topBandsH
    // box.h-aware uniform stretch (matrix.tsx's own idiom). `box.h`, when a
    // caller sets it, is the TOTAL remaining height from box.y — inclusive
    // of the column-label band above the grid and the title pair now sitting
    // *below* it, same convention measure() returns. Subtract each once.
    // The measure()-mirroring fallback is grid-only, so it already excludes
    // both bands.
    const availGridH = box.h !== undefined ? box.h - topBandsH - titleH : gridH
    const rowH = Math.max(NATURAL_CELL_H, (availGridH - (rows - 1) * CELL_GAP) / rows)
    const actualGridH = rows * rowH + (rows - 1) * CELL_GAP
    const bandH = component.bands?.length ? BAND.line : 0
    const keyH = component.steps ? KEY.line : 0
    const keyTop = gridTop + actualGridH + bandH
    const titleY = keyTop + keyH
    const r = Math.min(4, ctx.shape?.radius ?? CELL_RADIUS)
    const domain = resolveDomain(component)
    const ground = ctx.defaultBg ?? ctx.colors.bg
    const colX = (col: number) => box.x + gridX0 + col * (cellW + CELL_GAP)
    const bands = bandSpans(component).map((band) => {
      const x0 = colX(band.from) - BAND.pad
      const x1 = colX(band.to) + cellW + BAND.pad
      const iconRoom = band.icon ? BAND.icon.size + BAND.icon.gap : 0
      const name = fitSvgLine(band.label, { maxWidth: box.w - iconRoom, fontSize: BAND.size, minFontSize: BAND.size, bold: true, fontFamily: ctx.fonts.body })
      // The name, its icon before it, stands centred under its run, slid
      // inside the grid when the run sits at an edge.
      const half = (iconRoom + measureTextUnits(name.text, { bold: true, fontFamily: ctx.fonts.body }) * name.fontSize) / 2
      const mid = Math.min(box.x + box.w - half, Math.max(box.x + half, (x0 + x1) / 2))
      return { ...band, x0, x1, name, cx: mid + iconRoom / 2, iconX: mid - half }
    })

    // A label printed every few columns has the run up to the next printed one.
    const labelRoom = (component.label_every ?? 1) * (cellW + CELL_GAP) - CELL_GAP
    const colLabelFits = component.x_labels.map((label) =>
      fitSvgLine(label, { maxWidth: labelRoom - COL_LABEL_PAD * 2, fontSize: COL_LABEL_FONT, minFontSize: COL_LABEL_MIN_FONT }),
    )
    const steps = component.steps
    const stepFill = (i: number) => cellFill(heatmapStepT(i, steps!.length), ctx)
    const key = steps
      ? (() => {
          let cursor = box.x + gridX0
          return steps.map((step, i) => {
            const room = Math.max(1, box.x + box.w - cursor - KEY.swatch - KEY.gap)
            const name = fitSvgLine(step.label.trim(), { maxWidth: room, fontSize: KEY.size, minFontSize: KEY.size, fontFamily: ctx.fonts.body })
            const x = cursor
            cursor += KEY.swatch + KEY.gap + measureTextUnits(name.text, { fontFamily: ctx.fonts.body }) * name.fontSize + KEY.itemGap
            return { x, name, fill: stepFill(i) }
          })
        })()
      : []
    const rowLabelFits = component.y_labels.map((label) =>
      fitSvgLine(label, {
        maxWidth: gridX0 - ROW_LABEL_PAD * 2,
        fontSize: ROW_LABEL_FONT,
        minFontSize: ROW_LABEL_MIN_FONT,
      }),
    )

    return (
      <g>
        {colLabelFits.map((fit, col) => {
          if (!heatmapLabelShown(component, col)) return null
          const cx = box.x + gridX0 + col * (cellW + CELL_GAP) + cellW / 2
          return (
            <text
              key={col}
              data-truncated={fit.truncated ? "1" : undefined}
              x={cx}
              y={box.y + COL_LABEL_H - COL_LABEL_PAD}
              textAnchor="middle"
              fontSize={fit.fontSize}
              fill={ctx.colors.muted}
              fontFamily={ctx.fonts.body}
              dominantBaseline="alphabetic"
            >
              {fit.text}
            </text>
          )
        })}
        {rowLabelFits.map((fit, row) => {
          const rowY = gridTop + row * (rowH + CELL_GAP)
          const cy = rowY + rowH / 2
          return (
            <text
              key={row}
              data-truncated={fit.truncated ? "1" : undefined}
              x={box.x + ROW_LABEL_PAD}
              y={cy + Math.round(fit.fontSize * 0.35)}
              textAnchor="start"
              fontSize={fit.fontSize}
              fill={ctx.colors.muted}
              fontFamily={ctx.fonts.body}
              dominantBaseline="alphabetic"
            >
              {fit.text}
            </text>
          )
        })}
        {component.values.map((rowValues, row) =>
          rowValues.map((v, col) => {
            const x = box.x + gridX0 + col * (cellW + CELL_GAP)
            const y = gridTop + row * (rowH + CELL_GAP)
            const step = steps ? heatmapStepOf(v, steps) : -1
            const cellText = component.show_values ? String(v) : steps ? (steps[step]!.short?.trim() ?? "") : ""
            const fill = steps ? stepFill(step) : cellFill(valueT(v, domain), ctx)
            const valueFit = cellText
              ? fitSvgLine(cellText, { maxWidth: cellW - CELL_PAD * 2, fontSize: VALUE_FONT, minFontSize: VALUE_MIN_FONT })
              : null
            return (
              <g key={`${row}-${col}`}>
                <rect
                  data-plot-mark="1"
                  x={x}
                  y={y}
                  width={cellW}
                  height={rowH}
                  rx={r}
                  fill={fill}
                  {...(ctx.colors.cardStroke ? { stroke: ctx.colors.cardStroke, strokeWidth: 1 } : {})}
                />
                {valueFit ? (
                  <text
                    data-truncated={valueFit.truncated ? "1" : undefined}
                    x={x + cellW / 2}
                    y={y + rowH / 2 + Math.round(valueFit.fontSize * 0.35)}
                    textAnchor="middle"
                    fontSize={valueFit.fontSize}
                    fill={accessibleInk(ctx.colors.text, fill, valueFit.fontSize)}
                    fontFamily={ctx.fonts.body}
                    dominantBaseline="alphabetic"
                  >
                    {valueFit.text}
                  </text>
                ) : null}
              </g>
            )
          }),
        )}
        {bands.map((band, k) => (
          <g key={`band-${k}`} data-heatmap-band={band.label}>
            <rect
              x={band.x0}
              y={gridTop - BAND.pad}
              width={band.x1 - band.x0}
              height={actualGridH + BAND.pad * 2}
              rx={BAND.r}
              fill="none"
              stroke={graphicInk(ctx.colors.accent, ground)}
              strokeWidth={BAND.stroke}
              strokeDasharray={BAND.dash}
            />
            {band.icon ? (
              <Icon
                name={band.icon}
                x={band.iconX}
                y={gridTop + actualGridH + BAND.pad + (BAND.line - BAND.icon.size) / 2}
                size={BAND.icon.size}
                color={graphicInk(ctx.colors.accent, ground)}
              />
            ) : null}
            <text
              data-truncated={band.name.truncated ? "1" : undefined}
              x={band.cx}
              y={gridTop + actualGridH + BAND.pad + Math.round(BAND.line / 2 + band.name.fontSize * 0.385)}
              textAnchor="middle"
              fontSize={band.name.fontSize}
              fontWeight="700"
              fill={liftedInk(ctx.colors.accent, ground, band.name.fontSize)}
              fontFamily={ctx.fonts.body}
              dominantBaseline="alphabetic"
            >
              {band.name.text}
            </text>
          </g>
        ))}
        {key.length ? (
          <g data-heatmap-key="">
            {key.map((item, i) => (
              <g key={i}>
                <rect x={item.x} y={keyTop + (KEY.line - KEY.swatch) / 2} width={KEY.swatch} height={KEY.swatch} rx={Math.min(3, r)} fill={item.fill} />
                <text
                  data-truncated={item.name.truncated ? "1" : undefined}
                  x={item.x + KEY.swatch + KEY.gap}
                  y={keyTop + Math.round(KEY.line / 2 + item.name.fontSize * 0.385)}
                  fontSize={item.name.fontSize}
                  fill={ctx.colors.muted}
                  fontFamily={ctx.fonts.body}
                  dominantBaseline="alphabetic"
                >
                  {item.name.text}
                </text>
              </g>
            ))}
          </g>
        ) : null}
        {renderAxisTitlePair({
          x: box.x,
          y: titleY,
          width: box.w,
          xTitle: component.x_title,
          yTitle: component.y_title,
          fill: ctx.colors.muted,
          fontFamily: ctx.fonts.body,
        })}
      </g>
    )
  },
}

export const renderDef: RenderDef<HeatmapComponent> = { type: "heatmap", measure: heatmap.measure, render: heatmap.render }
