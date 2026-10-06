import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import { Lead, fireTint, fitMarquee, marqueeInks, marqueeText, marqueeWidth, paintMarquee, paintMarqueeIcon, paintMarqueeLine } from "./marquee"

type Gantt = Extract<Component, { type: "gantt" }>

/*
 * timetable: a plan month by month, rally's 2026-10 board (the schedule
 * page, p14). A thin rule at every tick of the axis with its label beside
 * its top, the season the plan is built around (the gantt's `bands`) tinted
 * in the accent behind the bars and named in the accent under them. A row a
 * piece of work: its name bold at the left with a grey line under it, its
 * bar a rounded capsule over its stretch, in the dim violet; the bar the page
 * is about in the accent, its name in the accent, and a row's icon set on its
 * bar (the star on the first stop).
 *
 * Takes, in the marquee setting: a `gantt` of two to six rows with no
 * period, at most one marked, with axis labels (one a tick, the first at the
 * axis's start and the last at its end) and at most one band.
 *
 * Declines: a name past its column, a row's line past one line, a tick label
 * wider than its month, the band's name past one line, and a bar too narrow
 * for its icon.
 *
 * Reads: the marquee inks (`./marquee.tsx`), the body and heading faces.
 */

const PLOT = { x: 236, right: 1136, top: 12, bottom: 412, tint: 0.1, tick: { size: 12, baseline: 8, dx: 4 }, band: { baseline: 428, size: 13 } } as const
const ROWS = { top: 28, pitch: 62, label: { top: 4, size: 16, lineHeight: 24, w: 220 }, text: { top: 28, size: 12, lineHeight: 20 }, bar: { dy: 10, h: 30, inset: 2 }, icon: { size: 18, dy: 6 } } as const

export const timetableComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "marquee") return null
  const [chart, ...rest] = components
  if (chart?.type !== "gantt" || rest.length > 0) return null
  const g = chart as Gantt
  const labels = g.axis_labels ?? []
  if (g.items.length < 2 || g.items.length > 6 || labels.length < 2 || (g.bands?.length ?? 0) > 1) return null
  if (g.items.some((it) => it.period) || g.items.filter((it) => it.emphasis).length > 1) return null
  if (rect.w < PLOT.right || rect.h < PLOT.band.baseline + 6) return null
  const inks = marqueeInks(ctx)
  const lo = g.range ? g.range.from : Math.min(...g.items.map((it) => it.start))
  const hi = g.range ? g.range.to : Math.max(...g.items.map((it) => it.end))
  if (!(hi > lo)) return null
  const x = (dx: number) => rect.x + dx
  const y = (dy: number) => rect.y + dy
  const plotW = PLOT.right - PLOT.x
  const vx = (v: number) => x(PLOT.x) + ((v - lo) / (hi - lo)) * plotW
  const tickGap = plotW / (labels.length - 1)
  if (labels.slice(0, -1).some((l) => marqueeWidth(l, PLOT.tick.size, ctx, true) > tickGap - PLOT.tick.dx * 2)) return null
  const rows = g.items.map((it, i) => {
    const label = fitMarquee(it.label, { width: ROWS.label.w, size: ROWS.label.size, lineHeight: ROWS.label.lineHeight, maxLines: 1, bold: true }, ctx)
    const text = it.text?.trim() ? fitMarquee(it.text, { width: ROWS.label.w, size: ROWS.text.size, lineHeight: ROWS.text.lineHeight, maxLines: 1 }, ctx) : null
    const x0 = vx(it.start) + ROWS.bar.inset
    const w = vx(it.end) - vx(it.start) - ROWS.bar.inset * 2
    return { it, i, label, text, x0, w, top: y(ROWS.top + i * ROWS.pitch), lit: it.emphasis === true }
  })
  if (rows.some((r) => !r.label || (r.it.text?.trim() && !r.text) || (r.it.icon && r.w < ROWS.icon.size + 6))) return null
  const band = g.bands?.[0]
  const bandName = band ? fitMarquee(band.label, { width: plotW, size: PLOT.band.size, lineHeight: PLOT.band.size, maxLines: 1, bold: true }, ctx) : null
  if (band && !bandName) return null

  return (
    <g {...compositionTag("timetable")} {...blockTag(ctx, g)}>
      {band && bandName ? (
        <g data-marquee-season={band.label}>
          <rect x={vx(band.from)} y={y(PLOT.top + 4)} width={vx(band.to) - vx(band.from)} height={PLOT.bottom - PLOT.top - 4} fill={fireTint(inks, PLOT.tint)} />
          {paintMarquee(bandName, { ctx, x: (vx(band.from) + vx(band.to)) / 2, baseline: y(PLOT.band.baseline), bold: true, anchor: "middle", fill: marqueeText(inks.fire, inks.ground, PLOT.band.size), ground: inks.ground })}
        </g>
      ) : null}
      {labels.map((l, i) => {
        const tx = x(PLOT.x) + i * tickGap
        return (
          <g key={`t-${i}`}>
            <rect x={tx - 0.5} y={y(PLOT.top)} width={1} height={PLOT.bottom - PLOT.top} fill={inks.line} />
            {paintMarqueeLine(l.trim(), { ctx, x: tx + PLOT.tick.dx, baseline: y(PLOT.tick.baseline), size: PLOT.tick.size, bold: true, fill: marqueeText(inks.muted, inks.ground, PLOT.tick.size) })}
          </g>
        )
      })}
      {rows.map((r) => {
        const bar = <rect x={r.x0} y={r.top + ROWS.bar.dy} width={Math.max(1, r.w)} height={ROWS.bar.h} rx={ROWS.bar.h / 2} fill={r.lit ? inks.fire : inks.dim} />
        const iconX = r.x0 + Math.min(tickGap, r.w + ROWS.bar.inset * 2) / 2 - ROWS.bar.inset - ROWS.icon.size / 2
        return (
          <g key={r.i} data-row={r.it.label}>
            {r.lit ? <Lead id="bar">{bar}</Lead> : bar}
            {r.it.icon ? paintMarqueeIcon(r.it.icon, iconX, r.top + ROWS.bar.dy + ROWS.icon.dy, ROWS.icon.size, r.lit ? inks.onFire : inks.ink, r.lit ? inks.fire : inks.dim) : null}
            {paintMarquee(r.label!, { ctx, x: x(0), top: r.top + ROWS.label.top, bold: true, fill: marqueeText(r.lit ? inks.fire : inks.ink, inks.ground, ROWS.label.size), ground: inks.ground })}
            {r.text ? paintMarquee(r.text, { ctx, x: x(0), top: r.top + ROWS.text.top, fill: marqueeText(inks.muted, inks.ground, ROWS.text.size), ground: inks.ground }) : null}
          </g>
        )
      })}
    </g>
  )
}
