import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  CAPTION,
  Caption,
  ILLUSTRATION_CAPTION,
  fitManuscript,
  glossBreak,
  manuscriptInks,
  manuscriptMeta,
  manuscriptText,
  paintManuscript,
  paintManuscriptPhoto,
  paintManuscriptTracked,
  manuscriptBaseline,
  splitLabel,
} from "./manuscript"

type Image = Extract<Component, { type: "image" }>
type Paragraph = Extract<Component, { type: "paragraph" }>
type Bullets = Extract<Component, { type: "bullets" }>

/*
 * inquiry: the research question beside its figure, thesis's 2026-10 board
 * (p02). A photograph down the left with its caption under it, numbered as
 * the page's figure when the face numbers it (「图 1」), and at the right the
 * question set large in emerald in the heading serif, then the terms it
 * rests on as ruled rows: each row's name small in the muted ink and what it
 * says in the heading serif.
 *
 * Takes, in the manuscript setting: an `image`, a `paragraph` (the question)
 * and a `bullets` of two to five items each written "name：what it says", in
 * that order.
 *
 * Declines: a question past two lines, a name past 120px, what a row says
 * past one line, a caption past one line.
 *
 * Reads: the manuscript inks (`./manuscript.tsx`).
 */

const PHOTO = { dy: 2, w: 470, h: 360 } as const
const CAP = { dy: 370 } as const
const QUESTION = { dx: 516, dy: 2, w: 636, size: 26, lineHeight: 42, maxLines: 2 } as const
const ROWS = { dx: 516, dy: 118, pitch: 60, label: { dy: 14, h: 30, size: 13, tracking: 1, w: 120 }, value: { dx: 120, dy: 12, h: 34, size: 18, w: 516 } } as const

export const inquiryComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "manuscript") return null
  const [image, question, rows, ...rest] = components
  if (image?.type !== "image" || question?.type !== "paragraph" || rows?.type !== "bullets" || rest.length > 0) return null
  const img = image as Image
  const q = question as Paragraph
  const b = rows as Bullets
  if (b.items.length < 2 || b.items.length > 5 || (b.style && b.style !== "default")) return null
  if (rect.w < QUESTION.dx + QUESTION.w || rect.h < ROWS.dy + b.items.length * ROWS.pitch + 1 || rect.h < CAP.dy + CAPTION.lineHeight) return null
  const inks = manuscriptInks(ctx)
  const ground = inks.ground
  const label = ctx.exhibitLabels?.get(img)
  const caption = img.caption?.trim()
  const plain = caption && !label ? fitManuscript(caption, { width: PHOTO.w, size: ILLUSTRATION_CAPTION.size, lineHeight: ILLUSTRATION_CAPTION.lineHeight, maxLines: 1 }, ctx) : null
  const numbered = caption && label ? fitManuscript(`${label}\u3000${caption}`, { width: PHOTO.w, size: CAPTION.size, lineHeight: CAPTION.lineHeight, maxLines: 1 }, ctx) : null
  if (caption && !plain && !numbered) return null
  const ask = fitManuscript(q.text, { width: QUESTION.w, size: QUESTION.size, lineHeight: QUESTION.lineHeight, maxLines: QUESTION.maxLines, serif: true, bold: true }, ctx)
  if (!ask) return null
  const items = b.items.map((item) => {
    const split = splitLabel(item)
    if (!split) return null
    const name = fitManuscript(split.name, { width: ROWS.label.w - 4, size: ROWS.label.size, lineHeight: ROWS.label.h, maxLines: 1, bold: true }, ctx)
    const value = fitManuscript(split.rest, { width: ROWS.value.w, size: ROWS.value.size, lineHeight: ROWS.value.h, maxLines: 1, serif: true, bold: true }, ctx)
    return name && value ? { split, value } : null
  })
  if (items.some((i) => !i)) return null
  const x = rect.x + ROWS.dx
  return (
    <g {...compositionTag("inquiry")}>
      <g {...blockTag(ctx, img)}>
        {paintManuscriptPhoto(img.asset_id, { x: rect.x, y: rect.y + PHOTO.dy, w: PHOTO.w, h: PHOTO.h }, ctx)}
        {label && caption ? <Caption label={label} title={caption} x={rect.x} top={rect.y + CAP.dy} ctx={ctx} /> : null}
        {plain ? <g data-manuscript-illustration="">{paintManuscript(plain, { ctx, x: rect.x, top: rect.y + CAP.dy, fill: manuscriptMeta(inks.muted, ground) })}</g> : null}
      </g>
      <g {...blockTag(ctx, q)} data-manuscript-question="">
        {paintManuscript(ask, { ctx, x, top: rect.y + QUESTION.dy, serif: true, bold: true, fill: manuscriptText(inks.deep, ground, QUESTION.size) })}
      </g>
      <g {...blockTag(ctx, b)} data-manuscript-terms="">
        {items.map((item, i) => {
          const top = rect.y + ROWS.dy + i * ROWS.pitch
          return (
            <g key={i} data-manuscript-term={item!.split.name}>
              <rect x={x} y={top} width={rect.x + rect.w - x} height={1} fill={inks.line} />
              <g {...glossBreak(item!.split.sep)}>
                {paintManuscriptTracked({ ctx, text: item!.split.name, x, y: manuscriptBaseline(top + ROWS.label.dy, ROWS.label.h, ROWS.label.size), size: ROWS.label.size, tracking: ROWS.label.tracking, bold: true, fill: manuscriptText(inks.muted, ground, ROWS.label.size) })}
              </g>
              {paintManuscript(item!.value, { ctx, x: x + ROWS.value.dx, top: top + ROWS.value.dy, serif: true, bold: true, fill: manuscriptText(inks.ink, ground, ROWS.value.size) })}
            </g>
          )
        })}
        <rect x={x} y={rect.y + ROWS.dy + items.length * ROWS.pitch} width={rect.x + rect.w - x} height={1} fill={inks.line} />
      </g>
    </g>
  )
}
