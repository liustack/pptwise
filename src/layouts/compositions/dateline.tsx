import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  PLACARD_META,
  fitPlacard,
  paintPlacard,
  paintPlacardRule,
  paintPlacardTracked,
  placardBaseline,
  placardInks,
  placardMark,
  placardMeta,
  placardText,
  placardTrackedWidth,
  placePlacardClaim,
  placePlacardSource,
  wholePage,
} from "./placard"

type Timeline = Extract<Component, { type: "timeline" }>
type Paragraph = Extract<Component, { type: "paragraph" }>

/*
 * dateline: events laid on one line at their true distance in time,
 * museum's 2026-10 board (p14). The claim over the page. One line across
 * the page with a tick and the year at each new year, the events standing
 * on it where their dates fall: the ones marked (`highlight`, the missions
 * in the board) as large copper lamps ringed in copper, the others as small
 * dots of paper. Each event's words hang above and below the line in turn
 * from a thin seam: its date small and tracked (copper on a lamp), its name
 * in the serif (larger and in a lit copper on a lamp) and a note in old
 * paper. A line in the serif closes the page.
 *
 * Takes, in the placard setting: a `timeline` of three to ten milestones,
 * each dated by year and month (2020-12) or by year (2021), in time order,
 * with no icon, tag, tone, status, source or lane, and no title or periods,
 * then optionally a `paragraph`.
 *
 * Declines: two events on one side too close for their words, a name past
 * one line, a note past one line.
 *
 * Reads: the placard inks (`./placard.tsx`), the heading and body faces.
 */

const AXIS = { x0: 96, x1: 1184, y: 380, over: 20, tick: 6, year: { top: 392, size: 11, lineHeight: 16 } } as const
const LAMP = { r: 12, ring: 22, ringOpacity: 0.6 } as const
const DOT = { r: 5 } as const
const WORDS = { w: 160, up: 236, down: 436, gap: 24 } as const
const DATE = { size: 11, lineHeight: 18, tracking: 1 } as const
const NAME = { dy: 20, size: 16, litSize: 18, lineHeight: 26 } as const
const NOTE = { dy: 46, size: 11, lineHeight: 18 } as const
const CLOSE = { top: 556, size: 16, lineHeight: 26, w: 1152 } as const

/** A milestone's date as a fraction of years: 2020-12 is 2020 and eleven twelfths, 2021 is 2021. `null` when it is written any other way. */
export function yearOf(date: string): number | null {
  const m = /^(\d{4})(?:-(\d{1,2}))?$/u.exec(date.trim())
  if (!m) return null
  const month = m[2] ? Number(m[2]) : 1
  if (month < 1 || month > 12) return null
  return Number(m[1]) + (month - 1) / 12
}

export const datelineComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "placard" || !wholePage(rect)) return null
  const [timeline, close, ...rest] = components
  if (timeline?.type !== "timeline" || rest.length > 0) return null
  if (close !== undefined && close.type !== "paragraph") return null
  const t = timeline as Timeline
  if (t.title?.trim() || t.periods || t.lanes || t.layout === "vertical") return null
  const events = t.milestones
  if (events.length < 3 || events.length > 10) return null
  if (events.some((e) => e.icon || e.tag || e.tone || e.status || e.source || e.lane)) return null
  const years = events.map((e) => yearOf(e.date))
  if (years.some((y) => y === null)) return null
  const at = years as number[]
  if (at.some((y, i) => i > 0 && y < at[i - 1]!)) return null
  const first = at[0]!
  const last = at[at.length - 1]!
  if (last <= first) return null
  const x = (y: number) => rect.x + AXIS.x0 + ((y - first) / (last - first)) * (AXIS.x1 - AXIS.x0)
  // Words on one side must not run into the next words on that side.
  for (let i = 2; i < events.length; i += 1) if (x(at[i]!) - x(at[i - 2]!) < WORDS.w + 4) return null
  const names = events.map((e) => fitPlacard(e.title, { width: WORDS.w, size: e.highlight ? NAME.litSize : NAME.size, lineHeight: NAME.lineHeight, maxLines: 1, serif: true }, ctx))
  const notes = events.map((e) => (e.desc?.trim() ? fitPlacard(e.desc, { width: WORDS.w, size: NOTE.size, lineHeight: NOTE.lineHeight, maxLines: 1 }, ctx) : undefined))
  if (names.some((n) => !n) || notes.some((n) => n === null)) return null
  if (events.some((e) => placardTrackedWidth(e.date, DATE.size, DATE.tracking, ctx) > WORDS.w)) return null
  const closing = close ? fitPlacard((close as Paragraph).text, { width: CLOSE.w, size: CLOSE.size, lineHeight: CLOSE.lineHeight, maxLines: 1, serif: true }, ctx) : undefined
  if (closing === null) return null
  const head = placePlacardClaim(claim, { x: rect.x + 64, w: 1152 })
  if (head === false) return null
  const foot = placePlacardSource(source, { x: rect.x + 64, w: 1100 })
  if (foot === false) return null
  const inks = placardInks(ctx)
  const ground = inks.ground
  const axisInk = placardMark(inks.muted, ground)
  const copper = placardMark(inks.copper, ground)
  const y = rect.y + AXIS.y
  const ticks: number[] = []
  for (let yr = Math.ceil(first); yr <= Math.floor(last); yr += 1) if (yr > first) ticks.push(yr)
  return (
    <g {...compositionTag("dateline")}>
      {head}
      <g {...blockTag(ctx, timeline)} data-placard-dateline="">
        {paintPlacardRule(rect.x + AXIS.x0 - AXIS.over, rect.x + AXIS.x1 + AXIS.over, y, axisInk, 1.2)}
        {ticks.map((yr) => (
          <g key={yr} data-placard-year={yr}>
            <rect x={x(yr) - 0.5} y={y - AXIS.tick} width={1} height={AXIS.tick * 2} fill={axisInk} />
            {paintPlacardTracked({ ctx, text: String(yr), x: x(yr), y: placardBaseline(rect.y + AXIS.year.top, AXIS.year.lineHeight, AXIS.year.size), size: AXIS.year.size, tracking: 0, anchor: "middle", fill: placardMeta(inks.dim, ground), attrs: { ...PLACARD_META } })}
          </g>
        ))}
        {events.map((e, i) => {
          const ex = x(at[i]!)
          const up = i % 2 === 0
          const top = rect.y + (up ? WORDS.up : WORDS.down)
          const lit = e.highlight === true
          return (
            <g key={i} data-placard-event={e.date}>
              <rect x={ex - 0.5} y={up ? top + 68 : y + WORDS.gap} width={1} height={up ? y - WORDS.gap - top - 68 : top - 4 - y - WORDS.gap} fill={inks.line} />
              {lit ? (
                <>
                  <circle cx={ex} cy={y} r={LAMP.r} fill={copper} />
                  <circle cx={ex} cy={y} r={LAMP.ring} fill="none" stroke={copper} strokeWidth={1} strokeOpacity={LAMP.ringOpacity} />
                </>
              ) : (
                <circle cx={ex} cy={y} r={DOT.r} fill={placardMark(inks.ink, ground)} />
              )}
              {paintPlacardTracked({ ctx, text: e.date, x: ex, y: placardBaseline(top, DATE.lineHeight, DATE.size), size: DATE.size, tracking: DATE.tracking, anchor: "middle", fill: lit ? placardText(inks.copper, ground, DATE.size) : placardMeta(inks.dim, ground), attrs: lit ? undefined : { ...PLACARD_META } })}
              {paintPlacard(names[i]!, { ctx, x: ex, anchor: "middle", top: top + NAME.dy, fill: placardText(lit ? inks.lit : inks.ink, ground, names[i]!.fontSize), serif: true })}
              {notes[i] ? paintPlacard(notes[i]!, { ctx, x: ex, anchor: "middle", top: top + NOTE.dy, fill: placardText(inks.muted, ground, NOTE.size) }) : null}
            </g>
          )
        })}
      </g>
      {closing ? <g {...blockTag(ctx, close!)} data-placard-close="">{paintPlacard(closing, { ctx, x: rect.x + 64, top: rect.y + CLOSE.top, fill: placardText(inks.ink, ground, CLOSE.size), serif: true })}</g> : null}
      {foot}
    </g>
  )
}
