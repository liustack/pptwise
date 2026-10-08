import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  CHALKBOARD_META,
  CLAIM_AT,
  ChalkStamp,
  chalkChinese,
  chalkLine,
  chalkMark,
  chalkMeta,
  chalkStampWidth,
  chalkText,
  chalkboardInks,
  fitChalk,
  fitChalkCaption,
  paintChalk,
  paintChalkCaption,
  paintChalkLine,
  paintChalkPhoto,
  placeChalkClaim,
  placeChalkSource,
  wholePage,
} from "./chalkboard"

type Image = Extract<Component, { type: "image" }>
type Rows = Extract<Component, { type: "row_cards" }>

/*
 * exercises: questions set on the board with room left to answer, lecture's
 * 2026-10 board (p13). Down the left of the page each question a letter in
 * a ring of yellow chalk, its name in the serif and the question in the grey
 * under it, then a dotted line to write on beginning 「答：」. At the right a
 * photograph with its caption, the example's stamp under it and, under the
 * stamp, the page's note (its footnote) on what the questions leave out.
 *
 * Takes, in the chalkboard setting: an `image` and a `row_cards` of two to
 * four questions, either order, each a name and a text that asks (it holds
 * a question mark). The page's stamp when it has one.
 *
 * Declines: an item with an icon, a sub, a tone or a highlight, a name or a
 * question past one line, a caption past one line, a stamp with a date line,
 * a note past two lines.
 *
 * Reads: the chalkboard inks (`./chalkboard.tsx`), the heading and body faces.
 */

const ROWS = { top: 180, step: 140, span: 420 } as const
const RING = { cx: 96, dy: 30, r: 28 } as const
const LETTER = { dy: 6, size: 32, lineHeight: 48 } as const
const NAME = { x: 146, w: 640, size: 24, lineHeight: 34 } as const
const QUESTION = { x: 146, dy: 38, w: 640, size: 16, lineHeight: 26 } as const
const ANSWER = { x1: 146, x2: 760, dy: 108, size: 14, rise: 6 } as const
const PHOTO = { x: 828, y: 172, w: 388, h: 260, caption: 440 } as const
const STAMP = { x: 828, y: 470 } as const
const NOTE = { x: 828, w: 388, top: 506, foot: 560, note: true } as const

const LETTERS = "ABCD"

/** Whether a line asks something: it holds a question mark. */
export function asks(text: string | undefined): boolean {
  return /[?？]/u.test(text ?? "")
}

export const exercisesComposition: Composition = ({ components, ctx, setting, rect, claim, source, stamp }) => {
  if (setting !== "chalkboard" || !wholePage(rect)) return null
  if (components.length !== 2) return null
  const image = components.find((c) => c.type === "image") as Image | undefined
  const rows = components.find((c) => c.type === "row_cards") as Rows | undefined
  if (!image || !rows) return null
  const items = rows.items
  if (items.length < 2 || items.length > 4) return null
  if (items.some((item) => item.icon || item.sub?.trim() || item.tone || item.highlight || !asks(item.text))) return null
  const names = items.map((item) => fitChalk(item.title, { width: NAME.w, size: NAME.size, lineHeight: NAME.lineHeight, maxLines: 1, serif: true }, ctx))
  const questions = items.map((item) => fitChalk(item.text, { width: QUESTION.w, size: QUESTION.size, lineHeight: QUESTION.lineHeight, maxLines: 1 }, ctx))
  if (names.some((l) => !l) || questions.some((l) => !l)) return null
  const caption = image.caption?.trim() ? fitChalkCaption(image.caption, PHOTO.w, ctx) : undefined
  if (caption === null) return null
  if (stamp && (stamp.date?.trim() || chalkStampWidth(stamp.text, ctx) > PHOTO.w)) return null
  const head = placeChalkClaim(claim, CLAIM_AT)
  if (head === false) return null
  const note = placeChalkSource(source, stamp ? NOTE : { ...NOTE, top: STAMP.y })
  if (note === false) return null
  const inks = chalkboardInks(ctx)
  const ground = inks.ground
  const step = Math.min(ROWS.step, ROWS.span / items.length)
  const answer = chalkChinese(ctx, items.map((item) => item.title)) ? "答：" : "Answer:"
  return (
    <g {...compositionTag("exercises")}>
      {head}
      <g {...blockTag(ctx, rows)} data-chalk-exercises="">
        {items.map((item, i) => {
          const y = ROWS.top + i * step
          return (
            <g key={i} data-chalk-exercise={item.title}>
              <circle cx={RING.cx} cy={y + RING.dy} r={RING.r} fill="none" stroke={chalkMark(inks.yellow, ground)} strokeWidth={2.4} />
              {paintChalkLine(LETTERS[i]!, { ctx, x: RING.cx, anchor: "middle", top: y + LETTER.dy, lineHeight: LETTER.lineHeight, size: LETTER.size, serif: true, fill: chalkText(inks.yellow, ground, LETTER.size) })}
              {paintChalk(names[i]!, { ctx, x: NAME.x, top: y, serif: true, fill: chalkText(inks.chalk, ground, NAME.size) })}
              {paintChalk(questions[i]!, { ctx, x: QUESTION.x, top: y + QUESTION.dy, fill: chalkText(inks.muted, ground, QUESTION.size) })}
              {chalkLine(ANSWER.x1, y + ANSWER.dy, ANSWER.x2, y + ANSWER.dy, inks.line, 1.5, { dash: "2 8" })}
              {paintChalkLine(answer, { ctx, x: ANSWER.x1, baseline: y + ANSWER.dy - ANSWER.rise, size: ANSWER.size, fill: chalkMeta(inks.dim, ground), attrs: { ...CHALKBOARD_META } })}
            </g>
          )
        })}
      </g>
      <g {...blockTag(ctx, image)} data-chalk-exercise-photo="">
        {paintChalkPhoto(image.asset_id, PHOTO, ctx, { crop: image.crop })}
        {caption ? paintChalkCaption(caption, { ctx, x: PHOTO.x + PHOTO.w, top: PHOTO.caption, anchor: "end" }) : null}
      </g>
      {stamp ? <ChalkStamp ctx={ctx} text={stamp.text} x={STAMP.x} y={STAMP.y} /> : null}
      {note}
    </g>
  )
}
