import type { Component } from "@/ir"
import { figureStyleOf, groupDigits, writtenFigure } from "../../lib/quantity-format"
import { mostlyChinese } from "../../lib/text-script"
import { paintTag, tagInks, tagWidth } from "../../components/tag"
import { blockTag, compositionTag, type Composition } from "./shared"
import { Lead, MARQUEE_SPEC, fitMarquee, marqueeInks, marqueeText, marqueeWidth, paintMarquee, paintMarqueeIcon, paintMarqueeLine } from "./marquee"

type Chart = Extract<Component, { type: "chart" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * branch: two things that started level and went separate ways, rally's
 * 2026-10 board (the split page, p04). From one dot at the left, named by
 * the year they started from, two curves part: the one that ends higher
 * climbs to the top right, the other falls to the bottom right, the one the
 * page is about (the marked series) solid in the accent and the other dotted
 * in the grey. The year they reached stands small between the two ends. At
 * each end its icon, and beside it a column: the series' line in bold (in
 * the accent for the marked one), its change set large, and a grey line of
 * what lies behind it, with a tag of where it comes from when it has one.
 *
 * The curves are a sketch of the two directions, not a plot: they part the
 * same way whatever the figures.
 *
 * Takes, in the marquee setting: a `line` chart of two series over the same
 * two categories, both starting at the same value and ending apart, one
 * marked, its values counted in `axes.y_unit` (「%」); then two `callout`s,
 * one a series, each titled starting with its series' name (「演唱会 · 2027
 * 押这边」), with an icon or not and a tag or not.
 *
 * Declines: a title past one line, a change wider than its column at 64px,
 * a line past two lines, and a tag that does not fit beside its title.
 *
 * Reads: the marquee inks (`./marquee.tsx`), the tag ink (`components/tag`).
 */

const START = { x: 76, y: 282, r: 14, label: { drop: 36, size: 14 } } as const
const END = { x: 636, rise: 52, fall: 372 } as const
const STROKE = { w: 10, dot: "2 16" } as const
const ICON = { x: 652, size: 30, dy: -20 } as const
const COLUMN = { x: 696, w: 456 } as const
const HIGH = { label: 8, value: 42, note: 124 } as const
const LOW = { label: 282, value: 316, note: 388 } as const
const TYPE = { label: { size: 16, lineHeight: 30 }, high: { size: 64, lineHeight: 80 }, low: { size: 56, lineHeight: 70 }, note: { size: 15, lineHeight: 24, maxLines: 2 } } as const
const TAG = { x: 220, size: 12, height: 22 } as const

function signedFigure(v: number, unit: string | undefined, chinese: boolean): string {
  const sign = v > 0 ? "+" : v < 0 ? "−" : ""
  const body = groupDigits(writtenFigure(Math.abs(v)), figureStyleOf(chinese))
  return `${sign}${body}${unit ?? ""}`
}

export const branchComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "marquee") return null
  const [chart, a, b, ...rest] = components
  if (chart?.type !== "chart" || a?.type !== "callout" || b?.type !== "callout" || rest.length > 0) return null
  const c = chart as Chart
  if (c.chart_type !== "line" || c.series.length !== 2 || c.tag || c.bands) return null
  if (c.series.filter((s) => s.emphasis).length !== 1 || c.series.some((s) => s.tone || s.data.length !== 2)) return null
  const [s0, s1] = c.series as [Chart["series"][number], Chart["series"][number]]
  if (String(s0.data[0]!.x) !== String(s1.data[0]!.x) || String(s0.data[1]!.x) !== String(s1.data[1]!.x)) return null
  if (s0.data[0]!.y !== s1.data[0]!.y || s0.data[1]!.y === s1.data[1]!.y) return null
  if (rect.w < COLUMN.x + COLUMN.w || rect.h < LOW.note + TYPE.note.lineHeight * 2) return null
  const notes = [a, b] as Callout[]
  const noteOf = (name: string) => notes.find((n) => n.title?.trim().startsWith(name.trim()))
  const n0 = noteOf(s0.name)
  const n1 = noteOf(s1.name)
  if (!n0 || !n1 || n0 === n1) return null
  const inks = marqueeInks(ctx)
  const unit = c.axes?.y_unit?.trim() || undefined
  const chinese = ctx.figures?.chinese ?? mostlyChinese(c.series.map((s) => s.name))
  const branches = [
    { s: s0, note: n0 },
    { s: s1, note: n1 },
  ]
    .map(({ s, note }) => ({ s, note, end: s.data[1]!.y, change: s.data[1]!.y - s.data[0]!.y, marked: s.emphasis === true }))
    .sort((x, y) => y.end - x.end)
  const laid = branches.map((br, i) => {
    const high = i === 0
    const spec = high ? TYPE.high : TYPE.low
    const value = signedFigure(br.change, unit, chinese)
    const title = fitMarquee(br.note.title, { width: COLUMN.w, size: TYPE.label.size, lineHeight: TYPE.label.lineHeight, maxLines: 1, bold: true }, ctx)
    const detail = fitMarquee(br.note.text, { width: COLUMN.w, size: TYPE.note.size, lineHeight: TYPE.note.lineHeight, maxLines: TYPE.note.maxLines }, ctx)
    const titleW = title ? marqueeWidth(br.note.title!, TYPE.label.size, ctx, true) : 0
    const tag = br.note.tag
    const tagX = Math.max(TAG.x, titleW + 16)
    const tagFits = !tag || tagX + tagWidth(tag.text, { size: TAG.size, height: TAG.height, padX: 10, fontFamily: ctx.fonts.body }) <= COLUMN.w
    return { ...br, high, spec, value, title, detail, tag, tagX, tagFits, rows: high ? HIGH : LOW, fits: title !== null && detail !== null && tagFits && marqueeWidth(value, spec.size, ctx, true) <= COLUMN.w }
  })
  if (laid.some((l) => !l.fits)) return null

  const x = (dx: number) => rect.x + dx
  const y = (dy: number) => rect.y + dy
  const startX = x(START.x)
  const startY = y(START.y)
  const ends = [y(END.rise), y(END.fall)]
  const curve = (endY: number) => `M ${startX} ${startY} C ${startX + 220} ${startY}, ${startX + 340} ${endY + (endY < startY ? 60 : -40)}, ${x(END.x)} ${endY}`
  const startLabel = String(s0.data[0]!.x).trim()
  const endLabel = String(s0.data[1]!.x).trim()
  return (
    <g {...compositionTag("branch")} {...blockTag(ctx, c)}>
      {laid.map((l, i) => {
        const path = <path d={curve(ends[i]!)} fill="none" stroke={l.marked ? inks.fire : inks.muted} strokeWidth={STROKE.w} strokeLinecap="round" strokeDasharray={l.marked ? undefined : STROKE.dot} />
        return <g key={`curve-${i}`} data-marquee-branch={l.s.name}>{l.marked ? <Lead id="branch">{path}</Lead> : path}</g>
      })}
      <circle cx={startX} cy={startY} r={START.r} fill={inks.ink} />
      {startLabel ? paintMarqueeLine(startLabel, { ctx, x: startX, baseline: startY + START.label.drop, size: START.label.size, bold: true, anchor: "middle", fill: marqueeText(inks.muted, inks.ground, START.label.size) }) : null}
      {endLabel ? paintMarqueeLine(endLabel, { ctx, x: x(END.x), baseline: Math.round((ends[0]! + ends[1]!) / 2 + START.label.size * 0.35), size: START.label.size, bold: true, anchor: "middle", fill: marqueeText(inks.muted, inks.ground, START.label.size) }) : null}
      {laid.map((l, i) => {
        const icon = l.note.icon
        return (
          <g key={`column-${i}`} {...blockTag(ctx, l.note)} data-marquee-branch-note={l.s.name}>
            {icon ? paintMarqueeIcon(icon, x(ICON.x), ends[i]! + ICON.dy, ICON.size, l.marked ? inks.fire : inks.muted, inks.ground) : null}
            {paintMarquee(l.title!, { ctx, x: x(COLUMN.x), top: y(l.rows.label), bold: true, fill: marqueeText(l.marked ? inks.fire : inks.muted, inks.ground, TYPE.label.size), ground: inks.ground })}
            {l.tag ? paintTag({ tag: l.tag, x: x(COLUMN.x) + l.tagX, y: y(l.rows.label) + (TYPE.label.lineHeight - TAG.height) / 2, spec: { size: TAG.size, height: TAG.height, padX: 10, fontFamily: ctx.fonts.body }, inks: tagInks(ctx, l.tag, false, inks.ground, TAG.size), attrs: { ...MARQUEE_SPEC }, width: tagWidth(l.tag.text, { size: TAG.size, height: TAG.height, padX: 10, fontFamily: ctx.fonts.body }) }) : null}
            {paintMarqueeLine(l.value, { ctx, x: x(COLUMN.x), top: y(l.rows.value), lineHeight: l.spec.lineHeight, size: l.spec.size, bold: true, fill: marqueeText(l.marked ? inks.ink : inks.muted, inks.ground, l.spec.size) })}
            {paintMarquee(l.detail!, { ctx, x: x(COLUMN.x), top: y(l.rows.note), fill: marqueeText(inks.muted, inks.ground, TYPE.note.size), ground: inks.ground })}
          </g>
        )
      })}
    </g>
  )
}
