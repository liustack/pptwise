import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  CHALKBOARD_META,
  CLAIM_AT,
  SOURCE_AT,
  chalkLine,
  chalkMark,
  chalkMeta,
  chalkText,
  chalkWidth,
  chalkboardInks,
  fitChalk,
  paintChalk,
  paintChalkLine,
  placeChalkClaim,
  placeChalkSource,
  skipPath,
  wholePage,
} from "./chalkboard"

type Timeline = Extract<Component, { type: "timeline" }>
type Paragraph = Extract<Component, { type: "paragraph" }>

/*
 * chronology: dates laid on a chalk line at their true distance, lecture's
 * 2026-10 board (p17). One line across the board in the grey, a quarter's
 * months marked under it small (「2026.3」). The spans the timeline names
 * (`periods`) stand on the line: a span gone by as a band a breath off the
 * board, the span the author is looking ahead to (the one holding a
 * highlighted date) as a box of yellow chalk, each span's name small over it.
 * The dates stand on the line where they fall, as dots, their words hung
 * above and below the line in turn from a hairline: the date small, what
 * happens in the serif, a line in the grey. Dates inside the span ahead are
 * in yellow. A line under the timeline, then the source.
 *
 * Takes, in the chalkboard setting: a `timeline` of three to eight
 * milestones dated by day (2026-03-01) in time order, one to three periods
 * dated the same way, the highlighted milestones all in one of them; then
 * optionally a `paragraph`.
 *
 * Declines: a title, lanes, a vertical layout, a milestone with an icon, a
 * tag, a tone, a status or a source, a period with a basis, two dates on one
 * side too close for their words, a name or a line past one line, a span's
 * name wider than its span, a closing line past two lines.
 *
 * Reads: the chalkboard inks (`./chalkboard.tsx`), the heading and body faces.
 */

const AXIS = { x0: 100, x1: 1180, y: 340, tick: { top: 376, size: 12, lineHeight: 16 } } as const
const SPAN = { done: { y: 326, h: 28 }, ahead: { y: 322, h: 36 }, label: { top: 296, size: 12, lineHeight: 18 } } as const
const DOT = { r: 6 } as const
const WORDS = { w: 200, up: 210, down: 410, gap: 12 } as const
const DATE = { size: 12, lineHeight: 20 } as const
const NAME = { dy: 22, size: 18, lineHeight: 28 } as const
const NOTE = { dy: 50, size: 12, lineHeight: 22 } as const
const CLOSE = { top: 560, size: 15, lineHeight: 25, maxLines: 2 } as const

/** A date written 2026-03-01 as years: 2026 and two months and no days. `null` when it is written any other way. */
export function dayOf(date: string): number | null {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/u.exec(date.trim())
  if (!m) return null
  const month = Number(m[2])
  const day = Number(m[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return Number(m[1]) + (month - 1) / 12 + (day - 1) / 365
}

export const chronologyComposition: Composition = ({ components, ctx, setting, rect, claim, source }) => {
  if (setting !== "chalkboard" || !wholePage(rect)) return null
  const [timeline, close, ...rest] = components
  if (timeline?.type !== "timeline" || rest.length > 0) return null
  if (close !== undefined && close.type !== "paragraph") return null
  const t = timeline as Timeline
  if (t.title?.trim() || t.lanes || t.layout === "vertical") return null
  const events = t.milestones
  if (events.length < 3 || events.length > 8) return null
  if (events.some((e) => e.icon || e.tag || e.tone || e.status || e.source || e.lane)) return null
  const at = events.map((e) => dayOf(e.date))
  if (at.some((d) => d === null) || at.some((d, i) => i > 0 && d! < at[i - 1]!)) return null
  const periods = (t.periods ?? []).map((p) => ({ p, from: dayOf(p.from), to: dayOf(p.to) }))
  if (periods.some((s) => s.from === null || s.to === null || s.to <= s.from || s.p.basis)) return null
  const inside = (d: number, s: { from: number | null; to: number | null }) => d >= s.from! - 1e-9 && d <= s.to! + 1e-9
  const lit = events.flatMap((e, i) => (e.highlight ? [at[i]!] : []))
  const ahead = lit.length > 0 ? periods.findIndex((s) => lit.every((d) => inside(d, s))) : -1
  if (lit.length > 0 && periods.length > 0 && ahead < 0) return null
  // The line runs from the middle of the first date's month to the middle of the second month after the last's.
  const first = at[0]!
  const last = at[at.length - 1]!
  const monthStart = (d: number) => Math.floor(d * 12 + 1e-9) / 12
  const d0 = monthStart(first) + 0.5 / 12
  const d1 = monthStart(last) + 2.5 / 12
  const x = (d: number) => AXIS.x0 + ((d - d0) / (d1 - d0)) * (AXIS.x1 - AXIS.x0)
  // Words hang above and below the line in turn; two on one side may not run into each other.
  const widths = events.map((e) => Math.max(chalkWidth(e.date, DATE.size, ctx), chalkWidth(e.title, NAME.size, ctx, { serif: true }), e.desc?.trim() ? chalkWidth(e.desc, NOTE.size, ctx) : 0))
  if (widths.some((w) => w > WORDS.w)) return null
  for (let i = 2; i < events.length; i += 1) {
    if (x(at[i]!) - x(at[i - 2]!) < (widths[i]! + widths[i - 2]!) / 2 + WORDS.gap) return null
  }
  for (const s of periods) {
    if (chalkWidth(s.p.label, SPAN.label.size, ctx) > x(s.to!) - x(s.from!) - 16) return null
  }
  const ticks: { d: number; label: string }[] = []
  for (let m = Math.ceil(d0 * 12 - 1e-9); m / 12 <= d1; m += 1) {
    const month = (m % 12) + 1
    if (month % 3 === 0) ticks.push({ d: m / 12, label: `${Math.floor(m / 12)}.${month}` })
  }
  const closing = close ? fitChalk((close as Paragraph).text, { width: 1152, size: CLOSE.size, lineHeight: CLOSE.lineHeight, maxLines: CLOSE.maxLines }, ctx) : undefined
  if (closing === null) return null
  const head = placeChalkClaim(claim, CLAIM_AT)
  if (head === false) return null
  const foot = placeChalkSource(source, SOURCE_AT)
  if (foot === false) return null
  const inks = chalkboardInks(ctx)
  const ground = inks.ground
  const inAhead = (d: number) => ahead >= 0 && inside(d, periods[ahead]!)
  return (
    <g {...compositionTag("chronology")}>
      {head}
      <g {...blockTag(ctx, timeline)} data-chalk-chronology="">
        {chalkLine(AXIS.x0, AXIS.y, AXIS.x1, AXIS.y, chalkMark(inks.muted, ground), 2)}
        {periods.map((s, i) => {
          const x0 = x(s.from!)
          const x1 = x(s.to!)
          const next = i === ahead
          return (
            <g key={i} data-chalk-span={stripEmphasis(s.p.label).trim()} data-chalk-lit={next ? "" : undefined}>
              {next ? (
                <path d={skipPath([{ x: x0, y: SPAN.ahead.y }, { x: x1, y: SPAN.ahead.y }, { x: x1, y: SPAN.ahead.y + SPAN.ahead.h }, { x: x0, y: SPAN.ahead.y + SPAN.ahead.h }], [40, 4], true)} stroke={chalkMark(inks.yellow, ground)} strokeWidth={2.4} fill="none" />
              ) : (
                <rect x={x0} y={SPAN.done.y} width={x1 - x0} height={SPAN.done.h} fill={inks.line} />
              )}
              {paintChalkLine(s.p.label, { ctx, x: (x0 + x1) / 2, anchor: "middle", top: SPAN.label.top, lineHeight: SPAN.label.lineHeight, size: SPAN.label.size, fill: next ? chalkText(inks.yellow, ground, SPAN.label.size) : chalkMeta(inks.dim, ground), attrs: next ? undefined : { ...CHALKBOARD_META } })}
            </g>
          )
        })}
        {ticks.map((tick, i) => (
          <g key={i}>{paintChalkLine(tick.label, { ctx, x: x(tick.d), anchor: "middle", top: AXIS.tick.top, lineHeight: AXIS.tick.lineHeight, size: AXIS.tick.size, fill: chalkMeta(inks.dim, ground), attrs: { ...CHALKBOARD_META } })}</g>
        ))}
        {events.map((e, i) => {
          const ex = x(at[i]!)
          const up = i % 2 === 0
          const top = up ? WORDS.up : WORDS.down
          const next = inAhead(at[i]!)
          const col = next ? inks.yellow : inks.muted
          // The words stay on the board: centred on the date, or held inside the measure near its ends.
          const wx = Math.max(64 + widths[i]! / 2, Math.min(1216 - widths[i]! / 2, ex))
          return (
            <g key={i} data-chalk-date={e.date} data-chalk-lit={next ? "" : undefined}>
              {up ? chalkLine(ex, AXIS.y - 8, ex, top + 78, inks.line, 1) : chalkLine(ex, AXIS.y + 8, ex, top - 2, inks.line, 1)}
              <circle cx={ex} cy={AXIS.y} r={DOT.r} fill={chalkMark(col, ground)} />
              {paintChalkLine(e.date, { ctx, x: wx, anchor: "middle", top, lineHeight: DATE.lineHeight, size: DATE.size, fill: chalkText(col, ground, DATE.size) })}
              {paintChalkLine(e.title, { ctx, x: wx, anchor: "middle", top: top + NAME.dy, lineHeight: NAME.lineHeight, size: NAME.size, serif: true, fill: chalkText(next ? inks.yellow : inks.chalk, ground, NAME.size) })}
              {e.desc?.trim() ? paintChalkLine(e.desc, { ctx, x: wx, anchor: "middle", top: top + NOTE.dy, lineHeight: NOTE.lineHeight, size: NOTE.size, fill: chalkText(inks.muted, ground, NOTE.size) }) : null}
            </g>
          )
        })}
      </g>
      {closing && close ? (
        <g {...blockTag(ctx, close)} data-chalk-close="">
          {paintChalk(closing, { ctx, x: 64, top: CLOSE.top, fill: chalkText(inks.chalk, ground, CLOSE.size) })}
        </g>
      ) : null}
      {foot}
    </g>
  )
}
