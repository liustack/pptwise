import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import { CRAYON, boardY, crayonAt, crayonInks, crayonText, crayonTint, crayonWidth, fitCrayon, paintCrayon, paintCrayonIcon, paintCrayonLine, placeCrayonClaim, placeCrayonSource } from "./crayonbox"

type IconCards = Extract<Component, { type: "icon_cards" }>

/*
 * stickies: rules that concern the reader as sticky notes on a wall,
 * crayon's 2026-10 board (p03). The claim over the page; under it the notes
 * in rows of three (two when there are four), each a pale crayon, turned a
 * degree or so this way or that with a solid shadow under it and a strip of
 * half-clear tape across its top. On each, upright, the rule's symbol and
 * name, what it says, and where it is written (the card's `tag`) on a white
 * label.
 *
 * Takes, in the crayonbox setting: an untitled `icon_cards` of three to six,
 * every card with a symbol, a title and words, a tag with words alone.
 *
 * Declines: a card with a tone, a name past one line, words past two lines,
 * a label wider than the note.
 *
 * Reads: the crayonbox inks (`./crayonbox.tsx`).
 */

const NOTES = { x: 6, top: 186, pitch: { x: 370, y: 222 }, w: 340, h: 196, r: 6, shadow: { dx: 2, dy: 3, alpha: 0.08 } } as const
const TURN = [-1.5, 1.2, -0.8, 1.0, -1.2, 0.8] as const
const TAPE = { w: 80, h: 24, dy: -12, alpha: 0.75 } as const
const ICON = { x: 24, y: 30, size: 28 } as const
const NAME = { x: 64, top: 28, size: 22, lineHeight: 34 } as const
const WORDS = { x: 24, top: 76, size: 15, lineHeight: 24, maxLines: 2, inset: 20 } as const
const LABEL = { x: 24, top: 150, h: 26, size: 12, pad: 12 } as const
/** The board's crayon for each note in turn: sky, yellow, green, orange, purple, red. */
const ORDER = [CRAYON.sky, CRAYON.yellow, CRAYON.green, CRAYON.orange, CRAYON.purple, CRAYON.red] as const

export const stickiesComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "crayonbox") return null
  const [cards, ...rest] = components
  if (cards?.type !== "icon_cards" || rest.length > 0) return null
  const c = cards as IconCards
  if (c.title?.trim() || c.items.length < 3 || c.items.length > 6) return null
  if (c.items.some((it) => it.tone || (it.tag && (it.tag.evidence || it.tag.tone || it.tag.basis || it.tag.quiet || it.tag.settled)))) return null
  const n = c.items.length
  const cols = n === 4 ? 2 : Math.min(3, n)
  const pitchX = cols === 3 ? NOTES.pitch.x : (rect.w - NOTES.x) / cols
  const w = cols === 3 ? NOTES.w : pitchX - 30
  const names = c.items.map((it) => fitCrayon(it.title, { width: w - NAME.x - WORDS.inset, size: NAME.size, lineHeight: NAME.lineHeight, maxLines: 1, weight: 900 }, ctx))
  const words = c.items.map((it) => fitCrayon(it.text, { width: w - WORDS.x - WORDS.inset, size: WORDS.size, lineHeight: WORDS.lineHeight, maxLines: WORDS.maxLines, weight: 500 }, ctx))
  if (names.some((x) => !x) || words.some((x) => !x)) return null
  const labels = c.items.map((it) => (it.tag?.text?.trim() ? stripEmphasis(it.tag.text).trim() : ""))
  if (labels.some((l) => l && crayonWidth(l, LABEL.size, ctx, { weight: 700 }) + LABEL.pad * 2 > w - LABEL.x * 2)) return null
  const head = placeCrayonClaim(claim, { x: rect.x, w: 1080 })
  if (head === false) return null
  const foot = placeCrayonSource(source, { x: rect.x, w: rect.w - 52 })
  if (foot === false) return null
  const inks = crayonInks(ctx)
  return (
    <g {...compositionTag("stickies")}>
      {head}
      <g {...blockTag(ctx, cards)}>
        {c.items.map((it, i) => {
          const x = rect.x + NOTES.x + (i % cols) * pitchX
          const y = boardY(rect, NOTES.top + Math.floor(i / cols) * NOTES.pitch.y)
          const fill = crayonTint(crayonAt(inks, ORDER, i), inks)
          const turn = TURN[i % TURN.length]!
          const cx = x + w / 2
          const cy = y + NOTES.h / 2
          const label = labels[i]!
          const labelW = Math.round(crayonWidth(label, LABEL.size, ctx, { weight: 700 }) + LABEL.pad * 2)
          return (
            <g key={i} data-crayon-note={stripEmphasis(it.title).trim()}>
              <g transform={`rotate(${turn} ${cx} ${cy})`}>
                <rect x={x + NOTES.shadow.dx} y={y + NOTES.shadow.dy} width={w} height={NOTES.h} rx={NOTES.r} fill={inks.ink} opacity={NOTES.shadow.alpha} />
                <rect x={x} y={y} width={w} height={NOTES.h} rx={NOTES.r} fill={fill} />
              </g>
              <rect x={cx - TAPE.w / 2} y={y + TAPE.dy} width={TAPE.w} height={TAPE.h} fill={inks.card} opacity={TAPE.alpha} transform={`rotate(${-turn * 2} ${cx} ${y + TAPE.dy + TAPE.h / 2})`} />
              {paintCrayonIcon(it.icon, x + ICON.x, y + ICON.y, ICON.size, inks.ink, fill)}
              {paintCrayon(names[i]!, { ctx, x: x + NAME.x, top: y + NAME.top, weight: 900, heading: true, fill: crayonText(inks.ink, fill, NAME.size), ground: fill })}
              {paintCrayon(words[i]!, { ctx, x: x + WORDS.x, top: y + WORDS.top, weight: 500, fill: crayonText(inks.ink, fill, WORDS.size), ground: fill })}
              {label ? (
                <g data-crayon-label={label}>
                  <rect x={x + LABEL.x} y={y + LABEL.top} width={labelW} height={LABEL.h} rx={LABEL.h / 2} fill={inks.card} />
                  {paintCrayonLine(label, { ctx, x: x + LABEL.x + labelW / 2, top: y + LABEL.top, lineHeight: LABEL.h, size: LABEL.size, weight: 700, anchor: "middle", fill: crayonText(inks.ink, inks.card, LABEL.size), ground: inks.card })}
                </g>
              ) : null}
            </g>
          )
        })}
      </g>
      {foot}
    </g>
  )
}
