import type React from "react"
import type { Component } from "@/ir"
import { computeBars, truncatedFloor } from "../../components/waterfall"
import { mostlyChinese } from "../../lib/text-script"
import { accessibleInk, readableOn } from "../../render/ink"
import { gridData, gridMark, gridQuiet } from "./grid"
import { axisInk, quietMarkFill } from "./notice"
import {
  PLOT_TYPE,
  PlotText,
  MetaLine,
  anyMeet,
  decimalsOf,
  insideRect,
  plotNumber,
  textBox,
  textWidth,
  type InkBox,
} from "./plot"
import { blockTag, compositionTag, type Composition } from "./shared"

type Waterfall = Extract<Component, { type: "waterfall" }>

/*
 * bridge: a waterfall set by hand with no value axis. Totals stand in a mid
 * grey, the steps between them in a light one, and the steps the author
 * marked in the primary colour with their value reversed out of the bar.
 * Dashed lines carry each level to the next bar, every bar prints its value,
 * and the unit sits over the plot on the left. A bridge whose levels all sit
 * far above zero starts its axis at a floor, the same floor the waterfall
 * component picks (`truncatedFloor`): the totals then carry cut marks at
 * their foot and the note over the plot says where the axis starts.
 * bulletin's 2026-10 mix page (p04).
 *
 * Takes: one `waterfall`, alone, of two to six bars once its closing total
 * is counted, every level zero or more, with no `emphasis_label`.
 *
 * Declines: a level below zero, a label line over the marked bars (the
 * waterfall component draws that bracket), a category name past one line of
 * its column at 17px, and values that cannot be set clear of each other.
 *
 * Band: the board's plot is 680px by 444px, and the bars take 290px.
 *
 * Reads: `primary` (marked steps), `text` (totals' values, category names),
 * `muted` (other values, the note), `bg` or `defaultBg` (the cut marks),
 * `fonts.body`.
 *
 * The grid setting (swiss's 2026-10 board, p04) draws the same bridge across
 * the page with black totals: the marked steps in the emphasis ink with
 * their values bold over them, the others in the light grey with muted
 * values, and the totals in the text ink with their values bold over them.
 * It takes the `emphasis_label` the notice setting leaves to the waterfall
 * component, as a bracket over the marked run with the label set bold in
 * the emphasis ink, and keeps the room over the bars that bracket needs.
 */

const MAX_BARS = 6
const NOTE_BASELINE = 24
const BASE_FROM_FOOT = 50
const CATEGORY_DROP = 30
const BAR_W = 108
const BAR_SHARE = 0.64
const PLOT_H = 290
const VALUE_LIFT = 12
const VALUE_DROP = 26
/** A marked step's value inside its bar, when the bar is at least this tall. */
const INSIDE_SIZE = 24
const INSIDE_MIN_H = 40
const CUT_OFFSETS = [22, 12] as const
const CUT_RISE = 10
const CUT_STROKE = 3
const CONNECTOR_DASH = "3 3"

/** The grid setting's geometry: wider bars, a lower baseline, and the bracket's room over the marked run. */
const GRID = { barW: 120, baseFromFoot: 40, plotTop: 52, bracketPlotTop: 84, totalSize: 22, bracketRise: 30, bracketLeg: 14, bracketLabelLift: 10 }

function bridgeShape(components: readonly Component[], grid: boolean): Waterfall | null {
  if (components.length !== 1) return null
  const only = components[0]!
  if (only.type !== "waterfall" || (only.emphasis_label !== undefined && !grid)) return null
  return only
}

/** The note over the plot: the unit, and where a cut axis starts. */
export function bridgeNote(unit: string | undefined, floor: number | null, chinese: boolean): string {
  const u = unit?.trim()
  if (floor === null) return u ?? ""
  const from = plotNumber(floor, chinese)
  if (chinese) return u ? `${u}，纵轴从 ${from} 起` : `纵轴从 ${from} 起`
  return u ? `${u}, axis from ${from}` : `Axis from ${from}`
}

export const bridgeComposition: Composition = ({ components, ctx, rect, setting }) => {
  const grid = setting === "grid"
  const waterfall = bridgeShape(components, grid)
  if (!waterfall) return null
  const bars = computeBars(waterfall.items)
  if (bars.length < 2 || bars.length > MAX_BARS) return null
  if (bars.some((bar) => bar.start < 0 || bar.end < 0)) return null
  const { colors, fonts } = ctx
  const body = fonts.body
  const bg = ctx.defaultBg ?? colors.bg
  const chinese = mostlyChinese(waterfall.items.map((item) => item.label))
  const floor = truncatedFloor(bars) ?? 0
  const top = Math.max(...bars.flatMap((bar) => [bar.start, bar.end]))
  if (!(top > floor)) return null
  const decimals = Math.min(4, Math.max(0, ...waterfall.items.map((item) => decimalsOf(item.value))))
  const marked = bars.some((bar) => bar.emphasis)

  const label = grid ? waterfall.emphasis_label?.trim() : undefined
  const base = rect.y + rect.h - (grid ? GRID.baseFromFoot : BASE_FROM_FOOT)
  const categoryY = base + CATEGORY_DROP
  const slot = rect.w / bars.length
  const barW = Math.min(grid ? GRID.barW : BAR_W, slot * BAR_SHARE)
  const plotH = grid ? base - (rect.y + (label ? GRID.bracketPlotTop : GRID.plotTop)) : PLOT_H
  const y = (v: number) => base - ((v - floor) / (top - floor)) * plotH
  const note = bridgeNote(waterfall.unit, floor > 0 ? floor : null, chinese)
  const noteY = rect.y + NOTE_BASELINE
  const boxes: InkBox[] = []
  if (note) boxes.push(textBox(rect.x, noteY, textWidth(note, PLOT_TYPE.meta, body), PLOT_TYPE.meta))

  const total = axisInk(ctx)
  const quiet = quietMarkFill(ctx)
  const nodes: React.ReactNode[] = []
  let prevRight: number | null = null
  bars.forEach((bar, i) => {
    const cx = rect.x + slot * (i + 0.5)
    const x = cx - barW / 2
    const hi = Math.max(bar.start, bar.end)
    const lo = bar.kind === "total" ? floor : Math.min(bar.start, bar.end)
    const yTop = y(hi)
    const h = Math.max(2, y(lo) - yTop)
    if (prevRight !== null) {
      const level = y(bar.kind === "total" ? bar.end : bar.start)
      nodes.push(
        <line key={`link-${i}`} x1={prevRight} y1={level} x2={x} y2={level} stroke={total} strokeWidth={1} strokeDasharray={CONNECTOR_DASH} />,
      )
    }
    prevRight = x + barW
    const fill = grid
      ? bar.kind === "total" ? gridData(ctx) : bar.emphasis ? gridMark(ctx) : gridQuiet(ctx)
      : bar.kind === "total" ? total : bar.emphasis || !marked ? colors.primary : quiet
    nodes.push(<rect key={`bar-${i}`} data-plot-mark="1" x={x} y={yTop} width={barW} height={h} fill={fill} />)
    if (bar.kind === "total" && floor > 0) {
      for (const offset of CUT_OFFSETS) {
        nodes.push(
          <path
            key={`cut-${i}-${offset}`}
            data-axis-break="1"
            d={`M ${x - 2} ${base - offset} l ${barW + 4} ${-CUT_RISE}`}
            stroke={bg}
            strokeWidth={CUT_STROKE}
            fill="none"
          />,
        )
      }
    }
    const text = plotNumber(bar.displayValue, chinese, decimals, bar.kind !== "total")
    if (bar.kind === "total") {
      const size = grid ? GRID.totalSize : PLOT_TYPE.lead
      const ink = accessibleInk(colors.text, bg, size)
      boxes.push(textBox(cx, yTop - VALUE_LIFT, textWidth(text, size, body, true), size, "middle"))
      nodes.push(<PlotText key={`value-${i}`} text={text} x={cx} y={yTop - VALUE_LIFT} size={size} fill={ink} ctx={ctx} bold />)
    } else if (grid) {
      // Over a rise, under a fall: the marked step bold in the emphasis ink.
      const above = bar.kind === "rise"
      const vy = above ? yTop - VALUE_LIFT : yTop + h + VALUE_DROP
      const strong = bar.emphasis
      const ink = accessibleInk(strong ? gridMark(ctx) : colors.muted, bg, PLOT_TYPE.lead)
      boxes.push(textBox(cx, vy, textWidth(text, PLOT_TYPE.lead, body, strong), PLOT_TYPE.lead, "middle"))
      nodes.push(<PlotText key={`value-${i}`} text={text} x={cx} y={vy} size={PLOT_TYPE.lead} fill={ink} ctx={ctx} bold={strong} />)
    } else if (bar.emphasis && h >= INSIDE_MIN_H && textWidth(text, INSIDE_SIZE, body, true) <= barW - 8) {
      const ink = readableOn(colors.primary)
      nodes.push(<PlotText key={`value-${i}`} text={text} x={cx} y={yTop + h / 2 + Math.round(INSIDE_SIZE * 0.35)} size={INSIDE_SIZE} fill={ink} ctx={ctx} bold />)
    } else {
      const above = bar.kind === "rise"
      const vy = above ? yTop - VALUE_LIFT : yTop + h + VALUE_DROP
      const strong = bar.emphasis
      const ink = accessibleInk(strong ? colors.primary : colors.muted, bg, PLOT_TYPE.value)
      boxes.push(textBox(cx, vy, textWidth(text, PLOT_TYPE.value, body, strong), PLOT_TYPE.value, "middle"))
      nodes.push(<PlotText key={`value-${i}`} text={text} x={cx} y={vy} size={PLOT_TYPE.value} fill={ink} ctx={ctx} bold={strong} />)
    }
    const nameW = textWidth(bar.label, PLOT_TYPE.category, body)
    boxes.push(textBox(cx, categoryY, nameW, PLOT_TYPE.category, "middle"))
  })
  // The grid bracket over the marked run: from the first marked bar's left
  // edge to the last one's right, 30px over the highest level the run
  // reaches, the label bold over it.
  if (label) {
    const run = bars.flatMap((bar, i) => (bar.emphasis && bar.kind !== "total" ? [i] : []))
    if (run.length === 0) return null
    const left = rect.x + slot * (run[0]! + 0.5) - barW / 2
    const right = rect.x + slot * (run[run.length - 1]! + 0.5) + barW / 2
    const peak = Math.max(...run.flatMap((i) => [bars[i]!.start, bars[i]!.end]))
    const crossY = y(peak) - GRID.bracketRise
    const labelY = crossY - GRID.bracketLabelLift
    const ink = accessibleInk(gridMark(ctx), bg, PLOT_TYPE.lead)
    boxes.push(textBox((left + right) / 2, labelY, textWidth(label, PLOT_TYPE.lead, body, true), PLOT_TYPE.lead, "middle"))
    nodes.push(
      <g key="bracket" data-plot-change="">
        <path
          d={`M ${left} ${crossY + GRID.bracketLeg} V ${crossY} H ${right} V ${crossY + GRID.bracketLeg}`}
          fill="none"
          stroke={gridMark(ctx)}
          strokeWidth={2}
        />
        <PlotText text={label} x={(left + right) / 2} y={labelY} size={PLOT_TYPE.lead} fill={ink} ctx={ctx} bold />
      </g>,
    )
  }
  if (bars.some((bar) => textWidth(bar.label, PLOT_TYPE.category, body) > slot - 8)) return null
  if (anyMeet(boxes, 4) || !insideRect(boxes, rect)) return null

  const categoryInk = accessibleInk(colors.text, bg, PLOT_TYPE.category)
  return (
    <g {...compositionTag("bridge")} {...blockTag(ctx, waterfall)}>
      {note && <MetaLine text={note} x={rect.x} y={noteY} ctx={ctx} />}
      <line x1={rect.x} y1={base} x2={rect.x + rect.w} y2={base} stroke={total} strokeWidth={1} />
      {nodes}
      {bars.map((bar, i) => (
        <PlotText
          key={`category-${i}`}
          text={bar.label}
          x={rect.x + slot * (i + 0.5)}
          y={categoryY}
          size={PLOT_TYPE.category}
          fill={categoryInk}
          ctx={ctx}
        />
      ))}
    </g>
  )
}
