import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitLesson,
  lessonInks,
  lessonText,
  paintLesson,
  paintLessonIcon,
  paintLessonLine,
  paintLessonPhoto,
  paintNote,
  fillUnderWhite,
  glossBreak,
  splitLead,
} from "./lesson"

type ImageGrid = Extract<Component, { type: "image_grid" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * methods: a few methods, each under its photograph, and the one line to
 * remember on a sticky note, homeroom's 2026-10 board (the three methods
 * page, p17). Under each photograph a number in a disc of the pen, the
 * method's name bold at 21px and how it goes muted at 15px, its icon in the
 * mark at the right. Under the row, a note on yellow paper turned a degree:
 * the callout's title and the line, bold at 18px.
 *
 * A caption is written 「名称：做法」 ("Name: how"), the name bold and the
 * rest under it; a caption with no colon is the name alone.
 *
 * Takes, in the lesson setting: an `image_grid` of two to four photographs,
 * each with a caption, then optionally a `callout` with no tag.
 *
 * Declines: a name past one line, how it goes past two, and a note past two
 * lines.
 *
 * Reads: the lesson inks (`./lesson.tsx`), the body and heading faces.
 */

const PHOTOS = { h: 200, gap: 24, disc: { top: 230, dx: 30, r: 20, size: 18 }, icon: { top: 218, size: 24 }, name: { x: 62, top: 216, size: 21, lineHeight: 30 }, how: { top: 252, size: 15, lineHeight: 24, maxLines: 2 } } as const
const NOTE = { top: 324, w: 560, padX: 22, padY: 16, size: 18, lineHeight: 30, maxLines: 2, angle: -1 } as const

export const methodsComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "lesson") return null
  const [grid, note, ...rest] = components
  if (grid?.type !== "image_grid" || rest.length > 0) return null
  if (note !== undefined && (note.type !== "callout" || note.tag || note.icon)) return null
  const g = grid as ImageGrid
  const n = g.items.length
  if (n < 2 || n > 4 || g.items.some((item) => !item.caption?.trim())) return null
  const inks = lessonInks(ctx)
  const w = (rect.w - (n - 1) * PHOTOS.gap) / n
  const fitted = g.items.map((item) => {
    const split = splitLead(item.caption!)
    const iconRoom = item.icon ? PHOTOS.icon.size + 14 : 0
    return {
      name: fitLesson(split?.lead ?? item.caption, { width: w - PHOTOS.name.x - iconRoom, size: PHOTOS.name.size, lineHeight: PHOTOS.name.lineHeight, maxLines: 1, bold: true }, ctx),
      how: split ? fitLesson(split.rest, { width: w - PHOTOS.name.x - 6, size: PHOTOS.how.size, lineHeight: PHOTOS.how.lineHeight, maxLines: PHOTOS.how.maxLines }, ctx) : null,
      split,
    }
  })
  if (fitted.some((f) => !f.name || (f.split && !f.how))) return null
  const c = note as Callout | undefined
  const colon = ctx.figures?.chinese ? "：" : ":"
  const noteSpec = { width: NOTE.w - NOTE.padX * 2, size: NOTE.size, lineHeight: NOTE.lineHeight, bold: true }
  const noteHead = c?.title?.trim() ? fitLesson(`${c.title.trim()}${colon}`, { ...noteSpec, maxLines: 1 }, ctx) : null
  const noteLayout = c ? fitLesson(c.text, { ...noteSpec, maxLines: NOTE.maxLines }, ctx) : null
  if (c && (!noteLayout || (c.title?.trim() && !noteHead))) return null
  const headLines = noteHead ? noteHead.lines.length : 0
  const noteH = noteLayout ? NOTE.padY * 2 + (headLines + noteLayout.lines.length) * NOTE.lineHeight : 0
  // The note stands at the board's y520, or as much higher as a third line needs, clear of the methods above it.
  const noteTop = Math.min(NOTE.top, rect.h - noteH)
  if (noteLayout && noteTop < PHOTOS.how.top + PHOTOS.how.maxLines * PHOTOS.how.lineHeight + 8) return null
  const noteX = rect.x + (rect.w - NOTE.w) / 2
  const disc = fillUnderWhite(inks.pen, PHOTOS.disc.size)

  return (
    <g {...compositionTag("methods")}>
      <g {...blockTag(ctx, g)}>
        {g.items.map((item, i) => {
          const x = rect.x + i * (w + PHOTOS.gap)
          const f = fitted[i]!
          return (
            <g key={i} data-lesson-method="">
              {paintLessonPhoto(item.asset_id, { x, y: rect.y, w, h: PHOTOS.h }, ctx, inks)}
              <circle cx={x + PHOTOS.disc.dx} cy={rect.y + PHOTOS.disc.top} r={PHOTOS.disc.r} fill={disc} />
              {paintLessonLine(String(i + 1), { ctx, x: x + PHOTOS.disc.dx, baseline: rect.y + PHOTOS.disc.top + 7, size: PHOTOS.disc.size, bold: true, anchor: "middle", fill: lessonText("#FFFFFF", disc, PHOTOS.disc.size) })}
              {item.icon ? paintLessonIcon(item.icon, x + w - 14 - PHOTOS.icon.size, rect.y + PHOTOS.icon.top, PHOTOS.icon.size, inks.mark, inks.ground) : null}
              {paintLesson(f.name!, { ctx, x: x + PHOTOS.name.x, top: rect.y + PHOTOS.name.top, bold: true, fill: lessonText(inks.ink, inks.ground, PHOTOS.name.size), lastAttrs: glossBreak(f.split?.sep) })}
              {f.how ? paintLesson(f.how, { ctx, x: x + PHOTOS.name.x, top: rect.y + PHOTOS.how.top, fill: lessonText(inks.muted, inks.ground, PHOTOS.how.size) }) : null}
            </g>
          )
        })}
      </g>
      {c && noteLayout ? (
        <g {...blockTag(ctx, c)}>
          {paintNote(
            { x: noteX, y: rect.y + noteTop, w: NOTE.w, h: noteH },
            inks,
            NOTE.angle,
            <>
              {noteHead ? paintLesson(noteHead, { ctx, x: noteX + NOTE.padX, top: rect.y + noteTop + NOTE.padY, bold: true, fill: lessonText(inks.ink, inks.note, NOTE.size), ground: inks.note }) : null}
              {paintLesson(noteLayout, { ctx, x: noteX + NOTE.padX, top: rect.y + noteTop + NOTE.padY + headLines * NOTE.lineHeight, bold: true, fill: lessonText(inks.ink, inks.note, NOTE.size), ground: inks.note })}
            </>,
          )}
        </g>
      ) : null}
    </g>
  )
}
