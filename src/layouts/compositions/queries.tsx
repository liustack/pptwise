import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  ILLUSTRATION_CAPTION,
  fitManuscript,
  glossBreak,
  manuscriptInks,
  manuscriptMeta,
  manuscriptText,
  paintManuscript,
  paintManuscriptCard,
  paintManuscriptIcon,
  paintManuscriptPhoto,
  splitLabel,
} from "./manuscript"

type Cards = Extract<Component, { type: "icon_cards" }>
type Image = Extract<Component, { type: "image" }>

/*
 * queries: questions put to a committee, thesis's 2026-10 board (p17). A
 * card a question in a grid of two columns: its label set large in emerald
 * in the heading serif (「Q1」), its icon in pebble at the top right, the
 * question in the heading serif and what it hangs on under it in the muted
 * ink. A photograph that illustrates the page at the right with its plain
 * caption.
 *
 * Takes, in the manuscript setting: an `icon_cards` of two to four with no
 * title, tag or tone, each titled "label：question", then an `image`.
 *
 * Declines: a label wider than 120px, a question past one line, what it
 * hangs on past three lines.
 *
 * Reads: the manuscript inks (`./manuscript.tsx`).
 */

const GRID = { pitchX: 410, pitchY: 214, w: 398, h: 202 } as const
const CARD = { pad: 22, label: { dy: 18, size: 30, h: 40, w: 120 }, icon: { right: 46, dy: 24, size: 22 }, question: { dy: 70, size: 20, h: 32, w: 360 }, text: { dy: 112, size: 14, h: 23, w: 354, maxLines: 3 } } as const
const PHOTO = { dx: 840, w: 312, gap: 4 } as const

export const queriesComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "manuscript") return null
  const [cards, image, ...rest] = components
  if (cards?.type !== "icon_cards" || image?.type !== "image" || rest.length > 0) return null
  const k = cards as Cards
  const img = image as Image
  if (k.title?.trim() || k.items.length < 2 || k.items.length > 4 || k.items.some((it) => it.tag || it.tone)) return null
  const rows = Math.ceil(k.items.length / 2)
  const gridH = (rows - 1) * GRID.pitchY + GRID.h
  if (rect.w < PHOTO.dx + PHOTO.w || rect.h < gridH + PHOTO.gap + ILLUSTRATION_CAPTION.lineHeight) return null
  const inks = manuscriptInks(ctx)
  const card = inks.card
  const fitted = k.items.map((it) => {
    const name = splitLabel(it.title)
    if (!name) return null
    const label = fitManuscript(name.name, { width: CARD.label.w, size: CARD.label.size, lineHeight: CARD.label.h, maxLines: 1, serif: true, bold: true }, ctx)
    const question = fitManuscript(name.rest, { width: CARD.question.w, size: CARD.question.size, lineHeight: CARD.question.h, maxLines: 1, serif: true, bold: true }, ctx)
    const text = fitManuscript(it.text, { width: CARD.text.w, size: CARD.text.size, lineHeight: CARD.text.h, maxLines: CARD.text.maxLines }, ctx)
    return label && question && text ? { it, name, label, question, text } : null
  })
  if (fitted.some((f) => !f)) return null
  const caption = img.caption?.trim() ? fitManuscript(img.caption, { width: PHOTO.w, size: ILLUSTRATION_CAPTION.size, lineHeight: ILLUSTRATION_CAPTION.lineHeight, maxLines: 1 }, ctx) : null
  if (img.caption?.trim() && !caption) return null
  return (
    <g {...compositionTag("queries")}>
      <g {...blockTag(ctx, k)}>
        {fitted.map((f, i) => {
          const x = rect.x + (i % 2) * GRID.pitchX
          const y = rect.y + Math.floor(i / 2) * GRID.pitchY
          return (
            <g key={i} data-manuscript-question={f!.name.name}>
              {paintManuscriptCard({ x, y, w: GRID.w, h: GRID.h }, inks)}
              <g {...glossBreak(f!.name.sep)}>{paintManuscript(f!.label!, { ctx, x: x + CARD.pad, top: y + CARD.label.dy, serif: true, bold: true, fill: manuscriptText(inks.deep, card, CARD.label.size), ground: card })}</g>
              {paintManuscriptIcon(f!.it.icon, x + GRID.w - CARD.icon.right, y + CARD.icon.dy, CARD.icon.size, inks.pebble, card)}
              {paintManuscript(f!.question!, { ctx, x: x + CARD.pad, top: y + CARD.question.dy, serif: true, bold: true, fill: manuscriptText(inks.ink, card, CARD.question.size), ground: card })}
              {paintManuscript(f!.text!, { ctx, x: x + CARD.pad, top: y + CARD.text.dy, fill: manuscriptText(inks.muted, card, CARD.text.size), ground: card })}
            </g>
          )
        })}
      </g>
      <g {...blockTag(ctx, img)}>
        {paintManuscriptPhoto(img.asset_id, { x: rect.x + PHOTO.dx, y: rect.y, w: PHOTO.w, h: gridH }, ctx)}
        {caption ? <g data-manuscript-illustration="">{paintManuscript(caption, { ctx, x: rect.x + PHOTO.dx, top: rect.y + gridH + PHOTO.gap, fill: manuscriptMeta(inks.muted, inks.ground) })}</g> : null}
      </g>
    </g>
  )
}
