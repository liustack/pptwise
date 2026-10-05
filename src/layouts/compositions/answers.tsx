import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import { QUESTION, questionPaper } from "./quiz"
import {
  fitLesson,
  lessonInks,
  lessonText,
  paintLesson,
  paintLessonLine,
  paintRuled,
  paintStamp,
  glossBreak,
  splitLead,
  STAMP,
  stampWidth,
  toneIcon,
  turnedBounds,
  writtenLines,
} from "./lesson"
import { fitLine, paintLine, plainCallout } from "./lesson-tips"

type RowCards = Extract<Component, { type: "row_cards" }>

/*
 * answers: a quiz's questions marked, homeroom's 2026-10 board (the answers,
 * p10 and p19). Each question on the same ruled card as the quiz, its number
 * in the pen, its case bold in the mark and the case at 17px, and at its
 * right a stamp pressed a few degrees askew: a tick for yes in the success
 * ink, a cross for no in the danger ink, a pause for not yet in the warning
 * ink (the item's `tone`), with the verdict's word. Under the case, in the
 * stamp's ink, why, and the page to look back at. Under the cards one line
 * in the mark: the order to judge in.
 *
 * The rules fall as on the quiz's cards, under each line of writing, stop
 * short of the stamp and go on past it; the rule the reason would sit on is
 * left out, since no rule runs through a word or within 4px of one.
 *
 * An item's title is written 「情景一：可以」 ("Case 1: Yes"), the case and its
 * verdict after a colon; the verdict is the stamp's word. Its `text` is the
 * case, its `sub` the reason, its `tone` which way the verdict goes.
 *
 * Takes, in the lesson setting: a `row_cards` of two to four items, each
 * with a title written 「case：verdict」, a text, a sub and a tone, and no
 * icon or highlight, then optionally a `callout` with no icon, title or tag.
 *
 * Declines: a title with no verdict, a case past two lines, a reason past
 * one, a stamp wider than its room, and a closing line past one.
 *
 * Reads: the lesson inks (`./lesson.tsx`), the body and heading faces.
 */

const STAMP_AT = { right: 150, top: 20 } as const
const ANGLES = [-6, 4, -3] as const
const REASON = { top: 100, size: 13, lineHeight: 22 } as const
const CLOSE = { top: 422, size: 14, lineHeight: 22 } as const

export const answersComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "lesson") return null
  const [cards, close, ...rest] = components
  if (cards?.type !== "row_cards" || rest.length > 0) return null
  if (close !== undefined && !plainCallout(close)) return null
  const r = cards as RowCards
  const n = r.items.length
  if (n < 2 || n > 4 || r.items.some((item) => item.icon || item.highlight || !item.tone || !item.sub?.trim() || !item.text?.trim())) return null
  const inks = lessonInks(ctx)
  const x0 = rect.x
  const w = rect.w
  const pitch = Math.min(QUESTION.pitch, (CLOSE.top + QUESTION.pitch - QUESTION.h - 4) / n)
  const h = pitch - (QUESTION.pitch - QUESTION.h)
  if (h < REASON.top + REASON.lineHeight) return null
  const fitted = r.items.map((item) => {
    const split = splitLead(item.title)
    const verdict = split?.rest ?? ""
    const stampW = stampWidth(verdict, ctx, true)
    const textW = w - QUESTION.text.x - Math.max(208, stampW + 96)
    return {
      split,
      stampW,
      label: split ? fitLesson(split.lead, { width: textW, size: QUESTION.label.size, lineHeight: QUESTION.label.lineHeight, maxLines: 1, bold: true }, ctx) : null,
      text: fitLesson(item.text, { width: textW, size: QUESTION.text.size, lineHeight: QUESTION.text.lineHeight, maxLines: QUESTION.text.maxLines }, ctx),
      reason: fitLesson(item.sub, { width: w - QUESTION.text.x - 48, size: REASON.size, lineHeight: REASON.lineHeight, maxLines: 1, bold: true }, ctx),
    }
  })
  if (fitted.some((f) => !f.split || !f.label || !f.text || !f.reason || f.stampW > 200)) return null
  const closing = close && plainCallout(close) ? fitLine(close, w, CLOSE.size, CLOSE.lineHeight, ctx) : null
  if (close && !closing) return null
  if (closing && CLOSE.top + CLOSE.lineHeight > rect.h) return null

  return (
    <g {...compositionTag("answers")}>
      <g {...blockTag(ctx, r)}>
        {r.items.map((item, i) => {
          const y = rect.y + i * pitch
          const f = fitted[i]!
          const ink = inks[item.tone!]
          const angle = ANGLES[i % ANGLES.length]!
          const stamp = { x: x0 + w - STAMP_AT.right - (f.stampW - STAMP.w) / 2, y: y + STAMP_AT.top, w: f.stampW, h: STAMP.h }
          const paper = questionPaper(y, h, f.label!, f.text!, writtenLines(f.reason!, y + REASON.top))
          return (
            <g key={i} data-lesson-answer={item.tone}>
              {paintRuled({ x: x0, y, w, h }, inks, { rules: paper.rules, around: [turnedBounds(stamp, angle)], margin: QUESTION.margin })}
              {paintLessonLine(String(i + 1), { ctx, x: x0 + QUESTION.number.x, baseline: paper.number, size: QUESTION.number.size, bold: true, anchor: "middle", fill: lessonText(inks.pen, inks.paper, QUESTION.number.size) })}
              <g data-lesson-verdict="">
                {paintLesson(f.label!, { ctx, x: x0 + QUESTION.label.x, top: y + QUESTION.label.top, bold: true, fill: lessonText(inks.mark, inks.paper, QUESTION.label.size), ground: inks.paper, lastAttrs: glossBreak(f.split!.sep) })}
                {paintStamp({ ctx, x: stamp.x, y: stamp.y, text: f.split!.rest, icon: toneIcon(item.tone!), color: ink, ground: inks.paper, angle, w: f.stampW })}
              </g>
              {paintLesson(f.text!, { ctx, x: x0 + QUESTION.text.x, top: y + QUESTION.text.top, fill: lessonText(inks.ink, inks.paper, QUESTION.text.size), ground: inks.paper })}
              {paintLesson(f.reason!, { ctx, x: x0 + QUESTION.text.x, top: y + REASON.top, bold: true, fill: lessonText(ink, inks.paper, REASON.size), ground: inks.paper })}
            </g>
          )
        })}
      </g>
      {close && closing && plainCallout(close) ? paintLine(close, closing, rect.x, rect.y + CLOSE.top, inks.mark, ctx, inks.ground) : null}
    </g>
  )
}
