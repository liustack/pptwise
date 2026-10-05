import type { Component } from "@/ir"
import { kpiFigure } from "../../components/kpi"
import { joinUnit } from "../../lib/quantity-format"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitLesson,
  lessonInks,
  lessonMeta,
  lessonText,
  lessonWidth,
  paintLesson,
  paintLessonCard,
  paintLessonIcon,
  paintLessonLine,
  paintPill,
  pillWidth,
} from "./lesson"

type Chart = Extract<Component, { type: "chart" }>
type KpiCards = Extract<Component, { type: "kpi_cards" }>

/*
 * estimates: what people expected against what was measured, homeroom's
 * 2026-10 board (felt against measured, p08). On one axis through zero, each
 * expectation a grey dot on a grey stem from zero, its name and value beside
 * it; the measurement, the bar the author marks, a dot in the pen on a heavy
 * stem, named in the pen. A dashed bracket in the pen runs from the
 * expectation just before it down to the measurement's row and along to
 * zero, so the gap reads at a glance. Ticks every step under the axis, a
 * dashed line up from zero, the axis title under the ticks. Beside the plot a
 * card states the gap: its icon and figure in the pen, the figure's unit
 * bold, what it is muted, what to do about it, and under the card the kind of
 * study as a pill.
 *
 * Takes, in the lesson setting: a horizontal bar `chart` of one series of
 * three to six bars, the last one marked and the others not, then optionally
 * a `kpi_cards` of one item with no delta or tone.
 *
 * Declines: a mark on any bar but the last, a name that runs off the band at
 * the narrowest scale the plot allows, a card text past its lines, and a pill
 * wider than the card.
 *
 * Reads: the lesson inks (`./lesson.tsx`), the body and heading faces.
 */

const PLOT = { x0: 56, x1: 836, axis: 274, zeroTop: 14, rows: { top: 54, pitch: 50, marked: 30 }, tick: { len: 5, size: 12, drop: 24 }, title: { drop: 52, size: 13 }, dot: { r: 8, marked: 10 }, label: { gap: 14, size: 14, marked: { gap: 16, size: 17 } }, minW: 420 } as const
const CARD = { x: 886, h: 300, pad: 20, icon: { top: 20, size: 24 }, value: { top: 56, size: 60, lineHeight: 70 }, unit: { top: 128, size: 15, lineHeight: 22 }, label: { top: 154, size: 14, lineHeight: 22, maxLines: 2 }, note: { gap: 16, size: 14, lineHeight: 22, maxLines: 4 }, pill: { gap: 16 } } as const

function signed(v: number, unit: string | undefined): string {
  const n = String(Number(Math.abs(v).toPrecision(12)))
  return joinUnit(v > 0 ? `+${n}` : v < 0 ? `−${n}` : n, unit)
}

export const estimatesComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "lesson") return null
  const [chart, figures, ...rest] = components
  if (chart?.type !== "chart" || rest.length > 0) return null
  if (figures !== undefined && figures.type !== "kpi_cards") return null
  const c = chart as Chart
  if (c.chart_type !== "bar" || c.direction !== "horizontal" || c.series.length !== 1 || c.reference || c.changes || c.bands || c.tag || c.series[0]!.tone) return null
  const points = c.series[0]!.data
  const n = points.length
  if (n < 3 || n > 6 || points.some((p) => p.status || p.note || p.upper !== undefined)) return null
  if (points[n - 1]!.emphasis !== true || points.slice(0, -1).some((p) => p.emphasis)) return null
  const k = figures as KpiCards | undefined
  if (k && (k.items.length !== 1 || k.items[0]!.delta || k.items[0]!.tone)) return null
  if (rect.h < PLOT.axis + PLOT.title.drop + 10) return null
  const inks = lessonInks(ctx)
  const unit = c.axes?.x_unit
  const values = points.map((p) => p.y)
  const lo = Math.floor(Math.min(0, ...values) / 10) * 10 - 10
  const hi = Math.ceil(Math.max(0, ...values) / 10) * 10 + 10
  let plotRight = rect.x + (k ? CARD.x - 50 : PLOT.x1)
  const labelOf = (i: number) => `${String(points[i]!.x)} ${signed(points[i]!.y, unit)}`
  // The plot spans the board's x120 to x900, and narrows from either end until
  // every name beside its dot clears the band and the card.
  let x0 = rect.x + PLOT.x0
  const vx = (v: number) => x0 + ((v - lo) / (hi - lo)) * (plotRight - x0)
  const room = rect.x + (k ? CARD.x - 16 : rect.w)
  const overflow = (side: "left" | "right") =>
    points.some((p, i) => {
      const marked = i === n - 1
      const size = marked ? PLOT.label.marked.size : PLOT.label.size
      const w = lessonWidth(labelOf(i), size, ctx, marked)
      const gap = marked ? PLOT.label.marked.gap : PLOT.label.gap
      return side === "left" ? p.y < 0 && vx(p.y) - gap - w < rect.x : p.y >= 0 && vx(p.y) + gap + w > room
    })
  for (let guard = 0; overflow("left") || overflow("right"); guard++) {
    if (overflow("left")) x0 += 8
    if (overflow("right")) plotRight -= 8
    if (plotRight - x0 < PLOT.minW || guard > 200) return null
  }
  const step = hi - lo > 100 ? 20 : 10
  const ticks: number[] = []
  for (let v = lo; v <= hi + 1e-9; v += step) ticks.push(v)
  const axisY = rect.y + PLOT.axis
  const rowY = (i: number) => (i === n - 1 ? rect.y + PLOT.rows.top + (n - 2) * PLOT.rows.pitch + PLOT.rows.marked : rect.y + PLOT.rows.top + i * PLOT.rows.pitch)
  if (rowY(n - 1) + PLOT.dot.marked > axisY - 8) return null
  const title = c.axes?.x_title?.trim()
  if (title && lessonWidth(title, PLOT.title.size, ctx, true) > plotRight - rect.x) return null

  const item = k?.items[0]
  const cardX = rect.x + CARD.x
  const cardW = rect.x + rect.w - cardX
  const inner = cardW - CARD.pad * 2
  const fig = item ? kpiFigure(item.value, undefined) : null
  const card = item
    ? {
        value: fitLesson(fig!.text, { width: inner, size: CARD.value.size, lineHeight: CARD.value.lineHeight, maxLines: 1, bold: true }, ctx),
        unit: item.unit?.trim() ? fitLesson(item.unit, { width: inner, size: CARD.unit.size, lineHeight: CARD.unit.lineHeight, maxLines: 1, bold: true }, ctx) : null,
        label: fitLesson(item.label, { width: inner, size: CARD.label.size, lineHeight: CARD.label.lineHeight, maxLines: CARD.label.maxLines }, ctx),
        note: item.note?.trim() ? fitLesson(item.note, { width: inner, size: CARD.note.size, lineHeight: CARD.note.lineHeight, maxLines: CARD.note.maxLines }, ctx) : null,
      }
    : null
  if (card && (!card.value || !card.label || (item!.unit?.trim() && !card.unit) || (item!.note?.trim() && !card.note))) return null
  if (item?.tag && pillWidth(item.tag.text.trim(), ctx) > cardW) return null
  const labelTop = card?.unit ? CARD.label.top : CARD.unit.top
  const noteTop = labelTop + (card?.label?.lines.length ?? 1) * CARD.label.lineHeight + CARD.note.gap
  if (card?.note && noteTop + card.note.lines.length * CARD.note.lineHeight > CARD.h - 12) return null
  if (item?.source?.trim()) return null
  const zero = vx(0)
  const prev = n - 2
  const valueInk = fig?.marked ? inks.pen : inks.ink

  return (
    <g {...compositionTag("estimates")}>
      <g {...blockTag(ctx, c)} data-lesson-estimates="">
        <line x1={x0} y1={axisY} x2={plotRight} y2={axisY} stroke={inks.ink} strokeWidth={1.5} />
        {ticks.map((t) => (
          <g key={t}>
            <line x1={vx(t)} y1={axisY - PLOT.tick.len} x2={vx(t)} y2={axisY + PLOT.tick.len} stroke={inks.ink} strokeWidth={1} />
            {paintLessonLine(t === 0 ? "0" : signed(t, unit), { ctx, x: vx(t), baseline: axisY + PLOT.tick.drop, size: PLOT.tick.size, anchor: "middle", fill: lessonMeta(inks.muted, inks.ground) })}
          </g>
        ))}
        <line x1={zero} y1={rect.y + PLOT.zeroTop} x2={zero} y2={axisY} stroke={inks.ink} strokeWidth={1.2} strokeDasharray="4 3" />
        {title ? paintLessonLine(title, { ctx, x: zero, baseline: axisY + PLOT.title.drop, size: PLOT.title.size, bold: true, anchor: "middle", fill: lessonText(inks.muted, inks.ground, PLOT.title.size) }) : null}
        <path data-lesson-gap="" d={`M ${vx(points[prev]!.y)} ${rowY(prev)} L ${vx(points[prev]!.y)} ${rowY(n - 1)} L ${zero} ${rowY(n - 1)}`} fill="none" stroke={inks.pen} strokeWidth={1.5} strokeDasharray="3 2" />
        {points.map((p, i) => {
          const marked = i === n - 1
          const y = rowY(i)
          const x = vx(p.y)
          const size = marked ? PLOT.label.marked.size : PLOT.label.size
          const gap = marked ? PLOT.label.marked.gap : PLOT.label.gap
          const ink = marked ? inks.pen : inks.ghost
          return (
            <g key={i} data-lesson-estimate={marked ? "measured" : ""}>
              <line x1={zero} y1={y} x2={x} y2={y} stroke={ink} strokeWidth={marked ? 3 : 2} />
              <circle cx={x} cy={y} r={marked ? PLOT.dot.marked : PLOT.dot.r} fill={ink} />
              {paintLessonLine(labelOf(i), {
                ctx,
                x: p.y < 0 ? x - gap : x + gap,
                baseline: y + (marked ? 6 : 5),
                size,
                bold: marked,
                anchor: p.y < 0 ? "end" : "start",
                fill: lessonText(marked ? inks.pen : inks.muted, inks.ground, size),
              })}
            </g>
          )
        })}
      </g>
      {item && card ? (
        <g {...blockTag(ctx, k!)} data-lesson-gap-card="">
          {paintLessonCard({ x: cardX, y: rect.y, w: cardW, h: CARD.h }, inks)}
          {item.icon ? paintLessonIcon(item.icon, cardX + CARD.pad, rect.y + CARD.icon.top, CARD.icon.size, inks.pen, inks.paper) : null}
          {paintLesson(card.value!, { ctx, x: cardX + CARD.pad, top: rect.y + CARD.value.top, bold: true, fill: lessonText(valueInk, inks.paper, CARD.value.size), ground: inks.paper })}
          {card.unit ? paintLesson(card.unit, { ctx, x: cardX + CARD.pad, top: rect.y + CARD.unit.top, bold: true, fill: lessonText(inks.ink, inks.paper, CARD.unit.size), ground: inks.paper }) : null}
          {paintLesson(card.label!, { ctx, x: cardX + CARD.pad, top: rect.y + labelTop, fill: lessonText(inks.muted, inks.paper, CARD.label.size), ground: inks.paper })}
          {card.note ? paintLesson(card.note, { ctx, x: cardX + CARD.pad, top: rect.y + noteTop, fill: lessonText(inks.ink, inks.paper, CARD.note.size), ground: inks.paper }) : null}
          {item.tag ? paintPill({ ctx, tag: item.tag, x: cardX, y: rect.y + CARD.h + CARD.pill.gap, ground: inks.ground, inks }) : null}
        </g>
      ) : null}
    </g>
  )
}
