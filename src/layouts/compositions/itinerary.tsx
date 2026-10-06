import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  Aside,
  fitAside,
  fitManuscript,
  manuscriptInks,
  manuscriptText,
  paintManuscript,
  paintManuscriptIcon,
  paintManuscriptLine,
  type AsideSpec,
} from "./manuscript"

type Gantt = Extract<Component, { type: "gantt" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * itinerary: a schedule with the gate it turns on, thesis's 2026-10 board
 * (p16). The axis's named ticks over the rows with a hairline down from each,
 * a row a piece of work: its icon in emerald, its name in the heading serif
 * and its stretch in words under it, and a bar of emerald along the axis, a
 * stretch not settled (`basis`) drawn as a dashed outline. The moment the
 * plan turns on (the gantt's one `milestones` entry) is a gold line down the
 * rows with a gold diamond under them and its name beside the diamond. A
 * closing line with a gold bar.
 *
 * Takes, in the manuscript setting: a `gantt` with a `range`, `axis_labels`
 * one a unit of the range (a blank label leaves its tick unnamed), two to six
 * rows each with an icon and a period and no text, emphasis or band, and one
 * moment, then optionally a `callout` with no title, icon or tag.
 *
 * Declines: a row's name or period past its column, a closing line past one
 * line.
 *
 * Reads: the manuscript inks (`./manuscript.tsx`).
 */

const AXIS = { dx: 266, right: 1136, top: 18, bottom: 352, label: 10, size: 12 } as const
const ROWS = { top: 38, pitch: 62, icon: { dy: 8, size: 18 }, name: { dx: 28, dy: 2, size: 14, h: 30, w: 236 }, period: { dy: 28, size: 11, h: 18 }, bar: { dy: 8, h: 22, r: 3 } } as const
const GATE = { stroke: 1.6, diamond: { dy: 372, half: 12 }, label: { dx: 20, dy: 360, size: 15, h: 26 } } as const
const CLOSE = { dy: 406, h: 40 } as const
const CLOSE_SPEC: AsideSpec = { size: 14, lineHeight: 40, maxLines: 1, pad: 0 }

export const itineraryComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "manuscript") return null
  const [gantt, close, ...rest] = components
  if (gantt?.type !== "gantt" || rest.length > 0 || (close && close.type !== "callout")) return null
  const g = gantt as Gantt
  const cl = close as Callout | undefined
  if (!g.range || !g.axis_labels || g.milestones?.length !== 1 || g.bands) return null
  if (g.items.length < 2 || g.items.length > 6 || g.items.some((it) => !it.icon || !it.period?.trim() || it.text?.trim() || it.emphasis)) return null
  if (cl && (cl.title || cl.icon || cl.tag)) return null
  const span = g.range.to - g.range.from
  if (g.axis_labels.length !== span + 1) return null
  if (rect.w < AXIS.right || rect.h < (cl ? CLOSE.dy + CLOSE.h : GATE.label.dy + GATE.label.h) || ROWS.top + g.items.length * ROWS.pitch > AXIS.bottom + 10) return null
  const inks = manuscriptInks(ctx)
  const ground = inks.ground
  const X0 = rect.x + AXIS.dx
  const X1 = rect.x + AXIS.right
  const mx = (v: number) => X0 + ((v - g.range!.from) / span) * (X1 - X0)
  const rows = g.items.map((it) => ({
    it,
    name: fitManuscript(it.label, { width: ROWS.name.w, size: ROWS.name.size, lineHeight: ROWS.name.h, maxLines: 1, serif: true, bold: true }, ctx),
    period: fitManuscript(it.period!, { width: ROWS.name.w, size: ROWS.period.size, lineHeight: ROWS.period.h, maxLines: 1 }, ctx),
  }))
  if (rows.some((r) => !r.name || !r.period)) return null
  const moment = g.milestones[0]!
  const gx = mx(moment.at)
  const momentName = fitManuscript(moment.label, { width: rect.x + rect.w - gx - GATE.label.dx, size: GATE.label.size, lineHeight: GATE.label.h, maxLines: 1, serif: true, bold: true }, ctx)
  if (!momentName) return null
  const closing = cl ? fitAside(cl.text, rect.w, CLOSE_SPEC, ctx) : null
  if (cl && !closing) return null
  const muted = manuscriptText(inks.muted, ground, AXIS.size)
  const cy = rect.y + GATE.diamond.dy
  const d = GATE.diamond.half
  return (
    <g {...compositionTag("itinerary")}>
      <g {...blockTag(ctx, g)}>
        {g.axis_labels.map((text, i) =>
          text.trim() ? (
            <g key={`t-${i}`}>
              <rect x={mx(g.range!.from + i) - 0.5} y={rect.y + AXIS.top} width={1} height={AXIS.bottom - AXIS.top} fill={inks.line} />
              {paintManuscriptLine(text.trim(), { ctx, x: mx(g.range!.from + i), baseline: rect.y + AXIS.label, size: AXIS.size, anchor: "middle", fill: muted })}
            </g>
          ) : null,
        )}
        {rows.map((r, i) => {
          const y = rect.y + ROWS.top + i * ROWS.pitch
          const x0 = mx(r.it.start)
          const w = mx(r.it.end) - x0
          return (
            <g key={i} data-manuscript-task={r.it.label}>
              {paintManuscriptIcon(r.it.icon!, rect.x, y + ROWS.icon.dy, ROWS.icon.size, inks.deep, ground)}
              {paintManuscript(r.name!, { ctx, x: rect.x + ROWS.name.dx, top: y + ROWS.name.dy, serif: true, bold: true, fill: manuscriptText(inks.ink, ground, ROWS.name.size) })}
              {paintManuscript(r.period!, { ctx, x: rect.x + ROWS.name.dx, top: y + ROWS.period.dy, fill: manuscriptText(inks.muted, ground, ROWS.period.size) })}
              {r.it.basis ? (
                <rect data-manuscript-unsettled={r.it.basis} x={x0 + 0.8} y={y + ROWS.bar.dy + 0.8} width={w - 1.6} height={ROWS.bar.h - 1.6} rx={ROWS.bar.r} fill="none" stroke={inks.deep} strokeWidth={1.6} strokeDasharray="5 3" />
              ) : (
                <rect x={x0} y={y + ROWS.bar.dy} width={w} height={ROWS.bar.h} rx={ROWS.bar.r} fill={inks.deep} />
              )}
            </g>
          )
        })}
        <g data-manuscript-moment={moment.label} data-manuscript-lead="gate">
          <rect x={gx - GATE.stroke / 2} y={rect.y + AXIS.top} width={GATE.stroke} height={AXIS.bottom - AXIS.top} fill={inks.gold} />
          <path d={`M ${gx} ${cy - d} L ${gx + d} ${cy} L ${gx} ${cy + d} L ${gx - d} ${cy} Z`} fill={inks.gold} />
          {paintManuscript(momentName, { ctx, x: gx + GATE.label.dx, top: rect.y + GATE.label.dy, serif: true, bold: true, fill: manuscriptText(inks.ink, ground, GATE.label.size) })}
        </g>
      </g>
      {cl && closing ? (
        <g {...blockTag(ctx, cl)}>
          <Aside layout={closing} x={rect.x} y={rect.y + CLOSE.dy} w={rect.w} h={CLOSE.h} spec={CLOSE_SPEC} ctx={ctx} />
        </g>
      ) : null}
    </g>
  )
}
