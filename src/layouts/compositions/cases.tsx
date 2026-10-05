import type { Component } from "@/ir"
import { kpiFigure } from "../../components/kpi"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitLesson,
  lessonInks,
  lessonMeta,
  lessonText,
  lessonWidth,
  paintLesson,
  paintLessonCard,
  paintLessonEdge,
  paintLessonIcon,
  paintLessonLine,
} from "./lesson"
import { fitTip, paintTip, plainCallout, type TipSpec } from "./lesson-tips"

type Comparison = Extract<Component, { type: "comparison" }>
type KpiCards = Extract<Component, { type: "kpi_cards" }>

/*
 * cases: what happened and who paid, case by case, homeroom's 2026-10 board
 * (the three cases, p12). A card a case, its top edge in the pen: its icon in
 * the pen and its name bold at 22px, its date (the row's quiet tag) muted at
 * the top right, then each column of the comparison as a section under its
 * header: the first header in the mark over the case at 15px, a hairline,
 * the second header in the pen over who paid, bold at 16px, and a third
 * column, the source, muted at the card's foot after its header. Under the
 * cards the line the page quotes in a tip box, and beside it the figure that
 * says it keeps happening: a number in the pen with what it counts.
 *
 * Takes, in the lesson setting: a `comparison` whose rows are two to four
 * cases (each with an icon and an optional quiet tag) and whose columns are
 * two or three, then optionally a `callout` with no title or tag, and
 * optionally a `kpi_cards` of one item with no tag, delta or tone.
 *
 * Declines: a row marked or recommended, a tag that is not quiet, a name past
 * one line, a case past three lines, who paid past two, a source past one,
 * and a quote or a figure past its box.
 *
 * Reads: the lesson inks (`./lesson.tsx`), the body and heading faces.
 */

const CARD = { gap: 24, h: 330, pad: 20, icon: { top: 22, size: 26 }, name: { x: 58, top: 20, size: 22, lineHeight: 30 }, date: { top: 26, size: 13, lineHeight: 22 }, first: { head: 66, top: 88, size: 15, lineHeight: 24, maxLines: 3 }, rule: 186, second: { head: 198, top: 220, size: 16, lineHeight: 26, maxLines: 2 }, head: { size: 12, lineHeight: 20 }, foot: { top: 294, size: 12, lineHeight: 20 } } as const
const LOW = { top: 350, h: 70, quoteW: 760, gap: 24 } as const
const TIP_SPEC: TipSpec = { size: 15, lineHeight: 23, maxLines: 2, textX: 56, icon: { x: 16, size: 22 } }
const FIGURE = { pad: 20, value: { size: 30, top: 6, lineHeight: 40 }, label: { top: 10, size: 13, lineHeight: 20, maxLines: 2, minX: 136 }, gap: 16 } as const

export const casesComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "lesson") return null
  const [table, ...others] = components
  if (table?.type !== "comparison") return null
  const t = table as Comparison
  const n = t.rows.length
  if (n < 2 || n > 4 || t.columns.length < 2 || t.columns.length > 3 || t.recommended !== undefined || t.label_column || t.tag_column || t.title) return null
  if (t.rows.some((row) => row.emphasis || !row.icon || (row.tag && !row.tag.quiet))) return null
  let quote = null as Extract<Component, { type: "callout" }> | null
  let figure: KpiCards | null = null
  for (const c of others) {
    if (plainCallout(c) && !quote && !figure) quote = c
    else if (c.type === "kpi_cards" && !figure) figure = c
    else return null
  }
  if (figure && (figure.items.length !== 1 || figure.items[0]!.tag || figure.items[0]!.delta || figure.items[0]!.tone || figure.items[0]!.note?.trim() || figure.items[0]!.source?.trim())) return null
  if (rect.h < (quote || figure ? LOW.top + LOW.h : CARD.h)) return null
  const inks = lessonInks(ctx)
  const colon = ctx.figures?.chinese ? "：" : ": "
  const cardW = (rect.w - (n - 1) * CARD.gap) / n
  const inner = cardW - CARD.pad * 2
  const heads = t.columns.map((c) => c.trim())
  if (heads.slice(0, 2).some((h) => lessonWidth(h, CARD.head.size, ctx, true) > inner)) return null
  const cases = t.rows.map((row) => {
    const date = row.tag?.text.trim()
    const dateW = date ? lessonWidth(date, CARD.date.size, ctx) + 12 : 0
    return {
      row,
      date,
      name: fitLesson(row.label, { width: inner - (CARD.name.x - CARD.pad) - dateW, size: CARD.name.size, lineHeight: CARD.name.lineHeight, maxLines: 1, bold: true }, ctx),
      first: fitLesson(row.cells[0], { width: inner, size: CARD.first.size, lineHeight: CARD.first.lineHeight, maxLines: CARD.first.maxLines }, ctx),
      second: fitLesson(row.cells[1], { width: inner, size: CARD.second.size, lineHeight: CARD.second.lineHeight, maxLines: CARD.second.maxLines, bold: true }, ctx),
      foot: heads[2] ? fitLesson(`${heads[2]}${colon}${row.cells[2] ?? ""}`, { width: inner, size: CARD.foot.size, lineHeight: CARD.foot.lineHeight, maxLines: 1 }, ctx) : null,
    }
  })
  if (cases.some((c) => !c.name || !c.first || !c.second || (heads[2] && !c.foot))) return null
  const figureX = quote ? rect.x + LOW.quoteW + LOW.gap : rect.x
  const figureW = rect.x + rect.w - figureX
  const quoteW = figure ? LOW.quoteW : rect.w
  const fittedQuote = quote ? fitTip(quote, quoteW, TIP_SPEC, ctx) : null
  if (quote && !fittedQuote) return null
  const item = figure?.items[0]
  const fig = item ? kpiFigure(item.value, item.unit) : null
  const valueW = fig ? lessonWidth(fig.text, FIGURE.value.size, ctx, true) : 0
  const labelDx = Math.max(valueW + FIGURE.gap, FIGURE.label.minX)
  const figLabel = item ? fitLesson(item.label, { width: figureW - FIGURE.pad * 2 - labelDx, size: FIGURE.label.size, lineHeight: FIGURE.label.lineHeight, maxLines: FIGURE.label.maxLines }, ctx) : null
  if (item && !figLabel) return null

  const top = rect.y
  return (
    <g {...compositionTag("cases")}>
      <g {...blockTag(ctx, t)}>
        {cases.map((c, i) => {
          const x = rect.x + i * (cardW + CARD.gap)
          const box = { x, y: top, w: cardW, h: CARD.h }
          return (
            <g key={i} data-lesson-case="">
              {paintLessonCard(box, inks)}
              {paintLessonEdge(box, inks.pen)}
              {paintLessonIcon(c.row.icon!, x + CARD.pad, top + CARD.icon.top, CARD.icon.size, inks.pen, inks.paper)}
              {paintLesson(c.name!, { ctx, x: x + CARD.name.x, top: top + CARD.name.top, bold: true, fill: lessonText(inks.ink, inks.paper, CARD.name.size), ground: inks.paper })}
              {c.date ? paintLessonLine(c.date, { ctx, x: x + cardW - CARD.pad, top: top + CARD.date.top, lineHeight: CARD.date.lineHeight, size: CARD.date.size, anchor: "end", fill: lessonText(inks.muted, inks.paper, CARD.date.size) }) : null}
              {paintLessonLine(heads[0]!, { ctx, x: x + CARD.pad, top: top + CARD.first.head, lineHeight: CARD.head.lineHeight, size: CARD.head.size, bold: true, fill: lessonText(inks.mark, inks.paper, CARD.head.size) })}
              {paintLesson(c.first!, { ctx, x: x + CARD.pad, top: top + CARD.first.top, fill: lessonText(inks.ink, inks.paper, CARD.first.size), ground: inks.paper })}
              <rect x={x + CARD.pad} y={top + CARD.rule} width={inner} height={1} fill={inks.line} />
              {paintLessonLine(heads[1]!, { ctx, x: x + CARD.pad, top: top + CARD.second.head, lineHeight: CARD.head.lineHeight, size: CARD.head.size, bold: true, fill: lessonText(inks.pen, inks.paper, CARD.head.size) })}
              {paintLesson(c.second!, { ctx, x: x + CARD.pad, top: top + CARD.second.top, bold: true, fill: lessonText(inks.ink, inks.paper, CARD.second.size), ground: inks.paper })}
              {c.foot ? paintLesson(c.foot, { ctx, x: x + CARD.pad, top: top + CARD.foot.top, fill: lessonMeta(inks.muted, inks.paper) }) : null}
            </g>
          )
        })}
      </g>
      {fittedQuote ? paintTip(fittedQuote, { x: rect.x, y: top + LOW.top, w: quoteW, h: LOW.h }, TIP_SPEC, ctx, inks) : null}
      {item && fig && figLabel ? (
        <g {...blockTag(ctx, figure!)} data-lesson-count="">
          {paintLessonCard({ x: figureX, y: top + LOW.top, w: figureW, h: LOW.h }, inks)}
          {paintLessonLine(fig.text, { ctx, x: figureX + FIGURE.pad, top: top + LOW.top + FIGURE.value.top, lineHeight: FIGURE.value.lineHeight, size: FIGURE.value.size, bold: true, fill: lessonText(fig.marked ? inks.pen : inks.ink, inks.paper, FIGURE.value.size) })}
          {paintLesson(figLabel, { ctx, x: figureX + FIGURE.pad + labelDx, top: top + LOW.top + FIGURE.label.top, fill: lessonText(inks.ink, inks.paper, FIGURE.label.size), ground: inks.paper })}
        </g>
      ) : null}
    </g>
  )
}
