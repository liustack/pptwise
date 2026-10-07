import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import type React from "react"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  decimalsOf,
  invitationInks,
  invitationMark,
  invitationMeta,
  invitationText,
  invitationValue,
  invitationWidth,
  paintInvitationLine,
  INVITATION_META,
  placeInvitationClaim,
  placeInvitationSource,
  wholeCanvas,
} from "./invitation"

type Chart = Extract<Component, { type: "chart" }>

/*
 * descent: a value falling from its high, drawn as one gold line, luxe's
 * 2026-10 board (p04, beside the figure `solo` sets). The line leaves its
 * first point (a solid gold dot) and comes to rest at its last (a hollow
 * one), easing out of the one and into the other. The first value in the
 * serif lifted toward the ivory with what it is and when over it, the last
 * in ivory with what it is and when under it. A level the line is read
 * against (a second series that holds one value throughout, such as last
 * year's average) is a dashed line in the dimmer gold across the plot, its
 * name and value at its right end, and the line's own name small at the
 * left end under it.
 *
 * Takes, in the invitation setting, in a band another composition hands on
 * or on a page of its own under the centred claim: one `line` chart
 * whose first series runs over two to eight categories, its two ends
 * optionally noted (`note`), and optionally a second series that holds one
 * value at every category.
 *
 * Declines: notes on a middle point, a second series that moves, any other
 * chart mark, a band shorter than 300px or narrower than 400px, a value or
 * its note wider than its room.
 *
 * Reads: the invitation inks (`./invitation.tsx`), the heading and body
 * faces, the deck's figures (`ctx.figures`).
 */

/** The plot runs from the band's top down 330px; the line ends 20px short of the band's right. */
const PLOT = { h: 330, endInset: 20, padLow: 0.2, padHigh: 0.1 } as const
const DOT = { r: 6, ring: 2 } as const
const LINE = { w: 2, ease: [0.392, 0.431] } as const
const VALUE = { size: 22, dy: 18 } as const
const CAPTION = { size: 12, above: 44, below: 28 } as const
const LEVEL = { size: 11, dy: 18, dash: "3 5" } as const

/** The smooth path through `points`, easing out of each and into the next as the board's curve does. */
function easedPath(points: readonly { x: number; y: number }[]): string {
  const r = (v: number) => Math.round(v * 10) / 10
  let d = `M ${r(points[0]!.x)} ${r(points[0]!.y)}`
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!
    const b = points[i]!
    const span = b.x - a.x
    d += ` C ${r(a.x + span * LINE.ease[0]!)} ${r(a.y)}, ${r(b.x - span * LINE.ease[1]!)} ${r(b.y)}, ${r(b.x)} ${r(b.y)}`
  }
  return d
}

/**
 * On a page of its own the drawing takes the band under the centred claim,
 * from y230, 800px wide in the middle of the card, the source at the foot.
 */
const PAGE_BAND = { x: 240, y: 230, w: 800, h: 350 } as const

export const descentComposition: Composition = (props) => {
  const { rect, setting, claim, source } = props
  if (setting !== "invitation") return null
  if (!claim) {
    const drawn = drawDescent(props)
    return drawn ? <g {...compositionTag("descent")}>{drawn}</g> : null
  }
  if (!wholeCanvas(rect)) return null
  const drawn = drawDescent({ ...props, rect: { x: rect.x + PAGE_BAND.x, y: rect.y + PAGE_BAND.y, w: PAGE_BAND.w, h: PAGE_BAND.h } })
  if (!drawn) return null
  const head = placeInvitationClaim(claim, { x: rect.x + 120, w: 1040 })
  if (head === false) return null
  const foot = placeInvitationSource(source, { x: rect.x + 64, w: 1100 })
  if (foot === false) return null
  return (
    <g {...compositionTag("descent")}>
      {head}
      {drawn}
      {foot}
    </g>
  )
}

/** The drawing alone, in the band it is handed. */
function drawDescent({ components, ctx, rect }: Parameters<Composition>[0]): React.ReactElement | null {
  const [chart, ...rest] = components
  if (chart?.type !== "chart" || rest.length > 0) return null
  const c = chart as Chart
  if (c.chart_type !== "line" || c.title || c.tag || c.markers || c.gaps || c.bands || c.series.length < 1 || c.series.length > 2) return null
  if (rect.w < 400 || rect.h < 300) return null
  const [run, levelSeries] = c.series
  if (!run || run.data.length < 2 || run.data.length > 8 || run.tone || run.emphasis) return null
  if (run.data.some((d, i) => d.note && i !== 0 && i !== run.data.length - 1)) return null
  if (c.series.some((s) => s.data.some((d) => d.icon || d.status || d.emphasis || d.upper !== undefined))) return null
  const level = levelSeries ? levelSeries.data[0]?.y : undefined
  if (levelSeries && (levelSeries.data.length === 0 || levelSeries.data.some((d) => d.y !== level || d.note) || levelSeries.tone || levelSeries.emphasis)) return null
  const inks = invitationInks(ctx)
  const ground = inks.ground
  const values = run.data.map((d) => d.y)
  const all = level !== undefined ? [...values, level] : values
  const lo0 = Math.min(...all)
  const hi0 = Math.max(...all)
  const span = hi0 - lo0 || Math.abs(hi0) || 1
  const lo = lo0 - span * PLOT.padLow
  const hi = hi0 + span * PLOT.padHigh
  const yOf = (v: number) => rect.y + PLOT.h - ((v - lo) / (hi - lo)) * PLOT.h
  const x1 = rect.x
  const x2 = rect.x + rect.w - PLOT.endInset
  const points = run.data.map((d, i) => ({ x: x1 + ((x2 - x1) * i) / (run.data.length - 1), y: yOf(d.y), d }))
  const decimals = decimalsOf(values)
  const first = points[0]!
  const last = points[points.length - 1]!
  const caption = (d: (typeof run.data)[number]) => (d.note ? `${stripEmphasis(d.note).trim()} · ${String(d.x)}` : String(d.x))
  const firstValue = invitationValue(first.d.y, ctx, decimals)
  const lastValue = invitationValue(last.d.y, ctx, decimals)
  const half = (x2 - x1) / 2
  for (const [text, size, opts] of [
    [firstValue, VALUE.size, { serif: true, bold: true }],
    [caption(first.d), CAPTION.size, {}],
    [lastValue, VALUE.size, { serif: true, bold: true }],
    [caption(last.d), CAPTION.size, {}],
  ] as const) {
    if (invitationWidth(text, size, ctx, opts) > half) return null
  }
  if (first.y - CAPTION.above - CAPTION.size < rect.y - 40) return null
  const levelY = level !== undefined ? yOf(level) : null
  const levelLabel = levelSeries && level !== undefined ? `${stripEmphasis(levelSeries.name).trim()} ${invitationValue(level, ctx, decimalsOf([level]))}` : ""
  if (levelLabel && invitationWidth(levelLabel, LEVEL.size, ctx) > rect.w / 2) return null
  // The run's own name stands small at the foot of the plot's left, where the level's name stands at its right.
  const runName = stripEmphasis(run.name).trim()
  if (invitationWidth(runName, LEVEL.size, ctx) > rect.w / 2 - 16) return null
  const gold = invitationMark(inks.gold, ground)
  const dim = invitationMeta(inks.dim, ground)
  const muted = invitationText(inks.muted, ground, CAPTION.size)
  return (
    <g data-invitation-drawing="descent">
      <g {...blockTag(ctx, chart)} data-invitation-plot="">
        {levelY !== null ? (
          <g data-invitation-level="">
            <line x1={x1} y1={levelY} x2={x2 + PLOT.endInset} y2={levelY} stroke={invitationMark(inks.dim, ground)} strokeWidth={1} strokeDasharray={LEVEL.dash} />
            {paintInvitationLine(levelLabel, { ctx, x: x2 + PLOT.endInset, baseline: Math.round(levelY + LEVEL.dy), size: LEVEL.size, anchor: "end", fill: dim, attrs: { ...INVITATION_META } })}
          </g>
        ) : null}
        <path data-invitation-run="" d={easedPath(points)} fill="none" stroke={gold} strokeWidth={LINE.w} />
        {points.slice(1, -1).map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill={gold} />
        ))}
        <circle cx={first.x} cy={first.y} r={DOT.r} fill={gold} />
        <circle cx={last.x} cy={last.y} r={DOT.r} fill={ground} stroke={gold} strokeWidth={DOT.ring} />
        {paintInvitationLine(firstValue, { ctx, x: first.x, baseline: Math.round(first.y - VALUE.dy), size: VALUE.size, serif: true, bold: true, fill: invitationText(inks.goldLight, ground, VALUE.size) })}
        {paintInvitationLine(caption(first.d), { ctx, x: first.x, baseline: Math.round(first.y - CAPTION.above), size: CAPTION.size, fill: muted })}
        {paintInvitationLine(lastValue, { ctx, x: last.x, baseline: Math.round(last.y - VALUE.dy), size: VALUE.size, serif: true, bold: true, anchor: "end", fill: invitationText(inks.ivory, ground, VALUE.size) })}
        {paintInvitationLine(caption(last.d), { ctx, x: last.x, baseline: Math.round(last.y + CAPTION.below), size: CAPTION.size, anchor: "end", fill: muted })}
        {paintInvitationLine(runName, { ctx, x: x1, baseline: Math.round((levelY ?? rect.y + PLOT.h) + LEVEL.dy), size: LEVEL.size, fill: dim, attrs: { ...INVITATION_META, "data-invitation-run-name": "" } })}
      </g>
    </g>
  )
}
