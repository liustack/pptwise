import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  CLAIM_CENTRED,
  KICKER_AT,
  SOURCE_CENTRED,
  fitKeynote,
  keynoteBaseline,
  keynoteFigureWidth,
  keynoteInks,
  keynoteLit,
  keynoteText,
  keynoteTrackedWidth,
  paintKeynote,
  paintKeynoteFigure,
  paintKeynoteRule,
  paintKeynoteTracked,
  placeKeynoteClaim,
  placeKeynoteKicker,
  placeKeynoteSource,
  wholePage,
} from "./keynote"

type Kpi = Extract<Component, { type: "kpi_cards" }>

/*
 * faceoff: two figures face to face, stage's 2026-10 board (p06). The claim
 * centred over them, a hairline down the middle of the page, and on each
 * side a name tracked wide over a figure set at 150px bold, a line under it
 * in the sand saying what was counted. The figure the author marks (the
 * whole value in `**…**`) and its name are silver, the other paper white.
 * The source small and dim, centred at the foot.
 *
 * Takes, in the keynote setting: a `kpi_cards` of two items, each with a
 * value, a label and optionally a unit and a note.
 *
 * Declines: an item with an icon, a tag, a delta, a tone or a source of its
 * own, a figure too wide for its half even a fifth smaller, a note past two
 * lines.
 *
 * Reads: the keynote inks (`./keynote.tsx`), the heading and body faces.
 */

const DIVIDE = { x: 640, y1: 230, y2: 540 } as const
const SIDES = [64, 704] as const
const SIDE_W = 512
const NAME = { top: 236, size: 20, lineHeight: 30, tracking: 8 } as const
/** A figure may reach a little past its half (560 of 512), short of the hairline, as the board's 30.22% does. */
const FIGURE = { top: 280, size: 150, lineHeight: 180, unit: 50, tracking: -4, reach: 560 } as const
const NOTE = { top: 476, size: 16, lineHeight: 26, maxLines: 2 } as const

export const faceoffComposition: Composition = ({ components, ctx, setting, rect, claim, source, kicker }) => {
  if (setting !== "keynote" || !wholePage(rect)) return null
  const [kpi, ...rest] = components
  if (kpi?.type !== "kpi_cards" || rest.length > 0) return null
  const items = (kpi as Kpi).items
  if (items.length !== 2) return null
  if (items.some((it) => it.icon || it.tag || it.delta || it.tone || it.source)) return null
  // One size for both figures: the board's, or as much smaller as the wider needs, down to a fifth under.
  let size: number = FIGURE.size
  const widest = (s: number) => Math.max(...items.map((it) => keynoteFigureWidth(it.value, it.unit, { ...FIGURE, size: s, unit: Math.round((s * FIGURE.unit) / FIGURE.size), tracking: (FIGURE.tracking * s) / FIGURE.size }, ctx)))
  while (widest(size) > FIGURE.reach && size > FIGURE.size * 0.8) size -= 2
  if (widest(size) > FIGURE.reach) return null
  const spec = { size, unit: Math.round((size * FIGURE.unit) / FIGURE.size), tracking: (FIGURE.tracking * size) / FIGURE.size }
  const names = items.map((it) => stripEmphasis(it.label).trim())
  if (names.some((n) => !n || keynoteTrackedWidth(n, NAME.size, NAME.tracking, ctx, { bold: true }) > SIDE_W)) return null
  const notes = items.map((it) => (it.note?.trim() ? fitKeynote(it.note, { width: SIDE_W, size: NOTE.size, lineHeight: NOTE.lineHeight, maxLines: NOTE.maxLines }, ctx) : undefined))
  if (notes.some((n) => n === null)) return null
  const head = placeKeynoteClaim(claim, CLAIM_CENTRED)
  if (head === false) return null
  const chapter = placeKeynoteKicker(kicker, KICKER_AT)
  if (chapter === false) return null
  const foot = placeKeynoteSource(source, SOURCE_CENTRED)
  if (foot === false) return null
  const inks = keynoteInks(ctx)
  const ground = inks.ground
  return (
    <g {...compositionTag("faceoff")}>
      {chapter}
      {head}
      <g {...blockTag(ctx, kpi)} data-keynote-faceoff="">
        <g data-keynote-divide="">{paintKeynoteRule(DIVIDE.x, DIVIDE.x + 1, (DIVIDE.y1 + DIVIDE.y2) / 2, inks.track, DIVIDE.y2 - DIVIDE.y1)}</g>
        {items.map((it, i) => {
          const mid = SIDES[i]! + SIDE_W / 2
          const lit = keynoteLit(it.value)
          const ink = lit ? inks.silver : inks.ink
          const note = notes[i]
          return (
            <g key={i} data-keynote-side={names[i]} data-keynote-lit={lit ? "" : undefined}>
              {paintKeynoteTracked({ ctx, text: names[i]!, x: mid, y: keynoteBaseline(NAME.top, NAME.lineHeight, NAME.size), size: NAME.size, tracking: NAME.tracking, bold: true, anchor: "middle", fill: keynoteText(ink, ground, NAME.size) })}
              {paintKeynoteFigure({ ctx, value: it.value, unit: it.unit, x: mid, baseline: keynoteBaseline(FIGURE.top, FIGURE.lineHeight, size, true), spec, fill: keynoteText(ink, ground, spec.unit), anchor: "middle" })}
              {note ? paintKeynote(note, { ctx, x: mid, anchor: "middle", top: NOTE.top, fill: keynoteText(inks.muted, ground, NOTE.size) }) : null}
            </g>
          )
        })}
      </g>
      {foot}
    </g>
  )
}
