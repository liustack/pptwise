import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitLesson,
  lessonInks,
  lessonMeta,
  lessonText,
  paintCheckbox,
  paintLesson,
  paintLessonCard,
  paintLessonIcon,
  paintLessonPhoto,
  paintPill,
  pillWidth,
} from "./lesson"
import { fitLine, paintLine, plainCallout } from "./lesson-tips"

type Image = Extract<Component, { type: "image" }>
type IconCards = Extract<Component, { type: "icon_cards" }>

/*
 * objectives: what the class will be able to do by the end, homeroom's
 * 2026-10 board (the goals page, p02). A photograph of the room on the left,
 * its caption under it, and on the right a card for each goal: an empty box
 * to tick at the end of the class, the goal's icon in the mark, its name
 * bold at 23px and a line or two under it, and at the card's top right the
 * part of the lesson that teaches it as a pill. Under the cards, in the pen,
 * the line that sends the room back to tick them.
 *
 * Takes, in the lesson setting: an `image`, then an `icon_cards` of two to
 * four goals, each with an optional tag, then optionally a `callout` with no
 * icon, title or tag.
 *
 * Declines: a goal's name past one line, its text past two, a pill too wide
 * for its card, the closing line past one line, and cards taller than the
 * photograph.
 *
 * Reads: the lesson inks (`./lesson.tsx`), the body and heading faces.
 */

const PHOTO = { w: 470, h: 400, caption: { gap: 6, size: 12, lineHeight: 18 } } as const
const CARDS = { x: 510, pitch: 136, gap: 12, box: { x: 24, top: 24, size: 26 }, icon: { x: 78, top: 24, size: 26 }, title: { x: 120, top: 20, size: 23, lineHeight: 34 }, text: { x: 120, top: 60, size: 15, lineHeight: 24, maxLines: 2, w: 500 }, pill: { right: 20, top: 24 } } as const
const CLOSE = { top: 412, size: 13, lineHeight: 22 } as const

export const objectivesComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "lesson") return null
  const [image, cards, close, ...rest] = components
  if (image?.type !== "image" || cards?.type !== "icon_cards" || rest.length > 0) return null
  if (close !== undefined && !plainCallout(close)) return null
  const photo = image as Image
  const c = cards as IconCards
  const n = c.items.length
  if (n < 2 || n > 4 || rect.w < CARDS.x + 500 || rect.h < PHOTO.h + 40) return null
  const inks = lessonInks(ctx)
  const cardX = rect.x + CARDS.x
  const cardW = rect.x + rect.w - cardX
  const pitch = Math.min(CARDS.pitch, (PHOTO.h + CARDS.gap) / n)
  const cardH = pitch - CARDS.gap
  const fitted = c.items.map((item) => {
    const pillW = item.tag ? pillWidth(item.tag.text.trim(), ctx) : 0
    const titleW = cardW - CARDS.title.x - (pillW ? pillW + CARDS.pill.right + 16 : 20)
    return {
      title: fitLesson(item.title, { width: titleW, size: CARDS.title.size, lineHeight: CARDS.title.lineHeight, maxLines: 1, bold: true }, ctx),
      text: fitLesson(item.text, { width: Math.min(CARDS.text.w, cardW - CARDS.text.x - 20), size: CARDS.text.size, lineHeight: CARDS.text.lineHeight, maxLines: CARDS.text.maxLines }, ctx),
      pillW,
    }
  })
  if (fitted.some((f) => !f.title || !f.text || f.pillW > cardW / 2)) return null
  if (fitted.some((f) => CARDS.text.top + f.text!.lines.length * CARDS.text.lineHeight > cardH + 4)) return null
  const caption = photo.caption?.trim() ? fitLesson(photo.caption, { width: PHOTO.w, size: PHOTO.caption.size, lineHeight: PHOTO.caption.lineHeight, maxLines: 1 }, ctx) : null
  if (photo.caption?.trim() && !caption) return null
  const closing = close && plainCallout(close) ? fitLine(close, cardW, CLOSE.size, CLOSE.lineHeight, ctx) : null
  if (close && !closing) return null
  if (closing && CLOSE.top + CLOSE.lineHeight > rect.h) return null

  return (
    <g {...compositionTag("objectives")}>
      <g {...blockTag(ctx, photo)}>
        {paintLessonPhoto(photo.asset_id, { x: rect.x, y: rect.y, w: PHOTO.w, h: PHOTO.h }, ctx, inks, { fit: photo.fit })}
        {caption ? paintLesson(caption, { ctx, x: rect.x, top: rect.y + PHOTO.h + PHOTO.caption.gap, fill: lessonMeta(inks.muted, inks.ground) }) : null}
      </g>
      <g {...blockTag(ctx, c)}>
        {c.items.map((item, i) => {
          const y = rect.y + i * pitch
          const f = fitted[i]!
          return (
            <g key={i} data-lesson-goal="">
              {paintLessonCard({ x: cardX, y, w: cardW, h: cardH }, inks)}
              {paintCheckbox(cardX + CARDS.box.x, y + CARDS.box.top, CARDS.box.size, inks, inks.paper)}
              {paintLessonIcon(item.icon, cardX + CARDS.icon.x, y + CARDS.icon.top, CARDS.icon.size, inks.mark, inks.paper)}
              {paintLesson(f.title!, { ctx, x: cardX + CARDS.title.x, top: y + CARDS.title.top, bold: true, fill: lessonText(inks.ink, inks.paper, CARDS.title.size), ground: inks.paper })}
              {paintLesson(f.text!, { ctx, x: cardX + CARDS.text.x, top: y + CARDS.text.top, fill: lessonText(inks.muted, inks.paper, CARDS.text.size), ground: inks.paper })}
              {item.tag ? paintPill({ ctx, tag: item.tag, x: cardX + cardW - CARDS.pill.right - f.pillW, y: y + CARDS.pill.top, ground: inks.paper, inks }) : null}
            </g>
          )
        })}
      </g>
      {close && closing && plainCallout(close) ? paintLine(close, closing, cardX, rect.y + CLOSE.top, inks.pen, ctx, inks.ground) : null}
    </g>
  )
}
