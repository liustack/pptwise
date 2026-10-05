import type React from "react"
import type { Component } from "@/ir"
import {
  dossierInks,
  dossierMeta,
  dossierSeries,
  dossierText,
  dossierWidth,
  paintDossierLine,
  DOSSIER_SPEC,
} from "./dossier"
import { blockTag, compositionTag, type CompositionProps } from "./shared"

type Timeline = Extract<Component, { type: "timeline" }>
type Milestone = Timeline["milestones"][number]

/*
 * lanes in the dossier setting: two kinds of event on one calendar, clinic's
 * 2026-10 board (the approvals page, p10). The years run along one axis
 * across the page, each milestone at its date's place on it. The first lane
 * (approvals) stands above the axis: a dot on the axis, a thin line in the
 * accent up to the milestone's date, its title bold and its description
 * under it. The second lane (new indications, policies, patents) hangs
 * below: a diamond on the axis, a thin line in the ghost ink down to its
 * date and title. Each lane is named at the left over its side of the axis,
 * the first in the mark and the second in the slate series ink. Labels that
 * would run into their neighbours step to the next tier, two above and four
 * below. The milestone the page is about (`highlight`) is in the mark, its
 * title bolder.
 *
 * Takes, in the dossier setting: one horizontal `timeline` of two lanes and
 * four to fourteen milestones dated "YYYY-MM-DD" or "YYYY-MM", the lower
 * lane's with no description.
 *
 * Declines: a date it cannot read, milestones out of date order within a
 * lane, labels that run out of tiers or past the band, an icon or a tone on
 * a milestone, a title over the timeline.
 *
 * Reads: the dossier inks and series inks (`./dossier.tsx`), the body and
 * heading faces.
 */

const AXIS = { at: 224, inset: 36, w: 2, tick: 6 } as const
const YEAR = { size: 13, gap: 6, drop: 22 } as const
const LANE = { size: 13, upper: 28, lower: 266 } as const
const UPPER = { top: 64, pitch: 62, tiers: 2, line: 50, date: 4, title: 24, desc: 42, sizes: { date: 12, title: 16, desc: 12 } } as const
const LOWER = { top: 298, pitch: 40, tiers: 4, line: 14, title: 20, sizes: { date: 12, title: 14, marked: 15 } } as const
const LABEL = { inset: 8, air: 14 } as const
const DOT = 6
const DIAMOND = 7.07

/** A milestone's date as months since year zero, or `null`. */
function monthsOf(date: string): number | null {
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/u.exec(date.trim())
  if (!m) return null
  const [y, mo, d] = [Number(m[1]), Number(m[2]), m[3] ? Number(m[3]) : 1]
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
  return y * 12 + (mo - 1) + (d - 1) / 30
}

interface Placed {
  m: Milestone
  x: number
  /** How far the label stands from the axis, 0 nearest. */
  depth: number
  w: number
  anchorEnd: boolean
}

/** A label's span along the axis, its own line included. */
function spanOf(p: Pick<Placed, "x" | "w" | "anchorEnd">): [number, number] {
  return p.anchorEnd ? [p.x - LABEL.inset - p.w, p.x] : [p.x, p.x + LABEL.inset + p.w]
}

/** Whether two placed labels can stand together: apart in one tier, and neither's line through the other's label. */
function compatible(a: Placed, b: Placed): boolean {
  const [a0, a1] = spanOf(a)
  const [b0, b1] = spanOf(b)
  if (a.depth === b.depth) return a1 + LABEL.air <= b0 || b1 + LABEL.air <= a0
  const [far, near] = a.depth > b.depth ? [a, b] : [b, a]
  const [n0, n1] = spanOf(near)
  return far.x < n0 - 4 || far.x > n1 + 4
}

/**
 * Places a lane's labels: each at a depth from the axis and to the right of
 * its line or, near the band's right edge, to the left, so that labels in a
 * tier stand apart and no line runs through a label nearer the axis than its
 * own. The placing that keeps the labels nearest the axis, and to the right
 * of their lines, wins. `null` when no placing clears.
 */
function placeLane(items: { m: Milestone; x: number; w: number }[], depths: number, left: number, right: number): Placed[] | null {
  let best: Placed[] | null = null
  let bestCost = Infinity
  const chosen: Placed[] = []
  const visit = (i: number, cost: number) => {
    if (cost >= bestCost) return
    if (i === items.length) {
      best = chosen.slice()
      bestCost = cost
      return
    }
    const it = items[i]!
    for (let depth = 0; depth < depths; depth++) {
      for (const anchorEnd of [false, true]) {
        const p: Placed = { ...it, depth, anchorEnd }
        const [p0, p1] = spanOf(p)
        if (p0 < left || p1 > right) continue
        if (!chosen.every((q) => compatible(p, q))) continue
        chosen.push(p)
        visit(i + 1, cost + depth * (it.m.highlight ? 3 : 1) + (anchorEnd ? 3 : 0))
        chosen.pop()
      }
    }
  }
  visit(0, 0)
  return best
}

export function lanesDossier({ components, ctx, rect }: CompositionProps): React.ReactElement | null {
  const [timeline, ...rest] = components
  if (timeline?.type !== "timeline" || rest.length > 0) return null
  const t = timeline as Timeline
  if (t.layout === "vertical" || t.title?.trim()) return null
  const ms = t.milestones
  if (ms.length < 4 || ms.length > 14 || ms.some((m) => m.icon || m.tone || !m.lane)) return null
  const named = [...new Set(ms.map((m) => m.lane!.trim()))]
  const lanes = t.lanes ? t.lanes.map((l) => l.trim()) : named
  if (lanes.length !== 2 || named.some((n) => !lanes.includes(n))) return null
  const months = ms.map((m) => monthsOf(m.date))
  if (months.some((v) => v === null)) return null
  const first = Math.floor(Math.min(...(months as number[])) / 12)
  const last = Math.floor(Math.max(...(months as number[])) / 12) + 1
  const inks = dossierInks(ctx)
  const meta = dossierMeta(inks.muted, inks.ground)
  const slate = dossierSeries(ctx)[2] ?? inks.ink
  const ax0 = rect.x + AXIS.inset
  const ax1 = rect.x + rect.w - AXIS.inset
  const axisY = rect.y + AXIS.at
  const right = rect.x + rect.w
  const mx = (v: number) => ax0 + ((v - first * 12) / ((last - first) * 12)) * (ax1 - ax0)

  const laneItems = (lane: string, upper: boolean) => {
    const items = ms
      .map((m, i) => ({ m, v: months[i]! }))
      .filter((it) => it.m.lane!.trim() === lane)
    for (let i = 1; i < items.length; i++) if (items[i]!.v < items[i - 1]!.v) return null
    return items.map(({ m, v }) => {
      const titleSize = upper ? UPPER.sizes.title : m.highlight ? LOWER.sizes.marked : LOWER.sizes.title
      const w = Math.max(
        dossierWidth(m.date, upper ? UPPER.sizes.date : LOWER.sizes.date, ctx),
        dossierWidth(m.title, titleSize, ctx, upper || m.highlight === true),
        upper && m.desc?.trim() ? dossierWidth(m.desc, UPPER.sizes.desc, ctx) : 0,
      )
      return { m, x: mx(v), w }
    })
  }
  const upperItems = laneItems(lanes[0]!, true)
  const lowerItems = laneItems(lanes[1]!, false)
  if (!upperItems || !lowerItems || upperItems.length === 0 || lowerItems.length === 0) return null
  if (lowerItems.some((it) => it.m.desc?.trim())) return null
  const upper = placeLane(upperItems, UPPER.tiers, rect.x, right)
  const lower = placeLane(lowerItems, LOWER.tiers, rect.x, right)
  if (!upper || !lower) return null
  const deepest = Math.max(...lower.map((p) => p.depth))
  if (LOWER.top + deepest * LOWER.pitch + LOWER.title + 6 > rect.h) return null

  const years: number[] = []
  for (let y = first; y < last; y++) years.push(y)
  const labelX = (p: Placed) => (p.anchorEnd ? p.x - LABEL.inset : p.x + LABEL.inset)
  const anchor = (p: Placed) => (p.anchorEnd ? ("end" as const) : undefined)

  return (
    <g {...compositionTag("lanes")} {...blockTag(ctx, t)} data-dossier-lanes="">
      {paintDossierLine(lanes[0]!, { ctx, x: rect.x, top: 0, lineHeight: 0, baseline: rect.y + LANE.upper, size: LANE.size, bold: true, fill: dossierText(inks.mark, inks.ground, LANE.size) })}
      {paintDossierLine(lanes[1]!, { ctx, x: rect.x, top: 0, lineHeight: 0, baseline: rect.y + LANE.lower, size: LANE.size, bold: true, fill: dossierText(slate, inks.ground, LANE.size) })}
      {upper.map((p, i) => {
        const ty = rect.y + UPPER.top + (UPPER.tiers - 1 - p.depth) * UPPER.pitch
        const marked = p.m.highlight === true
        return (
          <g key={`u${i}`} data-dossier-milestone={marked ? "marked" : ""}>
            <line x1={p.x} y1={ty + UPPER.line} x2={p.x} y2={axisY - DOT} stroke={inks.accent} strokeWidth={1.2} />
            <circle cx={p.x} cy={axisY} r={DOT} fill={inks.mark} />
            {paintDossierLine(p.m.date, { ctx, x: labelX(p), top: 0, lineHeight: 0, baseline: ty + UPPER.date, size: UPPER.sizes.date, anchor: anchor(p), fill: meta })}
            {paintDossierLine(p.m.title, { ctx, x: labelX(p), top: 0, lineHeight: 0, baseline: ty + UPPER.title, size: UPPER.sizes.title, bold: true, anchor: anchor(p), fill: dossierText(marked ? inks.mark : inks.ink, inks.ground, UPPER.sizes.title) })}
            {p.m.desc?.trim() ? paintDossierLine(p.m.desc.trim(), { ctx, x: labelX(p), top: 0, lineHeight: 0, baseline: ty + UPPER.desc, size: UPPER.sizes.desc, anchor: anchor(p), fill: meta }) : null}
          </g>
        )
      })}
      <rect x={ax0} y={axisY - AXIS.w / 2} width={ax1 - ax0} height={AXIS.w} fill={inks.ink} />
      {years.map((y) => {
        const x = mx(y * 12)
        return (
          <g key={y}>
            <rect x={x - 1} y={axisY - AXIS.tick} width={2} height={AXIS.tick * 2} fill={inks.ink} />
            <text {...DOSSIER_SPEC} x={x + YEAR.gap} y={axisY + YEAR.drop} fontFamily={ctx.fonts.heading} fontSize={YEAR.size} fontWeight="700" fill={dossierText(inks.ink, inks.ground, YEAR.size)} dominantBaseline="alphabetic">
              {String(y)}
            </text>
          </g>
        )
      })}
      {lower.map((p, i) => {
        const ty = rect.y + LOWER.top + p.depth * LOWER.pitch
        const marked = p.m.highlight === true
        const ink = marked ? inks.mark : slate
        return (
          <g key={`l${i}`} data-dossier-milestone={marked ? "marked" : ""}>
            <line x1={p.x} y1={axisY + DOT} x2={p.x} y2={ty - LOWER.line} stroke={inks.ghost} strokeWidth={1.2} />
            <path d={`M ${p.x} ${axisY - DIAMOND} L ${p.x + DIAMOND} ${axisY} L ${p.x} ${axisY + DIAMOND} L ${p.x - DIAMOND} ${axisY} Z`} fill={ink} />
            {paintDossierLine(p.m.date, { ctx, x: labelX(p), top: 0, lineHeight: 0, baseline: ty, size: LOWER.sizes.date, anchor: anchor(p), fill: meta })}
            {paintDossierLine(p.m.title, {
              ctx,
              x: labelX(p),
              top: 0,
              lineHeight: 0,
              baseline: ty + LOWER.title,
              size: marked ? LOWER.sizes.marked : LOWER.sizes.title,
              bold: marked,
              anchor: anchor(p),
              fill: dossierText(marked ? inks.mark : inks.ink, inks.ground, LOWER.sizes.title),
            })}
          </g>
        )
      })}
    </g>
  )
}

