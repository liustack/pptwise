import type { Component } from "@/ir"
import type { EmphasisHeadingLayout } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitLesson,
  lessonInks,
  lessonMeta,
  lessonText,
  lessonWidth,
  paintCheckbox,
  paintLesson,
  paintLessonLine,
  paintLessonPhoto,
  paintRuled,
  ruleLines,
  ruleUnder,
  writtenLines,
  type WrittenLine,
} from "./lesson"

type Image = Extract<Component, { type: "image" }>
type RowCards = Extract<Component, { type: "row_cards" }>

/*
 * quiz: questions for the room to answer, homeroom's 2026-10 board (the
 * quizzes, p09 and p18). A photograph of the class on the left with its
 * caption, and beside it each question on a card of ruled paper with a red
 * margin: its number in the pen in the margin, its case bold in the mark
 * (「情景一」), the case itself at 17px, and at its right a box for each of
 * the page's choices (the page's `ballot`, 「可以 / 不行 / 先别急」) with the
 * choice beside it, left blank for the room.
 *
 * The rules fall every 32px under the lines of writing, the first just under
 * the case's name and its number, so no rule runs through a word or within
 * 4px of one (`ruleLines`).
 *
 * Takes, in the lesson setting, on a page with a ballot of two to four
 * choices: optionally an `image`, then a `row_cards` of two to four cases
 * with a title and a text and nothing else.
 *
 * Declines: a page with no ballot, a case's title past one line, its text
 * past two, a choice wider than its box's room, and cards taller than the
 * band.
 *
 * Reads: the lesson inks (`./lesson.tsx`), the body and heading faces.
 */

/** A question's card. The number in the margin stands on the case name's baseline. */
export const QUESTION = { pitch: 142, h: 128, rule: 32, margin: 56, number: { x: 28, size: 22 }, label: { x: 72, top: 14, size: 14, lineHeight: 24 }, text: { x: 72, top: 42, size: 17, lineHeight: 30, maxLines: 2 } } as const

/**
 * The writing on a question's card whose top is `y`: the case's name and its
 * number on one baseline, then the case's lines, then `more` (the choices or
 * the reason), and where its rules fall.
 */
export function questionPaper(y: number, h: number, label: EmphasisHeadingLayout, text: EmphasisHeadingLayout, more: readonly WrittenLine[]): { number: number; rules: number[] } {
  const name = writtenLines(label, y + QUESTION.label.top)
  const number = name[0]!.baseline
  const first = [...name, { baseline: number, size: QUESTION.number.size }]
  const writing = [...first, ...writtenLines(text, y + QUESTION.text.top), ...more]
  return { number, rules: ruleLines({ x: 0, y, w: 0, h }, QUESTION.rule, ruleUnder(first), writing) }
}
const PHOTO = { w: 400, h: 420, gap: 30, caption: { gap: 6, size: 12, lineHeight: 18 } } as const
const CHOICE = { w: 74, right: 8, top: 50, box: 18, label: { dx: 24, baseline: 64, size: 13 }, before: 26 } as const

export const quizComposition: Composition = ({ components, ctx, rect, setting, ballot }) => {
  // Every question here is ticked in the same boxes.
  if (setting !== "lesson" || !ballot || ballot.item_choices) return null
  const image = components[0]?.type === "image" ? (components[0] as Image) : null
  const [cards, ...rest] = components.slice(image ? 1 : 0)
  if (cards?.type !== "row_cards" || rest.length > 0) return null
  const r = cards as RowCards
  const n = r.items.length
  if (n < 2 || n > 4 || r.items.some((item) => item.icon || item.sub?.trim() || item.tone || item.highlight || !item.text?.trim())) return null
  const inks = lessonInks(ctx)
  const x0 = image ? rect.x + PHOTO.w + PHOTO.gap : rect.x
  const w = rect.x + rect.w - x0
  const pitch = Math.min(QUESTION.pitch, (rect.h + QUESTION.pitch - QUESTION.h) / n)
  const h = pitch - (QUESTION.pitch - QUESTION.h)
  if (h < QUESTION.text.top + 2 * QUESTION.text.lineHeight) return null
  if (image && rect.h < PHOTO.h) return null
  const choices = ballot.choices.map((c) => c.trim())
  // Each choice takes the board's 74px, or more when its word is longer than the board's three characters.
  const choiceW = Math.max(CHOICE.w, Math.ceil(Math.max(...choices.map((c) => lessonWidth(c, CHOICE.label.size, ctx)))) + CHOICE.label.dx + 12)
  const choicesW = choices.length * choiceW + CHOICE.right
  const textW = w - QUESTION.text.x - choicesW - CHOICE.before
  const fitted = r.items.map((item) => ({
    label: fitLesson(item.title, { width: textW, size: QUESTION.label.size, lineHeight: QUESTION.label.lineHeight, maxLines: 1, bold: true }, ctx),
    text: fitLesson(item.text, { width: textW, size: QUESTION.text.size, lineHeight: QUESTION.text.lineHeight, maxLines: QUESTION.text.maxLines }, ctx),
  }))
  if (fitted.some((f) => !f.label || !f.text)) return null
  const caption = image?.caption?.trim() ? fitLesson(image.caption, { width: PHOTO.w, size: PHOTO.caption.size, lineHeight: PHOTO.caption.lineHeight, maxLines: 1 }, ctx) : null
  if (image?.caption?.trim() && !caption) return null

  return (
    <g {...compositionTag("quiz")}>
      {image ? (
        <g {...blockTag(ctx, image)}>
          {paintLessonPhoto(image.asset_id, { x: rect.x, y: rect.y, w: PHOTO.w, h: PHOTO.h }, ctx, inks, { fit: image.fit })}
          {caption ? paintLesson(caption, { ctx, x: rect.x, top: rect.y + PHOTO.h + PHOTO.caption.gap, fill: lessonMeta(inks.muted, inks.ground) }) : null}
        </g>
      ) : null}
      <g {...blockTag(ctx, r)}>
        {r.items.map((_item, i) => {
          const y = rect.y + i * pitch
          const f = fitted[i]!
          const start = x0 + w - choicesW
          const paper = questionPaper(y, h, f.label!, f.text!, [{ baseline: y + CHOICE.label.baseline, size: CHOICE.label.size }])
          return (
            <g key={i} data-lesson-question="">
              {paintRuled({ x: x0, y, w, h }, inks, { rules: paper.rules, margin: QUESTION.margin })}
              {paintLessonLine(String(i + 1), { ctx, x: x0 + QUESTION.number.x, baseline: paper.number, size: QUESTION.number.size, bold: true, anchor: "middle", fill: lessonText(inks.pen, inks.paper, QUESTION.number.size) })}
              {paintLesson(f.label!, { ctx, x: x0 + QUESTION.label.x, top: y + QUESTION.label.top, bold: true, fill: lessonText(inks.mark, inks.paper, QUESTION.label.size), ground: inks.paper })}
              {paintLesson(f.text!, { ctx, x: x0 + QUESTION.text.x, top: y + QUESTION.text.top, fill: lessonText(inks.ink, inks.paper, QUESTION.text.size), ground: inks.paper })}
              <g data-lesson-ballot="">
                {choices.map((choice, j) => {
                  const cx = start + j * choiceW
                  return (
                    <g key={j}>
                      {paintCheckbox(cx, y + CHOICE.top, CHOICE.box, inks, inks.paper, { stroke: 1.8 })}
                      {paintLessonLine(choice, { ctx, x: cx + CHOICE.label.dx, baseline: y + CHOICE.label.baseline, size: CHOICE.label.size, fill: lessonText(inks.ink, inks.paper, CHOICE.label.size) })}
                    </g>
                  )
                })}
              </g>
            </g>
          )
        })}
      </g>
    </g>
  )
}
