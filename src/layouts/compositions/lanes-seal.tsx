import type React from "react"
import type { Component } from "@/ir"
import { fitSealNote, paintSealNote } from "./note-seal"
import { sealInks, sealSeriesInk, sealSmall, sealText } from "./seal"
import { blockTag, compositionTag, type CompositionProps } from "./shared"
import { centredBaseline, fitFixed, paintLines } from "./type"

type Timeline = Extract<Component, { type: "timeline" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * lanes in the seal setting: vermilion's 2026-10 policy page (p11). One axis
 * across the page, 2px in the ink, milestones in time order as equal
 * columns. With two lanes (`milestones[].lane`) the first lane's cards stand
 * above the axis and the second's below it, each lane named in the mark on
 * the left. Each card hangs from the axis on a thin stem: its date at 15px,
 * its title bold at 17px and its description at 15px. The milestone the
 * author highlights takes a filled node and its stem, date and title in the
 * mark. A note may close the page in a panel. The seal setting draws it where
 * bulletin's notice board drew the same shape, at the seal board's sizes.
 *
 * Takes: `[timeline]` or `[timeline, callout]`, a horizontal timeline of two
 * to eight milestones with or without lanes and no `title`.
 *
 * Declines: a lane name past two lines of its column, a date past one line,
 * a title past two lines or a description past three of its card, and a page
 * taller than the band.
 */

const MIN_ITEMS = 2
const MAX_ITEMS = 8
const NAME_COLUMN = 116
const NAME = { size: 17, box: 24, maxLines: 2 }
const AXIS_AT = 206
const AXIS_STROKE = 2
const NODE = { r: 7, stroke: 2, inset: 8 }
const CARD = { inset: 22, trail: 18 }
const UPPER_TOP = 20
const LOWER_DROP = 28
const DATE = { size: 15, box: 22 }
const TITLE = { size: 17, box: 25, top: 26, maxLines: 2 }
const DESC = { size: 15, box: 22, top: 80, maxLines: 3 }
const STEM_PAST_CARD = 18
const NOTE_AIR = 16
const MIN_COLUMN = 120

function lanesShape(components: readonly Component[]): { timeline: Timeline; callout?: Callout } | null {
  const [timeline, second, ...rest] = components
  if (timeline?.type !== "timeline" || rest.length > 0) return null
  if (timeline.layout === "vertical" || timeline.title?.trim()) return null
  if (timeline.milestones.length < MIN_ITEMS || timeline.milestones.length > MAX_ITEMS) return null
  // An icon or a tone has no place on these lanes: the ordinary timeline draws both.
  if (timeline.milestones.some((m) => m.icon !== undefined || m.tone !== undefined)) return null
  if (second === undefined) return { timeline }
  if (second.type !== "callout" || second.icon !== undefined) return null
  return { timeline, callout: second }
}

export function lanesSeal({ components, ctx, rect }: CompositionProps): React.ReactElement | null {
  const shape = lanesShape(components)
  if (!shape) return null
  const body = ctx.fonts.body
  const milestones = shape.timeline.milestones
  const named = [...new Set(milestones.flatMap((m) => (m.lane ? [m.lane.trim()] : [])))]
  const laneNames = shape.timeline.lanes ? shape.timeline.lanes.map((lane) => lane.trim()).filter((lane) => named.includes(lane)) : named
  if (laneNames.length > 2) return null
  const hasLanes = laneNames.length > 0
  const x0 = rect.x + (hasLanes ? NAME_COLUMN : 0)
  const columnW = (rect.x + rect.w - x0) / milestones.length
  if (columnW < MIN_COLUMN) return null
  const cardW = columnW - CARD.inset - CARD.trail + 12

  const names = []
  for (const name of laneNames) {
    const fitted = fitFixed(name, { width: NAME_COLUMN - 8, size: NAME.size, lineHeight: NAME.box, maxLines: NAME.maxLines, fontFamily: body, bold: true })
    if (fitted === null) return null
    names.push(fitted)
  }
  const cards = []
  for (const [i, m] of milestones.entries()) {
    const below = hasLanes && m.lane?.trim() === laneNames[1]
    const strong = m.highlight === true
    const date = fitFixed(m.date, { width: cardW, size: DATE.size, lineHeight: DATE.box, maxLines: 1, fontFamily: body, bold: strong })
    const title = fitFixed(m.title, { width: cardW, size: TITLE.size, lineHeight: TITLE.box, maxLines: TITLE.maxLines, fontFamily: body, bold: true })
    const desc = m.desc?.trim()
      ? fitFixed(m.desc, { width: cardW - 4, size: DESC.size, lineHeight: DESC.box, maxLines: DESC.maxLines, fontFamily: body, bold: false })
      : undefined
    if (date === null || title === null || desc === null) return null
    const depth = desc ? DESC.top + desc.lines.length * DESC.box : TITLE.top + title.lines.length * TITLE.box
    cards.push({ m, i, below, strong, date, title, desc, depth, x: x0 + i * columnW })
  }
  const note = shape.callout ? fitSealNote(shape.callout, rect.w, ctx) : null
  if (shape.callout && !note) return null
  const axisY = rect.y + AXIS_AT
  const upperTop = rect.y + UPPER_TOP
  const upperFoot = Math.max(upperTop, ...cards.filter((c) => !c.below).map((c) => upperTop + c.depth))
  if (upperFoot > axisY - 12) return null
  const lowerDepth = Math.max(0, ...cards.filter((c) => c.below).map((c) => c.depth))
  const stemFoot = lowerDepth > 0 ? axisY + LOWER_DROP + lowerDepth + STEM_PAST_CARD : axisY
  const floor = note ? rect.y + rect.h - note.height - NOTE_AIR : rect.y + rect.h
  if (stemFoot > floor) return null

  const inks = sealInks(ctx)
  const quietStem = sealSeriesInk(ctx, 0)
  const axisInk = sealText(inks.ink, inks.ground, DATE.size)
  return (
    <g {...compositionTag("lanes")}>
      <g {...blockTag(ctx, shape.timeline)}>
        {names.map((name, k) => (
          <g key={`lane-${k}`} data-lane={laneNames[k]}>
            {paintLines(name, {
              ctx,
              x: rect.x,
              y: centredBaseline(k === 0 ? upperTop : axisY + LOWER_DROP, NAME.box, NAME.size),
              fill: sealText(inks.mark, inks.ground, NAME.size),
              fontFamily: body,
              fontWeight: "700",
            })}
          </g>
        ))}
        {cards.map((c) => {
          const cx = c.x + NODE.inset
          const top = c.below ? axisY + LOWER_DROP : upperTop
          return c.below ? (
            <line key={`stem-${c.i}`} x1={cx} y1={axisY} x2={cx} y2={stemFoot} stroke={c.strong ? inks.mark : quietStem} strokeWidth={1} />
          ) : (
            <line key={`stem-${c.i}`} x1={cx} y1={top + 4} x2={cx} y2={axisY} stroke={c.strong ? inks.mark : quietStem} strokeWidth={1} />
          )
        })}
        <line x1={x0 - NODE.inset} y1={axisY} x2={rect.x + rect.w} y2={axisY} stroke={axisInk} strokeWidth={AXIS_STROKE} />
        {cards.map((c) => {
          const cx = c.x + NODE.inset
          const tx = c.x + CARD.inset
          const top = c.below ? axisY + LOWER_DROP : upperTop
          return (
            <g key={`card-${c.i}`} data-milestone-highlight={c.strong ? "1" : undefined}>
              <circle cx={cx} cy={axisY} r={NODE.r} fill={c.strong ? inks.mark : inks.ground} stroke={c.strong ? inks.mark : axisInk} strokeWidth={NODE.stroke} />
              {paintLines(c.date, {
                ctx,
                x: tx,
                y: centredBaseline(top, DATE.box, DATE.size),
                fill: sealText(c.strong ? inks.mark : inks.muted, inks.ground, DATE.size),
                fontFamily: body,
                fontWeight: c.strong ? "700" : "400",
                attrs: sealSmall(DATE.size),
              })}
              {paintLines(c.title, {
                ctx,
                x: tx,
                y: centredBaseline(top + TITLE.top, TITLE.box, TITLE.size),
                fill: sealText(c.strong ? inks.mark : inks.ink, inks.ground, TITLE.size),
                fontFamily: body,
                fontWeight: "700",
              })}
              {c.desc &&
                paintLines(c.desc, {
                  ctx,
                  x: tx,
                  y: centredBaseline(top + DESC.top, DESC.box, DESC.size),
                  fill: sealText(inks.muted, inks.ground, DESC.size),
                  fontFamily: body,
                  fontWeight: "400",
                  attrs: sealSmall(DESC.size),
                })}
            </g>
          )
        })}
      </g>
      {note && paintSealNote(note, { x: rect.x, y: rect.y + rect.h - note.height, w: rect.w }, ctx)}
    </g>
  )
}
