import type React from "react"
import type { Component } from "@/ir"
import { accessibleInk } from "../../render/ink"
import { fitNoticeClosing, noticeClosingCallout, paintNoticeClosing } from "./closing"
import { gridMark } from "./grid"
import { axisInk } from "./notice"
import { blockTag, compositionTag, type Composition } from "./shared"
import { centredBaseline, fitFixed, paintLines } from "./type"
import { lanesPanel } from "./lanes-panel"
import { lanesSeal } from "./lanes-seal"

type Timeline = Extract<Component, { type: "timeline" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * lanes: a timeline on one axis across the page, its milestones in time order
 * as equal columns, each hanging from the axis on a thin line to a card of
 * date, bold title and description. With two lanes (`milestones[].lane`) the
 * first lane's cards stand above the axis and the second's below it, each
 * lane named at the left. The first lane is the one the timeline's `lanes`
 * names first, or else the one a milestone names first. Without lanes every
 * card stands above. A milestone the author highlights takes a filled node,
 * a line and date in primary, and its title in primary. A closing note may
 * follow on a light panel at the foot. bulletin's 2026-10 regulation page
 * (p11).
 *
 * Takes: `[timeline]` or `[timeline, callout]`, where the timeline runs across
 * the page with two to eight milestones, and the callout carries no icon.
 *
 * Declines: a vertical timeline, a lane name past one line of the 90px name
 * column at 17px, a date past one line of its card, a title past two lines or
 * a description past three at 16px, cards that would cross the axis, and a
 * page taller than the band.
 *
 * Band: the cards share the width right of the lane names, so six need about
 * 1020px. The axis sits 196px into the band, and two lanes with a one-line
 * note need 444px.
 *
 * Reads: `primary` (lane names, highlighted milestones), `text` (the axis,
 * titles, nodes), `muted` (dates, descriptions), `panel` (the note), `bg` or
 * `defaultBg`, `fonts.body`.
 *
 * The grid setting (swiss's 2026-10 board, p12) draws the same lanes with
 * the lane names and the highlighted milestone in the emphasis ink
 * (`./grid.ts`) and a 2px axis 8px lower, where the board puts it.
 */

const MIN_ITEMS = 2
const MAX_ITEMS = 8
/** The axis runs 196px into the band (y392 on the board). */
const AXIS_AT = 196
const AXIS_STROKE = 1.5
/** The grid setting's axis: 2px, 204px into the band (y400 on swiss's board). */
const GRID_AXIS_AT = 204
const GRID_AXIS_STROKE = 2
/** Lane names take a 100px column on the left when the timeline has lanes. */
const NAME_COLUMN = 100
const NAME = { size: 17, box: 24 }
const NODE_R = 7
const NODE_STROKE = 2
/** A node sits 8px into its column, its card 22px in. */
const NODE_INSET = 8
const CARD_INSET = 22
/** A card's text stops this far short of the next column's line. */
const CARD_TRAIL = 24
/** An upper card starts 18px into the band, a lower card 28px under the axis. */
const UPPER_TOP = 18
const LOWER_DROP = 28
/** The line from an upper card starts 4px under its top. A lower card's runs 18px past the deepest lower card. */
const UPPER_LINE_LEAD = 4
const STEM_PAST_CARD = 18
/** The least air between the deepest upper card and the axis, and between the stems and the closing note. */
const AXIS_CLEAR = 40
const CLOSING_AIR = 16
const DATE = { size: 16, box: 22 }
const TITLE = { size: 16, top: 26, box: 24, maxLines: 2 }
const DESC = { size: 16, box: 22, maxLines: 3, gap: 6 }
const MIN_COLUMN = 120

function lanesShape(components: readonly Component[]): { timeline: Timeline; callout?: Callout } | null {
  const [timeline, second, ...rest] = components
  if (timeline?.type !== "timeline" || rest.length > 0) return null
  // No place for a title over the axis: the ordinary timeline prints it.
  if (timeline.layout === "vertical" || timeline.title?.trim()) return null
  if (timeline.milestones.length < MIN_ITEMS || timeline.milestones.length > MAX_ITEMS) return null
  // An icon or a tone has no place on these lanes: the ordinary timeline draws both.
  if (timeline.milestones.some((m) => m.icon !== undefined || m.tone !== undefined)) return null
  if (second === undefined) return { timeline }
  const callout = noticeClosingCallout(second)
  return callout ? { timeline, callout } : null
}

export const lanesComposition: Composition = (props) => {
  if (props.setting === "panel") return lanesPanel(props)
  if (props.setting === "seal") return lanesSeal(props)
  const { components, ctx, rect, setting } = props
  const shape = lanesShape(components)
  if (!shape) return null
  const { colors, fonts } = ctx
  const grid = setting === "grid"
  const mark = grid ? gridMark(ctx) : colors.primary
  const body = fonts.body
  const milestones = shape.timeline.milestones
  const named = [...new Set(milestones.flatMap((m) => (m.lane ? [m.lane.trim()] : [])))]
  // The timeline's own lane order when it gives one, the order lanes are first named otherwise.
  const laneNames = shape.timeline.lanes ? shape.timeline.lanes.map((lane) => lane.trim()).filter((lane) => named.includes(lane)) : named
  if (laneNames.length > 2) return null
  const hasLanes = laneNames.length > 0
  const x0 = rect.x + (hasLanes ? NAME_COLUMN : 0)
  const columnW = (rect.x + rect.w - x0) / milestones.length
  if (columnW < MIN_COLUMN) return null
  const cardW = columnW - CARD_TRAIL

  const names = []
  for (const name of laneNames) {
    const fitted = fitFixed(name, { width: NAME_COLUMN - 10, size: NAME.size, lineHeight: NAME.box, maxLines: 1, fontFamily: body, bold: true })
    if (fitted === null) return null
    names.push(fitted)
  }

  // Each card measured from its own top. Where its top sits waits for the axis.
  const measured = []
  for (const [i, m] of milestones.entries()) {
    const below = hasLanes && m.lane?.trim() === laneNames[1]
    const highlight = m.highlight === true
    const date = fitFixed(m.date, { width: cardW, size: DATE.size, lineHeight: DATE.box, maxLines: 1, fontFamily: body, bold: highlight })
    const title = fitFixed(m.title, { width: cardW, size: TITLE.size, lineHeight: TITLE.box, maxLines: TITLE.maxLines, fontFamily: body, bold: true })
    const desc = m.desc?.trim()
      ? fitFixed(m.desc, { width: cardW, size: DESC.size, lineHeight: DESC.box, maxLines: DESC.maxLines, fontFamily: body, bold: false })
      : undefined
    if (date === null || title === null || desc === null) return null
    const descOffset = TITLE.top + title.lines.length * TITLE.box + DESC.gap
    const depth = desc ? descOffset + desc.lines.length * DESC.box : TITLE.top + title.lines.length * TITLE.box
    measured.push({ m, i, below, highlight, date, title, desc, descOffset, depth, x: x0 + i * columnW })
  }

  const closing = shape.callout ? fitNoticeClosing(shape.callout, rect.w, ctx) : undefined
  if (closing === null) return null
  const floor = closing ? rect.y + rect.h - closing.height - CLOSING_AIR : rect.y + rect.h
  const upperTop = rect.y + UPPER_TOP
  const upperFoot = Math.max(upperTop, ...measured.filter((c) => !c.below).map((c) => upperTop + c.depth))
  const lowerDepth = Math.max(0, ...measured.filter((c) => c.below).map((c) => c.depth))
  // The axis stands where the board puts it, and rises toward the upper cards
  // when the lower lane and the closing note need the room: the lower stems
  // run 18px past the deepest lower card, the way the board's run to y560
  // under cards that end at y542.
  const lowerNeed = (axis: number) => (lowerDepth > 0 ? axis + LOWER_DROP + lowerDepth + STEM_PAST_CARD : axis)
  let axisY = rect.y + (grid ? GRID_AXIS_AT : AXIS_AT)
  if (lowerNeed(axisY) > floor) axisY -= lowerNeed(axisY) - floor
  if (axisY < upperFoot + AXIS_CLEAR) return null
  const stemFoot = lowerNeed(axisY)
  const cards = measured.map((c) => {
    const top = c.below ? axisY + LOWER_DROP : upperTop
    return { ...c, top, descTop: top + c.descOffset, foot: top + c.depth }
  })
  const closingTop = closing ? rect.y + rect.h - closing.height : null

  const bg = ctx.defaultBg ?? colors.bg
  const axisColor = accessibleInk(colors.text, bg, DATE.size)
  const quietLine = axisInk(ctx)
  const nodes: React.ReactNode[] = []
  for (const card of cards) {
    const cx = card.x + NODE_INSET
    const lineColor = card.highlight ? mark : quietLine
    nodes.push(
      card.below ? (
        <line key={`stem-${card.i}`} x1={cx} y1={axisY} x2={cx} y2={stemFoot} stroke={lineColor} strokeWidth={1} />
      ) : (
        <line key={`stem-${card.i}`} x1={cx} y1={card.top + UPPER_LINE_LEAD} x2={cx} y2={axisY} stroke={lineColor} strokeWidth={1} />
      ),
    )
  }
  nodes.push(<line key="axis" x1={x0 - NODE_INSET} y1={axisY} x2={rect.x + rect.w} y2={axisY} stroke={axisColor} strokeWidth={grid ? GRID_AXIS_STROKE : AXIS_STROKE} />)
  for (const card of cards) {
    const cx = card.x + NODE_INSET
    const tx = card.x + CARD_INSET
    const strong = card.highlight
    nodes.push(
      <g key={`card-${card.i}`} data-milestone-highlight={strong ? "1" : undefined}>
        <circle
          cx={cx}
          cy={axisY}
          r={NODE_R}
          fill={strong ? mark : bg}
          stroke={strong ? mark : axisColor}
          strokeWidth={NODE_STROKE}
        />
        {paintLines(card.date, {
          ctx,
          x: tx,
          y: centredBaseline(card.top, DATE.box, DATE.size),
          fill: accessibleInk(strong ? mark : colors.muted, bg, DATE.size),
          fontFamily: body,
          fontWeight: strong ? "700" : "400",
        })}
        {paintLines(card.title, {
          ctx,
          x: tx,
          y: centredBaseline(card.top + TITLE.top, TITLE.box, TITLE.size),
          fill: accessibleInk(strong ? mark : colors.text, bg, TITLE.size),
          fontFamily: body,
          fontWeight: "700",
        })}
        {card.desc &&
          paintLines(card.desc, {
            ctx,
            x: tx,
            y: centredBaseline(card.descTop, DESC.box, DESC.size),
            fill: accessibleInk(colors.muted, bg, DESC.size),
            fontFamily: body,
            fontWeight: "400",
          })}
      </g>,
    )
  }
  const nameInk = accessibleInk(mark, bg, NAME.size)
  return (
    <g {...compositionTag("lanes")}>
      <g {...blockTag(ctx, shape.timeline)}>
        {names.map((name, k) => (
          <g key={`lane-${k}`} data-lane={laneNames[k]}>
            {paintLines(name, {
              ctx,
              x: rect.x,
              y: centredBaseline(k === 0 ? rect.y + UPPER_TOP : axisY + LOWER_DROP, NAME.box, NAME.size),
              fill: nameInk,
              fontFamily: body,
              fontWeight: "700",
            })}
          </g>
        ))}
        {nodes}
      </g>
      {closing && closingTop !== null && paintNoticeClosing(closing, { x: rect.x, y: closingTop, w: rect.w }, ctx)}
    </g>
  )
}
