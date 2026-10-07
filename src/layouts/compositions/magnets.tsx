import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blendOver } from "../../render/ink"
import { blockTag, compositionTag, type Composition } from "./shared"
import { CRAYON, boardY, crayonAt, crayonInks, crayonText, crayonWidth, fitCrayon, paintCrayon, paintCrayonIcon, paintCrayonLine, placeCrayonClaim, placeCrayonSource } from "./crayonbox"

type Numbered = Extract<Component, { type: "numbered_cards" }>

/*
 * magnets: a few things to remember at home, pinned to a fridge door,
 * crayon's 2026-10 board (p11). A pale cool-grey door with a rounded edge,
 * and on it a white card a thing, each turned a degree or two with a solid
 * shadow under it and a round magnet of its crayon at its top. On each card
 * the thing's name set large with its symbol in its crayon at the right,
 * what to do, and in the grey who says so (the card's `sub`, its own line
 * breaks kept).
 *
 * Takes, in the crayonbox setting: a `numbered_cards` of two to four, every
 * card with a symbol, a title and words.
 *
 * Declines: a marked card, a name, words or a note past their room.
 *
 * Reads: the crayonbox inks (`./crayonbox.tsx`).
 */

const DOOR = { x: 0, top: 186, w: 1100, h: 440, r: 30, stroke: 3 } as const
/** The door's cool grey: the ink laid this thin over the card's white, and its edge a little deeper. */
const DOOR_INK = { face: 0.07, edge: 0.17 } as const
const CARD = { top: 220, w: 310, h: 360, pitch: 350, r: 10, shadow: { dx: 3, dy: 5, alpha: 0.1 } } as const
const TURN = [-2.5, 1.5, -1.2, 2] as const
const MAGNET = { dy: 6, r: 20 } as const
const NAME = { x: 30, top: 50, h: 60, size: 34 } as const
const ICON = { dx: 240, dy: 62, size: 34 } as const
const WORDS = { x: 30, top: 124, w: 260, size: 17, lineHeight: 28, maxLines: 3 } as const
const NOTE = { x: 30, top: 250, w: 262, size: 13, lineHeight: 21, maxLines: 3 } as const
/** The board's crayon for each card in turn: sky, orange, green, purple. */
const ORDER = [CRAYON.sky, CRAYON.orange, CRAYON.green, CRAYON.purple] as const

export const magnetsComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "crayonbox") return null
  const [cards, ...rest] = components
  if (cards?.type !== "numbered_cards" || rest.length > 0) return null
  const items = (cards as Numbered).items
  if (items.length < 2 || items.length > 4 || items.some((it) => !it.icon || !it.title?.trim() || !it.text?.trim() || it.emphasis)) return null
  const doorW = Math.min(DOOR.w, rect.w)
  const pitch = Math.min(CARD.pitch, (doorW - 40) / items.length)
  const w = Math.min(CARD.w, pitch - 30)
  if (items.some((it) => crayonWidth(it.title, NAME.size, ctx, { weight: 900, heading: true }) > ICON.dx - NAME.x - 10 - (CARD.w - w))) return null
  const words = items.map((it) => fitCrayon(it.text, { width: w - 50, size: WORDS.size, lineHeight: WORDS.lineHeight, maxLines: WORDS.maxLines, weight: 600 }, ctx))
  const notes = items.map((it) => (it.sub?.trim() ? fitCrayon(it.sub, { width: w - 48, size: NOTE.size, lineHeight: NOTE.lineHeight, maxLines: NOTE.maxLines, weight: 600 }, ctx) : undefined))
  if (words.some((x) => !x) || notes.some((x) => x === null)) return null
  const head = placeCrayonClaim(claim, { x: rect.x, w: 1080 })
  if (head === false) return null
  const foot = placeCrayonSource(source, { x: rect.x, w: rect.w - 52 })
  if (foot === false) return null
  const inks = crayonInks(ctx)
  const face = blendOver(inks.ink, inks.card, DOOR_INK.face)
  const edge = blendOver(inks.ink, inks.card, DOOR_INK.edge)
  const doorY = boardY(rect, DOOR.top)
  const x0 = rect.x + (doorW - ((items.length - 1) * pitch + w)) / 2
  const top = boardY(rect, CARD.top)
  return (
    <g {...compositionTag("magnets")}>
      {head}
      <g {...blockTag(ctx, cards)}>
        <rect data-crayon-door="" x={rect.x} y={doorY} width={doorW} height={DOOR.h} rx={DOOR.r} fill={face} stroke={edge} strokeWidth={DOOR.stroke} />
        {items.map((it, i) => {
          const color = crayonAt(inks, ORDER, i)
          const x = x0 + i * pitch
          const cx = x + w / 2
          const turn = TURN[i % TURN.length]!
          return (
            <g key={i} data-crayon-magnet={stripEmphasis(it.title).trim()}>
              <g transform={`rotate(${turn} ${cx} ${top + CARD.h / 2})`}>
                <rect x={x + CARD.shadow.dx} y={top + CARD.shadow.dy} width={w} height={CARD.h} rx={CARD.r} fill={inks.ink} opacity={CARD.shadow.alpha} />
                <rect x={x} y={top} width={w} height={CARD.h} rx={CARD.r} fill={inks.card} />
              </g>
              <circle cx={cx} cy={top + MAGNET.dy} r={MAGNET.r} fill={color} />
              {paintCrayonLine(it.title, { ctx, x: x + NAME.x, top: top + NAME.top, lineHeight: NAME.h, size: NAME.size, weight: 900, heading: true, fill: crayonText(inks.ink, inks.card, NAME.size), ground: inks.card })}
              {paintCrayonIcon(it.icon!, x + ICON.dx - (CARD.w - w), top + ICON.dy, ICON.size, color, inks.card, { stroke: 2.6 })}
              {paintCrayon(words[i]!, { ctx, x: x + WORDS.x, top: top + WORDS.top, weight: 600, fill: crayonText(inks.ink, inks.card, WORDS.size), ground: inks.card })}
              {notes[i] ? paintCrayon(notes[i]!, { ctx, x: x + NOTE.x, top: top + NOTE.top, weight: 600, fill: crayonText(inks.muted, inks.card, NOTE.size), ground: inks.card }) : null}
            </g>
          )
        })}
      </g>
      {foot}
    </g>
  )
}
