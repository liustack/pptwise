import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  CLAIM_AT,
  KICKER_AT,
  SOURCE_AT,
  fitKeynote,
  keynoteBaseline,
  keynoteFigureWidth,
  keynoteInks,
  keynoteLit,
  keynoteText,
  keynoteTrackedWidth,
  paintKeynote,
  paintKeynoteFigure,
  paintKeynoteIcon,
  paintKeynoteTracked,
  placeKeynoteClaim,
  placeKeynoteKicker,
  placeKeynoteSource,
  wholePage,
} from "./keynote"

type Kpi = Extract<Component, { type: "kpi_cards" }>

/*
 * arches: the gates a plan has to pass, stage's 2026-10 board (p16). Two to
 * four tall doors with round heads standing side by side on the black, each
 * a step lighter than the page with a hairline round it, and in each, from
 * the top, a symbol in silver, the gate's name tracked wide in the sand, one
 * figure at 80px bold with its unit after it smaller, and a few lines in the
 * sand saying what the figure means. The figure the author marks is silver,
 * or the first when none is. The source under them.
 *
 * Takes, in the keynote setting: a `kpi_cards` of two to four items, each
 * with an icon, a value, a label (the gate's name) and a note.
 *
 * Declines: an item without an icon or a note, with a tag, a delta, a tone
 * or a source, a figure or a name too wide for its door, a note past four
 * lines.
 *
 * Reads: the keynote inks (`./keynote.tsx`), the heading and body faces.
 */

const DOOR = { left: 64, gap: 24, w: 1152, bottom: 560, shoulder: 240, crown: 170 } as const
const ICON = { top: 196, size: 32, stroke: 1.5 } as const
const NAME = { top: 246, size: 20, lineHeight: 30, tracking: 8 } as const
const FIGURE = { top: 290, size: 80, lineHeight: 100, unit: 26, tracking: -2 } as const
const NOTE = { top: 410, size: 14, lineHeight: 24, pad: 32, maxLines: 4 } as const

/** A door `w` wide from `x`: upright sides from the floor to the shoulder, a round head to the crown. */
export function doorPath(x: number, w: number): string {
  const mid = x + w / 2
  return `M ${x} ${DOOR.bottom} L ${x} ${DOOR.shoulder} Q ${x} ${DOOR.crown} ${mid} ${DOOR.crown} Q ${x + w} ${DOOR.crown} ${x + w} ${DOOR.shoulder} L ${x + w} ${DOOR.bottom}`
}

export const archesComposition: Composition = ({ components, ctx, setting, rect, claim, source, kicker }) => {
  if (setting !== "keynote" || !wholePage(rect)) return null
  const [kpi, ...rest] = components
  if (kpi?.type !== "kpi_cards" || rest.length > 0) return null
  const items = (kpi as Kpi).items
  if (items.length < 2 || items.length > 4) return null
  if (items.some((it) => !it.icon || !it.note?.trim() || it.tag || it.delta || it.tone || it.source)) return null
  const w = (DOOR.w - (items.length - 1) * DOOR.gap) / items.length
  const names = items.map((it) => stripEmphasis(it.label).trim())
  if (names.some((n) => !n || keynoteTrackedWidth(n, NAME.size, NAME.tracking, ctx, { bold: true }) > w - 24)) return null
  if (items.some((it) => keynoteFigureWidth(it.value, it.unit, FIGURE, ctx) > w - 24)) return null
  const notes = items.map((it) => fitKeynote(it.note, { width: w - 2 * NOTE.pad, size: NOTE.size, lineHeight: NOTE.lineHeight, maxLines: NOTE.maxLines }, ctx))
  if (notes.some((n) => n === null)) return null
  const head = placeKeynoteClaim(claim, CLAIM_AT)
  if (head === false) return null
  const chapter = placeKeynoteKicker(kicker, KICKER_AT)
  if (chapter === false) return null
  const foot = placeKeynoteSource(source, { ...SOURCE_AT, top: 600 })
  if (foot === false) return null
  const inks = keynoteInks(ctx)
  const door = inks.door
  const marked = items.findIndex((it) => keynoteLit(it.value))
  const litIndex = marked >= 0 ? marked : 0
  return (
    <g {...compositionTag("arches")}>
      {chapter}
      {head}
      <g {...blockTag(ctx, kpi)} data-keynote-arches="">
        {items.map((it, i) => {
          const x = DOOR.left + i * (w + DOOR.gap)
          const mid = x + w / 2
          return (
            <g key={i} data-keynote-door={names[i]} data-keynote-lit={i === litIndex ? "" : undefined}>
              <path d={doorPath(x, w)} fill={door} stroke={inks.track} strokeWidth={1} />
              {paintKeynoteIcon(it.icon!, mid - ICON.size / 2, ICON.top, ICON.size, inks.silver, door, { stroke: ICON.stroke })}
              {paintKeynoteTracked({ ctx, text: names[i]!, x: mid, y: keynoteBaseline(NAME.top, NAME.lineHeight, NAME.size), size: NAME.size, tracking: NAME.tracking, bold: true, anchor: "middle", fill: keynoteText(inks.muted, door, NAME.size) })}
              {paintKeynoteFigure({ ctx, value: it.value, unit: it.unit, x: mid, baseline: keynoteBaseline(FIGURE.top, FIGURE.lineHeight, FIGURE.size, true), spec: FIGURE, fill: keynoteText(i === litIndex ? inks.silver : inks.ink, door, FIGURE.unit), anchor: "middle" })}
              {paintKeynote(notes[i]!, { ctx, x: mid, anchor: "middle", top: NOTE.top, fill: keynoteText(inks.muted, door, NOTE.size), ground: door })}
            </g>
          )
        })}
      </g>
      {foot}
    </g>
  )
}
