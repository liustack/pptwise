import type { Component } from "@/ir"
import { fitSvgLine, layoutSvgText } from "../lib/svg-text-layout"
import { recededMarkFill } from "../render/chart-palette"
import { accessibleInk } from "../render/ink"
import type { RenderDef, SvgComponent } from "./types"

type GanttComponent = Extract<Component, { type: "gantt" }>

/**
 * Shared-axis time-bar chart (structure-components wave task 2, decision 6):
 * a full-body component (`FULL_BODY_TYPES`, `component-traits.ts`) — the sole
 * component `svg-content.tsx` ever hands this to fills the whole content rect,
 * no sibling components on the same slide (`checkFullBodyExclusivity`,
 * `api.ts`).
 *
 * Deliberately does **not** parse date strings — `start`/`end` are plain
 * numbers on a single shared axis whose unit is opaque to this renderer (week
 * index, month index, quarter index, …: whatever the caller's own data
 * means). Real calendar-date parsing is a format-hell surface this component
 * stays out of on purpose (decision 6: "确定性优先，格式地狱不进门") — a
 * caller wanting calendar dates converts them to a numeric axis itself before
 * authoring the IR. Axis bounds are the tightest span that contains every
 * bar: `min(item.start)` / `max(item.end)`, always distinct (schema-enforced
 * `end > start` per item guarantees at least one item's own span is
 * non-zero, so `axisMax > axisMin` holds for any valid input — see
 * `GanttItemSchema`'s `.refine` in `ir/index.ts`).
 *
 * Bar positioning reuses `chart-svg.tsx`'s `renderDumbbell` proportional-
 * position primitive (`vx`, `plotX + (v / max) * plotW`) — adapted to two
 * endpoints per row (`start`→`end`) filled as one solid rect instead of
 * `renderDumbbell`'s two endpoint dots + connecting line, and to a shared
 * `[axisMin, axisMax]` domain instead of that function's own per-render
 * `[0, max]`. Row labels sit left-aligned in a reserved left column
 * (deliberately the opposite anchor from `renderDumbbell`'s own right-
 * aligned label — this file's own decision 6 spec calls for left alignment,
 * a plain reading-order list of row names rather than dumbbell's "value
 * leads into the row" right-ranged layout), `fitSvgLine`-truncated the same
 * way every other component's list text is.
 *
 * Row height uses the same box.h-aware uniform-stretch idiom `matrix.tsx`'s
 * `render` established (no `STRETCH_CAP_RATIO` ceiling — full-body
 * components never go through `growStretchables`' capped path).
 *
 * Bar fill is `colors.accent`, flat and unblended (not a `mixHex` tint) —
 * decision 7's "any mixed/tinted background needs a dedicated needs-fixture
 * probe" mandate names three concrete surfaces (swot's quadrants, bmc's
 * `value_propositions` block, waterfall's three bar colors); this component
 * has no mixed surface to name, so it isn't one of them. No text ever
 * renders on top of the bar fill (row labels sit in the reserved left
 * column, axis tick labels sit below the plot) — every text element renders
 * on the ambient page background instead, the same "page-bg" surface
 * `chart.tsx`/`chart-svg.tsx`'s own category/value labels already use raw
 * `colors.text`/`colors.muted` on (`MUTED_SURFACE_CLASS`'s "page-bg" class,
 * pre-verified to clear 4.5:1 against every theme's real default background
 * — `full-matrix-contrast.test.ts`'s dedicated "colors.muted contrast"
 * sweep). Row labels use `colors.text`, axis tick labels use `colors.muted`
 * (the de-emphasized secondary tier every other page-bg component already
 * uses it for) — both raw, unwrapped, matching that established precedent
 * rather than re-deriving a fresh `accessibleInk` policy this file would be
 * the only place using.
 */

const ROW_H_NATURAL = 52
const ROW_GAP = 10
const LABEL_W = 160
const LABEL_GAP = 14
const PLOT_RIGHT_PAD = 16
const BAR_INSET_Y = 8
const BAR_MIN_W = 4
const ROW_LABEL_FONT = 16
const ROW_LABEL_MIN_FONT = 16
const AXIS_LABEL_FONT = 16
const AXIS_LABEL_MIN_FONT = 16
const AXIS_BAND_H = 30
const AXIS_LINE_GAP = 10

function axisBounds(component: GanttComponent): { min: number; max: number } {
  const min = Math.min(...component.items.map((i) => i.start))
  const max = Math.max(...component.items.map((i) => i.end))
  return { min, max }
}

/** A bar's line of text (`items[].text`): under its label in the label column, up to three lines. */
const ROW_TEXT_FONT = 16
const ROW_TEXT_LINE_H = 20
const ROW_TEXT_MAX_LINES = 3
/** The label's line box when a text line follows it, and the air around the pair. */
const ROW_LABEL_LINE_H = 22
const ROW_PAD_Y = 8

function rowText(item: GanttComponent["items"][number]): ReturnType<typeof layoutSvgText> | null {
  const text = item.text?.trim()
  if (!text) return null
  return layoutSvgText(text, { maxWidth: LABEL_W, fontSize: ROW_TEXT_FONT, minPt: ROW_TEXT_FONT, maxLines: ROW_TEXT_MAX_LINES, lineHeightRatio: ROW_TEXT_LINE_H / ROW_TEXT_FONT })
}

/** The height a row needs: the natural row, or its label and text stacked with air. */
function rowNeed(item: GanttComponent["items"][number]): number {
  const text = rowText(item)
  if (!text) return ROW_H_NATURAL
  return Math.max(ROW_H_NATURAL, ROW_PAD_Y * 2 + ROW_LABEL_LINE_H + text.lines.length * ROW_TEXT_LINE_H)
}

function naturalHeight(component: GanttComponent): number {
  const n = component.items.length
  const hasAxisLabels = (component.axis_labels?.length ?? 0) > 0
  const reservedBottom = hasAxisLabels ? AXIS_BAND_H : 0
  const rows = Math.max(...component.items.map(rowNeed))
  return n * rows + (n - 1) * ROW_GAP + reservedBottom
}

export const gantt: SvgComponent<GanttComponent> = {
  measure(component) {
    return naturalHeight(component)
  },
  render(component, box, ctx) {
    const n = component.items.length
    const hasAxisLabels = (component.axis_labels?.length ?? 0) > 0
    const reservedBottom = hasAxisLabels ? AXIS_BAND_H : 0
    const naturalH = naturalHeight(component)
    // box.h-aware uniform stretch (matrix.tsx's own idiom) — no
    // STRETCH_CAP_RATIO ceiling, this component fills whatever it's handed.
    const totalH = Math.max(naturalH, box.h ?? naturalH)
    const rowsH = totalH - reservedBottom
    const rowH = Math.max(ROW_H_NATURAL, ...component.items.map(rowNeed), (rowsH - (n - 1) * ROW_GAP) / n)
    // A bar the author marks keeps the accent and the others recede, the
    // way a marked waterfall bar does.
    const marked = component.items.some((item) => item.emphasis === true)
    const receded = marked ? recededMarkFill(ctx.colors.muted, ctx.defaultBg ?? ctx.colors.bg) : ""

    const { min: axisMin, max: axisMax } = axisBounds(component)
    const plotX = box.x + LABEL_W + LABEL_GAP
    const plotW = Math.max(1, box.w - LABEL_W - LABEL_GAP - PLOT_RIGHT_PAD)
    const vx = (v: number) => plotX + ((v - axisMin) / (axisMax - axisMin)) * plotW

    const axisLabels = component.axis_labels ?? []
    const axisY = box.y + rowsH + AXIS_LINE_GAP

    return (
      <g>
        {component.items.map((item, i) => {
          const rowY = box.y + i * (rowH + ROW_GAP)
          const cy = rowY + rowH / 2
          const label = fitSvgLine(item.label, {
            maxWidth: LABEL_W,
            fontSize: ROW_LABEL_FONT,
            minFontSize: ROW_LABEL_MIN_FONT,
          })
          const barX = vx(item.start)
          const barW = Math.max(BAR_MIN_W, vx(item.end) - barX)
          const barY = rowY + BAR_INSET_Y
          const barH = Math.max(1, rowH - BAR_INSET_Y * 2)
          const r = Math.min(4, barH / 2)
          const text = rowText(item)
          // With a line of text, the label and its text stack centred on the row.
          const stackTop = text ? cy - (ROW_LABEL_LINE_H + text.lines.length * ROW_TEXT_LINE_H) / 2 : 0
          const labelY = text ? stackTop + ROW_LABEL_LINE_H - 6 : cy + Math.round(label.fontSize * 0.35)
          return (
            <g key={i} data-gantt-marked={item.emphasis ? "1" : undefined}>
              <text
                data-truncated={label.truncated ? "1" : undefined}
                x={box.x}
                y={labelY}
                textAnchor="start"
                fontSize={label.fontSize}
                fontWeight="600"
                fill={ctx.colors.text}
                fontFamily={ctx.fonts.body}
                dominantBaseline="alphabetic"
              >
                {label.text}
              </text>
              {text?.lines.map((line, k) => (
                <text
                  key={`t-${k}`}
                  data-truncated={text.truncated && k === text.lines.length - 1 ? "1" : undefined}
                  x={box.x}
                  y={stackTop + ROW_LABEL_LINE_H + (k + 1) * ROW_TEXT_LINE_H - 5}
                  fontSize={text.fontSize}
                  fill={accessibleInk(ctx.colors.muted, ctx.defaultBg ?? ctx.colors.bg, text.fontSize)}
                  fontFamily={ctx.fonts.body}
                  dominantBaseline="alphabetic"
                >
                  {line}
                </text>
              ))}
              <rect
                x={barX}
                y={barY}
                width={barW}
                height={barH}
                rx={r}
                fill={marked && !item.emphasis ? receded : ctx.colors.accent}
              />
            </g>
          )
        })}
        {hasAxisLabels && axisLabels.length > 0 && (
          <>
            <line
              x1={plotX}
              y1={axisY - AXIS_LINE_GAP / 2}
              x2={plotX + plotW}
              y2={axisY - AXIS_LINE_GAP / 2}
              stroke={ctx.colors.muted}
              strokeOpacity={0.3}
              strokeWidth={1}
            />
            {axisLabels.map((text, i) => {
              const frac = axisLabels.length > 1 ? i / (axisLabels.length - 1) : 0.5
              const cx = plotX + frac * plotW
              const anchor = i === 0 ? "start" : i === axisLabels.length - 1 ? "end" : "middle"
              const maxWidth = plotW / Math.max(axisLabels.length - 1, 1)
              const fitted = fitSvgLine(text, {
                maxWidth,
                fontSize: AXIS_LABEL_FONT,
                minFontSize: AXIS_LABEL_MIN_FONT,
              })
              return (
                <text
                  key={i}
                  data-truncated={fitted.truncated ? "1" : undefined}
                  x={cx}
                  y={axisY + fitted.fontSize}
                  textAnchor={anchor}
                  fontSize={fitted.fontSize}
                  fill={ctx.colors.muted}
                  fontFamily={ctx.fonts.body}
                  dominantBaseline="alphabetic"
                >
                  {fitted.text}
                </text>
              )
            })}
          </>
        )}
      </g>
    )
  },
}

export const renderDef: RenderDef<GanttComponent> = { type: "gantt", measure: gantt.measure, render: gantt.render }
