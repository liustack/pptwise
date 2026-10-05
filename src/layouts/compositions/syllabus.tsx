import type { Component } from "@/ir"
import { roadmapPeriodText } from "../../components/roadmap"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitLesson,
  lessonInks,
  lessonText,
  lessonWidth,
  paintLesson,
  paintLessonCard,
  paintLessonEdge,
  paintLessonIcon,
  paintLessonLine,
  paintPill,
  pillWidth,
  PILL,
  type LessonInks,
} from "./lesson"
import { fitTip, paintTip, plainCallout, type TipSpec } from "./lesson-tips"

type Roadmap = Extract<Component, { type: "roadmap" }>
type Phase = Roadmap["items"][number]

/*
 * syllabus: a class laid out by the minute, homeroom's 2026-10 board (the
 * agenda page, p03). Across the top a bar of the whole class, each part as
 * long as it lasts (`duration`), named under its start with its length
 * (「环节一 · 15 分钟」), a question mark in a ring where it ends on a check
 * (`checkpoint`). Under it a card for each part, its top edge in the part's
 * ink: its icon and name, its title bold, what it covers as a short list
 * (`points`), its check as a pill and its rows (「目标：会挑任务」) at the
 * foot. The part the page is about (`emphasis`) is in the pen, the closing
 * part of three or more in the palette's quieter ink, the others in the mark.
 * Under the cards the classroom's rule in a tip box.
 *
 * Takes, in the lesson setting: a `roadmap` of two to four phases that all
 * carry a duration, then optionally a `callout` with no title or tag.
 *
 * Declines: a name under the bar wider than its part, a title past two lines,
 * more points than the card holds, a pill wider than the card, a row past
 * one line, and the tip past one line.
 *
 * Reads: the lesson inks (`./lesson.tsx`), the body and heading faces.
 */

const BAR = { top: 10, h: 14, gap: 6, label: { baseline: 50, size: 13 }, check: { inset: 30, r: 13, size: 15, baseline: 22 } } as const
const CARD = { top: 76, h: 260, gap: 20, pad: 20, icon: { top: 22, size: 24 }, name: { x: 54, top: 20, size: 14, lineHeight: 26 }, title: { top: 58, size: 19, lineHeight: 28, maxLines: 2 }, points: { top: 124, pitch: 28, size: 14, lineHeight: 24 }, chip: { top: 188 }, rows: { foot: 246, size: 13, lineHeight: 22 } } as const
const TIP = { top: 360, h: 60 } as const
const TIP_SPEC: TipSpec = { size: 17, lineHeight: 26, maxLines: 1, textX: 60, icon: { x: 18, size: 24 } }

function phaseInk(item: Phase, i: number, n: number, inks: LessonInks): string {
  if (item.emphasis) return inks.pen
  return n >= 3 && i === n - 1 ? inks.quiet : inks.mark
}

export const syllabusComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "lesson") return null
  const [road, tip, ...rest] = components
  if (road?.type !== "roadmap" || rest.length > 0) return null
  if (tip !== undefined && !plainCallout(tip)) return null
  const r = road as Roadmap
  const n = r.items.length
  if (n < 2 || n > 4 || r.items.some((item) => item.duration === undefined)) return null
  if (rect.h < (tip ? TIP.top + TIP.h : CARD.top + CARD.h)) return null
  const inks = lessonInks(ctx)
  const colon = ctx.figures?.chinese ? "：" : ": "
  const total = r.items.reduce((sum, item) => sum + item.duration!, 0)
  const k = rect.w / total
  const cardW = (rect.w - (n - 1) * CARD.gap) / n
  const inner = cardW - CARD.pad * 2
  let cum = 0
  const parts = r.items.map((item, i) => {
    const x = rect.x + cum * k
    cum += item.duration!
    const w = item.duration! * k - BAR.gap
    const label = roadmapPeriodText(item, r.duration_unit) ?? ""
    const chip = item.checkpoint?.trim() ? `${item.checkpoint.trim()} ?` : null
    const rows = (item.rows ?? []).map((row) => `${row.label.trim()}${colon}${row.value.trim()}`)
    return {
      item,
      x,
      w,
      ink: phaseInk(item, i, n, inks),
      label,
      labelFits: lessonWidth(label, BAR.label.size, ctx, true) <= w + BAR.gap - 4,
      name: item.period?.trim() ? fitLesson(item.period, { width: inner - CARD.name.x + CARD.pad, size: CARD.name.size, lineHeight: CARD.name.lineHeight, maxLines: 1, bold: true }, ctx) : null,
      title: fitLesson(item.title, { width: inner, size: CARD.title.size, lineHeight: CARD.title.lineHeight, maxLines: CARD.title.maxLines, bold: true }, ctx),
      points: (item.points ?? []).map((p) => fitLesson(`· ${p}`, { width: inner, size: CARD.points.size, lineHeight: CARD.points.lineHeight, maxLines: 1 }, ctx)),
      chip,
      rows: rows.map((row) => fitLesson(row, { width: inner, size: CARD.rows.size, lineHeight: CARD.rows.lineHeight, maxLines: 1, bold: true }, ctx)),
    }
  })
  for (const p of parts) {
    if (!p.labelFits || !p.title || (p.item.period?.trim() && !p.name) || p.points.some((x) => !x) || p.rows.some((x) => !x)) return null
    if (p.chip && pillWidth(p.chip, ctx) > inner) return null
    const pointsFoot = CARD.points.top + p.points.length * CARD.points.pitch
    const rowsTop = CARD.rows.foot - p.rows.length * CARD.rows.lineHeight
    const chipFoot = p.chip ? CARD.chip.top + PILL.height : 0
    if (p.chip && pointsFoot > CARD.chip.top + 4) return null
    if (rowsTop < Math.max(pointsFoot, chipFoot) + 4) return null
  }
  const fittedTip = tip && plainCallout(tip) ? fitTip(tip, rect.w, TIP_SPEC, ctx) : null
  if (tip && !fittedTip) return null

  const barY = rect.y + BAR.top
  return (
    <g {...compositionTag("syllabus")}>
      <g {...blockTag(ctx, r)}>
        {parts.map((p, i) => (
          <g key={i} data-lesson-phase={p.item.emphasis ? "marked" : ""}>
            <rect x={p.x} y={barY} width={Math.max(0, p.w)} height={BAR.h} rx={BAR.h / 2} fill={p.ink} />
            {paintLessonLine(p.label, { ctx, x: p.x, baseline: rect.y + BAR.label.baseline, size: BAR.label.size, bold: true, fill: lessonText(p.ink, inks.ground, BAR.label.size) })}
            {p.chip ? (
              <g data-lesson-checkpoint="">
                <circle cx={p.x + p.w - BAR.check.inset} cy={barY + BAR.h / 2} r={BAR.check.r} fill={inks.paper} stroke={p.ink} strokeWidth={2} />
                {paintLessonLine("?", { ctx, x: p.x + p.w - BAR.check.inset, baseline: rect.y + BAR.check.baseline, size: BAR.check.size, bold: true, anchor: "middle", fill: lessonText(p.ink, inks.paper, BAR.check.size) })}
              </g>
            ) : null}
          </g>
        ))}
        {parts.map((p, i) => {
          const x = rect.x + i * (cardW + CARD.gap)
          const top = rect.y + CARD.top
          const box = { x, y: top, w: cardW, h: CARD.h }
          const textX = x + CARD.pad
          const rowsTop = top + CARD.rows.foot - p.rows.length * CARD.rows.lineHeight
          return (
            <g key={`c${i}`} data-lesson-part="">
              {paintLessonCard(box, inks)}
              {paintLessonEdge(box, p.ink)}
              {p.item.icon ? paintLessonIcon(p.item.icon, textX, top + CARD.icon.top, CARD.icon.size, p.ink, inks.paper) : null}
              {p.name ? paintLesson(p.name, { ctx, x: x + CARD.name.x, top: top + CARD.name.top, bold: true, fill: lessonText(p.ink, inks.paper, CARD.name.size), ground: inks.paper }) : null}
              {paintLesson(p.title!, { ctx, x: textX, top: top + CARD.title.top, bold: true, fill: lessonText(inks.ink, inks.paper, CARD.title.size), ground: inks.paper })}
              {p.points.map((point, j) => (
                <g key={j}>{paintLesson(point!, { ctx, x: textX, top: top + CARD.points.top + j * CARD.points.pitch, fill: lessonText(inks.muted, inks.paper, CARD.points.size), ground: inks.paper })}</g>
              ))}
              {p.chip ? paintPill({ ctx, tag: { text: p.chip }, x: textX, y: top + CARD.chip.top, ground: inks.paper, inks: { ...inks, mark: p.ink } }) : null}
              {p.rows.map((row, j) => (
                <g key={`r${j}`}>{paintLesson(row!, { ctx, x: textX, top: rowsTop + j * CARD.rows.lineHeight, bold: true, fill: lessonText(inks.ink, inks.paper, CARD.rows.size), ground: inks.paper })}</g>
              ))}
            </g>
          )
        })}
      </g>
      {fittedTip ? paintTip(fittedTip, { x: rect.x, y: rect.y + TIP.top, w: rect.w, h: TIP.h }, TIP_SPEC, ctx, inks) : null}
    </g>
  )
}
