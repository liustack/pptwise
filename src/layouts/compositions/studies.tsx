import type { Component } from "@/ir"
import { kpiFigure } from "../../components/kpi"
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
  glossBreak,
  splitLead,
} from "./lesson"
import { fitTip, paintTip, plainCallout, type TipSpec } from "./lesson-tips"

type KpiCards = Extract<Component, { type: "kpi_cards" }>

/*
 * studies: what each study found, side by side, homeroom's 2026-10 board
 * (the four studies page, p05). One card a study, its top edge in the mark:
 * its icon and its field (「写作」) at the top, the figure bold at 44px, what
 * the figure measures bold under it (「用时」), the finding beside it muted,
 * a hairline, who was studied, and at the foot a pill saying what kind of
 * study it is (a journal's in the success ink, a working paper's or a
 * vendor's in the warning ink). The study the page leads with (its figure
 * written `**…**`) takes the pen for its edge and its figure. Under the cards
 * a caution in a dashed outline of the pen.
 *
 * A card's label is written 「领域：指标」 ("Field: measure"), the field set
 * at the top beside the icon and the measure under the figure; a label with
 * no colon is set at the top alone. Its `note` is the finding, its `source`
 * who was studied, its `tag` the kind of study.
 *
 * Takes, in the lesson setting: a `kpi_cards` of two to four items with no
 * delta or tone, then optionally a `callout` with no title or tag.
 *
 * Declines: a figure wider than its card at 44px, a field, measure, finding
 * or sample past one line, a pill wider than the card, and a caution past
 * one line.
 *
 * Reads: the lesson inks (`./lesson.tsx`), the body and heading faces.
 */

const CARD = { h: 320, gap: 20, pad: 20, icon: { top: 22, size: 24 }, field: { x: 54, top: 20, size: 16, lineHeight: 28 }, value: { top: 62, size: 44, lineHeight: 56, unit: 20 }, measure: { top: 122, size: 15, lineHeight: 24 }, note: { top: 150, size: 14, lineHeight: 24 }, rule: 184, sample: { top: 198, size: 13, lineHeight: 22 }, pill: { top: 274 } } as const
const TIP = { top: 344, h: 56 } as const
const TIP_SPEC: TipSpec = { size: 16, lineHeight: 24, maxLines: 1, textX: 56, icon: { x: 16, size: 22 } }

export const studiesComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "lesson") return null
  const [figures, tip, ...rest] = components
  if (figures?.type !== "kpi_cards" || rest.length > 0) return null
  if (tip !== undefined && !plainCallout(tip)) return null
  const k = figures as KpiCards
  const n = k.items.length
  if (n < 2 || n > 4 || k.items.some((item) => item.delta || item.tone)) return null
  if (rect.h < (tip ? TIP.top + TIP.h : CARD.h)) return null
  const inks = lessonInks(ctx)
  const cardW = (rect.w - (n - 1) * CARD.gap) / n
  const inner = cardW - CARD.pad * 2
  const fitted = k.items.map((item) => {
    const split = splitLead(item.label)
    const field = split?.lead ?? item.label
    const measure = split?.rest ?? null
    const fig = kpiFigure(item.value, item.unit)
    const valueW = lessonWidth(fig.text, CARD.value.size, ctx, true) + (fig.unit ? 8 + lessonWidth(fig.unit, CARD.value.unit, ctx, true) : 0)
    return {
      item,
      fig,
      valueFits: valueW <= inner,
      field: fitLesson(field, { width: inner - (item.icon ? CARD.field.x - CARD.pad : 0), size: CARD.field.size, lineHeight: CARD.field.lineHeight, maxLines: 1, bold: true }, ctx),
      measure: measure ? fitLesson(measure, { width: inner, size: CARD.measure.size, lineHeight: CARD.measure.lineHeight, maxLines: 1, bold: true }, ctx) : null,
      measureText: measure,
      sep: split?.sep,
      note: item.note?.trim() ? fitLesson(item.note, { width: inner, size: CARD.note.size, lineHeight: CARD.note.lineHeight, maxLines: 1 }, ctx) : null,
      sample: item.source?.trim() ? fitLesson(item.source, { width: inner, size: CARD.sample.size, lineHeight: CARD.sample.lineHeight, maxLines: 1 }, ctx) : null,
    }
  })
  for (const f of fitted) {
    if (!f.valueFits || !f.field || (f.measureText && !f.measure) || (f.item.note?.trim() && !f.note) || (f.item.source?.trim() && !f.sample)) return null
    if (f.item.tag && pillWidth(f.item.tag.text.trim(), ctx) > inner) return null
  }
  const fittedTip = tip && plainCallout(tip) ? fitTip(tip, rect.w, TIP_SPEC, ctx) : null
  if (tip && !fittedTip) return null

  return (
    <g {...compositionTag("studies")}>
      <g {...blockTag(ctx, k)}>
        {fitted.map((f, i) => {
          const x = rect.x + i * (cardW + CARD.gap)
          const box = { x, y: rect.y, w: cardW, h: CARD.h }
          const lead = f.fig.marked ? inks.pen : inks.mark
          const textX = x + CARD.pad
          const valueInk = lessonText(f.fig.marked ? inks.pen : inks.ink, inks.paper, CARD.value.size)
          const valueBaseline = rect.y + CARD.value.top + Math.round(CARD.value.lineHeight / 2 + CARD.value.size * 0.385)
          return (
            <g key={i} data-lesson-study={f.fig.marked ? "marked" : ""}>
              {paintLessonCard(box, inks)}
              {paintLessonEdge(box, lead)}
              {f.item.icon ? paintLessonIcon(f.item.icon, textX, rect.y + CARD.icon.top, CARD.icon.size, lead, inks.paper) : null}
              <g data-lesson-label="">
                {paintLesson(f.field!, { ctx, x: f.item.icon ? x + CARD.field.x : textX, top: rect.y + CARD.field.top, bold: true, fill: lessonText(inks.ink, inks.paper, CARD.field.size), ground: inks.paper, lastAttrs: glossBreak(f.measure ? f.sep : undefined) })}
                {f.measure ? paintLesson(f.measure, { ctx, x: textX, top: rect.y + CARD.measure.top, bold: true, fill: lessonText(inks.ink, inks.paper, CARD.measure.size), ground: inks.paper }) : null}
              </g>
              {paintLessonLine(f.fig.text, { ctx, x: textX, baseline: valueBaseline, size: CARD.value.size, bold: true, fill: valueInk })}
              {f.fig.unit
                ? paintLessonLine(f.fig.unit, { ctx, x: textX + lessonWidth(f.fig.text, CARD.value.size, ctx, true) + 8, baseline: valueBaseline, size: CARD.value.unit, bold: true, fill: lessonText(f.fig.marked ? inks.pen : inks.ink, inks.paper, CARD.value.unit) })
                : null}
              {f.note ? paintLesson(f.note, { ctx, x: textX, top: rect.y + CARD.note.top, fill: lessonText(inks.muted, inks.paper, CARD.note.size), ground: inks.paper }) : null}
              {f.sample ? <rect x={textX} y={rect.y + CARD.rule} width={inner} height={1} fill={inks.line} /> : null}
              {f.sample ? paintLesson(f.sample, { ctx, x: textX, top: rect.y + CARD.sample.top, fill: lessonText(inks.muted, inks.paper, CARD.sample.size), ground: inks.paper }) : null}
              {f.item.tag ? paintPill({ ctx, tag: f.item.tag, x: textX, y: rect.y + CARD.pill.top, ground: inks.paper, inks }) : null}
            </g>
          )
        })}
      </g>
      {fittedTip ? paintTip(fittedTip, { x: rect.x, y: rect.y + TIP.top, w: rect.w, h: TIP.h }, TIP_SPEC, ctx, inks) : null}
    </g>
  )
}
