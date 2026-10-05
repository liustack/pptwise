import type { Component } from "@/ir"
import type { EmphasisHeadingLayout } from "../../render/emphasis"
import { fitMemo, memoInks, memoMeta, memoOn, memoQuietInks, memoText, memoWidth, paintMemo, paintMemoLine } from "./memo"
import { blockTag, compositionTag, type Composition } from "./shared"

type Gantt = Extract<Component, { type: "gantt" }>
type Timeline = Extract<Component, { type: "timeline" }>

/*
 * schedule: a calendar over its dates, memo's 2026-10 board (the timetable
 * page, p13). Across the top, one column a unit of the calendar (a month)
 * named in small mono, a hairline between columns, and the stretches as bars
 * with their names lettered in them: the marked stretch in the mark, those
 * before it in the palette's quiet brown, those after it in the ink. A label
 * that opens or closes with a year (「2026 年 10 月」, "Jan 2027") puts the
 * year under the calendar at its column and the rest over it. Under the
 * calendar the dates as a typed table: the date in the heading face, what
 * happens bold in the heading face, and a note in the muted ink, the marked
 * milestone's row on the mark's tint.
 *
 * Takes, in the memo setting: a `gantt` whose stretches are whole units
 * counted from 0 to the number of `axis_labels` (two to twelve), then
 * optionally a `timeline` of two to seven milestones on no lanes.
 *
 * Declines: a stretch that does not land on whole units of the labels, a
 * name that does not fit its bar, a date, title or note that does not fit its
 * column, rows taller than the band.
 *
 * Reads: the memo inks (`./memo.tsx`), the mono, body and heading faces.
 */

const AXIS = { top: 6, size: 13, lineHeight: 20, tickTop: 28, tickBottom: 100 } as const
const BAR = { top: 40, h: 26, inset: 4, pad: 10, size: 13 } as const
const YEAR = { top: 82, size: 12, lineHeight: 20 } as const
const TABLE = { top: 120, row: 50, pitch: 51, date: { x: 16, w: 220, size: 17 }, title: { x: 240, w: 260, size: 18 }, note: { x: 520, size: 15 }, lineHeight: 26, top0: 12 } as const

/**
 * A label as its year and the rest, every character kept: 「2026 年 10 月」
 * → 「2026 年」 and 「10 月」, the year first; "Jan 2027" → "Jan" and "2027",
 * the year last.
 */
export function splitYear(label: string): { year?: string; rest: string; yearFirst: boolean } {
  const lead = /^(\d{4}\s*年)\s*(.+)$/u.exec(label.trim())
  if (lead) return { year: lead[1], rest: lead[2]!.trim(), yearFirst: true }
  const trail = /^(.+?)\s+(\d{4})$/u.exec(label.trim())
  if (trail) return { year: trail[2], rest: trail[1]!.trim(), yearFirst: false }
  return { rest: label.trim(), yearFirst: false }
}

export const scheduleComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "memo") return null
  const [gantt, timeline, ...rest] = components
  if (gantt?.type !== "gantt" || rest.length > 0) return null
  if (timeline && timeline.type !== "timeline") return null
  const g = gantt as Gantt
  const labels = g.axis_labels ?? []
  if (labels.length < 2 || labels.length > 12) return null
  if (g.items.some((item) => !Number.isInteger(item.start) || !Number.isInteger(item.end) || item.start < 0 || item.end > labels.length || item.text?.trim())) return null
  const t = timeline as Timeline | undefined
  if (t && (t.milestones.length < 2 || t.milestones.length > 7 || t.lanes || t.milestones.some((m) => m.lane || m.icon || m.tone) || t.title?.trim())) return null
  const inks = memoInks(ctx)
  const unit = rect.w / labels.length
  const marked = g.items.findIndex((item) => item.emphasis)
  const quiet = memoQuietInks(ctx)[0] ?? inks.muted
  const barInk = (i: number) => (i === marked ? inks.mark : marked >= 0 && i > marked ? inks.ink : quiet)
  const split = labels.map(splitYear)
  if (split.some((s) => memoWidth(s.rest, AXIS.size, "mono", ctx) > unit - 4)) return null
  for (const item of g.items) {
    const w = (item.end - item.start) * unit - BAR.inset
    if (memoWidth(item.label, BAR.size, "body", ctx, true) + BAR.pad * 2 > w) return null
  }
  const rows: { date: EmphasisHeadingLayout; title: EmphasisHeadingLayout; note: EmphasisHeadingLayout | null; marked: boolean }[] = []
  if (t) {
    const noteW = rect.w - TABLE.note.x - 16
    for (const m of t.milestones) {
      const date = fitMemo(m.date, { width: TABLE.date.w, size: TABLE.date.size, lineHeight: TABLE.lineHeight, maxLines: 1, face: "song", bold: true }, ctx)
      const title = fitMemo(m.title, { width: TABLE.title.w, size: TABLE.title.size, lineHeight: TABLE.lineHeight, maxLines: 1, face: "song", bold: true }, ctx)
      const note = m.desc?.trim() ? fitMemo(m.desc, { width: noteW, size: TABLE.note.size, lineHeight: TABLE.lineHeight, maxLines: 1, face: "body" }, ctx) : null
      if (!date || !title || (m.desc?.trim() && !note)) return null
      rows.push({ date, title, note, marked: m.highlight === true })
    }
    if (rect.y + TABLE.top + rows.length * TABLE.pitch > rect.y + rect.h) return null
  }
  const ticks = Array.from({ length: labels.length }, (_, i) => rect.x + i * unit)
  return (
    <g {...compositionTag("schedule")}>
      <g {...blockTag(ctx, gantt)} data-memo-calendar="">
        {split.map((s, i) => {
          // The year and the rest are painted one after the other, in the
          // order the label writes them, so the label reads whole.
          const month = paintMemoLine(s.rest, {
            ctx,
            key: "m",
            x: ticks[i]! + unit / 2,
            top: rect.y + AXIS.top,
            lineHeight: AXIS.lineHeight,
            size: AXIS.size,
            face: "mono",
            fill: memoMeta(inks.muted, inks.ground),
            anchor: "middle",
          })
          const year = s.year
            ? paintMemoLine(s.year, { ctx, key: "y", x: ticks[i]!, top: rect.y + YEAR.top, lineHeight: YEAR.lineHeight, size: YEAR.size, face: "mono", fill: memoMeta(inks.muted, inks.ground) })
            : null
          return <g key={`m-${i}`}>{s.yearFirst ? [year, month] : [month, year]}</g>
        })}
        {ticks.map((x, i) => (
          <rect key={`t-${i}`} x={x} y={rect.y + AXIS.tickTop} width={1} height={AXIS.tickBottom - AXIS.tickTop} fill={inks.line} />
        ))}
        {g.items.map((item, i) => {
          const x = rect.x + item.start * unit
          const w = (item.end - item.start) * unit - BAR.inset
          const fill = barInk(i)
          return (
            <g key={`b-${i}`} data-memo-stretch={i === marked ? "marked" : ""}>
              <rect x={x} y={rect.y + BAR.top} width={w} height={BAR.h} fill={fill} />
              {paintMemoLine(item.label, { ctx, x: x + BAR.pad, top: rect.y + BAR.top, lineHeight: BAR.h, size: BAR.size, face: "body", bold: true, fill: memoOn(fill, inks.paper, BAR.size) })}
            </g>
          )
        })}
      </g>
      {t ? (
        <g {...blockTag(ctx, t)} data-memo-dates="">
          {rows.map(({ date, title, note, marked: on }, i) => {
            const top = rect.y + TABLE.top + i * TABLE.pitch
            const ground = on ? inks.tint : inks.ground
            return (
              <g key={i} data-memo-row={on ? "marked" : ""}>
                {on ? <rect x={rect.x} y={top} width={rect.w} height={TABLE.row} fill={inks.tint} /> : null}
                <rect x={rect.x} y={top + TABLE.row} width={rect.w} height={1} fill={inks.line} />
                {paintMemo(date, {
                  ctx,
                  x: rect.x + TABLE.date.x,
                  top: top + TABLE.top0,
                  face: "song",
                  bold: true,
                  fill: on ? memoText(inks.mark, ground, TABLE.date.size) : memoMeta(inks.muted, ground),
                })}
                {paintMemo(title, { ctx, x: rect.x + TABLE.title.x, top: top + TABLE.top0, face: "song", bold: true, fill: memoText(on ? inks.mark : inks.ink, ground, TABLE.title.size) })}
                {note ? paintMemo(note, { ctx, x: rect.x + TABLE.note.x, top: top + TABLE.top0 + 1, face: "body", fill: memoText(inks.muted, ground, TABLE.note.size) }) : null}
              </g>
            )
          })}
        </g>
      ) : null}
    </g>
  )
}
