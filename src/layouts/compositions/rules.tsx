import type { Component } from "@/ir"
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

type IconCards = Extract<Component, { type: "icon_cards" }>

/*
 * rules: the house rules, each with what it rests on, homeroom's 2026-10
 * board (the six rules page, p15). A card a rule, three to a row: its icon in
 * the mark on a disc of the mark's tint, its name bold at 20px, the rule at
 * 15px, and at its foot the provision it rests on as a pill in the pen after
 * the word 「依据」 ("Basis"), the label a rule's tag takes when it cites a
 * law (`basis: "law"`). A tag of any other kind stands at the foot alone.
 *
 * Takes, in the lesson setting: an `icon_cards` of three to six rules, each
 * with a tag.
 *
 * Declines: a rule's name past one line, its text past two, and a pill wider
 * than its card.
 *
 * Reads: the lesson inks (`./lesson.tsx`), the body and heading faces.
 */

const CARD = { gap: 24, rowGap: 16, h: 196, pad: 20, disc: { cx: 42, cy: 42, r: 22 }, icon: { at: 30, size: 24 }, title: { x: 78, top: 28, size: 20, lineHeight: 30 }, text: { top: 80, size: 15, lineHeight: 24, maxLines: 2 }, basis: { top: 150, size: 12, lineHeight: 22, gap: 16 } } as const

export const rulesComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "lesson") return null
  const [cards, ...rest] = components
  if (cards?.type !== "icon_cards" || rest.length > 0) return null
  const c = cards as IconCards
  const n = c.items.length
  if (n < 3 || n > 6 || c.items.some((item) => !item.tag)) return null
  const cols = n === 4 ? 2 : 3
  const rows = Math.ceil(n / cols)
  if (rows * CARD.h + (rows - 1) * CARD.rowGap > rect.h) return null
  const inks = lessonInks(ctx)
  const cardW = (rect.w - (cols - 1) * CARD.gap) / cols
  const inner = cardW - CARD.pad * 2
  const word = ctx.figures?.chinese ? "依据" : "Basis"
  const wordW = lessonWidth(word, CARD.basis.size, ctx) + CARD.basis.gap
  const fitted = c.items.map((item) => {
    const law = item.tag!.basis === "law"
    return {
      law,
      title: fitLesson(item.title, { width: cardW - CARD.title.x - CARD.pad, size: CARD.title.size, lineHeight: CARD.title.lineHeight, maxLines: 1, bold: true }, ctx),
      text: fitLesson(item.text, { width: inner, size: CARD.text.size, lineHeight: CARD.text.lineHeight, maxLines: CARD.text.maxLines }, ctx),
      pillW: pillWidth(item.tag!.text.trim(), ctx),
    }
  })
  if (fitted.some((f) => !f.title || !f.text || f.pillW + (f.law ? wordW : 0) > inner)) return null

  return (
    <g {...compositionTag("rules")}>
      <g {...blockTag(ctx, c)}>
        {c.items.map((item, i) => {
          const x = rect.x + (i % cols) * (cardW + CARD.gap)
          const y = rect.y + Math.floor(i / cols) * (CARD.h + CARD.rowGap)
          const f = fitted[i]!
          return (
            <g key={i} data-lesson-rule="">
              {paintLessonCard({ x, y, w: cardW, h: CARD.h }, inks)}
              <circle cx={x + CARD.disc.cx} cy={y + CARD.disc.cy} r={CARD.disc.r} fill={inks.tint} />
              {paintLessonIcon(item.icon, x + CARD.icon.at, y + CARD.icon.at, CARD.icon.size, inks.mark, inks.tint)}
              {paintLesson(f.title!, { ctx, x: x + CARD.title.x, top: y + CARD.title.top, bold: true, fill: lessonText(inks.ink, inks.paper, CARD.title.size), ground: inks.paper })}
              {paintLesson(f.text!, { ctx, x: x + CARD.pad, top: y + CARD.text.top, fill: lessonText(inks.ink, inks.paper, CARD.text.size), ground: inks.paper })}
              {f.law ? paintLessonLine(word, { ctx, x: x + CARD.pad, top: y + CARD.basis.top, lineHeight: CARD.basis.lineHeight, size: CARD.basis.size, fill: lessonText(inks.muted, inks.paper, CARD.basis.size) }) : null}
              {paintPill({ ctx, tag: item.tag!, x: x + CARD.pad + (f.law ? wordW : 0), y: y + CARD.basis.top, ground: inks.paper, inks })}
            </g>
          )
        })}
      </g>
    </g>
  )
}
