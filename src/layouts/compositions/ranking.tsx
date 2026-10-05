import type { Component } from "@/ir"
import { joinUnit } from "../../lib/quantity-format"
import { blendOver } from "../../render/ink"
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
} from "./lesson"

type Chart = Extract<Component, { type: "chart" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * ranking: how many do each thing, and one of them broken down, homeroom's
 * 2026-10 board (the risky habits page, p13). On the left the share who do
 * each thing, a bar a habit under the chart's axis title, the names right
 * aligned against the bars, every bar in the ghost but the one the page is
 * about, in the pen with its name and figure; the kind of survey as a pill
 * under the bars. On the right a card breaks the marked habit down: the
 * callout's icon in the pen and its title bold, the second chart's bars each
 * under its name, the marked one in the pen and the others stepping in the
 * order written from the mark down to the ghost, the callout's words muted
 * at its foot.
 *
 * Takes, in the lesson setting: a horizontal bar `chart` of one series of
 * three to six bars, a `callout` with a title and no tag, and a second
 * horizontal bar `chart` of one series of two to four bars.
 *
 * Declines: a name past its column, a figure past the plot, a card title past
 * one line, its words past two, and a pill wider than the plot.
 *
 * Reads: the lesson inks (`./lesson.tsx`), the body and heading faces.
 */

const MAIN = { title: { baseline: 10, size: 13 }, rows: { top: 30, pitch: 54 }, label: { right: 236, size: 15, baseline: 24 }, bar: { x: 252, dy: 6, h: 28 }, value: { gap: 10, baseline: 27, size: 16 }, pill: { gap: 26 }, scale: 440 } as const
const CARD = { x: 736, h: 400, pad: 24, icon: { top: 22, size: 24 }, title: { x: 60, top: 20, size: 16, lineHeight: 26 }, rows: { top: 74, pitch: 84 }, label: { baseline: 18, size: 14 }, bar: { dy: 28, h: 30 }, value: { gap: 10, baseline: 50, size: 20 }, foot: { top: 334, size: 14, lineHeight: 22, maxLines: 2 } } as const

function simpleBars(c: Component | undefined, min: number, max: number): c is Chart {
  if (c?.type !== "chart" || c.chart_type !== "bar" || c.direction !== "horizontal" || c.series.length !== 1) return false
  if (c.reference || c.changes || c.bands || c.series[0]!.tone) return false
  const points = c.series[0]!.data
  return points.length >= min && points.length <= max && points.every((p) => !p.status && !p.note && p.upper === undefined && p.y >= 0) && points.filter((p) => p.emphasis).length <= 1
}

function figure(v: number, unit: string | undefined): string {
  return joinUnit(String(Number(v.toPrecision(12))), unit)
}

export const rankingComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "lesson") return null
  const [main, callout, side, ...rest] = components
  if (!simpleBars(main, 3, 6) || callout?.type !== "callout" || !simpleBars(side, 2, 4) || rest.length > 0) return null
  const note = callout as Callout
  if (!note.title?.trim() || note.tag || side.tag || side.axes?.x_title?.trim()) return null
  if (rect.w < CARD.x + 360 || rect.h < CARD.h) return null
  const inks = lessonInks(ctx)
  const points = main.series[0]!.data
  const unit = main.axes?.x_unit
  const top = Math.max(...points.map((p) => p.y))
  const plotRight = rect.x + CARD.x - 16
  // The names take the board's 236px column, or as much more as the longest needs, and the bars start after it.
  const labelRight = Math.max(MAIN.label.right, Math.ceil(Math.max(...points.map((p) => lessonWidth(String(p.x), MAIN.label.size, ctx, p.emphasis === true)))) + 8)
  const barX = labelRight + (MAIN.bar.x - MAIN.label.right)
  const widestMain = Math.max(...points.map((p) => lessonWidth(figure(p.y, unit), MAIN.value.size, ctx, true)))
  const k = Math.min(MAIN.scale / (unit === "%" && top <= 100 ? 100 : top), (plotRight - rect.x - barX - MAIN.value.gap - widestMain) / top)
  if (k <= 0 || plotRight - rect.x - barX < 160) return null
  const title = main.axes?.x_title?.trim()
  if (title && lessonWidth(title, MAIN.title.size, ctx, true) > CARD.x - 16) return null
  const pillTop = MAIN.rows.top + points.length * MAIN.rows.pitch + MAIN.pill.gap - MAIN.rows.pitch + MAIN.bar.dy + MAIN.bar.h
  if (main.tag && pillWidth(main.tag.text.trim(), ctx) > CARD.x - 16) return null
  if (main.tag && pillTop + 22 > rect.h) return null

  const cardX = rect.x + CARD.x
  const cardW = rect.x + rect.w - cardX
  const inner = cardW - CARD.pad * 2
  const sidePoints = side.series[0]!.data
  const unmarked = sidePoints.flatMap((p, j) => (p.emphasis ? [] : [j]))
  const sideUnit = side.axes?.x_unit
  const sideTop = Math.max(...sidePoints.map((p) => p.y))
  const widest = Math.max(...sidePoints.map((p) => lessonWidth(figure(p.y, sideUnit), CARD.value.size, ctx, true)))
  const k2 = (inner - widest - CARD.value.gap) / sideTop
  if (k2 <= 0 || sidePoints.some((p) => lessonWidth(String(p.x), CARD.label.size, ctx, true) > inner)) return null
  if (CARD.rows.top + sidePoints.length * CARD.rows.pitch > CARD.foot.top + 8) return null
  const head = fitLesson(note.title, { width: cardW - CARD.title.x - CARD.pad, size: CARD.title.size, lineHeight: CARD.title.lineHeight, maxLines: 1, bold: true }, ctx)
  const foot = fitLesson(note.text, { width: inner, size: CARD.foot.size, lineHeight: CARD.foot.lineHeight, maxLines: CARD.foot.maxLines }, ctx)
  if (!head || !foot) return null

  return (
    <g {...compositionTag("ranking")}>
      <g {...blockTag(ctx, main)} data-lesson-ranking="">
        {title ? paintLessonLine(title, { ctx, x: rect.x, baseline: rect.y + MAIN.title.baseline, size: MAIN.title.size, bold: true, fill: lessonText(inks.ink, inks.ground, MAIN.title.size) }) : null}
        {points.map((p, i) => {
          const y = rect.y + MAIN.rows.top + i * MAIN.rows.pitch
          const marked = p.emphasis === true
          const w = Math.max(2, p.y * k)
          return (
            <g key={i} data-lesson-bar={marked ? "marked" : ""}>
              {paintLessonLine(String(p.x), { ctx, x: rect.x + labelRight, baseline: y + MAIN.label.baseline, size: MAIN.label.size, bold: marked, anchor: "end", fill: lessonText(marked ? inks.pen : inks.ink, inks.ground, MAIN.label.size) })}
              <rect data-plot-mark="1" x={rect.x + barX} y={y + MAIN.bar.dy} width={w} height={MAIN.bar.h} rx={3} fill={marked ? inks.pen : inks.ghost} />
              {paintLessonLine(figure(p.y, unit), { ctx, x: rect.x + barX + w + MAIN.value.gap, baseline: y + MAIN.value.baseline, size: MAIN.value.size, bold: true, fill: lessonText(marked ? inks.pen : inks.ink, inks.ground, MAIN.value.size) })}
            </g>
          )
        })}
        {main.tag ? paintPill({ ctx, tag: main.tag, x: rect.x, y: rect.y + pillTop, ground: inks.ground, inks }) : null}
      </g>
      <g data-lesson-breakdown="">
        {paintLessonCard({ x: cardX, y: rect.y, w: cardW, h: CARD.h }, inks)}
        <g {...blockTag(ctx, note)}>
          {note.icon ? paintLessonIcon(note.icon, cardX + CARD.pad, rect.y + CARD.icon.top, CARD.icon.size, inks.pen, inks.paper) : null}
          {paintLesson(head, { ctx, x: cardX + (note.icon ? CARD.title.x : CARD.pad), top: rect.y + CARD.title.top, bold: true, fill: lessonText(inks.ink, inks.paper, CARD.title.size), ground: inks.paper })}
          {paintLesson(foot, { ctx, x: cardX + CARD.pad, top: rect.y + CARD.foot.top, fill: lessonText(inks.muted, inks.paper, CARD.foot.size), ground: inks.paper })}
        </g>
        <g {...blockTag(ctx, side)}>
          {sidePoints.map((p, j) => {
            const y = rect.y + CARD.rows.top + j * CARD.rows.pitch
            const marked = p.emphasis === true
            const u = unmarked.indexOf(j)
            const ink = marked ? inks.pen : blendOver(inks.ghost, inks.mark, unmarked.length <= 1 ? 0 : u / (unmarked.length - 1))
            const w = Math.max(2, p.y * k2)
            return (
              <g key={j} data-lesson-bar={marked ? "marked" : ""}>
                {paintLessonLine(String(p.x), { ctx, x: cardX + CARD.pad, baseline: y + CARD.label.baseline, size: CARD.label.size, bold: true, fill: lessonText(inks.ink, inks.paper, CARD.label.size) })}
                <rect data-plot-mark="1" x={cardX + CARD.pad} y={y + CARD.bar.dy} width={w} height={CARD.bar.h} rx={3} fill={ink} />
                {paintLessonLine(figure(p.y, sideUnit), { ctx, x: cardX + CARD.pad + w + CARD.value.gap, baseline: y + CARD.value.baseline, size: CARD.value.size, bold: true, fill: lessonText(ink, inks.paper, CARD.value.size) })}
              </g>
            )
          })}
        </g>
      </g>
    </g>
  )
}
