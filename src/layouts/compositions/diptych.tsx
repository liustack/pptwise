import type React from "react"
import type { Component } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import { joinUnit } from "../../lib/quantity-format"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitLesson,
  lessonInks,
  lessonText,
  lessonWidth,
  paintLesson,
  paintLessonCard,
  paintLessonIcon,
  paintLessonLine,
  paintPill,
  pillWidth,
  type LessonInks,
} from "./lesson"
import { fitTip, paintTip, plainCallout, type TipSpec } from "./lesson-tips"

type Panel = Extract<Component, { type: "insight_panel" }>
type Chart = Extract<Component, { type: "chart" }>
type Point = Chart["series"][number]["data"][number]

/*
 * diptych: two studies side by side, each a card with its own figures,
 * homeroom's 2026-10 board (the two ways it backfires, p07). A card is an
 * `insight_panel` and the `chart` after it: the panel's icon in the pen and
 * its title bold, its rows as 「怎么测的：…」 lines under the title, then the
 * chart, then the panel's footnote as what to do about it, and the chart's
 * tag at the card's foot as the kind of study.
 *
 * A chart is drawn one of two ways, from what it holds:
 *
 * - bars from zero, when any bar is a plain value: its axis title over
 *   them, each bar named at its left, the bar the page is about in the pen
 *   and the others in the ghost, a value known only as a range (`upper`)
 *   solid to its low end and dashed on over the pen's tint to its high end,
 *   its label naming both ends;
 * - spans on a track, when every bar is a range: each named over its track,
 *   the span from its low end to its high end in the pen when it is the one
 *   the page is about and in the warning ink otherwise, its two ends named
 *   under it.
 *
 * Under the two cards the page's one safety net in a tip box, bold.
 *
 * Takes, in the lesson setting: two pairs of an `insight_panel` (one or two
 * rows) and a horizontal bar `chart` of one series and two or three bars,
 * then optionally a `callout` with no title or tag.
 *
 * Declines: a title, a row or a bar's name past one line, a figure past the
 * card, a footnote past its lines, and a pill wider than the card.
 *
 * Reads: the lesson inks (`./lesson.tsx`), the body and heading faces.
 */

const CARD = { gap: 32, h: 340, pad: 24, icon: { top: 24, size: 26 }, title: { x: 62, top: 22, size: 20, lineHeight: 30 }, rows: { top: 64, size: 13, lineHeight: 22 }, pill: { top: 304 } } as const
const BARS = { percentMargin: 36, label: { baseline: 120, size: 13 }, row: { pitch: 44, name: 154, top: 138, h: 24, size: 14 }, barX: 116, value: { gap: 8, baseline: 156, size: 16 }, foot: { top: 228, size: 14, lineHeight: 22, maxLines: 3 } } as const
const SPANS = { pitch: 90, labelPitch: 98, label: { baseline: 120, size: 13 }, track: { top: 140, h: 12 }, ends: { drop: 36, size: 15 }, foot: { top: 280, size: 14, lineHeight: 22, maxLines: 1 } } as const
const TIP = { top: 360, h: 56 } as const
const TIP_SPEC: TipSpec = { size: 17, lineHeight: 26, maxLines: 1, bold: true, textX: 56, icon: { x: 16, size: 24 } }

/** A figure as the author wrote it, with the axis's unit. */
function figure(v: number, unit: string | undefined): string {
  return joinUnit(String(Number(v.toPrecision(12))), unit)
}

function rangeText(p: Point, unit: string | undefined, ctx: ComponentCtx): string {
  return ctx.figures?.chinese ? `${figure(p.y, unit)} 至 ${figure(p.upper!, unit)}` : `${figure(p.y, unit)} to ${figure(p.upper!, unit)}`
}

interface Drawn {
  height: number
  node: (x: number, y: number, w: number) => React.ReactNode
}

/** A chart of plain bars, some of them ranges, from zero: or `null` when one does not fit. */
function barsMode(chart: Chart, w: number, ctx: ComponentCtx, inks: LessonInks): Drawn | null {
  const points = chart.series[0]!.data
  const unit = chart.axes?.x_unit
  const percent = unit === "%"
  const top = Math.max(...points.map((p) => p.upper ?? p.y))
  const room = w - CARD.pad * 2 - BARS.barX
  const labels = points.map((p) => (p.upper !== undefined ? rangeText(p, unit, ctx) : figure(p.y, unit)))
  // As long as every bar's label still fits after its reach, and on a percent
  // chart no longer than a hundred would leave the board's margin for.
  const reachK = Math.min(...points.map((p, j) => (room - BARS.value.gap - lessonWidth(labels[j]!, BARS.value.size, ctx, true)) / Math.max(p.upper ?? p.y, 1e-9)))
  const k = percent && top <= 100 ? Math.min(reachK, (room - BARS.percentMargin) / 100) : reachK
  if (k <= 0) return null
  if (points.some((p) => lessonWidth(String(p.x), BARS.row.size, ctx, p.emphasis === true) > BARS.barX - 8)) return null
  const title = chart.axes?.x_title?.trim()
  if (title && lessonWidth(title, BARS.label.size, ctx, true) > w - CARD.pad * 2) return null
  return {
    height: BARS.foot.top,
    node: (x, y) => (
      <g data-lesson-bars="">
        {title ? paintLessonLine(title, { ctx, x: x + CARD.pad, baseline: y + BARS.label.baseline, size: BARS.label.size, bold: true, fill: lessonText(inks.muted, inks.paper, BARS.label.size) }) : null}
        {points.map((p, j) => {
          const marked = p.emphasis === true
          const ink = marked ? inks.pen : inks.ghost
          const barX = x + CARD.pad + BARS.barX
          const barY = y + BARS.row.top + j * BARS.row.pitch
          const solid = Math.max(1, p.y * k)
          const reach = p.upper !== undefined ? (p.upper - p.y) * k : 0
          return (
            <g key={j} data-lesson-bar={marked ? "marked" : ""}>
              {paintLessonLine(String(p.x), { ctx, x: x + CARD.pad, baseline: y + BARS.row.name + j * BARS.row.pitch, size: BARS.row.size, bold: marked, fill: lessonText(marked ? inks.pen : inks.ink, inks.paper, BARS.row.size) })}
              <rect data-plot-mark="1" x={barX} y={barY} width={solid} height={BARS.row.h} rx={3} fill={ink} />
              {reach > 0 ? <rect data-range-reach="1" x={barX + solid + 0.5} y={barY + 0.5} width={reach - 1} height={BARS.row.h - 1} rx={3} fill={inks.penTint} stroke={ink} strokeWidth={1} strokeDasharray="3 2" /> : null}
              {paintLessonLine(labels[j]!, { ctx, x: barX + solid + reach + BARS.value.gap, baseline: y + BARS.value.baseline + j * BARS.row.pitch, size: BARS.value.size, bold: true, fill: lessonText(marked ? inks.pen : inks.ink, inks.paper, BARS.value.size) })}
            </g>
          )
        })}
      </g>
    ),
  }
}

/** A chart whose every bar is a range, as spans on a track: or `null` when one does not fit. */
function spansMode(chart: Chart, w: number, ctx: ComponentCtx, inks: LessonInks): Drawn | null {
  const points = chart.series[0]!.data
  const unit = chart.axes?.x_unit
  const trackW = w - CARD.pad * 2
  const top = Math.max(...points.map((p) => p.upper!))
  const axisMax = Math.ceil((top * 1.05) / 5) * 5
  const k = trackW / axisMax
  if (chart.axes?.x_title?.trim()) return null
  if (points.some((p) => lessonWidth(String(p.x), SPANS.label.size, ctx, true) > trackW)) return null
  return {
    height: SPANS.foot.top,
    node: (x, y) => (
      <g data-lesson-spans="">
        {points.map((p, j) => {
          const marked = p.emphasis === true
          const ink = marked ? inks.pen : inks.warning
          const trackX = x + CARD.pad
          const trackY = y + SPANS.track.top + j * SPANS.pitch
          const lo = trackX + p.y * k
          const hi = trackX + p.upper! * k
          const ends = [figure(p.y, unit), figure(p.upper!, unit)]
          const endInk = lessonText(ink, inks.paper, SPANS.ends.size)
          const clamp = (cx: number, text: string) => {
            const half = lessonWidth(text, SPANS.ends.size, ctx, true) / 2
            return Math.min(Math.max(cx, trackX + half), trackX + trackW - half)
          }
          return (
            <g key={j} data-lesson-span={marked ? "marked" : ""}>
              {paintLessonLine(String(p.x), { ctx, x: trackX, baseline: y + SPANS.label.baseline + j * SPANS.labelPitch, size: SPANS.label.size, bold: true, fill: lessonText(inks.muted, inks.paper, SPANS.label.size) })}
              <rect x={trackX} y={trackY} width={trackW} height={SPANS.track.h} rx={SPANS.track.h / 2} fill={inks.tint} />
              <rect data-plot-mark="1" x={lo} y={trackY} width={Math.max(SPANS.track.h, hi - lo)} height={SPANS.track.h} rx={SPANS.track.h / 2} fill={ink} />
              {paintLessonLine(ends[0]!, { ctx, x: clamp(lo, ends[0]!), baseline: trackY + SPANS.ends.drop, size: SPANS.ends.size, bold: true, anchor: "middle", fill: endInk })}
              {paintLessonLine(ends[1]!, { ctx, x: clamp(hi, ends[1]!), baseline: trackY + SPANS.ends.drop, size: SPANS.ends.size, bold: true, anchor: "middle", fill: endInk })}
            </g>
          )
        })}
      </g>
    ),
  }
}

function chartShape(c: Component | undefined): c is Chart {
  if (c?.type !== "chart" || c.chart_type !== "bar" || c.direction !== "horizontal") return false
  if (c.series.length !== 1 || c.reference || c.changes || c.bands || c.series[0]!.tone) return false
  const points = c.series[0]!.data
  return points.length >= 2 && points.length <= 3 && points.every((p) => !p.status && !p.note && p.y >= 0) && points.filter((p) => p.emphasis).length <= 1
}

export const diptychComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "lesson") return null
  const [p1, c1, p2, c2, tip, ...rest] = components
  if (p1?.type !== "insight_panel" || p2?.type !== "insight_panel" || !chartShape(c1) || !chartShape(c2) || rest.length > 0) return null
  if (tip !== undefined && !plainCallout(tip)) return null
  if (rect.h < (tip ? TIP.top + TIP.h : CARD.h)) return null
  const inks = lessonInks(ctx)
  const colon = ctx.figures?.chinese ? "：" : ": "
  const cardW = (rect.w - CARD.gap) / 2
  const inner = cardW - CARD.pad * 2
  const cards = ([[p1, c1], [p2, c2]] as [Panel, Chart][]).map(([panel, chart]) => {
    const spans = chart.series[0]!.data.every((p) => p.upper !== undefined)
    const drawn = spans ? spansMode(chart, cardW, ctx, inks) : barsMode(chart, cardW, ctx, inks)
    const foot = spans ? SPANS.foot : BARS.foot
    return {
      panel,
      chart,
      drawn,
      foot,
      title: fitLesson(panel.title, { width: cardW - CARD.title.x - CARD.pad, size: CARD.title.size, lineHeight: CARD.title.lineHeight, maxLines: 1, bold: true }, ctx),
      rows: panel.rows.map((row) => fitLesson(`${row.label.trim()}${colon}${row.text.trim()}`, { width: inner, size: CARD.rows.size, lineHeight: CARD.rows.lineHeight, maxLines: 1 }, ctx)),
      note: panel.footnote?.trim() ? fitLesson(panel.footnote, { width: inner, size: foot.size, lineHeight: foot.lineHeight, maxLines: foot.maxLines }, ctx) : null,
    }
  })
  for (const c of cards) {
    if (!c.drawn || !c.title || c.panel.rows.length > 2 || c.rows.some((r) => !r)) return null
    if (c.panel.footnote?.trim() && !c.note) return null
    if (c.note && c.foot.top + c.note.lines.length * c.foot.lineHeight > CARD.pill.top) return null
    if (c.chart.tag && pillWidth(c.chart.tag.text.trim(), ctx) > inner) return null
  }
  const fittedTip = tip && plainCallout(tip) ? fitTip(tip, rect.w, TIP_SPEC, ctx) : null
  if (tip && !fittedTip) return null

  return (
    <g {...compositionTag("diptych")}>
      {cards.map((c, i) => {
        const x = rect.x + i * (cardW + CARD.gap)
        const y = rect.y
        return (
          <g key={i} data-lesson-study="">
            {paintLessonCard({ x, y, w: cardW, h: CARD.h }, inks)}
            <g {...blockTag(ctx, c.panel)}>
              {c.panel.icon ? paintLessonIcon(c.panel.icon, x + CARD.pad, y + CARD.icon.top, CARD.icon.size, inks.pen, inks.paper) : null}
              {paintLesson(c.title!, { ctx, x: x + (c.panel.icon ? CARD.title.x : CARD.pad), top: y + CARD.title.top, bold: true, fill: lessonText(inks.ink, inks.paper, CARD.title.size), ground: inks.paper })}
              {c.rows.map((row, j) => (
                <g key={j}>{paintLesson(row!, { ctx, x: x + CARD.pad, top: y + CARD.rows.top + j * CARD.rows.lineHeight, fill: lessonText(inks.muted, inks.paper, CARD.rows.size), ground: inks.paper })}</g>
              ))}
              {c.note ? paintLesson(c.note, { ctx, x: x + CARD.pad, top: y + c.foot.top, fill: lessonText(inks.muted, inks.paper, c.foot.size), ground: inks.paper }) : null}
            </g>
            <g {...blockTag(ctx, c.chart)}>
              {c.drawn!.node(x, y, cardW)}
              {c.chart.tag ? paintPill({ ctx, tag: c.chart.tag, x: x + CARD.pad, y: y + CARD.pill.top, ground: inks.paper, inks }) : null}
            </g>
          </g>
        )
      })}
      {fittedTip ? paintTip(fittedTip, { x: rect.x, y: rect.y + TIP.top, w: rect.w, h: TIP.h }, TIP_SPEC, ctx, inks) : null}
    </g>
  )
}
