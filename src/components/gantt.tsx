import type { Component } from "@/ir"
import { fitSvgLine, layoutSvgText } from "../lib/svg-text-layout"
import { recededMarkFill } from "../render/chart-palette"
import { Icon } from "../render/icons"
import { measureTextUnits } from "../lib/svg-text-layout"
import { accessibleInk, blendOver, graphicInk, liftedInk } from "../render/ink"
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
 * The author may give the axis its own stretch (`range`), for a plan whose
 * bars cover only parts of it. A row's `icon` stands before its label and a
 * row's `period` (「第 16 至 18 个月」) is a muted line under the label, above
 * its text.
 *
 * A span of the axis the author marks (`bands`, such as the season a plan
 * is built around) is tinted behind the bars in the accent and named under
 * the axis, centred under its span, in a line of its own.
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
/** A marked span (`bands`): the accent at this strength behind the bars, and its name in a line of its own under the axis. */
const SPAN = { tint: 0.12, line: 28, size: 16 } as const
/** A marked moment (`milestones`): a line down the rows, a diamond under them and its label beside it, in a line of its own under the axis. */
const MOMENT = { line: 32, diamond: 9, gap: 8, size: 16, stroke: 1.6 } as const

/** The axis: the author's `range` when there is one, otherwise the bars' own stretch. */
function axisBounds(component: GanttComponent): { min: number; max: number } {
  if (component.range) return { min: component.range.from, max: component.range.to }
  const min = Math.min(...component.items.map((i) => i.start))
  const max = Math.max(...component.items.map((i) => i.end))
  return { min, max }
}

/** A row's icon (`items[].icon`), before its label. */
const ROW_ICON = { size: 16, gap: 6 } as const
/** A row's period (`items[].period`): a muted line under its label. */
const ROW_PERIOD_FONT = 16
const ROW_PERIOD_LINE_H = 20

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

function rowPeriod(item: GanttComponent["items"][number]): ReturnType<typeof fitSvgLine> | null {
  const period = item.period?.trim()
  if (!period) return null
  return fitSvgLine(period, { maxWidth: LABEL_W, fontSize: ROW_PERIOD_FONT, minFontSize: ROW_PERIOD_FONT })
}

/** The height of a row's label, period and text stacked, without the air around them. */
function stackHeight(item: GanttComponent["items"][number]): number {
  const text = rowText(item)
  return ROW_LABEL_LINE_H + (rowPeriod(item) ? ROW_PERIOD_LINE_H : 0) + (text ? text.lines.length * ROW_TEXT_LINE_H : 0)
}

/** The height a row needs: the natural row, or its label, period and text stacked with air. */
function rowNeed(item: GanttComponent["items"][number]): number {
  if (!rowText(item) && !rowPeriod(item)) return ROW_H_NATURAL
  return Math.max(ROW_H_NATURAL, ROW_PAD_Y * 2 + stackHeight(item))
}

/** The band under the rows: the axis labels' line and the spans' names' line, when there are any. */
function bottomBand(component: GanttComponent): number {
  return ((component.axis_labels?.length ?? 0) > 0 ? AXIS_BAND_H : 0) + (component.bands?.length ? SPAN.line : 0) + (component.milestones?.length ? MOMENT.line : 0)
}

function naturalHeight(component: GanttComponent): number {
  const n = component.items.length
  const reservedBottom = bottomBand(component)
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
    const reservedBottom = bottomBand(component)
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
    const ground = ctx.defaultBg ?? ctx.colors.bg
    const spanTop = box.y + rowsH + (hasAxisLabels ? AXIS_BAND_H : 0)
    const spans = (component.bands ?? []).map((band) => {
      const x0 = vx(band.from)
      const x1 = vx(band.to)
      const name = fitSvgLine(band.label.trim(), { maxWidth: box.w, fontSize: SPAN.size, minFontSize: SPAN.size, bold: true, fontFamily: ctx.fonts.body })
      const half = (measureTextUnits(name.text, { bold: true, fontFamily: ctx.fonts.body }) * name.fontSize) / 2
      const cx = Math.min(box.x + box.w - half, Math.max(box.x + half, (x0 + x1) / 2))
      return { x0, x1, name, cx, label: band.label.trim() }
    })

    const momentTop = spanTop + (spans.length > 0 ? SPAN.line : 0)
    const moments = (component.milestones ?? []).map((m) => {
      const x = vx(m.at)
      const room = box.x + box.w - (x + MOMENT.diamond + MOMENT.gap)
      const leftRoom = x - MOMENT.diamond - MOMENT.gap - box.x
      const name = fitSvgLine(m.label.trim(), { maxWidth: Math.max(room, leftRoom), fontSize: MOMENT.size, minFontSize: MOMENT.size, bold: true, fontFamily: ctx.fonts.body })
      const nameW = measureTextUnits(name.text, { bold: true, fontFamily: ctx.fonts.body }) * name.fontSize
      // The label stands at the diamond's right, or at its left when the right has no room.
      const right = nameW <= room
      return { x, name, right, label: m.label.trim() }
    })
    const momentInk = graphicInk(ctx.colors.accent, ground)

    return (
      <g>
        {spans.map((span, k) => (
          <g key={`span-${k}`} data-gantt-band={span.label}>
            <rect x={span.x0} y={box.y} width={Math.max(1, span.x1 - span.x0)} height={rowsH} fill={blendOver(ctx.colors.accent, ground, SPAN.tint)} />
            <text
              data-truncated={span.name.truncated ? "1" : undefined}
              x={span.cx}
              y={spanTop + Math.round(SPAN.line / 2 + span.name.fontSize * 0.385)}
              textAnchor="middle"
              fontSize={span.name.fontSize}
              fontWeight="700"
              fill={liftedInk(ctx.colors.accent, ground, span.name.fontSize)}
              fontFamily={ctx.fonts.body}
              dominantBaseline="alphabetic"
            >
              {span.name.text}
            </text>
          </g>
        ))}
        {component.items.map((item, i) => {
          const rowY = box.y + i * (rowH + ROW_GAP)
          const cy = rowY + rowH / 2
          const iconRoom = item.icon ? ROW_ICON.size + ROW_ICON.gap : 0
          const label = fitSvgLine(item.label, {
            maxWidth: LABEL_W - iconRoom,
            fontSize: ROW_LABEL_FONT,
            minFontSize: ROW_LABEL_MIN_FONT,
          })
          const period = rowPeriod(item)
          const barX = vx(item.start)
          const barW = Math.max(BAR_MIN_W, vx(item.end) - barX)
          const barY = rowY + BAR_INSET_Y
          const barH = Math.max(1, rowH - BAR_INSET_Y * 2)
          const r = Math.min(4, barH / 2)
          const text = rowText(item)
          // With a period or a line of text, the label and what follows it stack centred on the row.
          const stacked = text !== null || period !== null
          const stackTop = stacked ? cy - stackHeight(item) / 2 : 0
          const labelY = stacked ? stackTop + ROW_LABEL_LINE_H - 6 : cy + Math.round(label.fontSize * 0.35)
          const textTop = stackTop + ROW_LABEL_LINE_H + (period ? ROW_PERIOD_LINE_H : 0)
          const ground = ctx.defaultBg ?? ctx.colors.bg
          return (
            <g key={i} data-gantt-marked={item.emphasis ? "1" : undefined}>
              {item.icon ? (
                <g data-row-icon={item.icon}>
                  <Icon name={item.icon} x={box.x} y={labelY - ROW_ICON.size + 3} size={ROW_ICON.size} color={graphicInk(ctx.colors.primary, ground)} />
                </g>
              ) : null}
              <text
                data-truncated={label.truncated ? "1" : undefined}
                x={box.x + iconRoom}
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
              {period ? (
                <text
                  data-gantt-period=""
                  data-truncated={period.truncated ? "1" : undefined}
                  x={box.x}
                  y={stackTop + ROW_LABEL_LINE_H + ROW_PERIOD_LINE_H - 5}
                  fontSize={period.fontSize}
                  fill={accessibleInk(ctx.colors.muted, ground, period.fontSize)}
                  fontFamily={ctx.fonts.body}
                  dominantBaseline="alphabetic"
                >
                  {period.text}
                </text>
              ) : null}
              {text?.lines.map((line, k) => (
                <text
                  key={`t-${k}`}
                  data-truncated={text.truncated && k === text.lines.length - 1 ? "1" : undefined}
                  x={box.x}
                  y={textTop + (k + 1) * ROW_TEXT_LINE_H - 5}
                  fontSize={text.fontSize}
                  fill={accessibleInk(ctx.colors.muted, ctx.defaultBg ?? ctx.colors.bg, text.fontSize)}
                  fontFamily={ctx.fonts.body}
                  dominantBaseline="alphabetic"
                >
                  {line}
                </text>
              ))}
              {item.basis ? (
                // A stretch not settled: a dashed outline of the bar's colour.
                <rect
                  data-gantt-unsettled={item.basis}
                  x={barX + 0.8}
                  y={barY + 0.8}
                  width={Math.max(1, barW - 1.6)}
                  height={Math.max(1, barH - 1.6)}
                  rx={r}
                  fill="none"
                  stroke={graphicInk(marked && !item.emphasis ? receded : ctx.colors.accent, ground)}
                  strokeWidth={1.6}
                  strokeDasharray="5 3"
                />
              ) : (
                <rect
                  x={barX}
                  y={barY}
                  width={barW}
                  height={barH}
                  rx={r}
                  fill={marked && !item.emphasis ? receded : ctx.colors.accent}
                />
              )}
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
              // A blank label leaves its tick unnamed and lends its room to the named label beside it.
              let span = 1
              while (i + span < axisLabels.length - 1 && !axisLabels[i + span]!.trim()) span++
              const maxWidth = (plotW / Math.max(axisLabels.length - 1, 1)) * span
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
        {moments.map((moment, k) => {
          const cy = momentTop + MOMENT.line / 2
          const d = MOMENT.diamond
          return (
            <g key={`moment-${k}`} data-gantt-moment={moment.label}>
              {/* The line runs down the rows and stops over the axis, so it never crosses a label. */}
              <line x1={moment.x} y1={box.y} x2={moment.x} y2={box.y + rowsH} stroke={momentInk} strokeWidth={MOMENT.stroke} />
              <path d={`M ${moment.x} ${cy - d} L ${moment.x + d} ${cy} L ${moment.x} ${cy + d} L ${moment.x - d} ${cy} Z`} fill={momentInk} />
              <text
                data-truncated={moment.name.truncated ? "1" : undefined}
                x={moment.right ? moment.x + d + MOMENT.gap : moment.x - d - MOMENT.gap}
                y={cy + Math.round(moment.name.fontSize * 0.35)}
                textAnchor={moment.right ? "start" : "end"}
                fontSize={moment.name.fontSize}
                fontWeight="700"
                fill={ctx.colors.text}
                fontFamily={ctx.fonts.body}
                dominantBaseline="alphabetic"
              >
                {moment.name.text}
              </text>
            </g>
          )
        })}
      </g>
    )
  },
}

export const renderDef: RenderDef<GanttComponent> = { type: "gantt", measure: gantt.measure, render: gantt.render }
