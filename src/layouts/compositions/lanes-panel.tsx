import type React from "react"
import type { Component } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import type { EmphasisHeadingLayout } from "../../render/emphasis"
import { mostlyChinese } from "../../lib/text-script"
import { PANEL, fitNotePanel, fitPanelBar, paintNotePanel, paintPanel, panelInks, panelOutlineInk, panelSeriesInk, panelText, type NotePanel, type Place } from "./panel"
import { blockTag, compositionTag, type CompositionProps } from "./shared"
import { centredBaseline, fitFixed, paintLines } from "./type"

type Timeline = Extract<Component, { type: "timeline" }>
type Milestone = Timeline["milestones"][number]

/*
 * lanes in the panel setting: a timeline in a panel, the milestones in equal
 * columns along one axis. The timeline's `title` names the panel. On one
 * track each column carries its date over the axis at 15px, its node on the
 * axis, and its title at 18px bold and its description at 15px under it. The
 * milestone the author highlighted (`highlight`) has a larger node filled in
 * the mark (ledger's amber), and its date and title in the mark too; the
 * others are hollow rings. A note may follow in a panel of its own, and a
 * note written 「表外安排：…」 names its panel. ledger's 2026-10 funding page
 * (p08).
 *
 * A timeline on two lanes (`lanes`, `milestones[].lane`) keeps one time
 * order: the first lane's milestones stand over the axis, title, description
 * and date reading down to it, and the second lane's under it, date first.
 * The lanes' names stand on the right of the title bar, the one over the
 * axis first, so a date is only ever a date.
 *
 * Takes: `[timeline]` or `[timeline, callout]`, a horizontal timeline of two
 * to eight milestones.
 *
 * Declines: a date past one line of its column, a title past two lines at
 * 18px, a description past two lines at 15px, or a panel too short for its
 * columns.
 */

const MIN_ITEMS = 2
const MAX_ITEMS = 8
const PAD = 24
/** One track: the date's box 62px into the panel, the axis at 148, the title's box at 178 and the description's at 240. */
const ONE = { date: 62, axis: 148, title: 178, desc: 240 } as const
const DATE = { size: 15, box: 22 } as const
const TITLE = { size: 18, lineHeight: 26, maxLines: 2 } as const
const DESC = { size: 15, lineHeight: 22, maxLines: 2 } as const
/** A column's text stops this far short of the next column. */
const COLUMN_SHORT = 14
const NODE = { x: 8, r: 6, mark: 8, stroke: 2 } as const
const AXIS_W = 2
const NOTE_GAP = PANEL.gap
/** Air kept under a column's last line. */
const FOOT = 16

interface Column {
  m: Milestone
  date: EmphasisHeadingLayout
  title: EmphasisHeadingLayout
  desc: EmphasisHeadingLayout | null
  /** 0 above the axis, 1 under it. */
  lane: 0 | 1
}

function laneNames(timeline: Timeline): [string, string] | null {
  if (timeline.lanes) return [timeline.lanes[0]!, timeline.lanes[1]!]
  const seen: string[] = []
  for (const m of timeline.milestones) if (m.lane?.trim() && !seen.includes(m.lane.trim())) seen.push(m.lane.trim())
  return seen.length === 2 ? [seen[0]!, seen[1]!] : null
}

function fitColumn(m: Milestone, width: number, ctx: ComponentCtx, lane: 0 | 1): Column | null {
  const body = ctx.fonts.body
  const date = fitFixed(m.date, { width, size: DATE.size, lineHeight: DATE.box, maxLines: 1, fontFamily: body, bold: m.highlight === true })
  const title = fitFixed(m.title, { width, size: TITLE.size, lineHeight: TITLE.lineHeight, maxLines: TITLE.maxLines, fontFamily: body, bold: true })
  const desc = m.desc?.trim() ? fitFixed(m.desc, { width, size: DESC.size, lineHeight: DESC.lineHeight, maxLines: DESC.maxLines, fontFamily: body, bold: false }) : null
  if (!date || !title || (m.desc?.trim() && !desc)) return null
  return { m, date, title, desc, lane }
}

export function lanesPanel({ components, ctx, rect }: CompositionProps): React.ReactElement | null {
  const [timeline, second, ...rest] = components
  if (timeline?.type !== "timeline" || rest.length > 0 || timeline.layout === "vertical") return null
  if (timeline.milestones.length < MIN_ITEMS || timeline.milestones.length > MAX_ITEMS) return null
  // An icon or a tone has no place in this panel: the ordinary timeline draws both.
  if (timeline.milestones.some((m) => m.icon !== undefined || m.tone !== undefined)) return null
  if (second !== undefined && second.type !== "callout") return null
  const note: NotePanel | null = second?.type === "callout" ? fitNotePanel(second, rect.w, ctx) : null
  if (second && !note) return null

  const lanes = laneNames(timeline)
  const laned = timeline.milestones.some((m) => m.lane?.trim())
  if (laned && !lanes) return null
  const chinese = ctx.figures?.chinese ?? mostlyChinese(timeline.milestones.map((m) => m.title))
  const meta = lanes ? (chinese ? `上：${lanes[0]} · 下：${lanes[1]}` : `Above: ${lanes[0]} · Below: ${lanes[1]}`) : undefined
  const bar = fitPanelBar(timeline.title, meta, rect.w, ctx)
  if (!bar) return null

  const panelH = rect.h - (note ? note.height + NOTE_GAP : 0)
  const n = timeline.milestones.length
  const pitch = (rect.w - PAD * 2) / n
  const width = pitch - COLUMN_SHORT
  const columns: Column[] = []
  for (const m of timeline.milestones) {
    const lane: 0 | 1 = lanes && m.lane?.trim() === lanes[1] ? 1 : 0
    const column = fitColumn(m, width, ctx, lane)
    if (!column) return null
    columns.push(column)
  }
  const place: Place = { x: rect.x, y: rect.y, w: rect.w, h: panelH }
  const drawn = lanes ? twoLanes(columns, place, pitch, ctx) : oneTrack(columns, place, pitch, ctx)
  if (!drawn) return null
  return (
    <g {...compositionTag("lanes")}>
      <g {...blockTag(ctx, timeline)} data-chart-panel="lanes">
        {paintPanel(place, ctx, { bar })}
        {drawn}
      </g>
      {note && paintNotePanel(note, { x: rect.x, y: rect.y + panelH + NOTE_GAP, w: rect.w }, ctx)}
    </g>
  )
}

function columnInks(ctx: ComponentCtx, m: Milestone) {
  const inks = panelInks(ctx)
  const marked = m.highlight === true
  return {
    date: panelText(marked ? inks.mark : ctx.colors.muted, inks.surface, DATE.size),
    title: panelText(marked ? inks.mark : ctx.colors.text, inks.surface, TITLE.size),
    desc: panelText(ctx.colors.muted, inks.surface, DESC.size),
    node: marked
      ? { r: NODE.mark, fill: inks.mark, stroke: inks.mark }
      : { r: NODE.r, fill: inks.surface, stroke: panelOutlineInk(ctx) },
  }
}

function paint(layout: EmphasisHeadingLayout, ctx: ComponentCtx, x: number, top: number, lineHeight: number, size: number, fill: string, bold: boolean) {
  return paintLines(layout, {
    ctx,
    x,
    y: centredBaseline(top, lineHeight, size),
    fill,
    fontFamily: ctx.fonts.body,
    fontWeight: bold ? "700" : "400",
    bg: ctx.colors.surface,
    ...(size < 16 ? { attrs: { "data-font-floor-exempt": "panel-spec" } } : {}),
  })
}

function oneTrack(columns: readonly Column[], place: Place, pitch: number, ctx: ComponentCtx): React.ReactNode {
  const deepest = Math.max(...columns.map((c) => ONE.desc + (c.desc?.lines.length ?? 0) * DESC.lineHeight))
  if (deepest + FOOT > place.h) return null
  const axisY = place.y + ONE.axis
  const left = place.x + PAD
  return (
    <>
      <rect x={left} y={axisY - AXIS_W / 2} width={place.w - PAD * 2} height={AXIS_W} fill={panelSeriesInk(ctx, 0)} />
      {columns.map((c, i) => {
        const x = left + i * pitch
        const inks = columnInks(ctx, c.m)
        const marked = c.m.highlight === true
        return (
          <g key={i} data-milestone={i + 1}>
            <circle cx={x + NODE.x} cy={axisY} r={inks.node.r} fill={inks.node.fill} stroke={inks.node.stroke} strokeWidth={NODE.stroke} />
            {paint(c.date, ctx, x, place.y + ONE.date, DATE.box, DATE.size, inks.date, marked)}
            {paint(c.title, ctx, x, place.y + ONE.title, TITLE.lineHeight, TITLE.size, inks.title, true)}
            {c.desc && paint(c.desc, ctx, x, place.y + ONE.desc, DESC.lineHeight, DESC.size, inks.desc, false)}
          </g>
        )
      })}
    </>
  )
}

/** Two lanes on one axis: the first lane over it reading down to it, the second under it. */
function twoLanes(columns: readonly Column[], place: Place, pitch: number, ctx: ComponentCtx): React.ReactNode {
  const top = place.y + PANEL.barH + 16
  const bottom = place.y + place.h - FOOT
  const axisY = Math.round((top + bottom) / 2)
  const stack = (c: Column) => c.title.lines.length * TITLE.lineHeight + (c.desc?.lines.length ?? 0) * DESC.lineHeight + DATE.box + 12
  if (columns.some((c) => (c.lane === 0 ? axisY - stack(c) - 8 < top : axisY + 16 + stack(c) > bottom))) return null
  const left = place.x + PAD
  return (
    <>
      <rect x={left} y={axisY - AXIS_W / 2} width={place.w - PAD * 2} height={AXIS_W} fill={panelSeriesInk(ctx, 0)} />
      {columns.map((c, i) => {
        const x = left + i * pitch
        const inks = columnInks(ctx, c.m)
        const marked = c.m.highlight === true
        const titleH = c.title.lines.length * TITLE.lineHeight
        const descH = (c.desc?.lines.length ?? 0) * DESC.lineHeight
        // Over the axis: title, description, then the date nearest the axis.
        // Under it: the date first, then title and description.
        const dateTop = c.lane === 0 ? axisY - 16 - DATE.box : axisY + 14
        const titleTop = c.lane === 0 ? dateTop - 6 - descH - titleH : dateTop + DATE.box + 6
        const descTop = titleTop + titleH
        return (
          <g key={i} data-milestone={i + 1} data-lane={c.lane + 1}>
            <circle cx={x + NODE.x} cy={axisY} r={inks.node.r} fill={inks.node.fill} stroke={inks.node.stroke} strokeWidth={NODE.stroke} />
            {paint(c.date, ctx, x, dateTop, DATE.box, DATE.size, inks.date, marked)}
            {paint(c.title, ctx, x, titleTop, TITLE.lineHeight, TITLE.size, inks.title, true)}
            {c.desc && paint(c.desc, ctx, x, descTop, DESC.lineHeight, DESC.size, inks.desc, false)}
          </g>
        )
      })}
    </>
  )
}
