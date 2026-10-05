import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import { fitLesson, lessonInks, lessonText, paintBoard, paintLesson, paintLessonIcon, Squiggle } from "./lesson"
import { fitLine, paintLine, plainCallout } from "./lesson-tips"

type RowCards = Extract<Component, { type: "row_cards" }>

/*
 * blackboard: what to copy down before the class ends, written on the board,
 * homeroom's 2026-10 board (the recap page, p20). The board fills the band
 * inside a frame of wood: two to four items, two to a row, each its icon in
 * chalk white, its words bold at 34px in white, and a line or two under them
 * in pale chalk. The item the author marks (`highlight`) is underlined with a
 * wavy line of the pen in chalk, its icon in that ink too. Under the board,
 * in the pen, the line that sends the room back to its goals.
 *
 * Takes, in the lesson setting: a `row_cards` of two to four items with an
 * icon and a text, at most one marked, no sub or tone, then optionally a
 * `callout` with no icon, title or tag.
 *
 * Declines: words past one line at 34px, a line under them past two, and a
 * closing line past one.
 *
 * Reads: the lesson inks (`./lesson.tsx`), the body and heading faces.
 */

const BOARD = { h: 400, frame: 8, r: 6, pad: { x: 40, top: 40 }, col: 540, row: 170, icon: { dy: 6, size: 30 }, words: { x: 48, size: 34, lineHeight: 48, w: 460 }, squiggle: { dy: 58, w: 300 }, text: { dy: 70, size: 15, lineHeight: 24, maxLines: 2 } } as const
const CLOSE = { top: 414, size: 14, lineHeight: 24 } as const

export const blackboardComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "lesson") return null
  const [cards, close, ...rest] = components
  if (cards?.type !== "row_cards" || rest.length > 0) return null
  if (close !== undefined && !plainCallout(close)) return null
  const r = cards as RowCards
  const n = r.items.length
  if (n < 2 || n > 4 || r.items.some((item) => !item.icon || !item.text?.trim() || item.sub?.trim() || item.tone) || r.items.filter((item) => item.highlight).length > 1) return null
  if (rect.h < BOARD.h || rect.w < BOARD.pad.x * 2 + BOARD.col + BOARD.words.x + 300) return null
  const inks = lessonInks(ctx)
  const fitted = r.items.map((item) => ({
    words: fitLesson(item.title, { width: BOARD.words.w, size: BOARD.words.size, lineHeight: BOARD.words.lineHeight, maxLines: 1, bold: true }, ctx),
    text: fitLesson(item.text, { width: BOARD.words.w, size: BOARD.text.size, lineHeight: BOARD.text.lineHeight, maxLines: BOARD.text.maxLines }, ctx),
  }))
  if (fitted.some((f) => !f.words || !f.text)) return null
  const closing = close && plainCallout(close) ? fitLine(close, rect.w, CLOSE.size, CLOSE.lineHeight, ctx) : null
  if (close && !closing) return null
  if (closing && CLOSE.top + CLOSE.lineHeight > rect.h) return null
  const white = lessonText("#FFFFFF", inks.board, BOARD.words.size)

  return (
    <g {...compositionTag("blackboard")}>
      <g {...blockTag(ctx, r)}>
        {paintBoard({ x: rect.x, y: rect.y, w: rect.w, h: BOARD.h }, inks, { frame: BOARD.frame, r: BOARD.r })}
        {r.items.map((item, i) => {
          const x = rect.x + BOARD.pad.x + (i % 2) * BOARD.col
          const y = rect.y + BOARD.pad.top + Math.floor(i / 2) * BOARD.row
          const f = fitted[i]!
          const marked = item.highlight === true
          return (
            <g key={i} data-lesson-chalk={marked ? "marked" : ""}>
              {paintLessonIcon(item.icon!, x, y + BOARD.icon.dy, BOARD.icon.size, marked ? inks.chalkPen : "#FFFFFF", inks.board)}
              {paintLesson(f.words!, { ctx, x: x + BOARD.words.x, top: y, bold: true, fill: white, ground: inks.board, runInk: inks.chalkPen })}
              {marked ? <Squiggle x={x + BOARD.words.x} y={y + BOARD.squiggle.dy} w={BOARD.squiggle.w} color={inks.chalkPen} width={3} /> : null}
              {paintLesson(f.text!, { ctx, x: x + BOARD.words.x, top: y + BOARD.text.dy, fill: lessonText(inks.chalk, inks.board, BOARD.text.size), ground: inks.board })}
            </g>
          )
        })}
      </g>
      {close && closing && plainCallout(close) ? paintLine(close, closing, rect.x, rect.y + CLOSE.top, inks.pen, ctx, inks.ground) : null}
    </g>
  )
}
