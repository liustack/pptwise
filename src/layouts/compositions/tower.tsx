import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  KeynoteWash,
  fitKeynote,
  keynoteBaseline,
  keynoteFigureWidth,
  keynoteInks,
  keynoteLit,
  keynoteText,
  paintKeynote,
  paintKeynoteFigure,
  paintKeynotePhoto,
  paintKeynoteRule,
  placeKeynoteClaim,
  placeKeynoteKicker,
  placeKeynoteSource,
  wholePage,
} from "./keynote"

type Image = Extract<Component, { type: "image" }>
type Kpi = Extract<Component, { type: "kpi_cards" }>

/*
 * tower: a photograph beside three figures, stage's 2026-10 board (p13). The
 * photograph fills the left half of the page to its edges, its right side
 * fading into the black, and in the right half the chapter, the claim on one
 * line or two (the author's break kept), and two or three figures stacked
 * under hairlines, each bold with its line under it in the sand. The figure
 * the author marks is silver, or the first when none is. The source small
 * and dim at the foot of the column.
 *
 * Takes, in the keynote setting: an `image` and the figures as `kpi_cards`,
 * either order: one `kpi_cards` of two or three items, or two or three
 * `kpi_cards` of one item each, every item a value and a label.
 *
 * Declines: an image with a caption, an item with a note, an icon, a tag, a
 * delta, a tone or a source, a figure or label too wide for the column, a
 * claim past two lines.
 *
 * Reads: the keynote inks (`./keynote.tsx`), the heading and body faces.
 */

const PHOTO = { x: 0, y: 0, w: 640, h: 720 } as const
const FADE = { x: 440, w: 200 } as const
const COL = { x: 700, w: 516 } as const
const ROWS = { top: 230, step: 128 } as const
const FIGURE = { dy: 14, size: 52, lineHeight: 64, unit: 30, tracking: -1 } as const
const LABEL = { dy: 82, size: 14, lineHeight: 24 } as const

export const towerComposition: Composition = ({ components, ctx, setting, rect, claim, source, kicker }) => {
  if (setting !== "keynote" || !wholePage(rect)) return null
  const images = components.filter((c) => c.type === "image") as Image[]
  const kpis = components.filter((c) => c.type === "kpi_cards") as Kpi[]
  if (images.length !== 1 || kpis.length + 1 !== components.length || kpis.length === 0) return null
  const image = images[0]!
  if (image.caption?.trim()) return null
  if (kpis.length > 1 && kpis.some((k) => k.items.length !== 1)) return null
  const items = kpis.flatMap((k) => k.items.map((item) => ({ item, kpi: k })))
  if (items.length < 2 || items.length > 3) return null
  if (items.some(({ item }) => item.note || item.icon || item.tag || item.delta || item.tone || item.source)) return null
  if (items.some(({ item }) => keynoteFigureWidth(item.value, item.unit, FIGURE, ctx) > COL.w)) return null
  const labels = items.map(({ item }) => fitKeynote(item.label, { width: COL.w, size: LABEL.size, lineHeight: LABEL.lineHeight, maxLines: 1 }, ctx))
  if (labels.some((l) => l === null)) return null
  const head = placeKeynoteClaim(claim, { x: COL.x, w: COL.w, top: 80, size: 40, lineHeight: 50, maxLines: 2 })
  if (head === false) return null
  const chapter = placeKeynoteKicker(kicker, { x: COL.x, top: 40, w: COL.w })
  if (chapter === false) return null
  const foot = placeKeynoteSource(source, { x: COL.x, w: COL.w, top: 612, foot: 660 })
  if (foot === false) return null
  const inks = keynoteInks(ctx)
  const ground = inks.ground
  const marked = items.findIndex(({ item }) => keynoteLit(item.value))
  const litIndex = marked >= 0 ? marked : 0
  return (
    <g {...compositionTag("tower")}>
      <g {...blockTag(ctx, image)} data-keynote-tower-photo="">
        {paintKeynotePhoto(image.asset_id, PHOTO, ctx, { crop: image.crop })}
        <KeynoteWash id="keynote-tower-fade" box={{ x: FADE.x, y: 0, w: FADE.w, h: 720 }} ink={ground} axis="x" stops={[{ offset: "0%", opacity: 0 }, { offset: "100%", opacity: 1 }]} />
      </g>
      {chapter}
      {head}
      {items.map(({ item, kpi }, i) => {
        const y = ROWS.top + i * ROWS.step
        const ink = i === litIndex ? inks.silver : inks.ink
        return (
          <g key={i} {...blockTag(ctx, kpi)} data-keynote-figure-row={stripEmphasis(item.value).trim()}>
            {paintKeynoteRule(COL.x, COL.x + COL.w, y, inks.track, 1)}
            {paintKeynoteFigure({ ctx, value: item.value, unit: item.unit, x: COL.x, baseline: keynoteBaseline(y + FIGURE.dy, FIGURE.lineHeight, FIGURE.size, true), spec: FIGURE, fill: keynoteText(ink, ground, FIGURE.unit) })}
            {paintKeynote(labels[i]!, { ctx, x: COL.x, top: y + LABEL.dy, fill: keynoteText(inks.muted, ground, LABEL.size) })}
          </g>
        )
      })}
      {foot}
    </g>
  )
}
