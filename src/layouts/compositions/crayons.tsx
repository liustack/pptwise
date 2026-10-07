import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import { boardY, crayonInks, fitCrayon, inkOn, paintCrayon, paintCrayonIcon, paintCrayonLine, placeCrayonClaim, placeCrayonSource } from "./crayonbox"

type Numbered = Extract<Component, { type: "numbered_cards" }>

/*
 * crayons: what a meeting will cover as a row of crayons, crayon's 2026-10
 * board (p02). The claim over the page; under it a crayon a part, standing
 * on end in the deck's section colours in order: a sharpened tip with its
 * lead, a body with two bands across it, the part's number at the top, its
 * symbol, its name and a line of what it covers, all in the ink the crayon
 * carries (white on the purple).
 *
 * Takes, in the crayonbox setting: a `numbered_cards` of three to six, every
 * card with a symbol, a title and words.
 *
 * Declines: a card with a sub line or a mark, a name past three lines or
 * words past four in the crayon's width.
 *
 * Reads: the crayonbox inks (`./crayonbox.tsx`).
 */

const CRAYON = { x: 6, w: 140, pitch: 228, tip: 196, top: 236, bottom: 616, r: 14, bands: [286, 560], band: 10 } as const
const NUMBER = { top: 246, size: 26, lineHeight: 36 } as const
const ICON = { top: 312, size: 32 } as const
const NAME = { top: 360, inset: 10, size: 20, lineHeight: 28, maxLines: 3 } as const
const WORDS = { top: 466, inset: 8, size: 14, lineHeight: 21, maxLines: 4 } as const

export const crayonsComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "crayonbox") return null
  const [cards, ...rest] = components
  if (cards?.type !== "numbered_cards" || rest.length > 0) return null
  const items = (cards as Numbered).items
  if (items.length < 3 || items.length > 6) return null
  if (items.some((it) => !it.icon || !it.title?.trim() || !it.text?.trim() || it.sub || it.emphasis)) return null
  const pitch = Math.min(CRAYON.pitch, (rect.w - CRAYON.x - CRAYON.w) / (items.length - 1))
  const names = items.map((it) => fitCrayon(it.title, { width: CRAYON.w - NAME.inset * 2, size: NAME.size, lineHeight: NAME.lineHeight, maxLines: NAME.maxLines, weight: 900 }, ctx))
  const words = items.map((it) => fitCrayon(it.text, { width: CRAYON.w - WORDS.inset * 2, size: WORDS.size, lineHeight: WORDS.lineHeight, maxLines: WORDS.maxLines, weight: 700 }, ctx))
  if (names.some((n) => !n) || words.some((w) => !w)) return null
  const head = placeCrayonClaim(claim, { x: rect.x, w: 1080 })
  if (head === false) return null
  const foot = placeCrayonSource(source, { x: rect.x, w: rect.w - 52 })
  if (foot === false) return null
  const inks = crayonInks(ctx)
  const y = (v: number) => boardY(rect, v)
  return (
    <g {...compositionTag("crayons")}>
      {head}
      <g {...blockTag(ctx, cards)}>
        {items.map((it, i) => {
          const color = inks.box[i % inks.box.length]!
          const x = rect.x + CRAYON.x + i * pitch
          const cx = x + CRAYON.w / 2
          const fg = inkOn(color, inks, WORDS.size)
          return (
            <g key={i} data-crayon-crayon={stripEmphasis(it.title ?? "").trim()}>
              <polygon points={`${cx},${y(CRAYON.tip)} ${cx - 30},${y(CRAYON.top)} ${cx + 30},${y(CRAYON.top)}`} fill={color} />
              <polygon points={`${cx},${y(CRAYON.tip)} ${cx - 8},${y(CRAYON.tip + 12)} ${cx + 8},${y(CRAYON.tip + 12)}`} fill={inks.ink} opacity={0.55} />
              <rect x={x} y={y(CRAYON.top)} width={CRAYON.w} height={CRAYON.bottom - CRAYON.top} rx={CRAYON.r} fill={color} />
              {CRAYON.bands.map((b) => (
                <rect key={b} x={x} y={y(b)} width={CRAYON.w} height={CRAYON.band} fill={inks.ink} opacity={0.25} />
              ))}
              {paintCrayonLine(String(i + 1).padStart(2, "0"), { ctx, x: cx, top: y(NUMBER.top), lineHeight: NUMBER.lineHeight, size: NUMBER.size, weight: 900, heading: true, anchor: "middle", fill: inkOn(color, inks, NUMBER.size), ground: color })}
              {paintCrayonIcon(it.icon!, cx - ICON.size / 2, y(ICON.top), ICON.size, fg, color, { stroke: 2.4 })}
              {paintCrayon(names[i]!, { ctx, x: cx, top: y(NAME.top), weight: 900, heading: true, anchor: "middle", fill: inkOn(color, inks, NAME.size), ground: color })}
              {paintCrayon(words[i]!, { ctx, x: cx, top: y(WORDS.top), weight: 700, anchor: "middle", fill: fg, ground: color })}
            </g>
          )
        })}
      </g>
      {foot}
    </g>
  )
}

