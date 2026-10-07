import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { cutRule, inkBox } from "./manuscript"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  SCROLL_META,
  paintScrollLine,
  placeScrollClaim,
  placeScrollSource,
  scrollInks,
  scrollMark,
  scrollMeta,
  scrollText,
  scrollWidth,
} from "./scroll"

type Timeline = Extract<Component, { type: "timeline" }>
type Chart = Extract<Component, { type: "chart" }>

/*
 * handscroll: a long run of years unrolled to scale, ink's 2026-10 board
 * (p06). The claim over the page; under it one axis of years drawn to their
 * true distances: the spans it is divided into as bands along it, each named
 * at its start (the timeline's `periods`), a dot a milestone with its year
 * under it, the milestone's name on a stem over it in the heading face, set
 * in three rows so that no name runs into another and no stem cuts a name,
 * the milestone the author marks (`highlight`) larger in cinnabar. Under the
 * axis, on the same years, the running count as a staircase from a zero
 * line, its steepest step and its end named with the series' name and the
 * count there (「累计 29」).
 *
 * Takes, in the scroll setting: a horizontal `timeline` of two to twelve
 * milestones dated by year, with up to three periods, then optionally a
 * `scatter` chart of one series joined as steps over the same run of years,
 * in order.
 *
 * Declines: a milestone with a description, an icon, a tone, a status, a tag,
 * a source or a lane, a date that is not a year, more than one marked
 * milestone, names that cannot be set in three rows clear of each other and
 * of the stems, a period name that runs into the next, a chart with a title,
 * a tag or values below zero.
 *
 * Reads: the scroll inks (`./scroll.tsx`).
 */

const AXIS = { left: 30, right: 1040, band: { top: 244, h: 10 }, node: { y: 249, r: 5, rLit: 7 }, year: { baseline: 274, size: 11 }, period: { baseline: 240, size: 12, gap: 12 } } as const
const NAMES = { rows: [194, 166, 138], size: 13, sizeLit: 15, stemGap: 8, clear: 10 } as const
const STAIRS = { zero: 504, h: 190, note: { size: 12, dx: 6, dy: 6 }, stroke: 2 } as const

const YEAR = /^\d{4}$/u

function yearOf(value: string | number): number | null {
  const s = String(value).trim()
  return YEAR.test(s) ? Number(s) : null
}

interface Placed {
  x0: number
  x1: number
  y0: number
  y1: number
}

const overlaps = (a: Placed, b: Placed) => a.x0 < b.x1 + NAMES.clear && b.x0 < a.x1 + NAMES.clear && a.y0 < b.y1 && b.y0 < a.y1

export const handscrollComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "scroll") return null
  const [timeline, chart, ...rest] = components
  if (timeline?.type !== "timeline" || rest.length > 0) return null
  if (chart && chart.type !== "chart") return null
  const t = timeline as Timeline
  if (t.layout === "vertical" || t.title?.trim() || t.lanes) return null
  const ms = t.milestones
  if (ms.length < 2 || ms.length > 12) return null
  if (ms.some((m) => m.desc?.trim() || m.icon || m.tone || m.status || m.tag || m.source || m.lane)) return null
  if (ms.filter((m) => m.highlight).length > 1) return null
  const years = ms.map((m) => yearOf(m.date))
  if (years.some((y) => y === null)) return null
  const periods = (t.periods ?? []).map((p) => ({ from: yearOf(p.from), to: yearOf(p.to), label: p.label, basis: p.basis }))
  if (periods.some((p) => p.from === null || p.to === null || p.to! <= p.from! || p.basis)) return null
  const c = chart as Chart | undefined
  if (c && (c.chart_type !== "scatter" || c.series.length !== 1 || !c.series[0]!.steps || c.title?.trim() || c.tag || c.bands || c.reference || c.markers)) return null
  const points = c ? c.series[0]!.data.map((d) => ({ x: yearOf(d.x), y: d.y })) : []
  if (points.some((p) => p.x === null || p.y < 0)) return null
  if (points.some((p, i) => i > 0 && p.x! <= points[i - 1]!.x!)) return null
  const all = [...(years as number[]), ...periods.flatMap((p) => [p.from!, p.to!]), ...points.map((p) => p.x!)]
  const y0 = Math.min(...all)
  const y1 = Math.max(...all)
  if (y1 <= y0) return null
  const left = rect.x + AXIS.left
  const right = rect.x + AXIS.right
  const tx = (year: number) => left + ((year - y0) / (y1 - y0)) * (right - left)
  // The names: three rows over the axis, each name clear of the others and of every stem.
  const candidates = ms.map((m, i) => {
    const x = tx(years[i]!)
    const size = m.highlight ? NAMES.sizeLit : NAMES.size
    const w = scrollWidth(stripEmphasis(m.title).trim(), size, ctx, { serif: true, bold: true })
    const rows = [i % NAMES.rows.length, ...[0, 1, 2].filter((r) => r !== i % NAMES.rows.length)]
    return rows.flatMap((row) =>
      (["middle", "end", "start"] as const).flatMap((anchor) => {
        const baseline = rect.y + NAMES.rows[row]!
        const x0 = anchor === "middle" ? x - w / 2 : anchor === "end" ? x + 6 - w : x - 6
        const box: Placed = { x0, x1: x0 + w, y0: baseline - size, y1: baseline + size * 0.3 }
        if (box.x0 < rect.x || box.x1 > rect.x + rect.w) return []
        return [{ x, anchor, baseline, size, stemTop: baseline + NAMES.stemGap, box }]
      }),
    )
  })
  type Spot = (typeof candidates)[number][number]
  // A name may not touch another, a stem may not cut a name: tried in order, stepping back when a later name has nowhere to go.
  const clash = (a: Spot, b: Spot) =>
    overlaps(a.box, b.box) || (b.x >= a.box.x0 - 4 && b.x <= a.box.x1 + 4 && b.stemTop < a.box.y1) || (a.x >= b.box.x0 - 4 && a.x <= b.box.x1 + 4 && a.stemTop < b.box.y1)
  const placed: Spot[] = []
  let budget = 20000
  const place = (i: number): boolean => {
    if (i === candidates.length) return true
    for (const spot of candidates[i]!) {
      if (--budget < 0) return false
      if (placed.some((other) => clash(other, spot))) continue
      placed.push(spot)
      if (place(i + 1)) return true
      placed.pop()
    }
    return false
  }
  if (!place(0)) return null
  const boxes = placed.map((p) => p.box)
  // Each period's name stands at its band's start, clear of the next one's.
  const periodNames = periods.map((p) => ({ x: tx(p.from!), w: scrollWidth(p.label, AXIS.period.size, ctx) }))
  for (let i = 0; i + 1 < periodNames.length; i++) {
    if (periodNames[i]!.x + periodNames[i]!.w + AXIS.period.gap > periodNames[i + 1]!.x) return null
  }
  if (periodNames.some((p) => p.x + p.w > rect.x + rect.w)) return null
  // The period names sit between the lowest row of names and the band: a stem may pass, a name may not.
  const periodTop = rect.y + AXIS.period.baseline - AXIS.period.size
  if (boxes.some((b) => b.y1 > periodTop - 2)) return null
  const maxY = points.length ? Math.max(...points.map((p) => p.y), 1e-9) : 1
  const cy = (v: number) => rect.y + STAIRS.zero - (v / maxY) * STAIRS.h
  // The staircase names its steepest step and where it ends, each as the series' name and the running count.
  const rises = points.map((p, i) => (i === 0 ? -Infinity : p.y - points[i - 1]!.y))
  const steepest = points.length > 2 ? rises.indexOf(Math.max(...rises)) : -1
  const named = [...new Set([steepest, points.length - 1].filter((i) => i > 0))]
  const seriesName = c ? stripEmphasis(c.series[0]!.name).trim() : ""
  // The staircase's own segments, so a name stands clear of every riser and tread.
  const segments: Placed[] = points.flatMap((p, i) => {
    const x = tx(p.x!)
    const riser = i > 0 ? [{ x0: x, x1: x, y0: Math.min(cy(p.y), cy(points[i - 1]!.y)), y1: Math.max(cy(p.y), cy(points[i - 1]!.y)) }] : []
    const next = points[i + 1]
    const tread = next ? [{ x0: x, x1: tx(next.x!), y0: cy(p.y), y1: cy(p.y) }] : []
    return [...riser, ...tread]
  })
  const notes: { text: string; x: number; anchor: "start" | "end"; baseline: number }[] = []
  for (const i of named) {
    const p = points[i]!
    const text = `${seriesName} ${p.y}`.trim()
    const w = scrollWidth(text, STAIRS.note.size, ctx, { bold: true })
    const x = tx(p.x!)
    const baseline = cy(p.y) - STAIRS.note.dy
    const spot = (["start", "end"] as const)
      .map((anchor) => {
        const x0 = anchor === "start" ? x + STAIRS.note.dx : x - STAIRS.note.dx - w
        return { anchor, x: anchor === "start" ? x + STAIRS.note.dx : x - STAIRS.note.dx, box: { x0: x0 - 3, x1: x0 + w + 3, y0: baseline - STAIRS.note.size - 3, y1: baseline + 3 } }
      })
      .find((s) => s.box.x0 >= rect.x && s.box.x1 <= rect.x + rect.w && !segments.some((g) => g.x0 <= s.box.x1 && g.x1 >= s.box.x0 && g.y0 <= s.box.y1 && g.y1 >= s.box.y0))
    if (!spot) return null
    notes.push({ text, x: spot.x, anchor: spot.anchor, baseline })
  }
  const head = placeScrollClaim(claim, { x: rect.x, w: rect.w })
  if (head === false) return null
  const foot = placeScrollSource(source, { x: rect.x, w: rect.w })
  if (foot === false) return null
  const inks = scrollInks(ctx)
  const ground = inks.ground
  const bandFills = [inks.wash, inks.faint, inks.taupe]
  const steps: string[] = []
  points.forEach((p, i) => {
    if (i > 0) steps.push(`${tx(p.x!)},${cy(points[i - 1]!.y)}`)
    steps.push(`${tx(p.x!)},${cy(p.y)}`)
  })
  const bandY = rect.y + AXIS.band.top
  // A stem stops short of a period's name rather than cutting through it.
  const periodBoxes = periods.map((p) => inkBox(p.label, tx(p.from!), rect.y + AXIS.period.baseline, AXIS.period.size, ctx))
  return (
    <g {...compositionTag("handscroll")}>
      {head}
      <g {...blockTag(ctx, timeline)} data-scroll-scroll="">
        {periods.map((p, i) => (
          <g key={`p${i}`} data-scroll-period={p.label}>
            <rect x={tx(p.from!)} y={bandY} width={tx(p.to!) - tx(p.from!)} height={AXIS.band.h} fill={bandFills[i % bandFills.length]} />
            {paintScrollLine(p.label, { ctx, x: tx(p.from!), baseline: rect.y + AXIS.period.baseline, size: AXIS.period.size, fill: scrollText(inks.muted, ground, AXIS.period.size) })}
          </g>
        ))}
        {ms.map((m, i) => {
          const at = placed[i]!
          const lit = m.highlight === true
          const stemInk = lit ? inks.cinnabar : inks.faint
          return (
            <g key={i} data-scroll-milestone={String(m.date)} {...(lit ? { "data-scroll-lead": "milestone" } : {})}>
              {cutRule("vertical", at.x, at.stemTop, bandY, periodBoxes).map(([a, b], k) => (
                <rect key={k} x={at.x - 0.5} y={a} width={1} height={b - a} fill={stemInk} />
              ))}
              <circle cx={at.x} cy={rect.y + AXIS.node.y} r={lit ? AXIS.node.rLit : AXIS.node.r} fill={lit ? scrollMark(inks.cinnabar, ground) : inks.lead} />
              {paintScrollLine(stripEmphasis(m.title).trim(), { ctx, x: at.anchor === "middle" ? at.x : at.anchor === "end" ? at.x + 6 : at.x - 6, baseline: at.baseline, size: at.size, anchor: at.anchor, serif: true, bold: true, fill: scrollText(lit ? inks.cinnabar : inks.ink, ground, at.size) })}
              {paintScrollLine(String(m.date), { ctx, x: at.x, baseline: rect.y + AXIS.year.baseline, size: AXIS.year.size, anchor: "middle", fill: scrollMeta(inks.muted, ground), attrs: { ...SCROLL_META } })}
            </g>
          )
        })}
      </g>
      {c ? (
        <g {...blockTag(ctx, c)} data-scroll-stairs="">
          <rect x={left} y={rect.y + STAIRS.zero - 0.5} width={right - left} height={1} fill={inks.line} />
          <polyline points={steps.join(" ")} fill="none" stroke={scrollMark(inks.taupe, ground)} strokeWidth={STAIRS.stroke} />
          {notes.map((n, i) => (
            <g key={i} data-scroll-stair-note={n.text}>
              {paintScrollLine(n.text, { ctx, x: n.x, baseline: n.baseline, size: STAIRS.note.size, anchor: n.anchor, bold: true, fill: scrollText(inks.ink2, ground, STAIRS.note.size) })}
            </g>
          ))}
        </g>
      ) : null}
      {foot}
    </g>
  )
}
