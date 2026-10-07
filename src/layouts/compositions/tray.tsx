import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  CRAYON,
  CrayonPhoto,
  DrawnBox,
  PhotoNote,
  boardY,
  crayonAt,
  crayonBaseline,
  crayonFigureWidth,
  crayonInks,
  crayonText,
  crayonTint,
  fitCrayon,
  fitPhotoNote,
  paintCrayon,
  paintCrayonFigure,
  paintCrayonIcon,
  placeCrayonClaim,
  placeCrayonSource,
} from "./crayonbox"

type Image = Extract<Component, { type: "image" }>
type Kpi = Extract<Component, { type: "kpi_cards" }>

/*
 * tray: a photograph in a yellow crayon frame beside a few figures to
 * remember, crayon's 2026-10 board (p13). The photograph on the left with
 * its note under it; beside it the figures two by two on cards drawn by
 * hand, each in its own crayon: the symbol, the figure set large with its
 * unit small after it, what it is, and in the grey for whom. The source
 * stands under the cards.
 *
 * Takes, in the crayonbox setting: an `image`, then a `kpi_cards` of two to
 * four, every card with a symbol and a label.
 *
 * Declines: a card with a tag, a delta, a tone or a source, a figure, label
 * or note past one line in its card, a note past one line under the photo.
 *
 * Reads: the crayonbox inks (`./crayonbox.tsx`).
 */

const PHOTO = { top: 186, w: 440, h: 420, r: 26, note: 616 } as const
const CARDS = { x: 476, top: 186, w: 316, h: 196, pitch: { x: 336, y: 214 } } as const
const CARD = { inset: 22, icon: { y: 22, size: 28 }, figure: { top: 60, lineHeight: 56, size: 40, unit: 16 }, label: { top: 120, size: 17, lineHeight: 26 }, note: { top: 148, size: 13, lineHeight: 22 } } as const
/** The board's crayon for each card in turn: sky, green, orange, purple. */
const ORDER = [CRAYON.sky, CRAYON.green, CRAYON.orange, CRAYON.purple] as const

export const trayComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "crayonbox") return null
  const [image, kpi, ...rest] = components
  if (image?.type !== "image" || kpi?.type !== "kpi_cards" || rest.length > 0) return null
  const items = (kpi as Kpi).items
  if (items.length < 2 || items.length > 4 || items.some((it) => !it.icon || !it.label.trim() || it.tag || it.delta || it.tone || it.source)) return null
  const inner = CARDS.w - CARD.inset * 2
  if (items.some((it) => crayonFigureWidth(it.value, it.unit, CARD.figure.size, CARD.figure.unit, ctx) > inner)) return null
  const labels = items.map((it) => fitCrayon(it.label, { width: inner, size: CARD.label.size, lineHeight: CARD.label.lineHeight, maxLines: 1, weight: 800 }, ctx))
  const notes = items.map((it) => (it.note?.trim() ? fitCrayon(it.note, { width: inner, size: CARD.note.size, lineHeight: CARD.note.lineHeight, maxLines: 1, weight: 600 }, ctx) : undefined))
  if (labels.some((l) => !l) || notes.some((n) => n === null)) return null
  const note = fitPhotoNote((image as Image).caption, PHOTO.w, ctx)
  if (note === null) return null
  const head = placeCrayonClaim(claim, { x: rect.x, w: 1080 })
  if (head === false) return null
  const cardsX = rect.x + CARDS.x
  const foot = placeCrayonSource(source, { x: cardsX, w: rect.w - CARDS.x - 6 })
  if (foot === false) return null
  const inks = crayonInks(ctx)
  const photoY = boardY(rect, PHOTO.top)
  return (
    <g {...compositionTag("tray")}>
      {head}
      <g {...blockTag(ctx, image)}>
        <CrayonPhoto assetId={(image as Image).asset_id} box={{ x: rect.x, y: photoY, w: PHOTO.w, h: PHOTO.h }} ctx={ctx} r={PHOTO.r} frame={inks.yellow} />
        {note ? <PhotoNote layout={note} x={rect.x} top={boardY(rect, PHOTO.note)} ctx={ctx} /> : null}
      </g>
      <g {...blockTag(ctx, kpi)}>
        {items.map((it, i) => {
          const color = crayonAt(inks, ORDER, i)
          const fill = crayonTint(color, inks)
          const x = cardsX + (i % 2) * CARDS.pitch.x
          const y = boardY(rect, CARDS.top + Math.floor(i / 2) * CARDS.pitch.y)
          return (
            <g key={i} data-crayon-figure={stripEmphasis(it.value).trim()}>
              <DrawnBox box={{ x, y, w: CARDS.w, h: CARDS.h }} color={color} fill={fill} />
              {paintCrayonIcon(it.icon!, x + CARD.inset, y + CARD.icon.y, CARD.icon.size, inks.ink, fill)}
              {paintCrayonFigure({ ctx, value: it.value, unit: it.unit, x: x + CARD.inset, baseline: crayonBaseline(y + CARD.figure.top, CARD.figure.lineHeight, CARD.figure.size), size: CARD.figure.size, unitSize: CARD.figure.unit, fill: crayonText(inks.ink, fill, CARD.figure.size) })}
              {paintCrayon(labels[i]!, { ctx, x: x + CARD.inset, top: y + CARD.label.top, weight: 800, fill: crayonText(inks.ink, fill, CARD.label.size), ground: fill })}
              {notes[i] ? paintCrayon(notes[i]!, { ctx, x: x + CARD.inset, top: y + CARD.note.top, weight: 600, fill: crayonText(inks.muted, fill, CARD.note.size), ground: fill }) : null}
            </g>
          )
        })}
      </g>
      {foot}
    </g>
  )
}
