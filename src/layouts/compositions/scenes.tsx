import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitScroll,
  paintScroll,
  paintScrollFigure,
  paintScrollIcon,
  paintScrollPhoto,
  placeScrollClaim,
  placeScrollSource,
  figureBaseline,
  scrollFigureWidth,
  scrollInks,
  scrollText,
  wholeLit,
} from "./scroll"

type Grid = Extract<Component, { type: "image_grid" }>
type Kpi = Extract<Component, { type: "kpi_cards" }>

/*
 * scenes: where a thing lives now, in pictures and figures, ink's 2026-10
 * board (p14). The claim over the page; under it two to four photographs in
 * a row, each with its symbol and its name in the heading face under it, and
 * under them a row of figures set large in the heading face, the one the
 * author marks (`**…**`) in cinnabar, each with what it counts and, small in
 * the grey, where the figure comes from (its `note`).
 *
 * Takes, in the scroll setting: an `image_grid` of two to four with captions,
 * then a `kpi_cards` of two to four.
 *
 * Declines: a grid with an emphasis or a tag on a picture, a card with a tag,
 * a delta, a tone, a source or a symbol, a caption, figure, label or note
 * past its room.
 *
 * Reads: the scroll inks (`./scroll.tsx`).
 */

const PHOTOS = { top: 130, h: 220, gap: 20, pitch: 360 } as const
const NAME = { top: 358, icon: { dy: 4, size: 18 }, dx: 26, size: 18, lineHeight: 26 } as const
const FIGS = { gap: 20, pitch: 270, figure: { top: 410, lineHeight: 60, size: 46, unit: 15 }, label: { top: 474, size: 13, lineHeight: 22 }, note: { top: 498, size: 11, lineHeight: 20 } } as const

export const scenesComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "scroll") return null
  const [grid, kpi, ...rest] = components
  if (grid?.type !== "image_grid" || kpi?.type !== "kpi_cards" || rest.length > 0) return null
  const pictures = (grid as Grid).items
  if ((grid as Grid).emphasis === "first" || pictures.length < 2 || pictures.length > 4 || pictures.some((p) => p.tag || !p.caption?.trim())) return null
  const iconed = pictures.some((p) => p.icon)
  if (iconed && pictures.some((p) => !p.icon)) return null
  const items = (kpi as Kpi).items
  if (items.length < 2 || items.length > 4 || items.some((it) => it.tag || it.delta || it.tone || it.source || it.icon || !it.label.trim())) return null
  const photoPitch = Math.min(PHOTOS.pitch, (rect.w + PHOTOS.gap) / pictures.length)
  const photoW = photoPitch - PHOTOS.gap
  const names = pictures.map((p) => fitScroll(p.caption, { width: photoW - (iconed ? NAME.dx : 0), size: NAME.size, lineHeight: NAME.lineHeight, maxLines: 1, serif: true }, ctx))
  if (names.some((n) => !n)) return null
  const figPitch = (rect.w + FIGS.gap) / items.length
  const figW = figPitch - FIGS.gap
  if (items.some((it) => scrollFigureWidth(it.value, it.unit, { size: FIGS.figure.size, unit: FIGS.figure.unit }, ctx) > figW)) return null
  const labels = items.map((it) => fitScroll(it.label, { width: figW, size: FIGS.label.size, lineHeight: FIGS.label.lineHeight, maxLines: 1 }, ctx))
  const notes = items.map((it) => (it.note?.trim() ? fitScroll(it.note, { width: figW, size: FIGS.note.size, lineHeight: FIGS.note.lineHeight, maxLines: 1 }, ctx) : undefined))
  if (labels.some((l) => !l) || notes.some((n) => n === null)) return null
  const head = placeScrollClaim(claim, { x: rect.x, w: rect.w })
  if (head === false) return null
  const foot = placeScrollSource(source, { x: rect.x, w: rect.w })
  if (foot === false) return null
  const inks = scrollInks(ctx)
  const ground = inks.ground
  return (
    <g {...compositionTag("scenes")}>
      {head}
      <g {...blockTag(ctx, grid)}>
        {pictures.map((p, i) => {
          const x = rect.x + i * photoPitch
          return (
            <g key={i} data-scroll-scene={stripEmphasis(p.caption ?? "").trim()}>
              {paintScrollPhoto(p.asset_id, { x, y: rect.y + PHOTOS.top, w: photoW, h: PHOTOS.h }, ctx)}
              {p.icon ? paintScrollIcon(p.icon, x, rect.y + NAME.top + NAME.icon.dy, NAME.icon.size, inks.taupe, ground) : null}
              {paintScroll(names[i]!, { ctx, x: x + (iconed ? NAME.dx : 0), top: rect.y + NAME.top, serif: true, fill: scrollText(inks.ink, ground, NAME.size) })}
            </g>
          )
        })}
      </g>
      <g {...blockTag(ctx, kpi)}>
        {items.map((it, i) => {
          const x = rect.x + i * figPitch
          const lit = wholeLit(it.value)
          return (
            <g key={i} data-scroll-figure={stripEmphasis(it.value).trim()} {...(lit ? { "data-scroll-lead": "figure" } : {})}>
              {paintScrollFigure({ ctx, value: it.value, unit: it.unit, x, baseline: figureBaseline(rect.y + FIGS.figure.top, FIGS.figure.lineHeight, FIGS.figure.size), spec: { size: FIGS.figure.size, unit: FIGS.figure.unit }, fill: scrollText(lit ? inks.cinnabar : inks.ink, ground, FIGS.figure.size), ground })}
              {paintScroll(labels[i]!, { ctx, x, top: rect.y + FIGS.label.top, fill: scrollText(inks.ink, ground, FIGS.label.size) })}
              {notes[i] ? paintScroll(notes[i]!, { ctx, x, top: rect.y + FIGS.note.top, fill: scrollText(inks.muted, ground, FIGS.note.size) }) : null}
            </g>
          )
        })}
      </g>
      {foot}
    </g>
  )
}
