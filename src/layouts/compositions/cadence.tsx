import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  Caption,
  cutRule,
  fitBroken,
  fitManuscript,
  glossBreak,
  manuscriptInks,
  manuscriptText,
  manuscriptWidth,
  paintManuscript,
  paintManuscriptIcon,
  paintManuscriptLine,
  splitLabel,
  type InkBox,
} from "./manuscript"

type Timeline = Extract<Component, { type: "timeline" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * cadence: rounds of two surveys against the day a reform began, thesis's
 * 2026-10 board (p13). The figure's number and title, then a year axis with
 * a hairline every two years, a lane a survey with its name in the heading
 * serif and what it covers under it, a dot a round on its lane, filled for
 * a round released and hollow for one carried out and not yet released (a
 * milestone with `status: "pending"`), named under it when its title says
 * more than its year. The span after the reform (the timeline's one
 * `periods` entry) sits on gold's pale ground behind the lanes with a gold
 * line where it starts and its name beside the line, on the span, on a
 * second line when one would run past the span's end. Under the figure the
 * gate the plan turns on, on pale emerald with its icon and title.
 *
 * Takes, in the manuscript setting: a horizontal `timeline` with a title,
 * two `lanes` written "name：what it covers", milestones dated by year, one
 * `periods` entry, no tag, source, icon, tone or highlight on a milestone,
 * then a `callout` with a title and an icon and no tag.
 *
 * Declines: a lane's name or a round's name past its room, the span's name
 * past two lines of the span, the gate's words past two lines.
 *
 * Reads: the manuscript inks (`./manuscript.tsx`).
 */

const AXIS = { dx: 156, right: 1116, top: 46, bottom: 262, label: 284, size: 12 } as const
const LANES = [102, 202] as const
const LANE = { name: { dy: -26, size: 18, h: 26, w: 150 }, what: { dy: 2, size: 12, h: 20 }, line: 1.4, dot: 8, round: { dy: 30, size: 11 } } as const
const SPAN = { top: 38, bottom: 270, line: { top: 32, bottom: 272, stroke: 2.2 }, label: { dx: 8, pad: 6, dy: 54, size: 13, lineHeight: 17 } } as const
const GATE = { dy: 312, h: 104, icon: { dx: 24, dy: 24, size: 26 }, title: { dx: 68, dy: 16, size: 20, h: 34 }, text: { dx: 68, dy: 54, size: 15, h: 22, w: 1060, maxLines: 2 } } as const

const year = (s: string) => (/^\d{4}$/u.test(s.trim()) ? Number(s.trim()) : null)

export const cadenceComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "manuscript") return null
  const [timeline, gate, ...rest] = components
  if (timeline?.type !== "timeline" || gate?.type !== "callout" || rest.length > 0) return null
  const t = timeline as Timeline
  const g = gate as Callout
  if (!t.title?.trim() || t.layout === "vertical" || !t.lanes || t.periods?.length !== 1) return null
  if (!g.title?.trim() || !g.icon || g.tag) return null
  if (t.milestones.some((m) => m.tag || m.source || m.icon || m.tone || m.highlight || m.desc || year(m.date) === null)) return null
  const period = t.periods[0]!
  const from = year(period.from)
  const to = year(period.to)
  if (from === null || to === null || period.basis) return null
  const label = ctx.exhibitLabels?.get(t)
  if (!label) return null
  if (rect.w < AXIS.right + 4 || rect.h < GATE.dy + GATE.h) return null
  const inks = manuscriptInks(ctx)
  const ground = inks.ground
  const years = t.milestones.map((m) => year(m.date)!)
  const y0 = Math.min(...years, from)
  const y1 = Math.max(...years, to)
  if (!(y1 > y0)) return null
  const X0 = rect.x + AXIS.dx
  const X1 = rect.x + AXIS.right
  const tx = (y: number) => X0 + ((y - y0) / (y1 - y0)) * (X1 - X0)
  const every = y1 - y0 > 10 ? 2 : 1
  const grid: number[] = []
  for (let y = y0; y <= y1; y += every) grid.push(y)
  const lanes = t.lanes.map((lane, i) => {
    const split = splitLabel(lane)
    const name = fitManuscript(split ? split.name : lane, { width: LANE.name.w, size: LANE.name.size, lineHeight: LANE.name.h, maxLines: 1, serif: true, bold: true }, ctx)
    const what = split ? fitManuscript(split.rest, { width: LANE.name.w, size: LANE.what.size, lineHeight: LANE.what.h, maxLines: 1 }, ctx) : null
    return { lane: lane.trim(), split, name, what, y: rect.y + LANES[i]! }
  })
  if (lanes.some((l) => !l.name || (l.split && !l.what))) return null
  // The span's name stays on the span: broken at a word space onto a second line when one would run past its end.
  const spanName = fitBroken(period.label, { width: tx(to) - tx(from) - SPAN.label.dx - SPAN.label.pad, size: SPAN.label.size, lineHeight: SPAN.label.lineHeight, maxLines: 2, bold: true }, ctx, / /u)?.layout
  const gateText = fitManuscript(g.text, { width: GATE.text.w, size: GATE.text.size, lineHeight: GATE.text.h, maxLines: GATE.text.maxLines }, ctx)
  const gateTitle = fitManuscript(g.title, { width: GATE.text.w, size: GATE.title.size, lineHeight: GATE.title.h, maxLines: 1, serif: true, bold: true }, ctx)
  if (!spanName || !gateText || !gateTitle) return null
  const muted = manuscriptText(inks.muted, ground, AXIS.size)
  const gateY = rect.y + GATE.dy
  // The words a hairline must not cross: the span's name and every round's name.
  const words: InkBox[] = [
    ...spanName.lines.map((line, i) => {
      const baseline = rect.y + SPAN.label.dy + i * SPAN.label.lineHeight
      return { x0: tx(from) + SPAN.label.dx, x1: tx(from) + SPAN.label.dx + manuscriptWidth(line, SPAN.label.size, ctx, { bold: true }), y0: baseline - SPAN.label.size * 0.9, y1: baseline + SPAN.label.size * 0.25 }
    }),
    ...t.milestones.flatMap((m) => {
      const lane = lanes.find((l) => l.lane === m.lane?.trim())
      if (!lane || m.title.trim() === m.date.trim()) return []
      const half = manuscriptWidth(m.title, LANE.round.size, ctx) / 2
      const x = tx(year(m.date)!)
      return [{ x0: x - half, x1: x + half, y0: lane.y + LANE.round.dy - LANE.round.size * 0.9, y1: lane.y + LANE.round.dy + LANE.round.size * 0.25 }]
    }),
  ]
  return (
    <g {...compositionTag("cadence")}>
      <g {...blockTag(ctx, t)}>
        <Caption label={label} title={t.title} x={rect.x} top={rect.y} ctx={ctx} />
        <rect data-manuscript-span={period.label.trim()} x={tx(from)} y={rect.y + SPAN.top} width={tx(to) - tx(from)} height={SPAN.bottom - SPAN.top} fill={inks.goldPale} />
        {grid.map((y) => (
          <g key={`g-${y}`}>
            {cutRule("vertical", tx(y), rect.y + AXIS.top, rect.y + AXIS.bottom, words).map(([a, b], k) => (
              <rect key={k} x={tx(y) - 0.5} y={a} width={1} height={b - a} fill={inks.line} />
            ))}
            {paintManuscriptLine(String(y), { ctx, x: tx(y), baseline: rect.y + AXIS.label, size: AXIS.size, anchor: "middle", fill: muted })}
          </g>
        ))}
        {lanes.map((l, i) => (
          <g key={`l-${i}`} data-manuscript-lane={l.split ? l.split.name : l.lane}>
            <g {...glossBreak(l.split?.sep)}>{paintManuscript(l.name!, { ctx, x: rect.x, top: l.y + LANE.name.dy, serif: true, bold: true, fill: manuscriptText(inks.ink, ground, LANE.name.size) })}</g>
            {l.what ? paintManuscript(l.what, { ctx, x: rect.x, top: l.y + LANE.what.dy, fill: manuscriptText(inks.muted, ground, LANE.what.size) }) : null}
            <line x1={tx(y0)} y1={l.y} x2={tx(y1)} y2={l.y} stroke={inks.faint} strokeWidth={LANE.line} />
          </g>
        ))}
        {t.milestones.map((m, i) => {
          const lane = lanes.find((l) => l.lane === m.lane?.trim())
          if (!lane) return null
          const x = tx(year(m.date)!)
          const on = x >= tx(from) && x <= tx(to) ? inks.goldPale : ground
          const named = m.title.trim() !== m.date.trim()
          return (
            <g key={i} data-manuscript-round={m.date} data-pending={m.status === "pending" ? "1" : undefined}>
              {m.status === "pending" ? <circle cx={x} cy={lane.y} r={LANE.dot - 1} fill={on} stroke={inks.deep} strokeWidth={2} /> : <circle cx={x} cy={lane.y} r={LANE.dot} fill={inks.deep} />}
              {named ? paintManuscriptLine(m.title.trim(), { ctx, x, baseline: lane.y + LANE.round.dy, size: LANE.round.size, anchor: "middle", fill: manuscriptText(inks.muted, on, LANE.round.size), ground: on }) : null}
            </g>
          )
        })}
        <line data-manuscript-gold="" x1={tx(from)} y1={rect.y + SPAN.line.top} x2={tx(from)} y2={rect.y + SPAN.line.bottom} stroke={inks.gold} strokeWidth={SPAN.line.stroke} />
        {paintManuscript(spanName, { ctx, x: tx(from) + SPAN.label.dx, baseline: rect.y + SPAN.label.dy, bold: true, fill: manuscriptText(inks.ink, inks.goldPale, SPAN.label.size), ground: inks.goldPale })}
      </g>
      <g {...blockTag(ctx, g)} data-manuscript-gate="">
        <rect x={rect.x} y={gateY} width={rect.w} height={GATE.h} rx={4} fill={inks.deepPale} />
        {paintManuscriptIcon(g.icon, rect.x + GATE.icon.dx, gateY + GATE.icon.dy, GATE.icon.size, inks.deep, inks.deepPale)}
        {paintManuscript(gateTitle, { ctx, x: rect.x + GATE.title.dx, top: gateY + GATE.title.dy, serif: true, bold: true, fill: manuscriptText(inks.deep, inks.deepPale, GATE.title.size), ground: inks.deepPale })}
        {paintManuscript(gateText, { ctx, x: rect.x + GATE.text.dx, top: gateY + GATE.text.dy, fill: manuscriptText(inks.ink, inks.deepPale, GATE.text.size), ground: inks.deepPale })}
      </g>
    </g>
  )
}
